'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, GitFork, Users, FileText, LogIn } from 'lucide-react'

interface BottomNavProps {
  isLoggedIn: boolean
}

export default function BottomNav({ isLoggedIn }: BottomNavProps) {
  const pathname = usePathname()

  // إخفاء الشريط في صفحات العرض الكامل للفيديو المباشر وصفحة الدخول أو البوابات الإدارية المعزولة
  const isHidden = pathname?.startsWith('/sanad-control-gate') || pathname?.startsWith('/login')

  if (isHidden) return null

  const navItems = [
    {
      href: '/',
      label: 'الرئيسية',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/courses',
      label: 'المتون',
      icon: Compass,
      isActive: pathname.startsWith('/courses'),
    },
    {
      href: '/roadmap',
      label: 'الخارطة',
      icon: GitFork,
      isActive: pathname.startsWith('/roadmap'),
    },
    {
      href: '/community',
      label: 'المذاكرة',
      icon: Users,
      isActive: pathname.startsWith('/community'),
    },
    isLoggedIn
      ? {
          href: '/dashboard',
          label: 'الكشكول',
          icon: FileText,
          isActive: pathname.startsWith('/dashboard'),
        }
      : {
          href: '/login',
          label: 'دخول',
          icon: LogIn,
          isActive: pathname.startsWith('/login'),
        },
  ]

  return (
    <nav
      aria-label="شريط التنقل السفلي السريع للجوال"
      className="no-print fixed bottom-0 inset-x-0 z-40 block lg:hidden border-t border-stone-200/80 bg-[#fdfbf7]/95 backdrop-blur-xl transition-all duration-300 dark:border-stone-800 dark:bg-[#191715]/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex h-15 items-center justify-around px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 select-none ${
                active
                  ? 'text-emerald-900 dark:text-emerald-400 font-black'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 font-semibold'
              }`}
            >
              <div
                className={`relative flex h-8 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                  active
                    ? 'bg-emerald-100/80 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-2xs scale-105'
                    : 'text-stone-500 group-hover:bg-stone-100/60 dark:text-stone-400 dark:group-hover:bg-stone-800/50'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 transition-transform duration-200 stroke-[2.2] ${
                    active ? 'scale-110 text-emerald-800 dark:text-emerald-300' : ''
                  }`}
                />
                {active && (
                  <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </div>
              <span className="mt-1 text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
