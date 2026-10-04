'use client'

import { X, Sparkles, BookOpen, CheckCircle, Compass, Quote } from 'lucide-react'
import { MatnSummaryBrief, getMatnBrief } from '@/lib/course-sources-data'
import { MatnCourse } from '@/lib/curriculum-data'

interface MatnQuickBriefModalProps {
  course: MatnCourse
  isOpen: boolean
  onClose: () => void
}

export default function MatnQuickBriefModal({
  course,
  isOpen,
  onClose,
}: MatnQuickBriefModalProps) {
  if (!isOpen) return null

  const brief = getMatnBrief(course.slug)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-stone-200 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/95 max-h-[90vh] overflow-y-auto space-y-6"
        dir="rtl"
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* الترويسة */}
        <div className="space-y-2 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 dark:bg-amber-950/80 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>المراجعة السريعة وخلاصة المتن</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white font-amiri">
            {course.title}
          </h2>
          {course.author && (
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              تصنيف: {course.author} • الفن: {course.category}
            </p>
          )}
        </div>

        {brief ? (
          <div className="space-y-5 text-sm">
            {/* مقصود المتن وثمرته الكبرى */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-950 dark:bg-emerald-950/30 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-black text-xs">
                <Compass className="h-4 w-4" />
                <span>المقصد الأكبر وثمرة دراسة هذا المتن:</span>
              </div>
              <p className="text-stone-700 dark:text-stone-200 leading-relaxed text-xs sm:text-sm">
                {brief.mainGoal}
              </p>
            </div>

            {/* المحاور والمسائل الأساسية */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-700" />
                <span>أبرز المحاور والمسائل الكبرى في هذا المتن:</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {brief.coreThemes.map((theme, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 p-3 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300"
                  >
                    <CheckCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{theme}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* طريقة الضبط الموصى بها */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-1.5">
              <span className="text-xs font-black text-amber-950 dark:text-amber-300 block">
                💡 وصية المحققين في كيفية ضبط هذا المتن:
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {brief.recommendedStudyMethod}
              </p>
            </div>

            {/* أثر أو قول أهل العلم */}
            {brief.scholarlyQuotes && (
              <div className="border-r-2 border-emerald-600 pr-3 italic text-xs text-stone-500 dark:text-stone-400 flex items-start gap-2">
                <Quote className="h-4 w-4 shrink-0 text-emerald-600 rotate-180" />
                <span>{brief.scholarlyQuotes}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            <p>
              {course.description}
            </p>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/50">
              <p className="font-bold text-stone-800 dark:text-stone-200 mb-1">
                نصيحة عامة في ضبط المتون:
              </p>
              <p>
                «قراءة المتن متأنياً، وحفظ ألفاظه مع حل معانيه على الشيخ، ثم تقييد الفوائد في الكشكول ومراجعتها دورياً لترسخ في الصدر».
              </p>
            </div>
          </div>
        )}

        {/* زر الإغلاق السفلي */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-900 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
          >
            إغلاق ومتابعة المدارسة
          </button>
        </div>
      </div>
    </div>
  )
}
