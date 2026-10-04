import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle, Flame, Bookmark, ArrowLeft, Sparkles, BookOpen, Layers, Mail, Phone, ShieldCheck, Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StudentNotesList, { DashboardNoteItem } from '@/components/student-notes-list'
import Dashboard3DStats from '@/components/dashboard-3d-stats'
import StudentAnalytics from '@/components/student-analytics'
import { getActiveCourses } from '@/lib/courses-store'
import { getStudentProfileData, getScholarlyLeaderboardData, getStudentLocalNotes } from '@/lib/student-tracking'
import { getUnreadCount } from '@/lib/messages-service'
import ScholarlyLeaderboard from '@/components/scholarly-leaderboard'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { getRecommendedCoursesForStudent } from '@/lib/curriculum-intelligence'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'كشكول الطالب',
  description: 'متابعة المتون المنجزة، وكشكول الفوائد والشوارد المقيدة أثناء المدارسة.',
  robots: { index: false, follow: false },
}


export default async function DashboardPage() {
  const user = await getCurrentStudentUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // 1. جلب بيانات الحساب وسجل المدارسة الحقيقي من الخادم (يبدأ من الصفر تماماً)
  let currentStreak = 0
  let totalStudyMinutes = 0
  let dailyStudyLog: Record<string, number> = {}
  let serverCompletedSlugs: string[] = []
  let scholarlyId: string | undefined = undefined

  if (user.email) {
    const studentProfile = getStudentProfileData(user.email)
    if (studentProfile) {
      scholarlyId = studentProfile.scholarlyId
      currentStreak = studentProfile.streak || 0
      totalStudyMinutes = studentProfile.totalStudyMinutes || 0
      dailyStudyLog = studentProfile.dailyStudyLog || {}
      serverCompletedSlugs = Array.isArray(studentProfile.completedCourses) ? studentProfile.completedCourses : []
    }
  }

  // 2. فحص Supabase فقط إذا كان المستخدم مسجلاً في سحابة Supabase
  let completedSlugs: string[] = [...serverCompletedSlugs]

  if (!user.id.startsWith('student-')) {
    try {
      const [profileRes, progressRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_streak, total_study_minutes')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('student_progress')
          .select('course_slug, is_completed, completed_at')
          .eq('user_id', user.id)
          .eq('is_completed', true),
      ])

      const profile = profileRes.data
      if (profile?.current_streak && profile.current_streak > currentStreak) {
        currentStreak = profile.current_streak
      }
      if (profile?.total_study_minutes && profile.total_study_minutes > totalStudyMinutes) {
        totalStudyMinutes = profile.total_study_minutes
      }

      if (progressRes.data) {
        const fromDb = progressRes.data.map((p) => p.course_slug).filter(Boolean)
        completedSlugs = Array.from(new Set([...completedSlugs, ...fromDb]))
      }
    } catch (err) {
      console.error('Error fetching progress from supabase:', err)
    }
  }

  const allCourses = getActiveCourses()
  const completedCourses = allCourses.filter((c) => completedSlugs.includes(c.slug))
  const recommendedStudies = getRecommendedCoursesForStudent(completedSlugs, allCourses)

  // 3. جلب كافة الفوائد المقيدة في كشكول الطالب (السجل المحلي الفوري + سحابة Supabase إن وُجدت)
  let formattedNotes: DashboardNoteItem[] = []

  // أ) الفوائد من السجل المحلي
  if (user.email) {
    const localNotes = getStudentLocalNotes(user.email)
    if (localNotes && localNotes.length > 0) {
      formattedNotes = localNotes.map((item) => {
        const course = allCourses.find((c) => c.slug === item.courseSlug)
        return {
          id: item.id,
          title: item.title || '',
          content: item.content,
          tag: item.tag || 'فائدة',
          created_at: item.created_at,
          courseSlug: item.courseSlug,
          courseTitle: course ? course.title : item.courseSlug || 'متن تأصيلي',
          courseCategory: course ? course.category : undefined,
        }
      })
    }
  }

  // ب) الفوائد من سحابة Supabase إن كان حساباً سحابياً
  if (!user.id.startsWith('student-')) {
    try {
      const { data: notesData } = await supabase
        .from('student_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (notesData) {
        const existingIds = new Set(formattedNotes.map((n) => n.id))
        const existingContents = new Set(formattedNotes.map((n) => n.content.trim()))

        for (const item of notesData as Record<string, unknown>[]) {
          const id = String(item.id)
          const content = String(item.content || item.note_text || '')
          if (!existingIds.has(id) && !existingContents.has(content.trim())) {
            const slug = String(item.course_slug || '')
            const course = allCourses.find((c) => c.slug === slug)
            const tag = String(
              item.tag || (Array.isArray(item.tags) && item.tags[0]) || 'فائدة'
            )
            formattedNotes.push({
              id,
              title: String(item.title || ''),
              content,
              tag,
              created_at: String(item.created_at || new Date().toISOString()),
              courseSlug: slug,
              courseTitle: course ? course.title : slug || 'متن تأصيلي',
              courseCategory: course ? course.category : undefined,
            })
            existingIds.add(id)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching notes from supabase:', err)
    }
  }

  // ترتيب الفوائد تنازلياً حسب تاريخ التدوين
  formattedNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  let leaderboardData
  try {
    leaderboardData = getScholarlyLeaderboardData(user.email || undefined)
  } catch (err) {
    console.error('Error getting leaderboard data:', err)
  }

  let unreadMessagesCount = 0
  try {
    unreadMessagesCount = user.email ? getUnreadCount(user.email) : 0
  } catch {}

  const isGoogleVerified = user.authProvider === 'google' || Boolean(user.email?.toLowerCase().endsWith('@gmail.com'))
  let verifiedPhone = user.phone
  try {
    if (!verifiedPhone && user.email) {
      verifiedPhone = getStudentProfileData(user.email)?.phone
    }
  } catch {}

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* 1. ترويسة الترحيب بالطالب وحصيلة المدارسة */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>زادُك في التعلّم والتأصيل المنهجي</span>
              </div>
              {scholarlyId && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 font-mono text-xs font-black text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] font-sans font-bold text-stone-500 dark:text-stone-400">معرّف الطالب:</span>
                  <span>#{scholarlyId}</span>
                </div>
              )}

              {/* شارة Google الموثقة */}
              {isGoogleVerified && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-950 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>حساب Google موثق</span>
                </div>
              )}

              {/* شارة توثيق الهاتف */}
              {verifiedPhone ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/80 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-950 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
                  <Phone className="h-3 w-3" />
                  <span className="font-mono dir-ltr">{verifiedPhone}</span>
                </div>
              ) : (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-600 hover:text-emerald-900 transition dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300"
                >
                  <Phone className="h-3 w-3 text-stone-400" />
                  <span>+ ربط الهاتف للتوثيق</span>
                </Link>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
              مرحباً بك، {user.user_metadata?.full_name || 'طالب العلم المبارك'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xl">
              هنا تجتمع حصيلة مذاكرتك؛ فوائدك المقيدة في الكشكول، والمتون التي ضبطتها، وخريطة تدرجك العلمي.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row shrink-0 items-center gap-2">
            {/* زر بريد سَنَد العلمي */}
            <Link
              href="/inbox"
              className="relative inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs sm:text-sm font-bold text-stone-700 hover:border-emerald-400 hover:text-emerald-900 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-emerald-400"
              title="صندوق بريد سَنَد"
            >
              <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>الرسائل الواردة</span>
              {unreadMessagesCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-stone-950">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>

            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs sm:text-sm font-bold text-stone-600 hover:border-emerald-400 hover:text-emerald-900 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-emerald-400"
              title="إعدادات الحساب"
            >
              <Layers className="h-4 w-4" />
              <span>إعدادات</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
            >
              <span>متابعة المدارسة</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. تحليلات ورسوم بيانية تفاعلية لحصيلة الطالب وحضوره الحي (بيانات حقيقية تبدأ من الصفر) */}
      <StudentAnalytics
        completedCourses={completedCourses}
        allCourses={allCourses}
        totalCoursesCount={allCourses.length}
        totalNotesCount={formattedNotes.length}
        initialStreak={currentStreak}
        dailyStudyLog={dailyStudyLog}
        initialTotalStudyMinutes={totalStudyMinutes}
      />

      {/* 3. لوحة المؤشرات ثلاثية الأبعاد (3D Interactive Cards) */}
      <Dashboard3DStats
        completedCourses={completedCourses}
        allCourses={allCourses}
        totalCoursesCount={allCourses.length}
        notes={formattedNotes}
        currentStreak={currentStreak}
      />

      {/* 4. ميدان التنافس وسباق أهل الهمم (وفي ذلك فليتنافس المتنافسون) */}
      {leaderboardData && <ScholarlyLeaderboard data={leaderboardData} />}

      {/* 3. المتون المنجزة مؤخراً */}
      {completedCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              <span>المتون التي أتممت ضبطها ({completedCourses.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-emerald-800 transition dark:border-stone-800 dark:bg-stone-900/95"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md dark:bg-amber-950 dark:text-amber-300">
                    {course.category}
                  </span>
                  <h4 className="mt-1 font-bold text-xs sm:text-sm text-stone-900 group-hover:text-emerald-900 truncate block dark:text-white dark:group-hover:text-emerald-400">
                    {course.title}
                  </h4>
                  {course.instructor && (
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      الشارح: {course.instructor}
                    </span>
                  )}
                </div>
                <ArrowLeft className="h-4 w-4 text-stone-300 group-hover:text-emerald-800 shrink-0 transition dark:group-hover:text-emerald-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* التوجيه المنهجي: المتون المقترحة كخطوة تالية بناءً على المتطلبات السابقة */}
      {recommendedStudies.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Compass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span>وجهتك التالية وفق السلم المنهجي</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                متون مقترحة لترتيب الأولويات وضمان دراسة كل متن بعد متطلبه السابق دون تشتت
              </p>
            </div>
            <Link
              href="/roadmap"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 dark:text-emerald-400 self-start sm:self-auto"
            >
              <span>استكشاف خرائط التأصيل الكاملة</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedStudies.map((rec) => (
              <Link
                key={rec.course.slug}
                href={`/courses/${rec.course.slug}`}
                className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:border-emerald-700/80 hover:shadow-md transition-all duration-300 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="rounded-lg bg-stone-100 px-2 py-0.5 font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {rec.course.category}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                      (rec.course.stage || 1) === 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {(rec.course.stage || 1) === 1 ? 'مرحلة 1: تأسيس' : 'مرحلة 2: بناء'}
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-stone-900 group-hover:text-emerald-800 transition dark:text-white dark:group-hover:text-emerald-400 leading-snug">
                    «{rec.course.title}»
                  </h4>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed font-medium">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:text-emerald-900 dark:text-emerald-400">
                  <span>الشروع في المدارسة</span>
                  <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. كشكول الطالب الشامل */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-amber-800 dark:text-amber-400" />
              <span>كشكول الفوائد والشوارد العلمية</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              جميع الفوائد والمسائل والقواعد التي قيدتها أثناء حضور المجالس مصنفة وجاهزة للمراجعة والطباعة.
            </p>
          </div>
        </div>

        <StudentNotesList initialNotes={formattedNotes} />
      </div>
    </div>
  )
}