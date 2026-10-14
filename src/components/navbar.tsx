import Link from 'next/link'
import { BookOpen, Compass, User, Users, FileText, LogIn, GitFork, ShieldCheck } from 'lucide-react'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { signOutAction } from '@/app/login/actions'
import LogoutButton from '@/components/logout-button'
import ThemeToggle from '@/components/theme-toggle'
import PomodoroTimer from '@/components/pomodoro-timer'
import MobileMenu from '@/components/mobile-menu'
import AiTriggerButton from '@/components/ai-trigger-button'
import InboxDropdown from '@/components/inbox-dropdown'
import PwaInstallButton from '@/components/pwa-install-button'
import { getStudentProfileData } from '@/lib/student-tracking'

export default async function Navbar() {
  const user = await getCurrentStudentUser()
  let scholarlyId: string | undefined
  if (user?.email) {
    const profile = getStudentProfileData(user.email)
    scholarlyId = profile?.scholarlyId
  }

  const cleanUserEmail = (user?.email || '').toLowerCase().trim()
  const isAdmin =
    user?.role === 'admin' ||
    cleanUserEmail === 'bhaaljml480@gmail.com' ||
    cleanUserEmail === 'bhaaljml48@gmail.com' ||
    cleanUserEmail === 'bhaaljml66@gmail.com' ||
    cleanUserEmail === 'bhaaljml3@gmail.com' ||
    cleanUserEmail === 'bhaaljml62@gmail.com'

  return (
    <header className="no-print sticky top-0 z-50 w-full border-b border-stone-200/80 bg-[#fdfbf7]/95 backdrop-blur-md transition-colors duration-300 dark:border-stone-800 dark:bg-[#1c1917]/95">
      <div className="container mx-auto flex h-13 sm:h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        
        {/* الشعار بروح السند والتأصيل العريق */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.01] shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-2xs border border-emerald-700/40">
              <BookOpen className="h-4 w-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-base sm:text-lg font-bold font-amiri text-stone-900 dark:text-white leading-tight">سَنَد</span>
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 leading-tight">تأصيل منهجي</span>
            </div>
          </Link>

          {/* روابط التصفح الرشيقة — متناسقة بدون أخذ مساحة ضخمة */}
          <nav className="hidden lg:flex items-center gap-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300" aria-label="التنقل الرئيسي">
            <Link href="/" className="rounded-lg px-2.5 py-1 transition hover:text-emerald-900 hover:bg-stone-100/80 dark:hover:text-emerald-400 dark:hover:bg-stone-800/60">
              الرئيسية
            </Link>
            <Link href="/courses" className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition hover:text-emerald-900 hover:bg-stone-100/80 dark:hover:text-emerald-400 dark:hover:bg-stone-800/60">
              <Compass className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>فهرس المتون</span>
            </Link>
            <Link href="/roadmap" className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition hover:text-emerald-900 hover:bg-stone-100/80 dark:hover:text-emerald-400 dark:hover:bg-stone-800/60">
              <GitFork className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>خارطة الطريق</span>
            </Link>
            <Link href="/community" className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition hover:text-emerald-900 hover:bg-stone-100/80 dark:hover:text-emerald-400 dark:hover:bg-stone-800/60">
              <Users className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              <span>مجلس المذاكرة</span>
            </Link>
          </nav>
        </div>

        {/* أدوات الطالب المضبوطة بحجم مدمج وأنيق */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              {/* حزمة أدوات المدارسة التفاعلية للطالب المسجل */}
              <div className="flex items-center gap-1">
                <AiTriggerButton />
                <div className="hidden sm:block">
                  <PomodoroTimer />
                </div>
              </div>

              {/* فاصل رأسي خفيف */}
              <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-stone-800" />

              {/* التفضيلات والحساب وتثبيت التطبيق */}
              <div className="flex items-center gap-1">
                <div className="hidden sm:block">
                  <PwaInstallButton />
                </div>
                <ThemeToggle />
                <InboxDropdown />

                <div className="hidden md:flex items-center gap-1.5">
                  {/* زر لوحة التحكم للمشرف العام فقط */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      title="لوحة الإدارة والتحكم الشاملة (مشرف)"
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-linear-to-r from-amber-600 via-amber-700 to-emerald-900 px-3 text-xs font-black text-amber-100 shadow-xs hover:from-amber-500 hover:to-emerald-800 transition border border-amber-400/40"
                    >
                      <ShieldCheck className="h-4 w-4 text-amber-300" />
                      <span>لوحة التحكم</span>
                    </Link>
                  )}

                  {/* رابط كشكول الطالب الخاص */}
                  <Link
                    href="/dashboard"
                    title="كشكول الفوائد ومتابعة الإنجاز"
                    className="flex h-8 items-center gap-1 rounded-lg border border-stone-200/90 bg-white/90 px-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:border-amber-500 hover:text-amber-900 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-amber-300"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>الكشكول</span>
                  </Link>

                  {/* رابط إعدادات الحساب */}
                  <Link
                    href="/settings"
                    title="إعدادات الحساب والملف الشخصي"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/90 bg-white/90 text-stone-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition dark:border-stone-800 dark:bg-stone-900 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50"
                  >
                    <User className="h-3.5 w-3.5" />
                  </Link>

                  {/* زر الخروج الشامل والتبديل لحساب آخر */}
                  <LogoutButton />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <Link
                href="/login?mode=password"
                title="تسجيل الدخول"
                className="flex h-8 sm:h-8.5 items-center gap-1 rounded-xl border border-stone-200/90 bg-white/90 px-2 sm:px-3 text-xs font-bold text-stone-700 hover:border-emerald-700 hover:text-emerald-950 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <LogIn className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
                <span className="sm:hidden">دخول</span>
              </Link>
              <Link
                href="/login?mode=signup"
                title="إنشاء حساب جديد"
                className="flex h-8 sm:h-8.5 items-center gap-1 rounded-xl bg-linear-to-r from-emerald-800 to-emerald-950 px-2.5 sm:px-3.5 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-emerald-900 transition border border-emerald-600/30"
              >
                <User className="h-3.5 w-3.5 text-amber-300" />
                <span>إنشاء حساب</span>
              </Link>
            </div>
          )}

          {/* زر الهامبرجر للجوال — يظهر فقط تحت lg */}
          <div className="lg:hidden">
            <MobileMenu
              isLoggedIn={!!user}
              isAdmin={isAdmin}
              userName={user?.user_metadata?.full_name}
              userEmail={user?.email}
              scholarlyId={scholarlyId}
              signOutAction={signOutAction}
            />
          </div>

        </div>

      </div>
    </header>
  )
}