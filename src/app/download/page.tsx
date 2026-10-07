'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Sparkles,
  WifiOff,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check,
  Monitor,
  HardDrive,
  Cpu,
  Layers,
  Award,
  Users,
  Compass,
  X,
  Info,
  Maximize2,
  Minus,
} from 'lucide-react'

export default function DownloadAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>('desktop')
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'android' | 'ios' | 'other'>('windows')

  useEffect(() => {
    document.title = 'سند'

    // 1. فحص هل التطبيق مثبت بالفعل (PWA Standalone Mode)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true)
    }

    // 2. كشف نظام التشغيل تلقائياً لضبط الواجهة بالشكل المناسب
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua)) {
      setActiveTab('ios')
      setDetectedOs('ios')
    } else if (/Android/.test(ua)) {
      setActiveTab('android')
      setDetectedOs('android')
    } else if (/Macintosh|Mac OS X/.test(ua)) {
      setActiveTab('desktop')
      setDetectedOs('mac')
    } else {
      setActiveTab('desktop')
      setDetectedOs('windows')
    }

    // 3. التقاط حدث التثبيت المباشر
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallSuccess(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // فتح النافذة الإرشادية المرئية الفخمة بدلاً من alert() القديم
      setShowGuideModal(true)
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallSuccess(true)
      }
      setDeferredPrompt(null)
    } catch {
      setShowGuideModal(true)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-14 space-y-12">
      
      {/* ═══════════════════════════════════════════════════
          الترويسة والشارة العليا
      ═══════════════════════════════════════════════════ */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Monitor className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>تطبيق سَنَد الأصلي لسطح المكتب (Windows / Mac) والهواتف الذكية</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 dark:text-white leading-tight">
          ثبّت برنامج <span className="text-emerald-800 dark:text-emerald-400 font-amiri">«سَنَد»</span> كبرنامج مستقل على جهازك
        </h1>

        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300 font-medium">
          «سَنَد» تطبيق متكامل مبني بأحدث معايير البرمجيات المستقلة (PWA Standalone)؛ يعمل كبرنامج حقيقي على الحاسوب المحمول واللابتوب وسطح المكتب، وعلى هواتف أندرويد وآيفون، بسرعة فائقة وخفة تامة دون الحاجة لمحاكيات أو متاجر خارجية.
        </p>

        {/* أزرار التبديل السريع بين بيئات التشغيل */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex rounded-2xl border border-stone-200 bg-stone-100/80 p-1 text-xs font-bold dark:border-stone-800 dark:bg-stone-800/90 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'desktop'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
              }`}
            >
              <Laptop className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>الحاسوب واللابتوب (Windows / Mac)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>أندرويد (Android)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'ios'
                  ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span>آيفون وآيباد (iOS)</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          معاينة شكل التطبيق التفاعلي (برنامج لابتوب أو هاتف)
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* عمود محاكاة الجهاز حسب الاختيار */}
        <div className="lg:col-span-5 flex justify-center">
          {activeTab === 'desktop' ? (
            /* محاكاة واجهة البرنامج المستقل على اللابتوب / سطح المكتب */
            <div className="w-full max-w-md rounded-2xl border-4 border-stone-800 bg-stone-900 p-2 shadow-2xl shadow-emerald-950/30 ring-1 ring-stone-700/60">
              {/* شريط عنوان نافذة البرنامج */}
              <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950 px-3 py-2 rounded-t-xl text-[11px] text-stone-300">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center gap-1.5 font-bold font-amiri text-xs text-amber-300">
                  <BookOpen className="h-3 w-3 text-emerald-400" />
                  <span>برنامج سَنَد — بيئة التأصيل العلمي</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-[10px]">
                  <Minus className="h-3 w-3" />
                  <Maximize2 className="h-2.5 w-2.5" />
                  <X className="h-3 w-3" />
                </div>
              </div>

              {/* داخل نافذة البرنامج */}
              <div className="p-4 bg-linear-to-b from-[#0f241d] to-[#081510] text-white rounded-b-xl space-y-4 min-h-[340px] flex flex-col justify-between">
                {/* شريط أدوات البرنامج */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] text-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-800/80 px-2 py-0.5 text-white font-bold">سطح المكتب</span>
                    <span>نسخة مستقلة v2.4</span>
                  </div>
                  <span className="text-amber-300 font-bold">⚡ استجابة فورية</span>
                </div>

                {/* أيقونة وهوية البرنامج */}
                <div className="text-center space-y-3 my-auto">
                  <div className="mx-auto relative h-20 w-20 rounded-2xl overflow-hidden shadow-xl ring-2 ring-amber-400/80 flex items-center justify-center">
                    <img src="/icon-512.png" alt="أيقونة برنامج سند" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-base font-black font-amiri text-amber-200">برنامج سَنَد التأصيلي</h4>
                    <p className="text-[11px] text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
                      برنامج حقيقي يفتح في نافذة مستقلة كبرامج ويندوز وماك، بدون أشرطة المتصفح المشتتة، وبأيقونة رسمية على شريط المهام (Taskbar).
                    </p>
                  </div>
                </div>

                {/* مؤشرات التشغيل */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-[10px]">
                  <div className="rounded-lg bg-white/5 p-1.5">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-0.5" />
                    <span>0% استهلاك المعالج</span>
                  </div>
                  <div className="rounded-lg bg-white/5 p-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-teal-400 mx-auto mb-0.5" />
                    <span>أقل من 3MB</span>
                  </div>
                  <div className="rounded-lg bg-white/5 p-1.5">
                    <WifiOff className="h-3.5 w-3.5 text-amber-400 mx-auto mb-0.5" />
                    <span>يعمل أوفلاين</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* محاكاة واجهة الهاتف المحمول */
            <div className="relative w-72 sm:w-80 rounded-[44px] border-4 border-stone-800 bg-stone-900 p-3 shadow-2xl shadow-emerald-950/30 ring-1 ring-stone-700/50">
              <div className="absolute top-5 left-1/2 -translate-x-1/2 h-5 w-24 rounded-full bg-black z-20" />
              <div className="relative rounded-[34px] overflow-hidden bg-radial from-[#1e3a2f] via-[#0f241d] to-[#081510] p-5 pt-10 text-white min-h-[460px] flex flex-col justify-between">
                <div className="flex justify-between items-center text-[11px] font-mono font-bold text-stone-300 px-2 pt-1">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="my-auto space-y-6">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] tracking-wider uppercase text-amber-300/80 font-bold">
                      شاشة هاتفك الرئيسية
                    </span>
                    <p className="text-xs text-stone-400">أيقونة «سَنَد» كأي تطبيق أصلي محمل</p>
                  </div>

                    <div className="flex flex-col items-center group">
                      <div className="relative h-24 w-24 rounded-[26px] overflow-hidden shadow-2xl shadow-emerald-600/40 ring-2 ring-amber-400/80 flex items-center justify-center transform transition-all group-hover:scale-105">
                        <img src="/icon-512.png" alt="أيقونة تطبيق سند" className="w-full h-full object-cover" />
                      </div>
                      <span className="mt-2 text-xs font-bold font-amiri text-stone-100 tracking-wide drop-shadow-sm">
                        سند
                      </span>
                    </div>

                  <div className="grid grid-cols-4 gap-3 pt-4 opacity-50">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-11 w-11 rounded-2xl bg-stone-700/80" />
                      <span className="text-[9px] text-stone-400">الرسائل</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-11 w-11 rounded-2xl bg-stone-700/80" />
                      <span className="text-[9px] text-stone-400">الصور</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-11 w-11 rounded-2xl bg-stone-700/80" />
                      <span className="text-[9px] text-stone-400">الساعة</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-11 w-11 rounded-2xl bg-stone-700/80" />
                      <span className="text-[9px] text-stone-400">الإعدادات</span>
                    </div>
                  </div>
                </div>

                <div className="mx-auto h-1 w-28 rounded-full bg-stone-500/80 mt-2" />
              </div>
            </div>
          )}
        </div>

        {/* عمود التثبيت الفوري والإرشادات */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-3d rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95 space-y-6">
            
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                  {activeTab === 'desktop' ? 'تثبيت برنامج سطح المكتب المباشر' : 'تثبيت التطبيق على هاتفك'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                  {activeTab === 'desktop'
                    ? 'يفتح في نافذة مستقلة كأي برنامج، خفيف جداً، وبدون أشرطة المتصفح المشتتة.'
                    : 'لا يتطلب متجر تطبيقات، حجم خفيف جداً (أقل من 3 ميجابايت)، ويعمل أوفلاين.'}
                </p>
              </div>

              {isInstalled ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>مثبت على هذا الجهاز ✓</span>
                </div>
              ) : null}
            </div>

            {/* زر التثبيت الكبير المباشر */}
            <button
              onClick={handleInstallClick}
              className="w-full rounded-2xl bg-linear-to-r from-emerald-800 via-emerald-900 to-teal-950 py-4 px-6 text-sm sm:text-base font-black text-white shadow-xl shadow-emerald-950/25 hover:from-emerald-700 hover:to-emerald-900 hover:shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-3 border border-emerald-600/30 group"
            >
              <Download className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
              <span>
                {isInstalled
                  ? 'تطبيق سَنَد مثبت بالفعل — افتحه الآن من قائمة البرامج'
                  : activeTab === 'desktop'
                  ? 'اضغط هنا لتثبيت برنامج سَنَد على اللابتوب / الكمبيوتر'
                  : 'اضغط هنا لتثبيت تطبيق سَنَد على الهاتف'}
              </span>
            </button>

            {installSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>تم إرسال أمر التثبيت بنجاح! تفقد شريط المهام وقائمة البرامج لديك.</span>
              </div>
            )}

            {/* تفاصيل الخطوات حسب نوع الجهاز النشط */}
            <div className="pt-2">
              {activeTab === 'desktop' && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/60 dark:border-teal-950 dark:bg-teal-950/30 p-4 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">١</span>
                    <span>في متصفح Chrome أو Edge على ويندوز/ماك: اضغط الزر الأخضر أعلاه مباشرة.</span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٢</span>
                    <span>أو انظر لأقصى يسار شريط الرابط (URL bar): ستجد أيقونة تثبيت صغيرة ⊞ (تثبيت سَنَد).</span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٣</span>
                    <span>بمجرد الموافقة، يفتح «سَنَد» كنافذة برنامج مستقل ويثبت أيقونته على سطح المكتب وشريط المهام فوراً.</span>
                  </div>
                </div>
              )}

              {activeTab === 'android' && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">١</span>
                    <span>في متصفح Chrome أو Samsung Internet: اضغط على الزر الأخضر أعلاه (تثبيت التطبيق).</span>
                  </div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">٢</span>
                    <span>أو من قائمة المتصفح (الثلاث نقاط ⋮ أعلى اليسار)، اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
                  </div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">٣</span>
                    <span>سيظهر تطبيق «سَنَد» بأيقونته الخضراء المذهبة على شاشتك الرئيسية كأي تطبيق أصلي تماماً.</span>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-950 dark:bg-amber-950/20 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">١</span>
                    <span>افتح المنصة في متصفح Safari على جهاز الآيفون أو الآيباد.</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٢</span>
                    <span>اضغط على أيقونة المشاركة (مربع بسهم لأعلى ⎋) في شريط المتصفح السفلي.</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٣</span>
                    <span>مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية ＋» (Add to Home Screen).</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٤</span>
                    <span>اضغط «إضافة» (Add) في الزاوية العلوية، وسيثبت تطبيق «سَنَد» كأنه محمل من App Store!</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════
          نافذة الإرشاد التفاعلية (بديل أنيق عن الـ alert)
      ═══════════════════════════════════════════════════ */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-black">
                <Info className="h-5 w-5 text-emerald-600" />
                <span>طريقة تثبيت برنامج «سَنَد» بنقرة واحدة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-xl p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {activeTab === 'desktop' ? (
                <>
                  <p className="font-bold text-stone-900 dark:text-white">
                    على أجهزة الكمبيوتر المحمول واللابتوب (Windows و Mac):
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pr-2 text-xs">
                    <li>
                      انظر لأعلى الشاشة في شريط الرابط (Address Bar) بجانب رمز النجمة ⭐
                    </li>
                    <li>
                      ستجد أيقونة تثبيت صغيرة تشبه شاشة كمبيوتر بسهم لأسفل أو علامة ⊞ (تثبيت التطبيق).
                    </li>
                    <li>
                      اضغط عليها ثم اختر <strong>«تثبيت» (Install)</strong>.
                    </li>
                    <li>
                      سيفتح «سَنَد» فوراً كنافذة برنامج مستقلة وستجد أيقونته على سطح المكتب وشريط المهام.
                    </li>
                  </ol>
                </>
              ) : activeTab === 'ios' ? (
                <>
                  <p className="font-bold text-stone-900 dark:text-white">
                    على أجهزة آبل (آيفون وآيباد) عبر Safari:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pr-2 text-xs">
                    <li>اضغط على زر المشاركة (مربع بسهم للأعلى ⎋) في شريط Safari السفلي.</li>
                    <li>مرر الخيارات واختر <strong>«إضافة إلى الشاشة الرئيسية ＋»</strong>.</li>
                    <li>اضغط على <strong>«إضافة» (Add)</strong> في أعلى اليمين.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold text-stone-900 dark:text-white">
                    على هواتف أندرويد (Chrome / Samsung):
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pr-2 text-xs">
                    <li>اضغط على القائمة العلوية ذات النقاط الثلاث (⋮) في متصفحك.</li>
                    <li>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</li>
                    <li>وافق على التثبيت وسيصبح التطبيق على شاشة هاتفك فوراً.</li>
                  </ol>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950 transition cursor-pointer"
              >
                فهمت، حسناً ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ترابط التطبيق مع أجزاء المنصة (Platform Modules Bridge)
      ═══════════════════════════════════════════════════ */}
      <section className="pt-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            كل أجزاء المنصة في متناول يدك بالتطبيق
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            تكامل سحابي فوري؛ أي تقدم تحرزه في التطبيق يزامن تلقائياً في حسابك
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/courses"
            className="group rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs hover:border-emerald-600/70 hover:shadow-md transition-all dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              فهرس المتون الـ 78
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              تصفح المتون المحققة، واستمع للشروح المرئية والصوتية مع تفكيك الألفاظ المستشكلة.
            </p>
          </Link>

          <Link
            href="/community"
            className="group rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs hover:border-amber-600/70 hover:shadow-md transition-all dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400">
              مجلس المذاكرة والتنافس
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              شارك إخوانك الطلاب حل الإشكالات وتقييد الفوائد بهوية مجهولة وتنافس في لوحة الشرف.
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="group rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs hover:border-teal-600/70 hover:shadow-md transition-all dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 group-hover:scale-110 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400">
              الكشكول العلمي الخاص
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              دوّن فوائدك وضوابط المسائل في كشكول منظم يرافقك دائماً ويعمل بدون اتصال بالإنترنت.
            </p>
          </Link>

          <Link
            href="/roadmap"
            className="group rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs hover:border-sky-600/70 hover:shadow-md transition-all dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 group-hover:scale-110 transition-transform">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400">
              خارطة الطريق التأصيلية
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              مسارات منهجية متدرجة من المرحلة التمهيدية حتى إتقان الفنون الشرعية والتخصص.
            </p>
          </Link>
        </div>
      </section>

      {/* زر العودة لفهرس المتون */}
      <div className="text-center pt-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 transition dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <span>تصفح فهرس المتون التأصيلية المعتمدة</span>
          <ArrowRight className="h-4 w-4 rotate-180" />
        </Link>
      </div>

    </div>
  )
}
