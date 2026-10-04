/**
 * محرك تعاهد المتون والمراجعة المتباعدة (Spaced Repetition Engine)
 * مبني على قواعد حفظ المتون الشرعية ("تعاهدوا هذا القرآن") وخوارزمية التكرار المتباعد (Spaced Repetition).
 * يُعنى بتذكير طالب العلم بمراجعة محفوظه ومقروئه على فترات علمية منتظمة لضمان الرسوخ وعدم النسيان.
 */

export interface ReviewLogEntry {
  date: string // ISO date
  quality: 'easy' | 'good' | 'hard' | 'again' // مستوى استحضار الطالب للمتن
  intervalDays: number
}

export interface MatnReviewRecord {
  courseSlug: string
  courseTitle: string
  episodeIndex?: number // رقم المجلس إن كانت المراجعة لمجلس مخصص
  level: number // من 1 إلى 6 (سلم الرسوخ)
  repetitionsCount: number
  lastReviewedAt: string // ISO date
  nextReviewAt: string // ISO date
  retentionScore: number // نسبة مئوية لرسوخ المتن (0 - 100%)
  logs: ReviewLogEntry[]
}

// فترات المراجعة المتباعدة الموصى بها في منهجية طلب العلم (بالأيام)
// 1 يوم -> 3 أيام -> 7 أيام -> 14 يوماً -> 30 يوماً -> 60 يوماً
export const SPACED_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60]

const STORAGE_KEY = 'sanad_spaced_repetition_v1'

/**
 * جلب جميع سجلات المراجعة من التخزين المحلي
 */
export function getAllReviewRecords(): Record<string, MatnReviewRecord> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to parse spaced repetition data:', err)
    return {}
  }
}

/**
 * حفظ سجلات المراجعة
 */
export function saveAllReviewRecords(records: Record<string, MatnReviewRecord>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('Failed to save spaced repetition data:', err)
  }
}

/**
 * جلب حالة مراجعة متن معين
 */
export function getCourseReviewRecord(courseSlug: string): MatnReviewRecord | null {
  const all = getAllReviewRecords()
  return all[courseSlug] || null
}

/**
 * تسجيل مراجعة متن وتحديث موعد التعاهد التالي
 */
export function recordCourseReview(
  courseSlug: string,
  courseTitle: string,
  quality: 'easy' | 'good' | 'hard' | 'again' = 'good'
): MatnReviewRecord {
  const all = getAllReviewRecords()
  const existing = all[courseSlug]

  const now = new Date()
  let currentLevel = existing ? existing.level : 0
  let repetitionsCount = existing ? existing.repetitionsCount + 1 : 1

  // تعديل المستوى وفق مستوى الاستحضار
  if (quality === 'again') {
    // نسيان أو استشكال: العودة للمستوى الأول لإعادة الضبط
    currentLevel = 1
  } else if (quality === 'hard') {
    // استحضار بصعوبة: البقاء في نفس المستوى أو زيادة طفيفة
    currentLevel = Math.max(1, currentLevel)
  } else if (quality === 'good') {
    currentLevel = Math.min(SPACED_INTERVALS_DAYS.length, currentLevel + 1)
  } else if (quality === 'easy') {
    // استحضار متقن: تقدم سريع
    currentLevel = Math.min(SPACED_INTERVALS_DAYS.length, currentLevel + 2)
  }

  const intervalDays = SPACED_INTERVALS_DAYS[currentLevel - 1] || 1
  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  // حساب نسبة الرسوخ التراكمية
  const retentionScore = Math.min(100, Math.round((currentLevel / SPACED_INTERVALS_DAYS.length) * 100))

  const logEntry: ReviewLogEntry = {
    date: now.toISOString(),
    quality,
    intervalDays,
  }

  const updatedRecord: MatnReviewRecord = {
    courseSlug,
    courseTitle,
    level: currentLevel,
    repetitionsCount,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextDate.toISOString(),
    retentionScore,
    logs: existing ? [...existing.logs, logEntry] : [logEntry],
  }

  all[courseSlug] = updatedRecord
  saveAllReviewRecords(all)
  return updatedRecord
}

/**
 * فحص المتون المستحقة للتعاهد اليوم
 */
export function getDueReviews(): {
  dueToday: MatnReviewRecord[]
  upcoming: MatnReviewRecord[]
  mastered: MatnReviewRecord[]
} {
  const all = getAllReviewRecords()
  const list = Object.values(all)
  const now = new Date()

  const dueToday: MatnReviewRecord[] = []
  const upcoming: MatnReviewRecord[] = []
  const mastered: MatnReviewRecord[] = []

  for (const record of list) {
    const nextDate = new Date(record.nextReviewAt)
    if (record.retentionScore >= 100) {
      mastered.push(record)
    } else if (nextDate <= now) {
      dueToday.push(record)
    } else {
      upcoming.push(record)
    }
  }

  return { dueToday, upcoming, mastered }
}

/**
 * الحصول على وصف عربي لمستوى الرسوخ
 */
export function getRetentionLevelTitle(level: number): {
  title: string
  colorClass: string
  description: string
} {
  switch (level) {
    case 1:
      return {
        title: 'مرحلة تثبيت السماع',
        colorClass: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
        description: 'مراجعة أولية بعد الفراغ من الدرس لتقييد الألفاظ في الذاكرة القريبة.',
      }
    case 2:
      return {
        title: 'مرحلة تعاهد الثلاثة',
        colorClass: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300',
        description: 'مراجعة بعد 3 أيام لاختبار استحضار المسائل والقواعد الكلية.',
      }
    case 3:
      return {
        title: 'مرحلة المذاكرة الأسبوعية',
        colorClass: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
        description: 'تعاهد أسبوعي يربط بين فصول الباب الواحد.',
      }
    case 4:
      return {
        title: 'مرحلة الترسيخ النصفي',
        colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
        description: 'مراجعة بعد أسبوعين لنقل المتن إلى الذاكرة الدائمة.',
      }
    case 5:
      return {
        title: 'مرحلة رسوخ الشهر',
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
        description: 'مراجعة شهرية تصقل المسائل وتمنع تسرب الفوائد.',
      }
    case 6:
      return {
        title: 'رتبة الإتقان والضبط التام',
        colorClass: 'text-emerald-900 bg-amber-100/80 border-amber-300 dark:bg-emerald-900 dark:text-amber-200',
        description: 'استحضار راسخ كحفظ الفاتحة بإذن الله.',
      }
    default:
      return {
        title: 'لم تبدأ جلسات التعاهد بعد',
        colorClass: 'text-stone-600 bg-stone-100 border-stone-200 dark:bg-stone-800 dark:text-stone-300',
        description: 'ابدأ أول جلسة مراجعة بعد سماع الدرس لتسجيل المتن في جدول التعاهد.',
      }
  }
}
