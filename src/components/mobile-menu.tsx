'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  Home,
  Compass,
  GitFork,
  Users,
  User,
  FileText,
  LogIn,
  Copy,
  Check,
  BookOpen,
  HeartHandshake,
  Moon,
  Sun,
  Mail,
  Smartphone,
} from 'lucide-react'
import LogoutButton from '@/components/logout-button'
import PwaInstallButton from '@/components/pwa-install-button'

interface MobileMenuProps {
  isLoggedIn: boolean
  userName?: string
  userEmail?: string
  scholarlyId?: string
  signOutAction: () => Promise<void>
}

export default function MobileMenu({
  isLoggedIn,
  userName,
  userEmail,
  scholarlyId,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // تزامن حالة النمط النهاري والليلي
  useEffect(() => {
    setMounted(true)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sanad_theme') : null
    if (stored === 'dark') {
      setIsDark(true)
    } else {
      setIsDark(false)
      if (!stored && typeof window !== 'undefined') {
        localStorage.setItem('sanad_theme', 'light')
      }
    }
  }, [])

  const toggleTheme = () => {
    const nextState = !isDark
    setIsDark(nextState)
    if (nextState) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('sanad_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('sanad_theme', 'light')
    }
  }

  // أغلق القائمة عند الانتقال لصفحة جديدة
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // منع تمرير الصفحة خلف القائمة وإغلاقها بزر Escape
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const copyScholarlyId = () => {
    const idToCopy = scholarlyId || 'SND-1001'
    navigator.clipboard?.writeText(idToCopy).then(() => {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    })
  }

  const navLinks = [
    {
      href: '/',
      label: 'الرئيسية',
      sub: 'الصفحة المستقيمة',
      icon: Home,
    },
    {
      href: '/courses',
      label: 'فهرس المتون',
      sub: '78 متناً تأصيلياً',
      icon: Compass,
    },
    {
      href: '/roadmap',
      label: 'خارطة الطريق',
      sub: 'المسار المنهجي المتدرج',
      icon: GitFork,
    },
    {
      href: '/community',
      label: 'مجلس المذاكرة',
      sub: 'تنافس ومدارسة علمية',
      icon: Users,
    },
    {
      href: '/dashboard',
      label: 'كشكول الطالب',
      sub: 'الفوائد والشوارد والأثر',
      icon: FileText,
    },
    {
      href: '/inbox',
      label: 'بريد سَنَد العلمي',
      sub: 'الرسائل ورموز الأمان (Gmail)',
      icon: Mail,
    },
    {
      href: '/download',
      label: 'تحميل تطبيق سَنَد',
      sub: 'تثبيت على الهاتف كأي تطبيق (📱 App)',
      icon: Smartphone,
    },
  ]

  const displayId =
    scholarlyId ||
    (userEmail
      ? `SND-${Math.abs(
          userEmail
            .split('')
            .reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000 + 1000
        )}`
      : 'SND-1001')

  return (
    <>
      {/* زر الهامبرجر المخصص للجوال والشاشات الصغيرة */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة الرئيسية'}
        aria-expanded={isOpen}
        aria-controls="sanad-mobile-drawer"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-250 bg-white/95 text-stone-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-950 hover:border-emerald-300 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900/95 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* الستار ودرج القائمة المصمت يُعرضان عبر Portal مباشرة في body لعزل تام عن أي تداخل */}
      {isOpen &&
        mounted &&
        createPortal(
          <div className="sanad-drawer-portal fixed inset-0 z-[9999] pointer-events-auto">
            {/* الستار المعتم المانع لأي تداخل مع الصفحة في الخلفية */}
            <div
              className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* درج القائمة المصمت بتصميم سَنَد التراثي المتناسق */}
            <nav
              id="sanad-mobile-drawer"
              role="navigation"
              aria-label="القائمة الرئيسية للجوال"
              className="sanad-mobile-drawer fixed top-0 bottom-0 right-0 flex h-full w-[320px] max-w-[86vw] flex-col bg-[#faf7f2] dark:bg-[#161412] text-stone-900 dark:text-stone-100 border-l border-stone-300/80 dark:border-stone-800 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
            >
              {/* شريط تذهيب علوي فاخر */}
              <div className="h-1 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950 shrink-0" />

              {/* ترويسة القائمة: الشعار وزر الإغلاق */}
              <div className="flex items-center justify-between border-b border-stone-200/80 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-4 py-3 dark:border-stone-800 shrink-0">
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-xs border border-emerald-700/40">
                    <BookOpen className="h-4.5 w-4.5 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-lg font-black font-amiri text-stone-900 dark:text-white leading-tight">سَنَد</span>
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 leading-normal">تأصيل منهجي لطلب العلم</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all dark:border-stone-750 dark:bg-stone-850 dark:text-stone-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 cursor-pointer shadow-2xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* محتوى القائمة القابل للتمرير بأمان تام */}
              <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
                {/* بطاقة هوية طالب العلم (عند تسجيل الدخول) */}
                {isLoggedIn ? (
                  <div className="rounded-2xl border border-emerald-300/60 bg-linear-to-b from-white to-emerald-50/40 p-3.5 shadow-2xs dark:border-emerald-900/50 dark:from-stone-900 dark:to-emerald-950/20">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 font-black text-base shadow-xs border border-emerald-700/40">
                        {userName ? userName.trim().charAt(0) : 'ط'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400">طالب علم موثق</span>
                        </div>
                        <p className="text-xs font-black text-stone-900 dark:text-white truncate">
                          {userName || 'طالب العلم'}
                        </p>
                      </div>
                    </div>

                    {/* المعرف الأكاديمي الموحد */}
                    <div className="flex items-center justify-between rounded-xl bg-white/90 border border-emerald-250/70 px-2.5 py-1.5 dark:bg-stone-850 dark:border-stone-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">المعرف:</span>
                        <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 tracking-wider">
                          #{displayId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copyScholarlyId}
                        title="نسخ المعرف الأكاديمي"
                        className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 dark:text-emerald-300 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 transition cursor-pointer"
                      >
                        {copiedId ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                            <span>تم النسخ ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-250 bg-white/90 p-3.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-black text-stone-900 dark:text-white">
                        حيّاك الله في منصة سَنَد
                      </p>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                      سجّل دخولك لحفظ مسارك، وتدوين فوائدك، والارتقاء في مراتب الإسناد.
                    </p>
                  </div>
                )}

                {/* روابط التصفح الأساسية */}
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-950/70 dark:text-emerald-400">
                    أبواب المنصة التأصيلية
                  </p>
                  <ul className="space-y-1.5">
                    {navLinks.map(({ href, label, sub, icon: Icon }) => {
                      const isActive = pathname === href
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setIsOpen(false)}
                            className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all
                              ${isActive
                                ? 'bg-linear-to-l from-emerald-900 to-teal-950 text-white shadow-sm border border-emerald-700/50'
                                : 'bg-white/70 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 hover:text-emerald-950 dark:hover:text-white hover:border-emerald-300 dark:hover:border-emerald-700/50 shadow-2xs'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors shrink-0
                                  ${isActive
                                    ? 'bg-white/15 text-amber-300 border border-white/20'
                                    : 'bg-stone-100 text-emerald-800 group-hover:bg-emerald-100 group-hover:text-emerald-950 dark:bg-stone-800 dark:text-emerald-400 dark:group-hover:bg-emerald-950'
                                  }
                                `}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate leading-snug font-black">{label}</span>
                                <span
                                  className={`text-[10px] truncate leading-tight font-medium
                                    ${isActive ? 'text-emerald-200/90' : 'text-stone-400 dark:text-stone-500'}
                                  `}
                                >
                                  {sub}
                                </span>
                              </div>
                            </div>

                            {isActive && (
                              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 shadow-2xs" />
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* أدوات سريعة داخل القائمة: نمط القراءة ودعم المنصة */}
                <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 space-y-2">
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    أدوات وتفضيلات
                  </p>

                  <PwaInstallButton variant="full" />

                  {mounted && (
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200/80 bg-white/70 dark:bg-stone-850/60 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-white hover:border-emerald-300 transition cursor-pointer dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        {isDark ? (
                          <Sun className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Moon className="h-4 w-4 text-stone-600" />
                        )}
                        <span>نمط العرض: {isDark ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400">
                        {isDark ? 'تبديل للنهاري' : 'تبديل لليلي'}
                      </span>
                    </button>
                  )}

                  <div className="rounded-xl border border-amber-400/40 bg-linear-to-br from-amber-50 to-orange-50/40 p-2.5 dark:border-amber-700/40 dark:from-amber-950/30 dark:to-stone-900 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                      <HeartHandshake className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-bold">دعم المنصة ووقفها العلمي</span>
                    </div>
                    <p className="mt-1 text-[10px] text-stone-600 dark:text-stone-400">
                      اتصالات كاش: <span className="font-mono font-bold text-amber-800 dark:text-amber-400">01140373702</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* أسفل الدرج: إعدادات الحساب وتسجيل الخروج المتناسق */}
              <div className="border-t border-stone-200/80 bg-white/70 dark:bg-stone-900/70 p-3.5 dark:border-stone-800 shrink-0 space-y-2.5">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/settings"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-stone-250 px-4 py-2.5 text-xs font-bold text-stone-800 shadow-2xs hover:bg-emerald-50 hover:text-emerald-950 hover:border-emerald-400 transition cursor-pointer dark:bg-stone-850 dark:border-stone-750 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-emerald-300"
                    >
                      <User className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span>إعدادات الحساب</span>
                    </Link>
                    <div className="w-full">
                      <LogoutButton
                        variant="full"
                        showText={true}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-900 transition-all cursor-pointer dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 shadow-2xs"
                      />
                    </div>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-900 to-teal-950 px-4 py-2.5 text-xs font-black text-white shadow-xs border border-emerald-700/40 hover:from-emerald-950 hover:to-teal-900 transition cursor-pointer"
                  >
                    <LogIn className="h-4 w-4 text-amber-300" />
                    <span>تسجيل الدخول إلى المنصة</span>
                  </Link>
                )}

                <p className="text-center text-[10px] font-medium text-stone-400 dark:text-stone-500">
                  منصة سَنَد للتعليم والتأصيل الشرعي
                </p>
              </div>
            </nav>
          </div>,
          document.body
        )}
    </>
  )
}
