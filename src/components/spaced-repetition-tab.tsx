'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trophy,
  Calendar,
  Flame,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import {
  MatnReviewRecord,
  getCourseReviewRecord,
  recordCourseReview,
  getRetentionLevelTitle,
  SPACED_INTERVALS_DAYS,
} from '@/lib/spaced-repetition'
import { MatnCourse } from '@/lib/curriculum-data'

interface SpacedRepetitionTabProps {
  course: MatnCourse
  currentEpisodeIndex: number
}

export default function SpacedRepetitionTab({
  course,
  currentEpisodeIndex,
}: SpacedRepetitionTabProps) {
  const [record, setRecord] = useState<MatnReviewRecord | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const rec = getCourseReviewRecord(course.slug)
    setRecord(rec)
  }, [course.slug])

  const handleReviewAction = (quality: 'easy' | 'good' | 'hard' | 'again') => {
    const updated = recordCourseReview(course.slug, course.title, quality)
    setRecord(updated)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 4000)
  }

  if (!isClient) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-stone-400">
        جارٍ جلب سجل المراجعة والتعاهد...
      </div>
    )
  }

  const levelInfo = getRetentionLevelTitle(record?.level || 0)
  const nextDate = record?.nextReviewAt ? new Date(record.nextReviewAt) : null
  const isDue = nextDate ? nextDate <= new Date() : false

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4 pr-1 text-xs">
      {/* الترويسة وبطاقة الرسوخ الحالية */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
            <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>نظام تعاهد المتن والمراجعة المتباعدة</span>
          </div>
          {record && (
            <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
              {record.repetitionsCount} مراجعات
            </span>
          )}
        </div>

        {/* بطاقة مستوى الرسوخ */}
        <div className={`rounded-2xl border p-4 space-y-2.5 transition-all ${levelInfo.colorClass}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs sm:text-sm">
              {levelInfo.title}
            </span>
            <span className="font-mono font-black text-xs">
              رسوخ {record?.retentionScore || 0}%
            </span>
          </div>

          {/* شريط نسبة الرسوخ التراكمية */}
          <div className="w-full h-2 bg-stone-200/80 rounded-full overflow-hidden dark:bg-stone-700/80">
            <div
              className="h-full bg-linear-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${record?.retentionScore || 0}%` }}
            />
          </div>

          <p className="text-[11px] leading-relaxed opacity-90">
            {levelInfo.description}
          </p>
        </div>

        {/* موعد المراجعة القادمة أو التنبيه */}
        {record && nextDate && (
          <div
            className={`rounded-2xl border p-3 flex items-center justify-between gap-2 ${
              isDue
                ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                : 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold block">
                  {isDue ? '🔔 حان موعد التعاهد اليوم!' : 'موعد المراجعة القادمة:'}
                </span>
                <span className="text-[10px] opacity-80 font-mono">
                  {nextDate.toLocaleDateString('ar-EG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
            {isDue && (
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 animate-pulse">
                مستحق الآن
              </span>
            )}
          </div>
        )}

        {/* رسالة نجاح الحفظ */}
        {showSuccessToast && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-[11px] text-emerald-950 font-bold dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>تم تقييد جلسة التعاهد وجدولة الموعد القادم بنجاح! بارك الله في همتك.</span>
          </div>
        )}

        {/* أزرار تقييد المراجعة */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
            كيف كان استحضارك لمسائل المتن عند المراجعة؟
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleReviewAction('easy')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 p-2 text-emerald-950 font-bold hover:bg-emerald-100 hover:border-emerald-500 transition cursor-pointer dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>سهل ومتقن (تقديم)</span>
            </button>

            <button
              type="button"
              onClick={() => handleReviewAction('good')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50/80 p-2 text-teal-950 font-bold hover:bg-teal-100 hover:border-teal-500 transition cursor-pointer dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 text-[11px]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
              <span>استحضار جيد ✓</span>
            </button>

            <button
              type="button"
              onClick={() => handleReviewAction('hard')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100/80 p-2 text-stone-800 font-bold hover:bg-stone-200 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 text-[11px]"
            >
              <AlertCircle className="h-3.5 w-3.5 text-stone-500" />
              <span>بصعوبة (تثبيت)</span>
            </button>

            <button
              type="button"
              onClick={() => handleReviewAction('again')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 p-2 text-rose-950 font-bold hover:bg-rose-100 hover:border-rose-400 transition cursor-pointer dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 text-[11px]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
              <span>نسيان (إعادة من ١)</span>
            </button>
          </div>
        </div>
      </div>

      {/* وصية إيمانية في تعاهد العلم في الأسفل */}
      <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3 text-[10px] text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400 leading-relaxed space-y-1">
        <span className="font-bold text-stone-700 dark:text-stone-300 block">
          قال الإمام الزهري (رحمه الله):
        </span>
        <p>«إنما يذهب العلم النسيان وترك المذاكرة». تعاهد متونك على هذه الفترات تظفر بالرسوخ التام بإذن الله.</p>
      </div>
    </div>
  )
}
