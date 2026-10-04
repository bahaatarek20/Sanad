'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Sparkles,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check,
  Monitor,
  MousePointerClick,
  Copy,
  X,
  Globe,
  HelpCircle,
} from 'lucide-react'

export default function DownloadAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>('desktop')
  const [showModal, setShowModal] = useState<'none' | 'desktop' | 'ios' | 'android'>('none')
  const [shortcutDownloaded, setShortcutDownloaded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    // 1. فحص هل التطبيق يعمل بنمط الشاشة المستقلة (PWA Standalone Mode)
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true)
    }

    // 2. كشف تلقائي لنظام تشغيل الزائر لاختيار التبويب المناسب تلقائياً
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase()
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab('ios')
      } else if (/android/.test(ua)) {
        setActiveTab('android')
      } else if (/windows|macintosh|mac os x|linux/.test(ua)) {
        setActiveTab('desktop')
      }
    }

    // 3. التقاط حدث التثبيت الأصلي لمتصفحات Chrome و Edge و Android
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

  // معالجة زر التثبيت الرئيسي بدون أي نافذة alert() بدائية
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setInstallSuccess(true)
        }
        setDeferredPrompt(null)
        return
      } catch {
        // في حال فشل الاستدعاء الأصلي نفتح المرشد التفاعلي
      }
    }

    // إذا لم يكن المتصفح قد أطلق نافذة التثبيت تلقائياً، نعرض المرشد المرئي الراقي
    if (activeTab === 'desktop') {
      setShowModal('desktop')
    } else if (activeTab === 'ios') {
      setShowModal('ios')
    } else {
      setShowModal('android')
    }
  }

  // تنزيل ملف اختصار سطح المكتب المباشر بنقرة واحدة لأجهزة الحاسوب واللابتوب
  const handleDownloadDesktopShortcut = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sanad-edu1.vercel.app'
    const shortcutContent = `[InternetShortcut]\r\nURL=${origin}/\r\nIconFile=${origin}/favicon.ico\r\nIconIndex=0\r\nHotKey=0\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n`
    const blob = new Blob([shortcutContent], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'سَنَد - منصة التعليم الشرعي والتأصيل.url'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShortcutDownloaded(true)
    setTimeout(() => setShortcutDownloaded(false), 5000)
  }

  // نسخ رابط المنصة للمشاركة
  const handleCopyLink = () => {
    const link = typeof window !== 'undefined' ? window.location.origin : 'https://sanad-edu1.vercel.app'
    navigator.clipboard?.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    })
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-14 space-y-12">
      
      {/* ═══════════════════════════════════════════════════
          الترويسة والشارة العليا
      ═══════════════════════════════════════════════════ */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>تطبيق سَنَد الرسمي للهواتف الذكية والحواسيب المحمولة</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 dark:text-white leading-tight">
          ثبّت تطبيق <span className="text-emerald-800 dark:text-emerald-400 font-amiri">«سَنَد»</span> على جهازك الآن
        </h1>

        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300 font-medium">
          اجعل مدارسة المتون والتأصيل في متناول يدك دائماً؛ بنقرة واحدة يصبح تطبيق «سَنَد» على شاشتك أو سطح مكتبك، خفيفاً وسريعاً ومتاحاً أينما كنت دون الحاجة لمتجر تطبيقات.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════
          معاينة شكل التطبيق (لابتوب أو هاتف حسب التبويب)
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* عمود المحاكاة المرئية */}
        <div className="lg:col-span-5 flex justify-center">
          {activeTab === 'desktop' ? (
            /* محاكاة شاشة اللابتوب والحاسوب */
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] rounded-3xl border-4 border-stone-800 bg-stone-950 p-2.5 shadow-2xl shadow-emerald-950/30 ring-1 ring-stone-700/50">
              {/* شريط عنوان نافذة البرنامج */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 px-2 text-stone-400">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-0.5 text-[10px] text-stone-300 font-mono border border-stone-800">
                  <Globe className="h-2.5 w-2.5 text-emerald-400" />
                  <span>sanad-edu1.vercel.app</span>
                  <span className="text-amber-400 font-bold">⤓</span>
                </div>
                <div className="text-[10px] text-stone-500 font-mono">PWA</div>
              </div>

              {/* شاشة البرنامج الداخلية */}
              <div className="relative rounded-2xl overflow-hidden bg-radial from-[#1e3a2f] via-[#0f241d] to-[#081510] p-4 text-white min-h-[380px] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-emerald-700 flex items-center justify-center text-amber-300">
                        <BookOpen className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-amiri font-bold text-sm text-stone-100">سَنَد — تطبيق الحاسوب</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      مستقل بلا متصفح
                    </span>
                  </div>

                  {/* بطاقة محاكاة المتون */}
                  <div className="rounded-xl bg-white/10 p-3 space-y-2 border border-white/10 backdrop-blur-xs">
                    <div className="text-[11px] font-bold text-amber-300">متن اليوم المقترح:</div>
                    <div className="font-bold text-sm text-white">«بداية المتفقه في الفقه الحنبلي»</div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 w-3/4" />
                    </div>
                    <div className="text-[10px] text-stone-300 flex justify-between">
                      <span>إنجاز المجلس ٤ من ٦</span>
                      <span>٧٥%</span>
                    </div>
                  </div>

                  {/* مميزات سريعة للحاسوب */}
                  <div className="space-y-1.5 text-[11px] text-stone-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>نافذة مستقلة بدون تبويبات مشتتة</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>اختصار سريع على سطح المكتب وشريط المهام</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>تشغيل فوري وسريع بنقرة واحدة</span>
                    </div>
                  </div>
                </div>

                {/* شريط المهام السفلي للمحاكاة */}
                <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-linear-to-br from-emerald-700 to-emerald-950 flex items-center justify-center text-amber-300 border border-amber-400/50 shadow-sm animate-pulse">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-stone-200">أيقونة سَنَد مثبتة في شريط المهام</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* محاكاة شاشة الهاتف (أندرويد وآيفون) */
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
                      <div className="absolute inset-0 rounded-[24px] bg-linear-to-tr from-amber-400/20 via-transparent to-emerald-400/20 animate-pulse" />
                      <div className="relative text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          <BookOpen className="h-6 w-6 stroke-[2.2]" />
                        </div>
                        <span className="mt-1 block font-amiri font-bold text-xl text-amber-300 drop-shadow-md">
                          سَنَد
                        </span>
                      </div>
                    </div>
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
          )}
        </div>

        {/* عمود التثبيت الفوري والإرشادات */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-3d rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95 space-y-6">
            
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                  {activeTab === 'desktop'
                    ? 'تثبيت سَنَد على الحاسوب واللابتوب'
                    : 'تثبيت سَنَد على الهاتف الذكي'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                  {activeTab === 'desktop'
                    ? 'تطبيق خفيف جداً يفتح في نافذة مستقلة مع اختصار على سطح المكتب.'
                    : 'تطبيق ويب تقدمي (PWA) فوري، بلا إعلانات ويعمل بسلاسة فائقة.'}
                </p>
              </div>

              {isInstalled ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>مثبت على هذا الجهاز ✓</span>
                </div>
              ) : null}
            </div>

            {/* أزرار التثبيت المباشرة */}
            <div className="space-y-3">
              {/* زر التثبيت كتطبيق PWA */}
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full rounded-2xl bg-linear-to-r from-emerald-800 via-emerald-900 to-teal-950 py-4 px-6 text-sm sm:text-base font-black text-white shadow-xl shadow-emerald-950/25 hover:from-emerald-700 hover:to-emerald-900 hover:shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-3 border border-emerald-600/30 group"
              >
                <Download className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
                <span>
                  {isInstalled
                    ? 'تطبيق سَنَد مثبت بالفعل — انقر هنا لفتحه'
                    : activeTab === 'desktop'
                    ? 'تثبيت تطبيق سَنَد على اللابتوب / الحاسوب (PWA)'
                    : 'تثبيت تطبيق سَنَد على هاتفك الآن'}
                </span>
              </button>

              {/* زر خاص بالحواسيب واللابتوب: تنزيل اختصار سطح المكتب المباشر بنقرة واحدة */}
              {activeTab === 'desktop' && (
                <button
                  type="button"
                  onClick={handleDownloadDesktopShortcut}
                  className="w-full rounded-2xl bg-stone-100 hover:bg-stone-200/90 dark:bg-stone-800 dark:hover:bg-stone-750 py-3 px-5 text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-stone-700 transition cursor-pointer flex items-center justify-center gap-2.5 shadow-xs"
                >
                  <Laptop className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>تنزيل اختصار سطح المكتب المباشر (.url) بنقرة واحدة</span>
                </button>
              )}
            </div>

            {shortcutDownloaded && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>تم تنزيل اختصار سطح المكتب بنجاح! ستجده في مجلد التنزيلات (Downloads)، اسحبه لسطح مكتبك وافتحه في أي وقت.</span>
              </div>
            )}

            {installSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>تم إرسال أمر التثبيت بنجاح! تفقد شاشتك أو سطح المكتب.</span>
              </div>
            )}

            {/* تبويبات التبديل بين الأجهزة */}
            <div className="pt-2 space-y-4">
              <div className="flex rounded-2xl border border-stone-200 bg-stone-100/70 p-1 text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'desktop'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Laptop className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>اللابتوب والحاسوب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'android'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>أندرويد (Android)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'ios'
                      ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span>آيفون وآيباد (iOS)</span>
                </button>
              </div>

              {/* خطوات الحاسوب واللابتوب */}
              {activeTab === 'desktop' && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 dark:border-teal-950 dark:bg-teal-950/20 p-4 space-y-3.5 text-xs sm:text-sm">
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">١</span>
                    <span>
                      <strong className="text-teal-900 dark:text-teal-100">من شريط العنوان بالمتصفح (Chrome أو Edge):</strong> انظر إلى نهاية شريط الرابط بالأعلى ستجد أيقونة شاشة بسهم <span className="font-mono bg-teal-200/60 dark:bg-teal-900/60 px-1 rounded">⤓</span> أو علامة <span className="font-mono bg-teal-200/60 dark:bg-teal-900/60 px-1 rounded">⊕</span> بعنوان «تثبيت تطبيق سَنَد».
                    </span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٢</span>
                    <span>
                      <strong className="text-teal-900 dark:text-teal-100">أو من قائمة المتصفح (⋮):</strong> اضغط على النقاط الثلاث أعلى زاوية المتصفح واختر «تثبيت تطبيق سَنَد» أو «حفظ ومشاركة ⇦ تثبيت المنصة كتطبيق».
                    </span>
                  </div>
                  <div className="font-bold text-teal-950 dark:text-teal-200 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white text-[11px]">٣</span>
                    <span>
                      <strong className="text-teal-900 dark:text-teal-100">أو تنزيل اختصار فوري:</strong> اضغط على زر «تنزيل اختصار سطح المكتب المباشر» أعلاه لتحصل على أيقونة مباشرة على حاسوبك فوراً دون خطوات.
                    </span>
                  </div>
                </div>
              )}

              {/* خطوات أندرويد */}
              {activeTab === 'android' && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">١</span>
                    <span>في متصفح Chrome أو Samsung Internet: اضغط على الزر الأخضر أعلاه (تثبيت التطبيق).</span>
                  </div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">٢</span>
                    <span>أو من قائمة المتصفح (الثلاث نقاط ⋮ أعلى الشاشة)، اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
                  </div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[11px]">٣</span>
                    <span>سيظهر تطبيق «سَنَد» بأيقونته الخضراء المذهبة على شاشتك كأي تطبيق أصلي تماماً.</span>
                  </div>
                </div>
              )}

              {/* خطوات آيفون وآيباد */}
              {activeTab === 'ios' && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-950 dark:bg-amber-950/20 space-y-3 text-xs sm:text-sm">
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">١</span>
                    <span>افتح المنصة في متصفح Safari على جهاز الآيفون أو الآيباد.</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٢</span>
                    <span>اضغط على أيقونة المشاركة (مربع بسهم لأعلى ⎋) في شريط المتصفح السفلي.</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٣</span>
                    <span>مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية ＋» (Add to Home Screen).</span>
                  </div>
                  <div className="font-bold text-amber-950 dark:text-amber-300 flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[11px]">٤</span>
                    <span>اضغط «إضافة» (Add) في الزاوية العلوية، وسيثبت تطبيق «سَنَد» فوراً على شاشة هاتفك!</span>
                  </div>
                </div>
              )}
            </div>

            {/* أدوات إضافية: نسخ الرابط للمشاركة */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <span>رابط المنصة السريع للمشاركة:</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>تم نسخ الرابط!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ رابط المنصة</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════
          ميزات التطبيق على الجهاز
      ═══════════════════════════════════════════════════ */}
      <section className="pt-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            لماذا تثبت تطبيق «سَنَد» على جهازك؟
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            صُمم ليكون رفيق مدارستك اليومية في حلقات المساجد والبيوت والأسفار
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/90 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">تصفح سريع وخفيف</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              احفظ متونك وفوائدك العلمية وارجع إليها في أي وقت ومن أي جهاز بكل سهولة ويسر وبدون ثقل المتصفحات.
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
              تحميل شهادات ضبط المتون والإجازات مع رمز QR الموثق برقم تسلسلي معتمد مباشرة.
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

      {/* ═══════════════════════════════════════════════════
          نافذة المرشد التفاعلي الراقي (بديل alert المزعج)
      ═══════════════════════════════════════════════════ */}
      {showModal !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowModal('none')}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* زر الإغلاق */}
            <button
              onClick={() => setShowModal('none')}
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>

            {/* محتوى نافذة الحاسوب واللابتوب */}
            {showModal === 'desktop' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                      تثبيت تطبيق سَنَد على اللابتوب / الحاسوب
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      اختر الطريقة الأنسب لك لتشغيل المنصة كتطبيق مستقل
                    </p>
                  </div>
                </div>

                {/* الخيار الأول: شريط العنوان */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40 space-y-2">
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">١</span>
                    <span>من شريط عنوان المتصفح بالأعلى (Chrome / Edge)</span>
                  </div>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-300/90 leading-relaxed">
                    انظر إلى أعلى نافذة المتصفح الحالية، في أقصى يمين أو يسار شريط الرابط، ستجد أيقونة تثبيت صغيرة <span className="font-mono bg-emerald-200/80 dark:bg-emerald-900 px-1 rounded font-bold">⤓</span> أو شاشة بسهم لأسفل. اضغط عليها واختر «تثبيت» (Install).
                  </p>
                </div>

                {/* الخيار الثاني: تنزيل اختصار سطح المكتب */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-850 space-y-2.5">
                  <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-700 text-white text-[10px]">٢</span>
                    <span>أو تنزيل اختصار فوري لسطح المكتب بنقرة واحدة</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    يمكنك تنزيل ملف الاختصار المباشر، ثم سحبه إلى سطح المكتب لتشغيل سَنَد بنقرة مزدوجة في أي وقت:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadDesktopShortcut()
                      setShowModal('none')
                    }}
                    className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download className="h-4 w-4 text-amber-300" />
                    <span>تنزيل أيقونة اختصار سطح المكتب الآن (.url)</span>
                  </button>
                </div>
              </div>
            )}

            {/* محتوى نافذة أندرويد */}
            {showModal === 'android' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                      تثبيت سَنَد على هاتف أندرويد
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      خطوات بسيطة لتثبيت التطبيق على شاشتك الرئيسية
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-850 space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">١</span>
                    <span>اضغط على قائمة المتصفح (الثلاث نقاط ⋮ أعلى زاوية الشاشة).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">٢</span>
                    <span>اختر خيار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» (Add to Home screen).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">٣</span>
                    <span>اضغط «تثبيت» وسينزل التطبيق فوراً بأيقونته الرسمية على شاشتك.</span>
                  </div>
                </div>
              </div>
            )}

            {/* محتوى نافذة آيفون */}
            {showModal === 'ios' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                      تثبيت سَنَد على آيفون وآيباد (Safari)
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      تثبيت التطبيق من خلال متصفح سفاري
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-850 space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[10px]">١</span>
                    <span>افتح المنصة من خلال متصفح Safari على جهازك.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[10px]">٢</span>
                    <span>اضغط على زر المشاركة أسفل الشاشة (أيقونة المربع مع سهم لأعلى ⎋).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[10px]">٣</span>
                    <span>مرر للأسفل في القائمة واختر «إضافة إلى الشاشة الرئيسية ＋» (Add to Home Screen).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white text-[10px]">٤</span>
                    <span>اضغط «إضافة» في الزاوية العلوية، وسيثبت التطبيق على هاتفك تماماً كأي تطبيق من المتجر.</span>
                  </div>
                </div>
              </div>
            )}

            {/* زر الإغلاق السفلي */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal('none')}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                فهمت ذلك، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
