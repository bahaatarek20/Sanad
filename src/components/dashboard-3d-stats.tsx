'use client'

import { useState, useRef } from 'react'
import { Flame, Bookmark, BookOpen, Printer, Sparkles, Trophy, Download } from 'lucide-react'
import { CATEGORIES_LIST, MatnCourse } from '@/lib/curriculum-data'
import { DashboardNoteItem } from './student-notes-list'

interface Dashboard3DStatsProps {
  completedCourses: MatnCourse[]
  allCourses?: MatnCourse[]
  totalCoursesCount: number
  notes: DashboardNoteItem[]
  currentStreak?: number
}

export default function Dashboard3DStats({
  completedCourses,
  allCourses,
  totalCoursesCount,
  notes,
  currentStreak = 0,
}: Dashboard3DStatsProps) {
  const [flameTilt, setFlameTilt] = useState({ x: 0, y: 0 })
  const [mihrabTilt, setMihrabTilt] = useState({ x: 0, y: 0 })
  const [notesTilt, setNotesTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    setter: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setter({
      x: -(y / rect.height) * 14,
      y: (x / rect.width) * 14,
    })
  }

  const handleMouseLeave = (
    setter: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  ) => {
    setter({ x: 0, y: 0 })
  }

  // استخراج كافة الفنون الشرعية ديناميكياً
  const categoryMap = new Map<string, string>()
  if (allCourses && allCourses.length > 0) {
    allCourses.forEach((c) => {
      if (c.categorySlug && c.category) {
        categoryMap.set(c.categorySlug, c.category)
      }
    })
  } else {
    CATEGORIES_LIST.forEach((cat) => categoryMap.set(cat.slug, cat.title))
  }
  if (completedCourses.length > 0) {
    completedCourses.forEach((c) => {
      if (c.categorySlug && c.category && !categoryMap.has(c.categorySlug)) {
        categoryMap.set(c.categorySlug, c.category)
      }
    })
  }

  const categoryStats = Array.from(categoryMap.entries()).map(([slug, title]) => {
    const done = completedCourses.filter((c) => c.categorySlug === slug).length
    const totalInCat = allCourses ? allCourses.filter((c) => c.categorySlug === slug).length : undefined
    return {
      title,
      slug,
      done,
      total: totalInCat,
    }
  })

  // تحديد توهج ولون الشعلة حسب الـ Streak
  const getFlameStyles = () => {
    if (currentStreak >= 7) {
      return {
        glow: 'from-emerald-600 via-amber-400 to-emerald-300',
        textColor: 'text-emerald-900 dark:text-emerald-400',
        badge: 'همة زمردية متقدة',
        isActive: true,
      }
    }
    if (currentStreak >= 3) {
      return {
        glow: 'from-amber-600 via-yellow-400 to-amber-200',
        textColor: 'text-amber-900 dark:text-amber-400',
        badge: 'شعلة ذهبية متواصلة',
        isActive: true,
      }
    }
    if (currentStreak >= 1) {
      return {
        glow: 'from-orange-600 via-amber-400 to-stone-300',
        textColor: 'text-amber-800 dark:text-amber-300',
        badge: 'بداية الهمة والتأصيل',
        isActive: true,
      }
    }
    return {
      glow: 'from-stone-300 via-stone-200 to-stone-100 dark:from-stone-800 dark:to-stone-900',
      textColor: 'text-stone-500 dark:text-stone-400',
      badge: 'في انتظار شعلة البداية',
      isActive: false,
    }
  }

  const flameInfo = getFlameStyles()

  // تصدير حاشية الطالب بصيغة كتاب إلكتروني جاهز للطباعة
  const handlePrintClassicalBook = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* شبكة البطاقات ثلاثية الأبعاد */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. شعلة الحماسة ثلاثية الأبعاد (3D Streak Flame Card) */}
        <div
          onMouseMove={(e) => handleMouseMove(e, setFlameTilt)}
          onMouseLeave={() => handleMouseLeave(setFlameTilt)}
          style={{
            transform: `perspective(1000px) rotateX(${flameTilt.x}deg) rotateY(${flameTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative overflow-hidden rounded-3xl border border-amber-900/15 bg-white/95 p-6 shadow-md cursor-pointer select-none dark:border-stone-800 dark:bg-stone-900/95"
        >
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-amber-600 via-amber-400 to-emerald-600" />
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
              شريان الاستمرار اليومي
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-700 border border-stone-200/80 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">
              {flameInfo.badge}
            </span>
          </div>

          {/* تجسيم الشعلة التفاعلية */}
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full bg-linear-to-tr ${flameInfo.glow} opacity-30 blur-xl ${
                  flameInfo.isActive ? 'animate-pulse' : ''
                }`}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-amber-100/70 to-stone-50 shadow-inner ring-1 ring-amber-300/40 dark:from-stone-800 dark:to-stone-900 dark:ring-stone-700">
                <Flame
                  className={`h-11 w-11 ${
                    flameInfo.isActive
                      ? 'fill-amber-500 text-amber-600 animate-bounce duration-1000'
                      : 'text-stone-400 dark:text-stone-500 opacity-60'
                  }`}
                />
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="font-mono text-4xl font-black text-stone-900 dark:text-white">
                {currentStreak}
              </span>
              <span className="mr-1.5 text-xs font-bold text-stone-500 dark:text-stone-400">
                أيام متتالية
              </span>
            </div>
          </div>

          <p className="text-center text-[11px] text-stone-500 dark:text-stone-400">
            {currentStreak > 0
              ? '«أحب الأعمال إلى الله أدومها وإن قل» • استمر في المدارسة لحفظ شعلتك.'
              : '«من سلك طريقاً يلتمس فيه علماً» • ابدأ أول مجلس اليوم لتشعل شعلة الهمة!'}
          </p>
        </div>

        {/* 2. محراب الإنجاز الموزون (3D 9-Sciences Mihrab) */}
        <div
          onMouseMove={(e) => handleMouseMove(e, setMihrabTilt)}
          onMouseLeave={() => handleMouseLeave(setMihrabTilt)}
          style={{
            transform: `perspective(1000px) rotateX(${mihrabTilt.x}deg) rotateY(${mihrabTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-md cursor-pointer select-none dark:border-stone-800 dark:bg-stone-900/95"
        >
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 to-emerald-600" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
              محراب الإنجاز الموزون
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200/80 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
              {categoryStats.length > 9 ? `كافة الفنون (${categoryStats.length}) بالتوازي` : `العلوم الـ ${categoryStats.length} بالتوازي`}
            </span>
          </div>

          {/* أعمدة كافة العلوم بالتوازي */}
          <div className="my-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700 dark:text-stone-300">إجمالي المتون المنجزة:</span>
              <span className="font-black text-emerald-950 dark:text-emerald-400 font-mono">
                {completedCourses.length} / {totalCoursesCount}
              </span>
            </div>

            {/* تمثيل ثلاثي الأبعاد بالأعمدة الصغيرة لجميع الفنون ديناميكياً */}
            <div className="grid grid-cols-3 gap-2 pt-2 max-h-52 overflow-y-auto pr-1">
              {categoryStats.map((cat) => (
                <div
                  key={cat.slug}
                  className="rounded-xl border border-stone-100 bg-[#fbf9f4] p-2 text-center transition hover:border-emerald-700 dark:border-stone-800 dark:bg-stone-800/60"
                >
                  <span className="block text-[10px] font-medium text-stone-500 dark:text-stone-400 truncate" title={cat.title}>
                    {cat.title.split(' ')[0]}
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-400">
                    {cat.done} {cat.total !== undefined ? `/ ${cat.total}` : 'منجز'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 pt-3 dark:border-stone-800">
            تدرج في العلوم بالتوازي دون انقطاع لتكتمل الملكة.
          </p>
        </div>

        {/* 3. بطاقة الفوائد المقيدة وتصدير الحاشية (3D Notes & Classical Book Export) */}
        <div
          onMouseMove={(e) => handleMouseMove(e, setNotesTilt)}
          onMouseLeave={() => handleMouseLeave(setNotesTilt)}
          style={{
            transform: `perspective(1000px) rotateX(${notesTilt.x}deg) rotateY(${notesTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-md cursor-pointer select-none dark:border-stone-800 dark:bg-stone-900/95 flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-amber-500 to-amber-700" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                حصيلة الشوارد والفوائد
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200/80 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                حاشية الطالب
              </span>
            </div>

            <div className="my-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-inner dark:bg-amber-950 dark:text-amber-300">
                <Bookmark className="h-8 w-8" />
              </div>
              <div>
                <span className="font-mono text-3xl font-black text-stone-900 dark:text-white">
                  {notes.length}
                </span>
                <span className="block text-xs font-bold text-stone-500 dark:text-stone-400">
                  فائدة ومسألة محررة
                </span>
              </div>
            </div>
          </div>

          {/* زر تصدير كشكول الفوائد بتنسيق كتاب إلكتروني */}
          <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
            <button
              onClick={handlePrintClassicalBook}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة الحاشية ككتيب علمي ورقي</span>
            </button>
            <p className="text-center text-[10px] text-stone-400">
              تنسيق كلاسيكي بهوامش محققة وخط أميري جاهز للتجليد.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
