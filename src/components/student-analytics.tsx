'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  TrendingUp,
  Clock,
  Calendar,
  Award,
  Zap,
  CheckCircle2,
  BookOpen,
  Compass,
  BarChart3,
  Layers,
  Sparkles,
  Info,
  Trophy,
  ChevronLeft,
  Lock,
} from 'lucide-react'
import { CATEGORIES_LIST, MatnCourse } from '@/lib/curriculum-data'
import ScholarlyStationsModal from '@/components/scholarly-stations-modal'
import { evaluateStudentBadges, SCHOLARLY_STATIONS } from '@/lib/scholarly-milestones'

interface StudentAnalyticsProps {
  completedCourses: MatnCourse[]
  allCourses?: MatnCourse[]
  totalCoursesCount: number
  totalNotesCount: number
  initialStreak?: number
  dailyStudyLog?: Record<string, number>
  initialTotalStudyMinutes?: number
}

export default function StudentAnalytics({
  completedCourses,
  allCourses,
  totalCoursesCount,
  totalNotesCount,
  initialStreak = 0,
  dailyStudyLog = {},
  initialTotalStudyMinutes = 0,
}: StudentAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isTabActive, setIsTabActive] = useState(true)
  const [isStationsModalOpen, setIsStationsModalOpen] = useState(false)
  const isTabActiveRef = useRef(true)
  const sessionSecondsRef = useRef(0)

  const badgesEvaluation = useMemo(() => {
    return evaluateStudentBadges({
      completedCourses,
      totalStudyMinutes: initialTotalStudyMinutes,
      streak: initialStreak,
      notesCount: totalNotesCount,
    })
  }, [completedCourses, initialTotalStudyMinutes, initialStreak, totalNotesCount])

  // 1. عداد الجلسة الحية المتصل بوجود الطالب الفعلي: يعد فقط أثناء تواجد الطالب وتفاعله داخل المنصة
  useEffect(() => {
    // استرجاع الثواني النشطة السابقة في هذه الجلسة إن وجدت
    let initialSec = 0
    try {
      const stored = sessionStorage.getItem('sanad_active_session_seconds')
      if (stored) {
        initialSec = Number(stored) || 0
      }
    } catch {}

    sessionSecondsRef.current = initialSec
    setSessionSeconds(initialSec)

    const checkTabActive = () => {
      if (typeof document === 'undefined') return true
      return !document.hidden && document.hasFocus()
    }

    const handleVisibilityChange = () => {
      const active = checkTabActive()
      isTabActiveRef.current = active
      setIsTabActive(active)
    }

    const handleFocus = () => {
      const active = typeof document !== 'undefined' && !document.hidden
      isTabActiveRef.current = active
      setIsTabActive(active)
    }

    const handleBlur = () => {
      isTabActiveRef.current = false
      setIsTabActive(false)
    }

    // فحص مبدئي للحالة
    const initiallyActive = checkTabActive()
    isTabActiveRef.current = initiallyActive
    setIsTabActive(initiallyActive)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // المؤقت يزيد ثانية واحدة فقط عند كل ثانية إذا كان الطالب نشطاً في المنصة
    const timer = setInterval(() => {
      if (isTabActiveRef.current) {
        sessionSecondsRef.current += 1
        const nextSec = sessionSecondsRef.current
        setSessionSeconds(nextSec)
        try {
          sessionStorage.setItem('sanad_active_session_seconds', String(nextSec))
        } catch {}
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // تنسيق وقت الجلسة الحية (أيام : ساعات : دقائق : ثواني)
  const sessionDays = Math.floor(sessionSeconds / 86400)
  const sessionHours = Math.floor((sessionSeconds % 86400) / 3600)
  const sessionMins = Math.floor((sessionSeconds % 3600) / 60)
  const sessionSecs = sessionSeconds % 60

  // 2. إحصائيات وهمة الطالب العلمية
  const completedCount = completedCourses.length
  const completionPercent = Math.round((completedCount / totalCoursesCount) * 100)

  // رتبة الطالب العلمية حسب عدد المتون
  const getRank = () => {
    if (completedCount >= 36) {
      return { title: 'راسخ في المتون والمناهج', level: 4, nextTarget: 78, badge: 'رتبة الإتقان والرسوخ' }
    }
    if (completedCount >= 16) {
      return { title: 'متفنن ضابط للأصول', level: 3, nextTarget: 36, badge: 'رتبة الضبط المنهجي' }
    }
    if (completedCount >= 6) {
      return { title: 'سائر في طريق التأصيل', level: 2, nextTarget: 16, badge: 'رتبة السير والتحصيل' }
    }
    return { title: 'طالب مبادر بهمة عالية', level: 1, nextTarget: 6, badge: 'رتبة البداية المباركة' }
  }

  const rank = getRank()

  // 3. بناء الرسوم البيانية التفاعلية الصافية من الصفر (تعتمد 100% على السجل الفعلي)
  // أ. البيانات اليومية: أيام الأسبوع الحالي (من السبت إلى الجمعة)
  const dailyData = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // السبت هو أول أيام الأسبوع الدراسي
    const daysSinceSaturday = (dayOfWeek + 1) % 7
    const saturday = new Date(now)
    saturday.setDate(now.getDate() - daysSinceSaturday)

    const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
    return dayNames.map((name, i) => {
      const d = new Date(saturday)
      d.setDate(saturday.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const realMinutes = dailyStudyLog[dateStr] || 0
      const isToday = dateStr === now.toISOString().split('T')[0]
      return {
        day: name,
        dateStr,
        minutes: realMinutes,
        isToday,
        sessions: realMinutes > 0 ? Math.max(1, Math.ceil(realMinutes / 20)) : 0,
      }
    })
  }, [dailyStudyLog])

  const totalWeekMinutes = dailyData.reduce((acc, d) => acc + d.minutes, 0)
  const maxRecordedDailyMinutes = Math.max(...dailyData.map((d) => d.minutes), 0)
  // مقياس الارتفاع: يبدأ من 60 دقيقة كمقياس قياسي
  const dailyScale = maxRecordedDailyMinutes > 60 ? maxRecordedDailyMinutes : 60

  // ب. البيانات الأسبوعية لأسابيع الشهر الحالي (محسوبة بدقة من السجل الفعلي)
  const weeklyData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    // تقسيم أيام الشهر الحالي إلى 4 أسابيع
    const weeks = [
      { week: 'الأسبوع 1', startDay: 1, endDay: 7, minutes: 0 },
      { week: 'الأسبوع 2', startDay: 8, endDay: 14, minutes: 0 },
      { week: 'الأسبوع 3', startDay: 15, endDay: 21, minutes: 0 },
      { week: 'الأسبوع 4', startDay: 22, endDay: 31, minutes: 0 },
    ]

    Object.entries(dailyStudyLog).forEach(([dateStr, mins]) => {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const d = parseInt(parts[2], 10)

        if (y === year && m === month) {
          for (const w of weeks) {
            if (d >= w.startDay && d <= w.endDay) {
              w.minutes += mins
              break
            }
          }
        }
      }
    })

    return weeks.map((w) => ({
      week: w.week,
      hours: Number((w.minutes / 60).toFixed(1)),
      sessions: w.minutes > 0 ? Math.max(1, Math.ceil(w.minutes / 25)) : 0,
    }))
  }, [dailyStudyLog])

  const maxWeeklyHours = Math.max(...weeklyData.map((w) => w.hours), 5)
  const totalWeeklyHours = weeklyData.reduce((acc, w) => acc + w.hours, 0)

  // ج. البيانات الشهرية (شهور السنة الهجرية / الميلادية محسوبة من السجل الفعلي)
  const monthlyData = useMemo(() => {
    const monthNames = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ]

    const now = new Date()
    const currentMonthIndex = now.getMonth() // 0 - 11

    return monthNames.map((name, idx) => {
      // حساب الساعات الفعلية للشهر إذا تطابق
      let monthMinutes = 0
      Object.entries(dailyStudyLog).forEach(([dateStr, mins]) => {
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10) - 1
          if (m === idx) {
            monthMinutes += mins
          }
        }
      })

      const hours = Number((monthMinutes / 60).toFixed(1))
      return {
        month: name,
        hours,
        isCurrent: idx === currentMonthIndex,
      }
    })
  }, [dailyStudyLog])

  const maxMonthlyHours = Math.max(...monthlyData.map((m) => m.hours), 10)
  const totalMonthlyHours = monthlyData.reduce((acc, m) => acc + m.hours, 0)

  // د. البيانات السنوية وتوزيع كافة الفنون الشرعية ديناميكياً
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, string>()
    if (allCourses && allCourses.length > 0) {
      allCourses.forEach((c) => {
        if (c.categorySlug && c.category) {
          map.set(c.categorySlug, c.category)
        }
      })
    } else {
      CATEGORIES_LIST.forEach((cat) => map.set(cat.slug, cat.title))
    }
    if (completedCourses.length > 0) {
      completedCourses.forEach((c) => {
        if (c.categorySlug && c.category && !map.has(c.categorySlug)) {
          map.set(c.categorySlug, c.category)
        }
      })
    }
    return Array.from(map.entries()).map(([slug, title]) => ({ slug, title }))
  }, [allCourses, completedCourses])

  const scienceCoverage = useMemo(() => {
    return dynamicCategories.map((cat) => {
      const doneInCat = completedCourses.filter((c) => c.categorySlug === cat.slug).length
      const totalInCat = allCourses ? allCourses.filter((c) => c.categorySlug === cat.slug).length : 8
      const maxCount = totalInCat > 0 ? totalInCat : 1
      return {
        title: cat.title,
        done: doneInCat,
        total: totalInCat,
        percent: Math.min(100, Math.round((doneInCat / maxCount) * 100)),
      }
    })
  }, [dynamicCategories, completedCourses, allCourses])

  return (
    <div className="space-y-8">
      {/* 1. لوحة الحضور الحي والتركيز الحالي (Live Session Monitor) */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-900/15 bg-linear-to-br from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white shadow-xl">
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute right-0 top-0 h-1 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-amber-300" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
                isTabActive
                  ? 'bg-emerald-800/80 text-amber-300 border-emerald-700/50'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
              }`}
            >
              {isTabActive ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>أنت متصل بالمنصة الآن • العداد نشط</span>
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                  <span>العداد متوقف مؤقتاً لحين عودتك للمنصة</span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              مدة بقائك في طلب العلم في جلستك الحالية
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl leading-relaxed">
              «الوقتُ هو رأس مال طالب العلم»؛ نرصد لك كل لحظة تقضيها في التحصيل لتشهد لك بالهمة والاستمرار.
            </p>
          </div>

          {/* عداد الوقت الحي بنمط رقمي تراثي رصين (أيام : ساعات : دقائق : ثواني) */}
          <div
            className={`flex items-center gap-2 sm:gap-2.5 bg-black/35 p-3 sm:p-4 rounded-2xl border transition-all shrink-0 ${
              isTabActive ? 'border-emerald-700/40 shadow-inner' : 'border-amber-500/50 opacity-80'
            }`}
          >
            <div className="text-center min-w-[2rem] sm:min-w-[2.4rem]">
              <span className="block font-mono text-xl sm:text-2xl lg:text-3xl font-black text-amber-300">
                {String(sessionDays).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-emerald-200">يوم</span>
            </div>
            <span className="font-mono text-lg sm:text-2xl font-bold text-emerald-400">:</span>
            <div className="text-center min-w-[2rem] sm:min-w-[2.4rem]">
              <span className="block font-mono text-xl sm:text-2xl lg:text-3xl font-black text-amber-200">
                {String(sessionHours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-emerald-200">ساعة</span>
            </div>
            <span className="font-mono text-lg sm:text-2xl font-bold text-emerald-400">:</span>
            <div className="text-center min-w-[2rem] sm:min-w-[2.4rem]">
              <span className="block font-mono text-xl sm:text-2xl lg:text-3xl font-black text-white">
                {String(sessionMins).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-emerald-200">دقيقة</span>
            </div>
            <span className="font-mono text-lg sm:text-2xl font-bold text-emerald-400">:</span>
            <div className="text-center min-w-[2rem] sm:min-w-[2.4rem]">
              <span className="block font-mono text-xl sm:text-2xl lg:text-3xl font-black text-emerald-300">
                {String(sessionSecs).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-emerald-200">ثانية</span>
            </div>
          </div>
        </div>

        {/* شريط الإنجاز السريع */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-emerald-800/50 text-center">
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-lg font-black text-amber-300">{completedCount} / {totalCoursesCount}</span>
            <span className="text-[11px] text-emerald-200 font-medium">متناً تم ضبطه</span>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-lg font-black text-white">{totalNotesCount}</span>
            <span className="text-[11px] text-emerald-200 font-medium">فائدة وشاردة مقيدة</span>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-lg font-black text-emerald-300">{initialStreak} أيام</span>
            <span className="text-[11px] text-emerald-200 font-medium">مواظبة متواصلة</span>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-lg font-black text-amber-200">{rank.badge}</span>
            <span className="text-[11px] text-emerald-200 font-medium">مرتبتك في التأصيل</span>
          </div>
        </div>
      </div>

      {/* 2. شريط التبويب الزمني التفاعلي للرسوم البيانية */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-100 dark:border-stone-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                منحنى الهمة والتحصيل العلمي
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              قياس دقيق لتدرجك وتطور حصيلتك اليومية والأسبوعية والشهرية والسنوية (بيانات حقيقية تتراكم مع حضورك)
            </p>
          </div>

          {/* أزرار اختيار النطاق الزمني */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100/70 p-1 dark:border-stone-700 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => setTimeframe('daily')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                timeframe === 'daily'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              يومي
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('weekly')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                timeframe === 'weekly'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              أسبوعي
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                timeframe === 'monthly'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('yearly')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                timeframe === 'yearly'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              سنوي
            </button>
          </div>
        </div>

        {/* عرض الرسم البياني اليومي */}
        {timeframe === 'daily' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
              <span>نشاط المدارسة الفعلي خلال أيام الأسبوع (بالدقائق):</span>
              <span className="text-emerald-800 dark:text-emerald-400 font-bold">
                {totalWeekMinutes > 0
                  ? `إجمالي مدارسة الأسبوع: ${totalWeekMinutes} دقيقة`
                  : 'يبدأ من الصفر (0 دقيقة) حتى تشرع في المدارسة'}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-56 pt-6 pb-2 px-2 border-b border-stone-100 dark:border-stone-800">
              {dailyData.map((d, i) => {
                // إذا كانت الدقائق صفر، يكون الارتفاع 0% تماماً
                const heightPercent = d.minutes > 0 ? Math.max(10, Math.round((d.minutes / dailyScale) * 100)) : 0
                return (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-bold text-stone-500 transition">
                      {d.minutes > 0 ? `${d.minutes} د` : '0 د'}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-10 rounded-t-xl transition-all duration-300 ${
                        heightPercent === 0
                          ? 'h-1 bg-stone-200 dark:bg-stone-800 border-b-2 border-stone-300 dark:border-stone-700'
                          : d.isToday
                          ? 'bg-linear-to-t from-amber-600 to-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-linear-to-t from-emerald-800 to-emerald-600'
                      }`}
                    />
                    <div className="text-center">
                      <span className={`block text-[11px] font-bold ${d.isToday ? 'text-amber-800 dark:text-amber-300' : 'text-stone-600 dark:text-stone-300'}`}>
                        {d.day}
                      </span>
                      {d.isToday && (
                        <span className="inline-block text-[9px] text-amber-700 font-extrabold bg-amber-100 dark:bg-amber-950 px-1 rounded-sm mt-0.5">
                          اليوم
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {totalWeekMinutes === 0 ? (
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300">
                <Info className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>المنحنى متصفر حالياً؛ فور حضورك لأي مجلس دراسي، سيتم تسجيل وتصعيد دقائق تحصيلك اليومية تلقائياً.</span>
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 text-center">
                «أحب الأعمال إلى الله أدومها وإن قل» • رائع! كل دقيقة مسجلة هنا تثبت في رصيد حسابك وسجلك العلمي.
              </p>
            )}
          </div>
        )}

        {/* عرض الرسم البياني الأسبوعي */}
        {timeframe === 'weekly' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
              <span>تطور التحصيل الفعلي عبر أسابيع الشهر الحالي (بالساعات):</span>
              <span className="text-emerald-800 dark:text-emerald-400 font-bold">
                {totalWeeklyHours > 0 ? `المجموع: ${totalWeeklyHours} ساعة` : 'الساعات صفر حتى تبدأ جلسات الشهر'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 items-end h-56 pt-6 pb-2 px-4 border-b border-stone-100 dark:border-stone-800">
              {weeklyData.map((w, i) => {
                const heightPercent = w.hours > 0 ? Math.max(12, Math.round((w.hours / maxWeeklyHours) * 100)) : 0
                return (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-400">
                      {w.hours} س
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-16 rounded-t-2xl transition-all duration-300 ${
                        heightPercent === 0
                          ? 'h-1 bg-stone-200 dark:bg-stone-800'
                          : 'bg-linear-to-t from-emerald-900 via-emerald-700 to-teal-500 shadow-md'
                      }`}
                    />
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                      {w.week}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {w.sessions > 0 ? `${w.sessions} جلسات مدارسة` : 'لا توجد جلسات'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* عرض الرسم البياني الشهري */}
        {timeframe === 'monthly' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
              <span>حصيلة الساعات المنجزة على مدار شهور السنة:</span>
              <span className="text-amber-800 dark:text-amber-400">
                {totalMonthlyHours > 0 ? `إجمالي العام: ${totalMonthlyHours} ساعة` : 'السجل السنوي يبدأ من الصفر ويتراكم'}
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2 items-end h-56 pt-6 pb-2 px-1 border-b border-stone-100 dark:border-stone-800">
              {monthlyData.map((m, i) => {
                const heightPercent = m.hours > 0 ? Math.max(10, Math.round((m.hours / maxMonthlyHours) * 100)) : 0
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[9px] font-bold text-stone-500">
                      {m.hours}س
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        heightPercent === 0
                          ? 'h-1 bg-stone-200 dark:bg-stone-800'
                          : m.isCurrent
                          ? 'bg-linear-to-t from-amber-600 to-amber-300 shadow-xs'
                          : 'bg-linear-to-t from-emerald-800 to-emerald-600'
                      }`}
                    />
                    <span className={`text-[9px] sm:text-[10px] font-bold truncate max-w-full ${m.isCurrent ? 'text-amber-800 dark:text-amber-300 font-black' : 'text-stone-600 dark:text-stone-300'}`}>
                      {m.month}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* عرض التغطية السنوية لكافة الفنون الشرعية ديناميكياً */}
        {timeframe === 'yearly' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
              <span>خريطة التغطية الشاملة لكافة الفنون الشرعية ({scienceCoverage.length} فنون):</span>
              <span className="text-emerald-800 dark:text-emerald-400">نسبة التغطية الكلية: {completionPercent}%</span>
            </div>

            {/* أشرطة التقدم لكافة الفنون */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scienceCoverage.map((sc, i) => (
                <div key={i} className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-800 dark:text-stone-200 truncate">{sc.title}</span>
                    <span className="text-emerald-800 dark:text-emerald-400 font-mono">
                      {sc.done} {sc.total !== undefined ? `/ ${sc.total}` : 'متون'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden dark:bg-stone-700">
                    <div
                      style={{ width: `${sc.percent}%` }}
                      className={`h-full rounded-full ${sc.percent > 0 ? 'bg-linear-to-r from-emerald-800 to-teal-500' : 'bg-transparent'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. سُلَّم المحطات التأصيلية، الشارات ومكافآت الإنجاز */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-linear-to-r from-amber-50/90 via-white to-emerald-50/50 p-6 sm:p-7 shadow-xs dark:border-amber-900/60 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 ring-4 ring-amber-100 dark:ring-amber-950">
              <Award className="h-7 w-7 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                  مرتبتك الحالية: {badgesEvaluation.currentStation.title}
                </h4>
                <span className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black shadow-2xs">
                  المستوى {badgesEvaluation.currentStation.level} من 4
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-300">
                  {badgesEvaluation.currentStation.subtitle}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl">
                أنجزت {completedCount} متناً •{' '}
                {badgesEvaluation.nextStation ? (
                  <>
                    تحتاج إلى ضبط <strong className="text-amber-800 dark:text-amber-400 font-bold">{badgesEvaluation.coursesUntilNextStation} متون إضافية</strong> للارتقاء إلى المحطة التالية ({badgesEvaluation.nextStation.title}).
                  </>
                ) : (
                  <span className="text-emerald-800 dark:text-emerald-400 font-bold">
                    ما شاء الله! بلغت قمة محطات التأصيل المنهجي.
                  </span>
                )}
              </p>

              {/* مسار المحطات الأربع المصغر البصري */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {SCHOLARLY_STATIONS.map((st) => {
                  const isCurrent = st.level === badgesEvaluation.currentStation.level
                  const isPassed = st.level < badgesEvaluation.currentStation.level
                  return (
                    <div
                      key={st.id}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700'
                          : isPassed
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-800 dark:bg-stone-800/40'
                      }`}
                    >
                      <span>{st.unlockedBadge.icon}</span>
                      <span>م {st.level}: {st.title.split(' ')[0]}</span>
                      {isPassed && <span className="text-emerald-700 text-[9px]">✓</span>}
                      {isCurrent && <span className="text-amber-700 text-[9px] animate-pulse">📍</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsStationsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Trophy className="h-4 w-4" />
              <span>استعراض المحطات والشارات والشهادات</span>
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="rounded-2xl border border-stone-200 bg-white/80 p-3 text-center min-w-28 dark:border-stone-800 dark:bg-stone-800/80">
              <span className="block text-xl font-black text-amber-700 dark:text-amber-400">
                {completionPercent}%
              </span>
              <span className="text-[10px] font-bold text-stone-400">إجمالي الخريطة</span>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة المحطات والشارات والشهادات التفاعلية */}
      <ScholarlyStationsModal
        isOpen={isStationsModalOpen}
        onClose={() => setIsStationsModalOpen(false)}
        completedCourses={completedCourses}
        totalCoursesCount={totalCoursesCount}
        streak={initialStreak}
        totalStudyMinutes={initialTotalStudyMinutes}
        notesCount={totalNotesCount}
      />
    </div>
  )
}
