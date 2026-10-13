'use client'

import { useEffect } from 'react'

interface SessionStorageSyncProps {
  user: {
    email: string
    fullName?: string
    phone?: string
    authProvider?: string
    avatarUrl?: string
  } | null
}

export default function SessionStorageSync({ user }: SessionStorageSyncProps) {
  useEffect(() => {
    try {
      if (user && user.email) {
        localStorage.setItem(
          'sanad_student_user',
          JSON.stringify({
            email: user.email,
            fullName: user.fullName || user.email.split('@')[0],
            phone: user.phone,
            authProvider: user.authProvider || 'email',
            avatarUrl: user.avatarUrl,
          })
        )
        localStorage.setItem('sanad_student_registered', 'true')
        // مسح علامة الخروج السابقة لأن المستخدم سجل دخوله الآن بنجاح
        document.cookie = 'sanad_explicit_logout=; path=/; max-age=0;'
      } else {
        // إذا كان المستخدم غير مسجل، أو تم تسجيل الخروج، نمسح التخزين المحلي فوراً
        const hasLogoutMarker = document.cookie.includes('sanad_explicit_logout=true')
        const hasDisplayCookie = document.cookie.includes('sanad_student_display=')
        if (hasLogoutMarker || !hasDisplayCookie) {
          localStorage.removeItem('sanad_student_user')
          localStorage.removeItem('sanad_student_registered')
        }
      }
    } catch {}
  }, [user])

  return null
}
