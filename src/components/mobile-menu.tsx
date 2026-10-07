'use client'

import { useState, useEffect } from 'react'
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
  LogOut,
  Copy,
  Check,
  BookOpen,
  HeartHandshake,
  Moon,
  Sun,
  ShieldCheck,
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
  signOutAction,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // تزامن حالة النمط النهاري والليلي (افتراضياً النهاري دائماً للزوار الجدد)
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

  const displayId = scholarlyId || (userEmail ? `SND-${Math.abs(userEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000 + 1000)}` : 'SND-1001')

  return (
    <>
      {/* زر الهامبرجر المخصص للجوال والشاشات الصغيرة */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة الرئيسية'}
        aria-expanded={isOpen}
        aria-controls="sanad-mobile-drawer"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/90 bg-white/95 text-stone-700 shadow-2xs hover:bg-stone-100 hover:text-emerald-950 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900/95 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* الستار المعتم المانع لأي شفافية في الخلفية */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* درج القائمة المصمت بتصميم سَنَد التراثي المتناسق */}
      <nav
        id="sanad-mobile-drawer"
        role="navigation"
        aria-label="القائمة الرئيسية للجوال"
        className={`
          sanad-mobile-drawer
          fixed top-0 bottom-0 right-0 z-50 flex h-full w-[310px] max-w-[85vw] flex-col
          bg-[#faf8f5] dark:bg-stone-900 text-stone-900 dark:text-stone-100
          border-l border-stone-200/90 shadow-2xl transition-transform duration-300 ease-out
          dark:border-stone-800
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ترويسة القائمة: الشعار وزر الإغلاق */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3.5 dark:border-stone-800 shrink-0">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-xs border border-emerald-700/40">
              <BookOpen className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-lg font-bold text-stone-900 dark:text-white leading-tight">سَنَد</span>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 leading-normal">تأصيل منهجي لطلب العلم</span>
            </div>
          </Link>

          <button
            onClick={() => setIsOpen(false)}
            aria-label="إغلاق القائمة"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-100/80 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* محتوى القائمة القابل للتمرير بأمان */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
          
          {/* بطاقة هوية طالب العلم (عند تسجيل الدخول) */}
          {isLoggedIn ? (
            <div className="rounded-2xl border border-stone-200/90 bg-white/95 p-3 shadow-2xs dark:border-stone-800 dark:bg-stone-900/95">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-amber-300 font-black text-sm shadow-xs border border-emerald-700/30">
                  {userName ? userName.trim().charAt(0) : 'ط'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">طالب علم موثق</span>
                  </div>
                  <p className="text-xs font-black text-stone-900 dark:text-white truncate">
                    {userName || 'طالب العلم'}
                  </p>
                </div>
              </div>

              {/* المعرف الأكاديمي الموحد */}
              <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-200/70 px-2.5 py-1.5 dark:bg-stone-850 dark:border-stone-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">المعرف:</span>
                  <span className="font-mono text-xs font-extrabold text-amber-700 dark:text-amber-400 tracking-wider">
                    #{displayId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyScholarlyId}
                  title="نسخ المعرف الأكاديمي"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-stone-600 hover:text-emerald-800 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-emerald-300 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  {copiedId ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم</span>
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
            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 shadow-2xs dark:border-stone-800 dark:bg-stone-900/80">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  مرحباً بك في سَنَد
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                سجّل دخولك لمتابعة إنجازك في المتون، وتدوين فوائدك في كشكولك الخاص.
              </p>
            </div>
          )}

          {/* روابط التصفح الأساسية */}
          <div>
            <p className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              أبواب المنصة
            </p>
            <ul className="space-y-1">
              {navLinks.map(({ href, label, sub, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all
                        ${isActive
                          ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-900/90 dark:text-emerald-50 dark:border dark:border-emerald-700/50'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-emerald-950 dark:text-stone-300 dark:hover:bg-stone-800/80 dark:hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0
                            ${isActive
                              ? 'bg-emerald-800 text-amber-300 border border-emerald-700/50'
                              : 'bg-stone-100 text-stone-500 group-hover:bg-emerald-50 group-hover:text-emerald-800 dark:bg-stone-850 dark:text-stone-400 dark:group-hover:bg-stone-800 dark:group-hover:text-emerald-300'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate leading-snug">{label}</span>
                          <span
                            className={`text-[10px] truncate leading-tight font-medium
                              ${isActive ? 'text-emerald-200/80' : 'text-stone-400 dark:text-stone-500'}
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
          <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800 space-y-2">
            <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              أدوات وتفضيلات
            </p>

            {/* زر تثبيت تطبيق سَنَد المباشر */}
            <PwaInstallButton variant="full" />

            {/* زر تبديل النمط الليلي / النهاري */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-800 dark:bg-stone-850 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-stone-600" />
                  )}
                  <span>نمط العرض: {isDark ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                  {isDark ? 'تبديل للنهاري' : 'تبديل لليلي'}
                </span>
              </button>
            )}

            {/* بطاقة دعم المنصة السريعة برقم اتصالات كاش */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-50/60 p-2.5 dark:border-amber-500/20 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <HeartHandshake className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold">دعم المنصة ووقفها العلمي</span>
              </div>
              <p className="mt-1 text-[10px] text-stone-600 dark:text-stone-400">
                اتصالات كاش: <span className="font-mono font-bold text-amber-700 dark:text-amber-400">01140373702</span>
              </p>
            </div>
          </div>

        </div>

        {/* أسفل الدرج: تسجيل الدخول أو الخروج */}
        <div className="border-t border-stone-200/80 p-3.5 dark:border-stone-800 shrink-0 space-y-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
              >
                <User className="h-4 w-4" />
                <span>إعدادات الحساب</span>
              </Link>
            <div className="w-full">
              <LogoutButton variant="full" showText={true} />
            </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-900 to-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs border border-emerald-700/40 hover:from-emerald-950 hover:to-emerald-900 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>تسجيل الدخول إلى المنصة</span>
            </Link>
          )}

          <p className="text-center text-[10px] font-medium text-stone-400 dark:text-stone-500">
            منصة سَنَد · بإشراف المهندس بهاء طارق
          </p>
        </div>
      </nav>
    </>
  )
}
