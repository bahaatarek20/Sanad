'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  WifiOff,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check,
} from 'lucide-react'

export default function DownloadAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android')

  useEffect(() => {
    // فحص هل التطبيق مثبت بالفعل (PWA Standalone Mode)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true)
    }

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
      if (activeTab === 'ios') {
        alert('على أجهزة آيفون: اضغط على زر المشاركة أسفل الشاشة في Safari ثم اختر (إضافة إلى الشاشة الرئيسية ＋)')
      } else {
        alert('لتثبيت التطبيق: اضغط على قائمة المتصفح (⋮) في الأعلى ثم اختر (تثبيت التطبيق) أو (إضافة إلى الشاشة الرئيسية)')
      }
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
      // تعذر استدعاء النافذة
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-14 space-y-12">
      
      {/* ═══════════════════════════════════════════════════
          الترويسة والشارة العليا
      ═══════════════════════════════════════════════════ */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>تطبيق سَنَد الرسمي للهواتف الذكية والأجهزة اللوحية</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 dark:text-white leading-tight">
          ثبّت تطبيق <span className="text-emerald-800 dark:text-emerald-400 font-amiri">«سَنَد»</span> على هاتفك الآن
        </h1>

        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300 font-medium">
          اجعل مدارسة المتون والتأصيل في متناول يدك دائماً؛ بنقرة واحدة يصبح تطبيق «سَنَد» على شاشة هاتفك الرئيسية، خفيفاً وسريعاً ومتاحاً أينما كنت.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════
          معاينة شكل الأيقونة على الهاتف + زر التثبيت المباشر
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* عمود محاكاة الهاتف وشكل الأيقونة */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-72 sm:w-80 rounded-[44px] border-4 border-stone-800 bg-stone-900 p-3 shadow-2xl shadow-emerald-950/30 ring-1 ring-stone-700/50">
            
            {/* كاميرا الهاتف (Dynamic Island) */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 h-5 w-24 rounded-full bg-black z-20" />

            {/* شاشة الهاتف */}
            <div className="relative rounded-[34px] overflow-hidden bg-radial from-[#1e3a2f] via-[#0f241d] to-[#081510] p-5 pt-10 text-white min-h-[460px] flex flex-col justify-between">
              
              {/* شريط الحالة والوقت */}
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-stone-300 px-2 pt-1">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* شبكة التطبيقات مع إبراز أيقونة سَنَد */}
              <div className="my-auto space-y-6">
                <div className="text-center space-y-1">
                  <span className="text-[10px] tracking-wider uppercase text-amber-300/80 font-bold">
                    معاينة شاشة الهاتف الرئيسية
                  </span>
                  <p className="text-xs text-stone-400">تطبيق مستقل بأيقونته التراثية الفخمة</p>
                </div>

                {/* أيقونة تطبيق سَنَد المحورية */}
                <div className="flex flex-col items-center group">
                  <div className="relative h-24 w-24 rounded-[26px] bg-linear-to-br from-emerald-800 via-emerald-950 to-stone-950 p-2 shadow-2xl shadow-emerald-600/40 ring-2 ring-amber-400/80 flex items-center justify-center transform transition-all group-hover:scale-105">
                    {/* هالة التوهج */}
                    <div className="absolute inset-0 rounded-[24px] bg-linear-to-tr from-amber-400/20 via-transparent to-emerald-400/20 animate-pulse" />
                    
                    {/* SVG الأيقونة المصغرة للمصحف والتأصيل */}
                    <div className="relative text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        <BookOpen className="h-6 w-6 stroke-[2.2]" />
                      </div>
                      <span className="mt-1 block font-amiri font-bold text-xl text-amber-300 drop-shadow-md">
                        سَنَد
                      </span>
                    </div>
                  </div>
                  
                  {/* اسم التطبيق أسفل الأيقونة كالهواتف تماماً */}
                  <span className="mt-2 text-xs font-bold font-amiri text-stone-100 tracking-wide drop-shadow-sm">
                    سَنَد
                  </span>
                </div>

                {/* صف تطبيقات رمزية للمحاكاة */}
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

              {/* شريط الإيماءة السفلي */}
              <div className="mx-auto h-1 w-28 rounded-full bg-stone-500/80 mt-2" />
            </div>
          </div>
        </div>

        {/* عمود التثبيت الفوري والإرشادات */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-3d rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95 space-y-6">
            
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                  تثبيت بنقرة واحدة (PWA)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                  لا يتطلب متجر تطبيقات، حجم خفيف جداً (أقل من 3 ميجابايت)، ويعمل أوفلاين.
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
              <span>{isInstalled ? 'تطبيق سَنَد مثبت بالفعل — افتحه الآن' : 'اضغط هنا لتثبيت تطبيق سَنَد على جهازك فوراً'}</span>
            </button>

            {installSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>تم إرسال أمر التثبيت بنجاح! تفقد شاشة هاتفك الرئيسية.</span>
              </div>
            )}

            {/* تبويبات الشرح حسب نوع الجهاز */}
            <div className="pt-2 space-y-4">
              <div className="flex rounded-2xl border border-stone-200 bg-stone-100/70 p-1 text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'android'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-emerald-700" />
                  <span>هواتف أندرويد (Android)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'ios'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-amber-700" />
                  <span>آيفون وآيباد (iOS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'desktop'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Laptop className="h-4 w-4 text-teal-700" />
                  <span>الحاسوب (Windows / Mac)</span>
                </button>
              </div>

              {/* خطوات أندرويد */}
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

              {/* خطوات آيفون وآيباد */}
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

              {/* خطوات الحاسوب */}
              {activeTab === 'desktop' && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 dark:border-teal-950 dark:bg-teal-950/20 p-4 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-teal-950 dark:text-teal-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">١</span>
                    <span>في متصفح Chrome أو Microsoft Edge: انظر إلى نهاية شريط العنوان (URL bar) بالأعلى.</span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٢</span>
                    <span>ستجد أيقونة شاشة بسهم لأسفل «تثبيت تطبيق سَنَد» (Install App).</span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-300 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٣</span>
                    <span>اضغط عليها ليصبح «سَنَد» برنامجاً مستقلاً على سطح المكتب بدون أشرطة المتصفح المشتتة.</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════
          ميزات التطبيق على الهاتف
      ═══════════════════════════════════════════════════ */}
      <section className="pt-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            لماذا تثبت تطبيق «سَنَد» على هاتفك؟
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            صُمم ليكون رفيق مدارستك اليومية في حلقات المساجد والأسفار
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">تصفح سريع وخفيف</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              احفظ متونك وفوائدك العلمية وارجع إليها في أي وقت ومن أي جهاز بكل سهولة ويسر.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">بلا إعلانات ولا مشتتات</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              بيئة علمية وقورة لا تحتوي على أي إعلانات أو روابط خارجية تصرفك عن مدارسة المتن.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">توثيق الإجازات والشهادات</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              تحميل شهادات ضبط المتون والإجازات مع رمز QR الموثق برقم تسلسلي معتمد.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">كشكول فوائد فوري</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              قيد شواردك وفوائدك أثناء الاستماع للمشايخ مع مزامنة سحابية لحسابك تلقائياً.
            </p>
          </div>
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
