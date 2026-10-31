'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface FooterVisibilityGuardProps {
  initialIsLoggedIn: boolean
  children: React.ReactNode
}

export default function FooterVisibilityGuard({
  initialIsLoggedIn,
  children,
}: FooterVisibilityGuardProps) {
  const pathname = usePathname()
  const [clientLoggedIn, setClientLoggedIn] = useState(initialIsLoggedIn)

  useEffect(() => {
    const checkLogin = () => {
      try {
        const storedUser = localStorage.getItem('sanad_student_user_info')
        const hasOwnerFlag = localStorage.getItem('sanad_is_platform_owner') === 'true'
        const hasCookie =
          document.cookie.includes('sanad_student_user') ||
          document.cookie.includes('sanad_admin_gate_token')
        setClientLoggedIn(Boolean(initialIsLoggedIn || storedUser || hasOwnerFlag || hasCookie))
      } catch {
        setClientLoggedIn(initialIsLoggedIn)
      }
    }

    checkLogin()
    window.addEventListener('storage', checkLogin)
    return () => window.removeEventListener('storage', checkLogin)
  }, [pathname, initialIsLoggedIn])

  // إخفاء الفوتر نهائياً في صفحة التسجيل والدخول أو في حال لم يتم تسجيل الدخول للمنصة بعد
  const isAuthPage =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')

  if (isAuthPage || !clientLoggedIn) {
    return null
  }

  return <>{children}</>
}
