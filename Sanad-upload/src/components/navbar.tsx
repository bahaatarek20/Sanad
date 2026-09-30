import Link from 'next/link'
import { BookOpen, Compass, Flame, User, LogOut, Users, FileText, LogIn, ShieldCheck, Map, GitFork } from 'lucide-react'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { signOutAction } from '@/app/login/actions'
import ThemeToggle from '@/components/theme-toggle'
import PomodoroTimer from '@/components/pomodoro-timer'
import MobileMenu from '@/components/mobile-menu'
import AiTriggerButton from '@/components/ai-trigger-button'
import InboxDropdown from '@/components/inbox-dropdown'
import { getStudentProfileData } from '@/lib/student-tracking'

export default async function Navbar() {
  const user = await getCurrentStudentUser()
  let scholarlyId: string | undefined
  if (user?.email) {
    const profile = getStudentProfileData(user.email)
    scholarlyId = profile?.scholarlyId
  }

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
          {/* حزمة أدوات المدارسة التفاعلية */}
          <div className="flex items-center gap-1">
            <AiTriggerButton />
            <PomodoroTimer />
          </div>

          {/* فاصل رأسي خفيف */}
          <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-stone-800" />

          {/* التفضيلات والحساب */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <InboxDropdown />

            {user ? (
              <div className="hidden md:flex items-center gap-1">
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

                {/* زر الخروج */}
                <form action={signOutAction} className="inline-flex">
                  <button
                    type="submit"
                    title="تسجيل الخروج"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/90 bg-white/90 text-stone-400 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:hover:text-rose-400 dark:hover:bg-rose-950/50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                {/* زر كشكول الطالب المستقل */}
                <Link
                  href="/dashboard"
                  title="كشكول الفوائد والشوارد"
                  className="flex h-8 items-center gap-1 rounded-lg border border-stone-200/90 bg-white/90 px-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:border-amber-500 hover:text-amber-900 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-amber-300"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>الكشكول</span>
                </Link>

                {/* زر تسجيل الدخول */}
                <Link
                  href="/login"
                  title="تسجيل الدخول إلى المنصة"
                  className="flex h-8 items-center gap-1 rounded-lg bg-emerald-900 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800 dark:hover:bg-emerald-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>دخول</span>
                </Link>
              </div>
            )}
          </div>

          {/* زر الهامبرجر للجوال — يظهر فقط تحت lg */}
          <div className="lg:hidden">
            <MobileMenu
              isLoggedIn={!!user}
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