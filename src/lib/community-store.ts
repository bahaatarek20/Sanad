import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import path from 'path'
import type { CommunityPost, CommunityReply } from '@/components/community-hub'
import { getStudentProfileData, isStudentDeleted, SUPER_ADMIN_EMAIL } from '@/lib/student-tracking'

const DATA_DIR = path.join(process.cwd(), 'data')
const COMMUNITY_FILE = path.join(DATA_DIR, 'sanad_community_posts.json')

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'sample-1',
    anonymous_alias: 'طالب علم #412',
    course_slug: 'al-usul-min-ilmil-usul',
    post_type: 'benefit',
    content:
      'قاعدة مفيدة قيّدتها من شرح الشيخ ابن عثيمين في الأصول: «الأصل في الأمر الوجوب إلا لصارف، والأصل في النهي التحريم إلا لدليل».. الفرق الجوهري بين الصارف والدليل المخصص يحتاج عناية أثناء مدارسة مباحث دلالات الألفاظ.',
    upvotes_count: 14,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:emerald-scholar',
    replies: [
      {
        id: 'rep-1',
        post_id: 'sample-1',
        anonymous_alias: 'باحث في الفقه #89',
        content:
          'أحسنت القيد! ومن أمثلة الصارف في السنة الأمر بالسواك عند كل صلاة؛ صُرف من الوجوب إلى الاستحباب بحديث: «لولا أن أشق على أمتي».',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        author_role: 'student',
        author_avatar_url: 'preset:amber-scribe',
      },
    ],
  },
  {
    id: 'sample-2',
    anonymous_alias: 'مستفهم في الأصول #15',
    course_slug: 'al-bayquniyyah',
    post_type: 'question',
    content:
      'استشكل عليّ الفرق بين "المرسل" و"المنقطع" عند الإمام البيقوني رحمه الله في قوله: (ومرسل منه الصحابي سقط.. وكل ما لم يتصل به انقطاع). هل كل مرسل منقطع اصطلاحاً؟',
    upvotes_count: 9,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:indigo-seeker',
    replies: [
      {
        id: 'rep-2',
        post_id: 'sample-2',
        anonymous_alias: 'محرر للحديث #74',
        content:
          'نعم يا أخي الكريم؛ المنقطع عند المتقدمين أعم، والمرسل نوع خاص منه بسقوط من فوق التابعي أو سقوط الصحابي عند البيقوني. فبينهما عموم وخصوص وجهي.',
        created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        author_role: 'student',
        author_avatar_url: 'preset:cyan-hikmah',
      },
    ],
  },
  {
    id: 'sample-3',
    anonymous_alias: 'دارس للسان العرب #63',
    course_slug: 'al-ajrumiyyah',
    post_type: 'summary',
    content:
      'تلخيص سريع لعلامات الإعراب الأربعة في الآجرومية:\n1. الرفع وعلامته الأصلية الضمة (وينوب عنها: الواو، الألف، النون).\n2. النصب وعلامته الفتحة (وينوب عنها: الألف، الكسرة، الياء، حذف النون).\n3. الخفض وعلامته الكسرة (وينوب عنها: الياء، الفتحة).\n4. الجزم وعلامته السكون (وينوب عنه: الحذف).',
    upvotes_count: 22,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    author_role: 'student',
    author_avatar_url: 'preset:rose-hafiz',
    replies: [],
  },
]

// حماية من الإغراق والرسائل المتكررة (Anti-Spam Rate Limiter)
const communityRateMap = new Map<string, { timestamps: number[]; lastContent: string; lastTime: number }>()

export function checkCommunityRateLimit(
  userEmail: string,
  content: string
): { allowed: boolean; error?: string } {
  const key = userEmail.toLowerCase().trim()
  const now = Date.now()
  const cleanContent = content.trim()

  const record = communityRateMap.get(key) || {
    timestamps: [],
    lastContent: '',
    lastTime: 0,
  }

  // منع تكرار نفس النص حرفياً خلال 45 ثانية
  if (record.lastContent === cleanContent && now - record.lastTime < 45000) {
    return {
      allowed: false,
      error: 'لقد قمت بنشر هذه المشاركة للتو، يرجى عدم تكرار الإرسال.',
    }
  }

  // السماح بحد أقصى 6 مشاركات/ردود خلال 30 ثانية
  const recentTimestamps = record.timestamps.filter((t) => now - t < 30000)
  if (recentTimestamps.length >= 6) {
    return {
      allowed: false,
      error: 'يرجى التمهل قليلاً قبل إرسال مشاركة جديدة لمنع الإغراق.',
    }
  }

  recentTimestamps.push(now)
  communityRateMap.set(key, {
    timestamps: recentTimestamps,
    lastContent: cleanContent,
    lastTime: now,
  })

  return { allowed: true }
}

/**
 * تعقيم وتطهير النص من أي وسوم خبيثة (XSS Sanitization) مع الحفاظ على النص العربي وعلامات الترقيم
 */
export function sanitizeCommunityContent(raw: string, maxLength = 2000): string {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength)
}

/**
 * استخراج اسم العرض والصورة والرتبة للمستخدم بناءً على ملفه الشخصي وإعدادات الخصوصية الحية
 */
export function resolveAuthorCommunityIdentity(email: string, fallbackName?: string): {
  displayName: string
  avatarUrl?: string
  role: 'owner' | 'admin' | 'student'
  educationLevel?: string
} {
  const cleanEmail = (email || '').toLowerCase().trim()
  const profile = getStudentProfileData(cleanEmail)
  const isOwner = cleanEmail === SUPER_ADMIN_EMAIL || profile?.role === 'owner'
  const role: 'owner' | 'admin' | 'student' = isOwner
    ? 'owner'
    : profile?.role === 'admin'
    ? 'admin'
    : 'student'

  const showRealName = isOwner ? true : (profile?.privacySettings?.showRealNameInCommunity ?? true)
  const showAvatar = profile?.privacySettings?.showAvatarInCommunity ?? true

  let displayName = ''
  if (isOwner) {
    displayName = `${profile?.name || fallbackName || 'المهندس بهاء طارق'} • مالك المنصة`
  } else if (role === 'admin') {
    displayName = `${profile?.name || fallbackName || 'مشرف'} • مشرف المنصة`
  } else if (!showRealName) {
    displayName = `طالب علم (${profile?.scholarlyId || 'سَنَد'})`
  } else {
    const rawName = profile?.name || fallbackName || cleanEmail.split('@')[0] || 'طالب علم'
    const idSuffix = profile?.scholarlyId ? ` (${profile.scholarlyId})` : ''
    displayName = `${rawName}${idSuffix}`
  }

  const avatarUrl = showAvatar ? profile?.avatarUrl : undefined
  const educationLevel =
    profile?.privacySettings?.showBioPublicly !== false ? profile?.educationLevel : undefined

  return {
    displayName,
    avatarUrl,
    role,
    educationLevel,
  }
}

/**
 * إثراء المشاركات والردود بالصور الرمزية والأسماء المحدثة حياً من سجلات الطلاب مع إخفاء البريد الخاص
 */
export function enrichCommunityPostsForPublic(posts: CommunityPost[]): CommunityPost[] {
  const activePosts = posts.filter((post) => {
    if (post.author_email && isStudentDeleted(post.author_email)) return false
    return true
  })
  return activePosts.map((post) => {
    let enrichedAlias = post.anonymous_alias
    let enrichedAvatar = post.author_avatar_url
    let enrichedRole = post.author_role || 'student'
    let enrichedLevel = post.author_education_level

    if (post.author_email) {
      const resolved = resolveAuthorCommunityIdentity(post.author_email, post.anonymous_alias)
      enrichedAlias = resolved.displayName
      enrichedAvatar = resolved.avatarUrl
      enrichedRole = resolved.role
      enrichedLevel = resolved.educationLevel
    } else if (enrichedAlias.includes('المشرف العام') || enrichedAlias.includes('مالك المنصة')) {
      enrichedRole = 'owner'
    }

    const enrichedReplies: CommunityReply[] = (post.replies || [])
      .filter((rep) => !(rep.author_email && isStudentDeleted(rep.author_email)))
      .map((rep) => {
      let repAlias = rep.anonymous_alias
      let repAvatar = rep.author_avatar_url
      let repRole = rep.author_role || 'student'

      if (rep.author_email) {
        const resolvedRep = resolveAuthorCommunityIdentity(rep.author_email, rep.anonymous_alias)
        repAlias = resolvedRep.displayName
        repAvatar = resolvedRep.avatarUrl
        repRole = resolvedRep.role
      } else if (repAlias.includes('المشرف العام') || repAlias.includes('مالك المنصة')) {
        repRole = 'owner'
      }

      const safeReply: CommunityReply = {
        ...rep,
        anonymous_alias: repAlias,
        author_avatar_url: repAvatar,
        author_role: repRole,
      }
      delete safeReply.author_email
      return safeReply
    })

    const safePost: CommunityPost = {
      ...post,
      anonymous_alias: enrichedAlias,
      author_avatar_url: enrichedAvatar,
      author_role: enrichedRole,
      author_education_level: enrichedLevel,
      replies: enrichedReplies,
    }
    delete safePost.author_email
    delete safePost.upvoter_keys
    return safePost
  })
}

// مسار احتياطي قابل للكتابة دائماً (على Vercel نظام الملفات للقراءة فقط عدا /tmp)
const TMP_COMMUNITY_DIR = path.join(os.tmpdir(), 'sanad_data')
const TMP_COMMUNITY_FILE = path.join(TMP_COMMUNITY_DIR, 'sanad_community_posts.json')

function ensureCommunityFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(COMMUNITY_FILE)) {
      fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(INITIAL_POSTS, null, 2), 'utf8')
    }
  } catch {
    // نظام ملفات للقراءة فقط (Vercel) — سيتم استخدام المسار الاحتياطي /tmp
  }
}

function readPostsFile(filePath: string): CommunityPost[] | null {
  try {
    if (!fs.existsSync(filePath)) return null
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * كتابة آمنة: تحاول الكتابة في مجلد البيانات الأساسي وفي /tmp معاً،
 * وتنجح إذا نجحت أي منهما (يمنع ضياع المشاركات على الخادم الحي)
 */
function writeCommunityPosts(posts: CommunityPost[]): boolean {
  const payload = JSON.stringify(posts, null, 2)
  let ok = false
  try {
    fs.writeFileSync(COMMUNITY_FILE, payload, 'utf8')
    ok = true
  } catch {}
  try {
    if (!fs.existsSync(TMP_COMMUNITY_DIR)) fs.mkdirSync(TMP_COMMUNITY_DIR, { recursive: true })
    fs.writeFileSync(TMP_COMMUNITY_FILE, payload, 'utf8')
    ok = true
  } catch {}
  if (!ok) console.error('Error persisting community posts: no writable storage available')
  return ok
}

export function getRawLocalCommunityPosts(): CommunityPost[] {
  ensureCommunityFile()
  const primary = readPostsFile(COMMUNITY_FILE)
  const tmp = readPostsFile(TMP_COMMUNITY_FILE)
  if (!tmp) return primary || INITIAL_POSTS
  if (!primary) return tmp

  // دمج النسختين: نسخة /tmp هي الأحدث على الخادم الحي، ونحافظ على أي مشاركة موجودة في الأساسي فقط
  const map = new Map<string, CommunityPost>()
  for (const p of primary) map.set(p.id, p)
  for (const p of tmp) map.set(p.id, p)
  const deletedInTmp = new Set(
    primary.filter((p) => !tmp.some((t) => t.id === p.id)).map((p) => p.id)
  )
  // إذا كانت /tmp أحدث من الملف الأساسي فالمشاركات المحذوفة فيها تُعتبر محذوفة فعلاً
  try {
    const tmpTime = fs.statSync(TMP_COMMUNITY_FILE).mtimeMs
    const primaryTime = fs.statSync(COMMUNITY_FILE).mtimeMs
    if (tmpTime >= primaryTime) {
      for (const id of deletedInTmp) map.delete(id)
    }
  } catch {}
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getLocalCommunityPosts(): CommunityPost[] {
  const rawPosts = getRawLocalCommunityPosts()
  return enrichCommunityPostsForPublic(rawPosts)
}

export function saveLocalCommunityPost(post: CommunityPost): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const deduplicated = posts.filter((p) => p.id !== post.id)
  const updated = [post, ...deduplicated]
  writeCommunityPosts(updated)
  return enrichCommunityPostsForPublic(updated)
}

export function addLocalCommunityReply(postId: string, reply: CommunityReply): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const existingReplies = (p.replies || []).filter((r) => r.id !== reply.id)
      return {
        ...p,
        replies: [...existingReplies, reply],
      }
    }
    return p
  })
  writeCommunityPosts(updated)
  return enrichCommunityPostsForPublic(updated)
}

function hashVoter(email: string): string {
  return crypto.createHash('sha256').update(`sanad-vote:${email.toLowerCase().trim()}`).digest('hex').slice(0, 16)
}

/**
 * تسجيل إعجاب مرة واحدة فقط لكل طالب على كل مشاركة (منع التلاعب بعداد «نفع الله بك»)
 * يعيد counted=true إذا احتُسب الإعجاب لأول مرة
 */
export function upvoteLocalCommunityPost(
  postId: string,
  voterEmail?: string
): { counted: boolean; posts: CommunityPost[] } {
  const posts = getRawLocalCommunityPosts()
  const voterKey = voterEmail ? hashVoter(voterEmail) : null
  let counted = false
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const voters = Array.isArray(p.upvoter_keys) ? p.upvoter_keys : []
      if (voterKey && voters.includes(voterKey)) return p
      counted = true
      return {
        ...p,
        upvotes_count: (p.upvotes_count || 0) + 1,
        upvoter_keys: voterKey ? [...voters, voterKey] : voters,
      }
    }
    return p
  })
  if (counted) writeCommunityPosts(updated)
  return { counted, posts: enrichCommunityPostsForPublic(updated) }
}

// سجل المحذوفات (Tombstones) لمنع عودة مشاركة محذوفة من النسخة السحابية عند الدمج
const DELETED_FILE = path.join(DATA_DIR, 'sanad_community_deleted.json')
const TMP_DELETED_FILE = path.join(TMP_COMMUNITY_DIR, 'sanad_community_deleted.json')

export function getDeletedCommunityIds(): Set<string> {
  const ids = new Set<string>()
  for (const file of [DELETED_FILE, TMP_DELETED_FILE]) {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ file)) continue
      const parsed = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'))
      if (Array.isArray(parsed)) parsed.forEach((id) => typeof id === 'string' && ids.add(id))
    } catch {}
  }
  return ids
}

function recordDeletedCommunityId(id: string) {
  const ids = getDeletedCommunityIds()
  ids.add(id)
  const payload = JSON.stringify(Array.from(ids).slice(-5000))
  try {
    fs.writeFileSync(DELETED_FILE, payload, 'utf8')
  } catch {}
  try {
    if (!fs.existsSync(TMP_COMMUNITY_DIR)) fs.mkdirSync(TMP_COMMUNITY_DIR, { recursive: true })
    fs.writeFileSync(TMP_DELETED_FILE, payload, 'utf8')
  } catch {}
}

/**
 * إزالة المشاركات والردود المحذوفة إدارياً من أي قائمة (محلية أو سحابية)
 */
export function filterDeletedCommunityContent(posts: CommunityPost[]): CommunityPost[] {
  const deleted = getDeletedCommunityIds()
  return posts
    .filter((p) => !deleted.has(p.id) && !(p.author_email && isStudentDeleted(p.author_email)))
    .map((p) => ({
      ...p,
      replies: (p.replies || []).filter(
        (r) => !deleted.has(r.id) && !(r.author_email && isStudentDeleted(r.author_email))
      ),
    }))
}

export function deleteLocalCommunityPost(postId: string): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.filter((p) => p.id !== postId)
  writeCommunityPosts(updated)
  recordDeletedCommunityId(postId)
  return enrichCommunityPostsForPublic(updated)
}

export function deleteLocalCommunityReply(postId: string, replyId: string): CommunityPost[] {
  const posts = getRawLocalCommunityPosts()
  const updated = posts.map((p) => {
    if (p.id === postId) {
      return {
        ...p,
        replies: (p.replies || []).filter((r) => r.id !== replyId),
      }
    }
    return p
  })
  writeCommunityPosts(updated)
  recordDeletedCommunityId(replyId)
  return enrichCommunityPostsForPublic(updated)
}

/**
 * حذف جميع مشاركات وتعليقات عضو محذوف نهائياً من مجلس المذاكرة
 */
export function purgeStudentCommunityContent(email: string, studentName?: string, scholarlyId?: string): string[] {
  const cleanEmail = (email || '').toLowerCase().trim()
  if (!cleanEmail || cleanEmail === SUPER_ADMIN_EMAIL) return []

  const posts = getRawLocalCommunityPosts()
  const deletedPostIds: string[] = []

  const updated = posts
    .filter((p) => {
      const pEmail = (p.author_email || '').toLowerCase().trim()
      const matchesEmail = pEmail && pEmail === cleanEmail
      const matchesScholarlyId = scholarlyId && p.anonymous_alias?.includes(scholarlyId)
      if (matchesEmail || matchesScholarlyId) {
        deletedPostIds.push(p.id)
        recordDeletedCommunityId(p.id)
        return false
      }
      return true
    })
    .map((p) => ({
      ...p,
      replies: (p.replies || []).filter((r) => {
        const rEmail = (r.author_email || '').toLowerCase().trim()
        const matchesEmail = rEmail && rEmail === cleanEmail
        const matchesScholarlyId = scholarlyId && r.anonymous_alias?.includes(scholarlyId)
        if (matchesEmail || matchesScholarlyId) {
          recordDeletedCommunityId(r.id)
          return false
        }
        return true
      }),
    }))

  writeCommunityPosts(updated)
  return deletedPostIds
}


