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
      }
    } catch {}
  }, [user])

  return null
}
