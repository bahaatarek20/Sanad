'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  REVELATION_QUOTES,
  SALAF_QUOTES,
  SCHOLARS_QUOTES,
  QuoteItem,
} from '@/lib/quotes-data'
import { RefreshCw, Sparkles, Pause, Play } from 'lucide-react'

const ROTATION_INTERVAL_SECONDS = 12

export default function DynamicQuotesBanner() {
  const [revIndex, setRevIndex] = useState(0)
  const [salafIndex, setSalafIndex] = useState(0)
  const [scholarsIndex, setScholarsIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mounted, setMounted] = useState(false)

  // تهيئة عشوائية أولية لمنع التكرار في كل زيارة
  useEffect(() => {
    setMounted(true)
    setRevIndex(Math.floor(Math.random() * REVELATION_QUOTES.length))
    setSalafIndex(Math.floor(Math.random() * SALAF_QUOTES.length))
    setScholarsIndex(Math.floor(Math.random() * SCHOLARS_QUOTES.length))
  }, [])

  // الانتقال إلى المقولات التالية بسلاسة وفخامة
  const nextQuotes = useCallback(() => {
    setIsFading(true)
    setTimeout(() => {
      setRevIndex((prev) => (prev + 1) % REVELATION_QUOTES.length)
      setSalafIndex((prev) => (prev + 1) % SALAF_QUOTES.length)
      setScholarsIndex((prev) => (prev + 1) % SCHOLARS_QUOTES.length)
      setProgress(0)
      setIsFading(false)
    }, 280)
  }, [])

  // مؤقت الدوران التلقائي والتقدم البصري
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!mounted || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      return
    }

    const stepMs = 100
    const totalSteps = (ROTATION_INTERVAL_SECONDS * 1000) / stepMs

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + (100 / totalSteps)
      })
    }, stepMs)

    timerRef.current = setInterval(() => {
      nextQuotes()
    }, ROTATION_INTERVAL_SECONDS * 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [mounted, isPaused, nextQuotes])

  // البطاقات الحالية الثلاث
  const currentRev: QuoteItem = REVELATION_QUOTES[revIndex] || REVELATION_QUOTES[0]
  const currentSalaf: QuoteItem = SALAF_QUOTES[salafIndex] || SALAF_QUOTES[0]
  const currentScholar: QuoteItem = SCHOLARS_QUOTES[scholarsIndex] || SCHOLARS_QUOTES[0]

  const activeCards = [
    {
      data: currentRev,
      accentGradient: 'from-emerald-600 via-teal-500 to-emerald-700',
      badgeStyle: 'bg-emerald-50 text-emerald-950 border-emerald-200/90 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
      quoteColor: 'text-emerald-700 dark:text-emerald-400',
      categoryTitle: 'نور الوحي',
    },
    {
      data: currentSalaf,
      accentGradient: 'from-amber-500 via-amber-400 to-amber-600',
      badgeStyle: 'bg-amber-50 text-amber-950 border-amber-200/90 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
      quoteColor: 'text-amber-600 dark:text-amber-400',
      categoryTitle: 'درر السلف',
    },
    {
      data: currentScholar,
      accentGradient: 'from-teal-600 via-emerald-500 to-teal-700',
      badgeStyle: 'bg-teal-50 text-teal-950 border-teal-200/90 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
      quoteColor: 'text-teal-600 dark:text-teal-400',
      categoryTitle: 'حكمة الأئمة',
    },
  ]

  return (
    <section
      aria-label="شريط درر الوحي وأقوال العلماء المتجدد"
      className="space-y-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ترويسة شريط المقولات مع أدوات التحكم التفاعلية */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300 font-bold">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>قبسات من نور الوحي ودرر السلف (متجددة تلقائياً)</span>
          {isPaused && (
            <span className="hidden sm:inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              موقوف مؤقتاً للقراءة
            </span>
          )}
        </div>

        {/* أزرار التحكم: تحديث يدوي فوري + إيقاف/استئناف */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            title={isPaused ? 'استئناف التبديل التلقائي' : 'إيقاف التبديل مؤقتاً للقراءة'}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-emerald-900 hover:bg-stone-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-emerald-300"
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>

          <button
            type="button"
            onClick={nextQuotes}
            title="تبديل إلى مقولات أخرى الآن"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:border-emerald-800 hover:text-emerald-900 hover:bg-stone-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-3 w-3 ${isFading ? 'animate-spin' : ''}`} />
            <span>درر أخرى</span>
          </button>
        </div>
      </div>

      {/* خط تقدم الوقت التلقائي الرفيع والأنيق */}
      <div className="h-1 w-full rounded-full bg-stone-200/60 dark:bg-stone-800/60 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-emerald-600 via-amber-500 to-emerald-700 transition-all duration-100 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* شبكة البطاقات الثلاث بتأثير انتقال انسيابي وتناسق تام */}
      <div
        className={`grid grid-cols-1 gap-5 sm:grid-cols-3 transition-opacity duration-300 ${
          isFading ? 'opacity-20 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {activeCards.map((card, idx) => (
          <div
            key={idx}
            className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-stone-800 dark:bg-[#1f1c19]/90 dark:hover:border-stone-700"
          >
            {/* شريط الإضاءة العلوي الرفيع المتناسق */}
            <div
              className={`absolute top-0 right-0 left-0 h-1 bg-linear-to-r ${card.accentGradient}`}
            />

            <div>
              {/* ترويسة بطاقة الحكمة */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 dark:border-stone-800/80">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${card.badgeStyle}`}
                >
                  {card.data.badge}
                </span>
                <span
                  className={`text-2xl font-serif font-black select-none opacity-40 dark:opacity-50 ${card.quoteColor}`}
                  aria-hidden="true"
                >
                  ❝
                </span>
              </div>

              {/* نص المقولة المباركة بعناية فائقة وتناسق بصري مريح */}
              <blockquote className="my-5 text-xs sm:text-sm leading-loose font-bold text-stone-800 dark:text-stone-100 min-h-[4.5rem] flex items-center">
                «{card.data.quote}»
              </blockquote>
            </div>

            {/* تذييل البطاقة: القائل والمصدر بتناسق تام */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs">
              <span className="font-extrabold text-stone-900 dark:text-stone-100">
                {card.data.speaker}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                {card.data.attribution}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
