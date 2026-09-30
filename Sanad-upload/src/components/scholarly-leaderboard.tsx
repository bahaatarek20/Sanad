'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Flame,
  Clock,
  BookOpen,
  Bookmark,
  Sparkles,
  Heart,
  Medal,
  Award,
  TrendingUp,
  Users,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Compass,
} from 'lucide-react'
import { LeaderboardStudentEntry, ScholarlyLeaderboardData } from '@/lib/student-tracking'

interface ScholarlyLeaderboardProps {
  data: ScholarlyLeaderboardData
  compact?: boolean
  showCouncilBanner?: boolean
}

type SortCategory = 'all' | 'hours' | 'streak' | 'courses' | 'notes'

export default function ScholarlyLeaderboard({
  data,
  compact = false,
  showCouncilBanner = false,
}: ScholarlyLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<SortCategory>('all')
  const [blessedStudents, setBlessedStudents] = useState<Record<string, number>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // وظيفة إرسال الدعاء بظهر الغيب لرفيق المدارسة
  const handleBlessStudent = (studentId: string, studentName: string) => {
    setBlessedStudents((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || 0) + 1,
    }))

    setToastMessage(`دَعَوْتَ لأخيك «${studentName}» بظهر الغيب، وقال الملك: «ولك بمثل» 🤲`)
    setTimeout(() => {
      setToastMessage((cur) => (cur?.includes(studentName) ? null : cur))
    }, 4500)
  }

  // ترتيب اللائحة بناءً على التبويب المختار لحظياً
  const sortedStudents = useMemo(() => {
    const list = [...data.allRankedStudents]
    if (activeTab === 'hours') {
      list.sort((a, b) => b.totalStudyMinutes - a.totalStudyMinutes)
    } else if (activeTab === 'streak') {
      list.sort((a, b) => b.streak - a.streak || b.totalStudyMinutes - a.totalStudyMinutes)
    } else if (activeTab === 'courses') {
      list.sort((a, b) => b.completedCoursesCount - a.completedCoursesCount || b.totalStudyMinutes - a.totalStudyMinutes)
    } else if (activeTab === 'notes') {
      list.sort((a, b) => b.notesCount - a.notesCount || b.totalStudyMinutes - a.totalStudyMinutes)
    }
    return list
  }, [data.allRankedStudents, activeTab])

  const formatHoursAndMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hrs === 0) return `${mins} دقيقة`
    if (mins === 0) return `${hrs} س`
    return `${hrs} س و ${mins} د`
  }

  const currentStudent = data.currentStudent

  return (
    <section className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 space-y-8">
      {/* الخط العلوي الذهبي الزمردي */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-amber-500 via-emerald-600 to-amber-600" />

      {/* تنبيه الدعاء اللحظي الطافي */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-950 px-5 py-3 text-xs sm:text-sm font-bold text-emerald-100 shadow-xl border border-emerald-700/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Heart className="h-5 w-5 text-rose-400 fill-rose-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. الترويسة الشاملة والآية الكريمة */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-6 dark:border-stone-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/90 px-3.5 py-1 text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2.5">
            <span>ميدان التنافس وسباق أهل الهمم</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              حيّ ومباشر
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
            مساحة تجمع طلاب العلم في سَنَد للمدارسة التشاركية، استباق الخيرات، ومعرفة منازل الهمة دون رياء أو حسد، 
            استناناً بحديث: «المؤمن مرآة أخيه».
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-emerald-800 transition dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Users className="h-4 w-4" />
            <span>مجلس المذاكرة العام</span>
          </Link>
        </div>
      </div>

      {/* 2. بطاقة الحالة الشخصية وموقعك بين الركب (Personal Stand & Gap Analysis) */}
      {currentStudent && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-linear-to-r from-amber-50/80 via-white to-emerald-50/60 p-5 dark:border-amber-900/50 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md font-black text-xl ring-4 ring-amber-100 dark:ring-amber-950">
                #{currentStudent.rank}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                    موقعك الحالي في ركاب سَنَد:
                  </span>
                  <span className="text-xs font-black text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md dark:bg-amber-950 dark:text-amber-300">
                    المركز {currentStudent.rank} من بين {currentStudent.totalStudents} طالباً
                  </span>
                  {currentStudent.isTopThree && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md dark:bg-emerald-950 dark:text-emerald-300">
                      🌟 من الثلاثة المتصدرين!
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                  {currentStudent.motivationalTip}
                </p>

                {currentStudent.aheadOfYouStudent && (
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                    <span>الزميل الذي يسبقك مباشرة:</span>
                    <strong className="text-emerald-900 dark:text-emerald-300">
                      «{currentStudent.aheadOfYouStudent.name}»
                    </strong>
                    <span className="text-stone-400">•</span>
                    <span>الفارق بينكما:</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-stone-800 px-2 py-0.5 rounded">
                      {formatHoursAndMinutes(currentStudent.aheadOfYouStudent.gapMinutes)}
                    </span>
                    {currentStudent.aheadOfYouStudent.gapStreak > 0 && (
                      <span className="font-mono font-bold text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-stone-800 px-2 py-0.5 rounded">
                        +{currentStudent.aheadOfYouStudent.gapStreak} أيام مواظبة
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/courses"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>شمر واستمع لمجلس الآن</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. فرسان الصدارة الأربعة (Four Pillars of Distinction Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* أ. فارس المواظبة (Streak) */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-linear-to-b from-rose-50/60 to-white p-5 shadow-xs dark:border-stone-800 dark:from-stone-900 dark:to-stone-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 dark:text-rose-400 flex items-center gap-1.5">
              <Flame className="h-4 w-4 fill-rose-500 text-rose-500" />
              <span>فارس المواظبة</span>
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full dark:bg-rose-950/80 dark:text-rose-300">
              أطول سلسلة
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-900 font-black text-lg dark:bg-rose-950 dark:text-rose-300">
              {data.topStreakLeader.streak}
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                {data.topStreakLeader.name}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold">
                {data.topStreakLeader.streak} يوماً بلا انقطاع 🔥
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-rose-100 pt-3 dark:border-stone-800">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {data.topStreakLeader.levelTitle}
            </span>
            <button
              onClick={() => handleBlessStudent(data.topStreakLeader.id, data.topStreakLeader.name)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:text-rose-950 dark:text-rose-400 transition"
              title="بارك الله في همتك"
            >
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              <span>دعاء ({blessedStudents[data.topStreakLeader.id] || 0})</span>
            </button>
          </div>
        </div>

        {/* ب. عميد ساعات المدارسة (Hours) */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-linear-to-b from-amber-50/60 to-white p-5 shadow-xs dark:border-stone-800 dark:from-stone-900 dark:to-stone-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>عميد ساعات المدارسة</span>
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full dark:bg-amber-950/80 dark:text-amber-300">
              أطول وقت
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-900 font-black text-sm dark:bg-amber-950 dark:text-amber-300">
              {Math.floor(data.topHoursLeader.totalStudyMinutes / 60)} س
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                {data.topHoursLeader.name}
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-400 font-bold">
                {formatHoursAndMinutes(data.topHoursLeader.totalStudyMinutes)} حضور
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-amber-100 pt-3 dark:border-stone-800">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {data.topHoursLeader.levelTitle}
            </span>
            <button
              onClick={() => handleBlessStudent(data.topHoursLeader.id, data.topHoursLeader.name)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 dark:text-amber-400 transition"
              title="بارك الله في همتك"
            >
              <Heart className="h-3.5 w-3.5 text-amber-600" />
              <span>دعاء ({blessedStudents[data.topHoursLeader.id] || 0})</span>
            </button>
          </div>
        </div>

        {/* ج. سابق المتون (Completed Courses) */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-linear-to-b from-emerald-50/60 to-white p-5 shadow-xs dark:border-stone-800 dark:from-stone-900 dark:to-stone-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>سابق المتون التأصيلية</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full dark:bg-emerald-950/80 dark:text-emerald-300">
              الأكثر إتماماً
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 font-black text-lg dark:bg-emerald-950 dark:text-emerald-300">
              {data.topCoursesLeader.completedCoursesCount}
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                {data.topCoursesLeader.name}
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold">
                {data.topCoursesLeader.completedCoursesCount} متون مضبوطة بالسند
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-3 dark:border-stone-800">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {data.topCoursesLeader.levelTitle}
            </span>
            <button
              onClick={() => handleBlessStudent(data.topCoursesLeader.id, data.topCoursesLeader.name)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 dark:text-emerald-400 transition"
              title="بارك الله في همتك"
            >
              <Heart className="h-3.5 w-3.5 text-emerald-600" />
              <span>دعاء ({blessedStudents[data.topCoursesLeader.id] || 0})</span>
            </button>
          </div>
        </div>

        {/* د. قيّد الأوابد (Notes and Highlights) */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-linear-to-b from-indigo-50/60 to-white p-5 shadow-xs dark:border-stone-800 dark:from-stone-900 dark:to-stone-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
              <Bookmark className="h-4 w-4 text-indigo-600" />
              <span>قيّد الأوابد والشوارد</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-full dark:bg-indigo-950/80 dark:text-indigo-300">
              أكثر الفوائد
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 font-black text-lg dark:bg-indigo-950 dark:text-indigo-300">
              {data.topNotesLeader.notesCount}
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                {data.topNotesLeader.name}
              </h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-400 font-bold">
                {data.topNotesLeader.notesCount} فائدة مقيدة بالكشكول
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-indigo-100 pt-3 dark:border-stone-800">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {data.topNotesLeader.levelTitle}
            </span>
            <button
              onClick={() => handleBlessStudent(data.topNotesLeader.id, data.topNotesLeader.name)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 hover:text-indigo-950 dark:text-indigo-400 transition"
              title="بارك الله في همتك"
            >
              <Heart className="h-3.5 w-3.5 text-indigo-600" />
              <span>دعاء ({blessedStudents[data.topNotesLeader.id] || 0})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. تبويبات التصفية وقائمة المتصدرين التفاعلية */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
            <h3 className="font-black text-base text-stone-900 dark:text-white">
              ترتيب طلاب العلم والمبادرين
            </h3>
          </div>

          {/* أزرار الفلترة السريعة */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-900 text-white dark:bg-emerald-800'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              الترتيب الشامل
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'hours'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              ساعات المدارسة
            </button>
            <button
              onClick={() => setActiveTab('streak')}
              className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'streak'
                  ? 'bg-rose-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              المواظبة (Streak)
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'courses'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              المتون المنجزة
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              الفوائد المقيدة
            </button>
          </div>
        </div>

        {/* جدول لائحة الشرف والمنافسة */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/60">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-400">
                <th className="py-3 px-4 w-14 text-center">الرتبة</th>
                <th className="py-3 px-4">طالب العلم</th>
                <th className="py-3 px-4 text-center">ساعات المدارسة</th>
                <th className="py-3 px-4 text-center">المواظبة</th>
                <th className="py-3 px-4 text-center">المتون</th>
                <th className="py-3 px-4 text-center">الفوائد</th>
                <th className="py-3 px-4 text-center w-28">دعاء بظهر الغيب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {sortedStudents.map((entry, idx) => {
                const displayRank = idx + 1
                const isCurrent = entry.isCurrentStudent

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors duration-150 ${
                      isCurrent
                        ? 'bg-amber-50/90 font-semibold ring-2 ring-amber-400/80 ring-inset dark:bg-amber-950/40 dark:ring-amber-700/80'
                        : 'hover:bg-white/80 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    {/* الرتبة مع الأوسمة */}
                    <td className="py-3 px-4 text-center font-black">
                      {displayRank === 1 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-stone-950 shadow-xs text-xs font-black">
                          🥇 1
                        </span>
                      ) : displayRank === 2 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-300 text-stone-900 shadow-xs text-xs font-black dark:bg-stone-600 dark:text-white">
                          🥈 2
                        </span>
                      ) : displayRank === 3 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-amber-100 shadow-xs text-xs font-black">
                          🥉 3
                        </span>
                      ) : (
                        <span className="font-mono text-stone-400 dark:text-stone-500 font-bold">
                          #{displayRank}
                        </span>
                      )}
                    </td>

                    {/* الاسم واللقب والوسام */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            isCurrent
                              ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                              : displayRank <= 3
                              ? 'bg-emerald-900 text-emerald-200'
                              : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {entry.name.slice(0, 2)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-900 dark:text-white">
                              {entry.name}
                            </span>
                            {isCurrent && (
                              <span className="rounded-md bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-black animate-pulse">
                                (أنت)
                              </span>
                            )}
                            {entry.specialHonor && (
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.2 rounded-md dark:bg-amber-950 dark:text-amber-300">
                                {entry.specialHonor}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400 block">
                            {entry.levelTitle}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ساعات المدارسة */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-800 dark:text-stone-200">
                      {formatHoursAndMinutes(entry.totalStudyMinutes)}
                    </td>

                    {/* المواظبة */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-950/60">
                        <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        <span>{entry.streak} يوم</span>
                      </span>
                    </td>

                    {/* المتون */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-900 dark:text-emerald-400">
                      {entry.completedCoursesCount} متون
                    </td>

                    {/* الفوائد */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-900 dark:text-indigo-400">
                      {entry.notesCount} فائدة
                    </td>

                    {/* زر الدعاء بظهر الغيب */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleBlessStudent(entry.id, entry.name)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                        title="بارك الله في همتك ودعاء بظهر الغيب"
                      >
                        <Heart className="h-3 w-3 text-rose-500" />
                        <span>بارك الله فيه</span>
                        {blessedStudents[entry.id] ? (
                          <span className="font-mono text-[10px] text-rose-600 font-black">
                            +{blessedStudents[entry.id]}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ميثاق التآخي والتنافس الصادق */}
      <div className="rounded-2xl border border-stone-200/90 bg-[#fbf9f4] p-5 text-center dark:border-stone-800 dark:bg-stone-800/40">
        <p className="text-xs sm:text-sm font-serif italic text-stone-700 dark:text-stone-300 leading-relaxed">
          «إذا رأيتَ أخاك يُنافسك في الخيرات فاشدد أزره، وادعُ له بظهر الغيب، وشمّر لتلحق بركبه؛ فما ساد من ساد إلا بدوام المدارسة وقيد الفوائد وحسن النية لله تعالى.»
        </p>
      </div>
    </section>
  )
}
