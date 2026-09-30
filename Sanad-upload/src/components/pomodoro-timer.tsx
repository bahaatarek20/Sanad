'use client'

import { useState, useEffect } from 'react'
import { Timer, Play, Pause, RotateCcw, X, Sparkles, Coffee, Sliders } from 'lucide-react'

const PRESET_DURATIONS = [15, 25, 45, 60, 90]

export default function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'study' | 'break'>('study')
  const [studyMinutes, setStudyMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [totalStudySeconds, setTotalStudySeconds] = useState(0)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInputVal, setCustomInputVal] = useState('25')

  // قراءة وقت المدارسة اليومي والإعدادات من المتصفح
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_today_study_seconds')
      if (stored) {
        setTotalStudySeconds(Number(stored))
      }
      const savedDuration = localStorage.getItem('sanad_study_custom_min')
      if (savedDuration) {
        const val = Number(savedDuration)
        if (val > 0) {
          setStudyMinutes(val)
          setTimeLeft(val * 60)
          setCustomInputVal(String(val))
        }
      }
    } catch {
      // LocalStorage fallback
    }
  }, [])

  // إغلاق النافذة عند الضغط على Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // منطق المؤقت
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
        if (mode === 'study') {
          setTotalStudySeconds((prev) => {
            const next = prev + 1
            if (next % 10 === 0) {
              try {
                localStorage.setItem('sanad_today_study_seconds', String(next))
              } catch {
                // LocalStorage fallback
              }
            }
            return next
          })
        }
      }, 1000)
    } else if (timeLeft === 0) {
      if (mode === 'study') {
        // إنهاء جلسة المدارسة والبدء في استراحة الاستغفار
        setMode('break')
        setTimeLeft(breakMinutes * 60)
        setIsActive(false)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('انتهت جلسة المدارسة! خذ وقتاً للاستراحة والاستغفار والذكر.')
        }
      } else {
        // إنهاء الاستراحة والعودة للمدارسة
        setMode('study')
        setTimeLeft(studyMinutes * 60)
        setIsActive(false)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, mode, breakMinutes, studyMinutes])

  const toggleTimer = () => setIsActive(!isActive)

  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(mode === 'study' ? studyMinutes * 60 : breakMinutes * 60)
  }

  const switchMode = (newMode: 'study' | 'break') => {
    setIsActive(false)
    setMode(newMode)
    setTimeLeft(newMode === 'study' ? studyMinutes * 60 : breakMinutes * 60)
  }

  const applyCustomDuration = (minutes: number) => {
    if (minutes > 0) {
      setStudyMinutes(minutes)
      setCustomInputVal(String(minutes))
      setIsActive(false)
      if (mode === 'study') {
        setTimeLeft(minutes * 60)
      }
      try {
        localStorage.setItem('sanad_study_custom_min', String(minutes))
      } catch {
        // LocalStorage fallback
      }
    }
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(customInputVal, 10)
    if (!isNaN(parsed) && parsed > 0) {
      applyCustomDuration(parsed)
      setShowCustomInput(false)
    }
  }

  const minutesDisplay = Math.floor(timeLeft / 60)
  const secondsDisplay = (timeLeft % 60).toString().padStart(2, '0')
  const totalStudyMinutes = Math.floor(totalStudySeconds / 60)

  return (
    <>
      {/* زر التفعيل في شريط التنقل */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        title="مؤقت المدارسة والتركيز (انقر للضبط والبدء)"
        className="flex h-8 items-center gap-1 rounded-lg border border-stone-200/90 bg-white/90 px-2 text-[11px] font-bold text-stone-700 shadow-2xs hover:border-emerald-600 hover:text-emerald-900 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
      >
        <Timer className={`h-3.5 w-3.5 ${isActive ? 'text-amber-500 animate-pulse' : 'text-emerald-700 dark:text-emerald-400'}`} />
        <span className="font-mono text-[11px] font-bold">
          {isActive ? `${minutesDisplay}:${secondsDisplay}` : `${studyMinutes}د`}
        </span>
        {totalStudyMinutes > 0 && (
          <span className="hidden xl:inline rounded bg-amber-100/80 px-1 py-0.2 text-[9px] text-amber-900 font-bold dark:bg-amber-950/60 dark:text-amber-300">
            {totalStudyMinutes}د تحصيل
          </span>
        )}
      </button>

      {/* النافذة المنبثقة لمؤقت التركيز */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900"
          >
            {/* شريط علوي */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  مؤقت المدارسة والتركيز
                </h3>
              </div>
              {/* زر الإغلاق X العلوي الفوري */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="إغلاق مؤقت التركيز (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 hover:scale-105 transition cursor-pointer border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* أزرار التبديل بين الجلسة والاستراحة */}
            <div className="mt-4 flex rounded-2xl border border-stone-200 bg-stone-100/70 p-1 text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => switchMode('study')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                  mode === 'study'
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-400'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>مدارسة ({studyMinutes} د)</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('break')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                  mode === 'break'
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-400'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <Coffee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>استراحة ({breakMinutes} د)</span>
              </button>
            </div>

            {/* تخصيص مدة المدارسة مباشرة وبلا تعقيد */}
            {mode === 'study' && (
              <div className="mt-4 space-y-2.5 rounded-2xl border border-stone-100 bg-[#fbf9f4] p-3 dark:border-stone-800 dark:bg-stone-800/60">
                <span className="block text-[11px] font-bold text-stone-600 dark:text-stone-300">
                  اختر المدة أو حددها يدوياً بالدقائق:
                </span>

                {/* خيارات أوقات سريعة */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_DURATIONS.map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => applyCustomDuration(dur)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        studyMinutes === dur
                          ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-700'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {dur} دقيقة
                    </button>
                  ))}
                </div>

                {/* حقل إدخال يدوي حر للوقت متاح دوماً بلا حد أقصى */}
                <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      value={customInputVal}
                      onChange={(e) => setCustomInputVal(e.target.value)}
                      placeholder="أدخل أي عدد من الدقائق..."
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <span className="absolute left-2.5 top-1.5 text-[10px] text-stone-400">دقيقة</span>
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition cursor-pointer"
                  >
                    تطبيق
                  </button>
                </form>
              </div>
            )}

            {/* عرض الوقت المتبقي */}
            <div className="my-6 text-center">
              <span className="font-mono text-5xl font-black tracking-tight text-stone-900 dark:text-white">
                {minutesDisplay}:{secondsDisplay}
              </span>
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                {mode === 'study'
                  ? '«وقل رب زدني علماً» • صفاء تام بلا مشتتات'
                  : '«أستغفر الله العظيم وأتوب إليه» • رطّب لسانك بالذكر'}
              </p>
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleTimer}
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-700 hover:bg-amber-800'
                    : 'bg-emerald-900 hover:bg-emerald-950'
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>ابدأ التركيز</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                title="إعادة ضبط"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* إجمالي وقت المدارسة اليوم */}
            <div className="mt-5 border-t border-stone-100 pt-3 text-center text-[11px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
              حصيلة طلبك اليوم: <strong className="text-emerald-900 dark:text-emerald-400">{totalStudyMinutes} دقيقة</strong>
            </div>

            {/* زر إغلاق صريح في الأسفل */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full rounded-xl border border-stone-200 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition cursor-pointer dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              إغلاق النافذة (✕)
            </button>
          </div>
        </div>
      )}
    </>
  )
}

