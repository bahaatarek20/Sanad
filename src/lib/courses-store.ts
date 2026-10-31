import fs from 'fs'
import os from 'os'
import path from 'path'
import { ALL_COURSES, MatnCourse, CATEGORIES_LIST } from '@/lib/curriculum-data'
import { savePlatformConfigToCloud } from '@/lib/cloud-db'

export interface BroadcastNotice {
  active: boolean
  sender: string
  message: string
  subtext: string
  timestamp: string
}

export interface CategoryItem {
  slug: string
  title: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const COURSES_FILE = path.join(DATA_DIR, 'sanad_custom_courses.json')
const CATEGORIES_FILE = path.join(DATA_DIR, 'sanad_custom_categories.json')
const BROADCAST_FILE = path.join(DATA_DIR, 'sanad_broadcast.json')

// مسار احتياطي قابل للكتابة دائماً على خوادم Vercel (حيث يكون process.cwd()/data للقراءة فقط)
const TMP_DATA_DIR = path.join(os.tmpdir(), 'sanad_data')
const TMP_COURSES_FILE = path.join(TMP_DATA_DIR, 'sanad_custom_courses.json')
const TMP_CATEGORIES_FILE = path.join(TMP_DATA_DIR, 'sanad_custom_categories.json')
const TMP_BROADCAST_FILE = path.join(TMP_DATA_DIR, 'sanad_broadcast.json')

declare global {
  // eslint-disable-next-line no-var
  var __sanad_courses_override__: MatnCourse[] | undefined
  // eslint-disable-next-line no-var
  var __sanad_categories_override__: CategoryItem[] | undefined
  // eslint-disable-next-line no-var
  var __sanad_broadcast_override__: BroadcastNotice | undefined
}

function writeDualFile(primaryPath: string, tmpPath: string, data: unknown) {
  const payload = JSON.stringify(data, null, 2)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(primaryPath, payload, 'utf8')
  } catch {}
  try {
    if (!fs.existsSync(TMP_DATA_DIR)) fs.mkdirSync(TMP_DATA_DIR, { recursive: true })
    fs.writeFileSync(tmpPath, payload, 'utf8')
  } catch {}
}

function readNewestFile<T>(primaryPath: string, tmpPath: string): T | null {
  try {
    const hasPrimary = fs.existsSync(primaryPath)
    const hasTmp = fs.existsSync(tmpPath)
    if (hasTmp && hasPrimary) {
      const tmpTime = fs.statSync(tmpPath).mtimeMs
      const primaryTime = fs.statSync(primaryPath).mtimeMs
      const chosen = tmpTime >= primaryTime ? tmpPath : primaryPath
      return JSON.parse(fs.readFileSync(chosen, 'utf8')) as T
    }
    if (hasTmp) return JSON.parse(fs.readFileSync(tmpPath, 'utf8')) as T
    if (hasPrimary) return JSON.parse(fs.readFileSync(primaryPath, 'utf8')) as T
  } catch {}
  return null
}

// ذاكرة كاش داخلية فائقة السرعة تمنع القراءة المتكررة من القرص في كل طلب
let cachedCourses: MatnCourse[] | null = null
let cachedCourseMap: Map<string, MatnCourse> | null = null
let lastCoursesCacheTime = 0

let cachedCategories: CategoryItem[] | null = null
let lastCategoriesCacheTime = 0

let cachedBroadcast: BroadcastNotice | null = null
let lastBroadcastCacheTime = 0

const CACHE_TTL_MS = 60 * 1000 // 60 ثانية

export function invalidateCoursesCache() {
  cachedCourses = null
  cachedCourseMap = null
  lastCoursesCacheTime = 0
  cachedCategories = null
  lastCategoriesCacheTime = 0
  cachedBroadcast = null
  lastBroadcastCacheTime = 0
}

function ensureStoreFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(COURSES_FILE)) {
      fs.writeFileSync(COURSES_FILE, JSON.stringify(ALL_COURSES, null, 2), 'utf8')
    }
    if (!fs.existsSync(CATEGORIES_FILE)) {
      fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(CATEGORIES_LIST, null, 2), 'utf8')
    }
    if (!fs.existsSync(BROADCAST_FILE)) {
      const defaultBroadcast: BroadcastNotice = {
        active: false,
        sender: 'المهندس بهاء طارق || إدارة سَنَد',
        message: '',
        subtext: 'تنبيه وإشعار عام لجميع طلاب المنصة.',
        timestamp: new Date().toISOString(),
      }
      fs.writeFileSync(BROADCAST_FILE, JSON.stringify(defaultBroadcast, null, 2), 'utf8')
    }
  } catch {
    // على Vercel يتم استخدام المسار الاحتياطي /tmp والذاكرة الحية تلقائياً
  }
}

/**
 * دالة ذكية لفصل الحروف والكلمات الملتصقة واستعادة المسافات الطبيعية في اللغة العربية
 */
export function normalizeArabicSpaces(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/([^\s(])\(/g, '$1 (')
    .replace(/\)([^\s)])/g, ') $1')
    .replace(/(:|،)(?=[^\s])/g, '$1 ')
    .replace(/كتابالبداية/g, 'كتاب البداية')
    .replace(/فيعلمالعقيدة/g, 'في علم العقيدة')
    .replace(/الشيخوحيدبالي/g, 'الشيخ وحيد بالي')
    .replace(/الشيخصالحالعصيميمجلسان/g, 'الشيخ صالح العصيمي - مجلسان')
    .replace(/الأربعينالنووية/g, 'الأربعين النووية')
    .replace(/التأهيلالفقهيأصولالفقه/g, 'التأهيل الفقهي: أصول الفقه')
    .replace(/الكفايةفيشرحالبدايةأصولالفقه/g, 'الكفاية في شرح البداية: أصول الفقه')
    .replace(/الدروسالتأصيليةشرحمتنالآجرومية/g, 'الدروس التأصيلية: شرح متن الآجرومية')
    .replace(/شرحكتاببدايةالمتفقه\((\d+)\)للشيخنورشعلان/g, 'شرح كتاب بداية المتفقه ($1) - للشيخ نور شعلان')
    .replace(/برنامجغريبالحديثدمحمدحمدالعتيبي/g, ' - برنامج غريب الحديث - د. محمد حمد العتيبي')
    .replace(/شرحالبيقونيةللشيخعبدالكريمالخضيربرنامجاجتماعالنقط/g, 'شرح المنظومة البيقونية - الشيخ عبد الكريم الخضير - ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * جلب كافة المتون المعتمدة والنشطة على مستوى المنصة (Server Source of Truth)
 */
export function getActiveCourses(): MatnCourse[] {
  if (globalThis.__sanad_courses_override__ && globalThis.__sanad_courses_override__.length > 0) {
    return globalThis.__sanad_courses_override__
  }
  if (cachedCourses && Date.now() - lastCoursesCacheTime < CACHE_TTL_MS) {
    return cachedCourses
  }

  try {
    ensureStoreFiles()
    const parsed = readNewestFile<MatnCourse[]>(COURSES_FILE, TMP_COURSES_FILE)
    if (Array.isArray(parsed) && parsed.length > 0) {
        const fallbackMap = new Map<string, MatnCourse>()
        ALL_COURSES.forEach((c) => fallbackMap.set(c.slug, c))

        let hadRepairs = false

        const courses = parsed.map((customCourse) => {
          const fallback = fallbackMap.get(customCourse.slug)
          const baseCourse = fallback ? { ...fallback, ...customCourse } : customCourse

          // استعادة العنوان الأصلي السليم من قاعدة المتون المعتمدة إذا كانت المسافات قد حُذفت سابقاً
          let resolvedTitle = normalizeArabicSpaces(customCourse.title || fallback?.title || '')
          if (fallback && resolvedTitle.replace(/\s+/g, '') === fallback.title.replace(/\s+/g, '')) {
            if (resolvedTitle !== fallback.title) {
              resolvedTitle = fallback.title
              hadRepairs = true
            }
          }

          const rawEpisodes = (customCourse.episodes && customCourse.episodes.length > 0)
            ? customCourse.episodes
            : (fallback?.episodes || [])

          const episodes = rawEpisodes.map((ep) => {
            let epTitle = normalizeArabicSpaces(ep.title ? ep.title.trim() : '')
            // استعادة المسافات للألقاب مثل "المجلس1"
            const majlisMatch = epTitle.match(/^(المجلس|الدرس)(\d+)$/)
            if (majlisMatch) {
              epTitle = `${majlisMatch[1]} ${majlisMatch[2]}`
              hadRepairs = true
            }
            // استعادة الاسم الأصلي من وصف المجلد إن وُجد
            if (ep.description && ep.description.startsWith('فيديو مرفوع من المجلد:')) {
              const fromDesc = ep.description.replace(/^فيديو مرفوع من المجلد:\s*/, '').trim()
              if (fromDesc && epTitle.replace(/\s+/g, '') === fromDesc.replace(/\s+/g, '')) {
                if (epTitle !== fromDesc) {
                  epTitle = fromDesc
                  hadRepairs = true
                }
              }
            }
            return {
              ...ep,
              title: epTitle,
              description: ep.description ? ep.description.trim() : '',
            }
          })

          const resolvedTotalLessons = episodes.length > 0
            ? episodes.length
            : (customCourse.totalLessons !== undefined && customCourse.totalLessons > 0)
            ? customCourse.totalLessons
            : (fallback?.totalLessons || 1)

          const resolvedYoutubeId =
            customCourse.youtubeId && !customCourse.youtubeId.startsWith('/api/video/')
              ? customCourse.youtubeId
              : fallback?.youtubeId || customCourse.youtubeId || ''

          const resolvedIsPlaylist =
            customCourse.isPlaylist !== undefined
              ? customCourse.isPlaylist
              : (fallback?.isPlaylist ?? Boolean(resolvedYoutubeId && (resolvedYoutubeId.startsWith('PL') || resolvedYoutubeId.includes('list='))))

          return {
            ...baseCourse,
            title: resolvedTitle,
            category: customCourse.category || fallback?.category || 'عام',
            categorySlug: customCourse.categorySlug || fallback?.categorySlug || 'hadith',
            stage: (customCourse.stage as 1 | 2 | 3) || (fallback?.stage as 1 | 2 | 3) || 1,
            author: customCourse.author || fallback?.author,
            instructor: customCourse.instructor || fallback?.instructor,
            videoUrl: customCourse.videoUrl || fallback?.videoUrl,
            youtubeId: resolvedYoutubeId,
            isPlaylist: resolvedIsPlaylist,
            videoList: customCourse.videoList && customCourse.videoList.length > 0 ? customCourse.videoList : fallback?.videoList,
            pdfUrl: customCourse.pdfUrl || fallback?.pdfUrl,
            audioUrl: customCourse.audioUrl || fallback?.audioUrl,
            description: customCourse.description || fallback?.description || '',
            episodes: episodes,
            totalLessons: resolvedTotalLessons,
            prerequisites: customCourse.prerequisites || fallback?.prerequisites || undefined,
            nextCourses: customCourse.nextCourses || fallback?.nextCourses || undefined,
            pedagogicalRole: customCourse.pedagogicalRole || fallback?.pedagogicalRole || undefined,
          }
        })

        // إذا تم إصلاح أي عناوين استُرجعت مسافاتها، حفظ التحديث في الملف فوراً
        if (hadRepairs) {
          writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
        }

        // دمج أي متون تأصيلية كبرى لم تكن موجودة في ملف التخصيص
        const customSlugs = new Set(parsed.map((c) => c.slug))
        const missingCanonicalCourses = ALL_COURSES.filter((c) => !customSlugs.has(c.slug))
        const finalCourses = [...courses, ...missingCanonicalCourses]

        cachedCourses = finalCourses
        cachedCourseMap = new Map(finalCourses.map((c) => [c.slug, c]))
        lastCoursesCacheTime = Date.now()
        return finalCourses
    }
  } catch (err) {
    console.error('Error reading courses from store:', err)
  }

  cachedCourses = ALL_COURSES
  cachedCourseMap = new Map(ALL_COURSES.map((c) => [c.slug, c]))
  lastCoursesCacheTime = Date.now()
  return ALL_COURSES
}

/**
 * جلب متن معين بالمعرف (Slug) مع تأمين البحث المزدوج والكاش السريع
 */
export function getActiveCourseBySlug(slug: string): MatnCourse | undefined {
  if (cachedCourseMap && Date.now() - lastCoursesCacheTime < CACHE_TTL_MS) {
    const found = cachedCourseMap.get(slug)
    if (found) return found
  }
  const courses = getActiveCourses()
  const found = courses.find((c) => c.slug === slug)
  if (found) return found
  return ALL_COURSES.find((c) => c.slug === slug)
}

/**
 * حفظ أو تعديل متن من لوحة الإدارة ونشره فوراً في المنصة كاملة
 */
export function saveCourseToServer(course: MatnCourse, oldSlug?: string): MatnCourse[] {
  ensureStoreFiles()
  let courses = [...getActiveCourses()]

  const targetSlug = oldSlug || course.slug
  const existingIdx = courses.findIndex((c) => c.slug === targetSlug || c.slug === course.slug)

  // حفظ مجالس المتن وعنوانه تماماً كما كتبها المستخدم دون أي تعديل على النص العربي
  const cleanedEpisodes = (course.episodes || []).map((ep) => ({
    ...ep,
    title: ep.title ? ep.title.trim() : '',
    description: ep.description ? ep.description.trim() : '',
  }))

  const resolvedTotalLessons = cleanedEpisodes.length > 0
    ? cleanedEpisodes.length
    : (course.totalLessons && course.totalLessons > 0 ? course.totalLessons : 1)

  const updatedCourseItem: MatnCourse = {
    ...course,
    title: course.title ? course.title.trim() : '',
    description: course.description ? course.description.trim() : '',
    episodes: cleanedEpisodes,
    totalLessons: resolvedTotalLessons,
    stage: (course.stage as 1 | 2 | 3) || 1,
    author: course.author || undefined,
    prerequisites: course.prerequisites || undefined,
    nextCourses: course.nextCourses || undefined,
    pedagogicalRole: course.pedagogicalRole || undefined,
  }

  if (existingIdx >= 0) {
    courses = courses.filter((c, idx) => idx === existingIdx || (c.slug !== targetSlug && c.slug !== course.slug))
    const updatedIdx = courses.findIndex((c) => c.slug === targetSlug || c.slug === course.slug)
    if (updatedIdx >= 0) {
      courses[updatedIdx] = updatedCourseItem
    } else {
      courses.unshift(updatedCourseItem)
    }
  } else {
    // إضافة المتن في مقدمة القائمة
    courses = [updatedCourseItem, ...courses]
  }

  globalThis.__sanad_courses_override__ = courses
  writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
  invalidateCoursesCache()

  return courses
}

/**
 * حذف متن من المنصة نهائياً عبر لوحة الإدارة
 */
export function deleteCourseFromServer(slug: string): MatnCourse[] {
  ensureStoreFiles()
  const courses = getActiveCourses().filter((c) => c.slug !== slug)

  globalThis.__sanad_courses_override__ = courses
  writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
  invalidateCoursesCache()

  return courses
}

/**
 * تبديل ونقل موضع متن لأعلى أو لأسفل في الفهرس ومسار المنصة
 */
export function moveCourseInServer(slug: string, direction: 'up' | 'down'): MatnCourse[] {
  ensureStoreFiles()
  const courses = [...getActiveCourses()]
  const idx = courses.findIndex((c) => c.slug === slug)
  if (idx < 0) return courses

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= courses.length) return courses

  // تبديل موضعي المتنين (Swap)
  const temp = courses[idx]
  courses[idx] = courses[targetIdx]
  courses[targetIdx] = temp

  globalThis.__sanad_courses_override__ = courses
  writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
  invalidateCoursesCache()

  return courses
}

/**
 * تغيير الفن الشرعي لمتن معين فوراً وتحديثه عبر المنصة
 */
export function updateCourseCategoryInServer(slug: string, newCategorySlug: string): MatnCourse[] {
  ensureStoreFiles()
  const categories = getActiveCategories()
  const foundCat = categories.find((c) => c.slug === newCategorySlug)
  const categoryTitle = foundCat ? foundCat.title : newCategorySlug

  let courses = getActiveCourses()
  courses = courses.map((c) => {
    if (c.slug === slug) {
      return {
        ...c,
        categorySlug: newCategorySlug,
        category: categoryTitle,
      }
    }
    return c
  })

  globalThis.__sanad_courses_override__ = courses
  writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
  invalidateCoursesCache()

  return courses
}

/**
 * حفظ الترتيب الكامل للمتون مباشرة
 */
export function reorderCoursesInServer(orderedCourses: MatnCourse[]): MatnCourse[] {
  ensureStoreFiles()
  globalThis.__sanad_courses_override__ = orderedCourses
  writeDualFile(COURSES_FILE, TMP_COURSES_FILE, orderedCourses)
  invalidateCoursesCache()
  return orderedCourses
}

/**
 * جلب الإعلان الإداري النشط المعروض لجميع الطلاب مع كاش سريع
 */
export function getBroadcastNotice(): BroadcastNotice {
  if (globalThis.__sanad_broadcast_override__) {
    return globalThis.__sanad_broadcast_override__
  }
  if (cachedBroadcast && Date.now() - lastBroadcastCacheTime < CACHE_TTL_MS) {
    return cachedBroadcast
  }

  try {
    ensureStoreFiles()
    const parsed = readNewestFile<BroadcastNotice>(BROADCAST_FILE, TMP_BROADCAST_FILE)
    if (parsed && typeof parsed.active === 'boolean') {
      cachedBroadcast = parsed
      lastBroadcastCacheTime = Date.now()
      return parsed
    }
  } catch {}

  return {
    active: false,
    sender: 'المهندس بهاء طارق || إدارة سَنَد',
    message: '',
    subtext: 'تنبيه وإشعار عام لجميع طلاب المنصة.',
    timestamp: new Date().toISOString(),
  }
}

/**
 * تحديث وبث الإعلان الإداري لجميع زوار وطلاب المنصة فوراً
 */
export function saveBroadcastNotice(broadcast: BroadcastNotice): BroadcastNotice {
  ensureStoreFiles()
  const updated: BroadcastNotice = {
    ...broadcast,
    timestamp: new Date().toISOString(),
  }

  globalThis.__sanad_broadcast_override__ = updated
  writeDualFile(BROADCAST_FILE, TMP_BROADCAST_FILE, updated)
  savePlatformConfigToCloud('broadcast', updated as unknown as Record<string, unknown>).catch(() => {})
  invalidateCoursesCache()

  return updated
}

/**
 * جلب كافة الفنون والتصنيفات الشرعية النشطة على مستوى المنصة مع كاش سريع
 */
export function getActiveCategories(): CategoryItem[] {
  if (globalThis.__sanad_categories_override__ && globalThis.__sanad_categories_override__.length > 0) {
    return globalThis.__sanad_categories_override__
  }
  if (cachedCategories && Date.now() - lastCategoriesCacheTime < CACHE_TTL_MS) {
    return cachedCategories
  }

  try {
    ensureStoreFiles()
    let categories: CategoryItem[] = []
    const parsed = readNewestFile<CategoryItem[]>(CATEGORIES_FILE, TMP_CATEGORIES_FILE)
    if (Array.isArray(parsed) && parsed.length > 0) {
      categories = parsed
    }
    if (categories.length === 0) {
      categories = [...CATEGORIES_LIST]
    }

    // التحقق من شمول أي فن يظهر في المتون النشطة حتى لا يسقط أي فن مضاف
    const courses = getActiveCourses()
    const map = new Map<string, string>()
    categories.forEach((cat) => map.set(cat.slug, cat.title))
    courses.forEach((c) => {
      if (c.categorySlug && c.category && !map.has(c.categorySlug)) {
        map.set(c.categorySlug, c.category)
      }
    })

    const finalCategories = Array.from(map.entries()).map(([slug, title]) => ({ slug, title }))
    cachedCategories = finalCategories
    lastCategoriesCacheTime = Date.now()
    return finalCategories
  } catch {
    return [...CATEGORIES_LIST]
  }
}

/**
 * حفظ أو تعديل أو إضافة فن شرعي، وتعميم الاسم الجديد فوراً على كافة المتون التابعة له
 */
export function saveCategoryToServer({
  slug,
  title,
  oldSlug,
  oldTitle,
}: {
  slug: string
  title: string
  oldSlug?: string
  oldTitle?: string
}): { categories: CategoryItem[]; courses: MatnCourse[] } {
  ensureStoreFiles()
  const categories = [...getActiveCategories()]
  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')
  const cleanTitle = title.trim()
  const targetOldSlug = (oldSlug || cleanSlug).trim().toLowerCase()

  // 1. تحديث أو إضافة الفن في قائمة الفنون
  const existingIdx = categories.findIndex(
    (c) => c.slug === targetOldSlug || c.slug === cleanSlug
  )

  if (existingIdx >= 0) {
    categories[existingIdx] = { slug: cleanSlug, title: cleanTitle }
  } else {
    categories.push({ slug: cleanSlug, title: cleanTitle })
  }

  globalThis.__sanad_categories_override__ = categories
  writeDualFile(CATEGORIES_FILE, TMP_CATEGORIES_FILE, categories)
  savePlatformConfigToCloud('categories', { items: categories }).catch(() => {})

  // 2. تحديث وتعميم الاسم الجديد على جميع المتون التابعة لهذا الفن في كامل أرجاء المنصة
  let courses = getActiveCourses()
  let coursesUpdated = false

  courses = courses.map((c) => {
    if (
      c.categorySlug === targetOldSlug ||
      c.categorySlug === cleanSlug ||
      (oldTitle && c.category === oldTitle)
    ) {
      coursesUpdated = true
      return {
        ...c,
        category: cleanTitle,
        categorySlug: cleanSlug,
      }
    }
    return c
  })

  if (coursesUpdated) {
    globalThis.__sanad_courses_override__ = courses
    writeDualFile(COURSES_FILE, TMP_COURSES_FILE, courses)
  }

  invalidateCoursesCache()
  return { categories, courses }
}

/**
 * حذف فن شرعي من المنصة نهائياً عبر لوحة الإدارة
 */
export function deleteCategoryFromServer(slug: string): CategoryItem[] {
  ensureStoreFiles()
  const categories = getActiveCategories().filter((c) => c.slug !== slug)

  globalThis.__sanad_categories_override__ = categories
  writeDualFile(CATEGORIES_FILE, TMP_CATEGORIES_FILE, categories)
  savePlatformConfigToCloud('categories', { items: categories }).catch(() => {})
  invalidateCoursesCache()

  return categories
}
