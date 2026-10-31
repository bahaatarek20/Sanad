'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()
  const lastTrackedPathRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // لا نحتسب زيارات صفحة لوحة التحكم الإدارية نفسها
    if (pathname?.startsWith('/sanad-control-gate') || pathname?.startsWith('/admin')) {
      return
    }

    const currentPath = pathname || '/'
    const isInitialSessionVisit = sessionStorage.getItem('sanad_visit_logged') !== 'true'
    const isNavigationChange = lastTrackedPathRef.current !== currentPath
    lastTrackedPathRef.current = currentPath

    const sendPresencePing = (eventType: 'visit' | 'navigation' | 'heartbeat') => {
      const pageTitle = typeof document !== 'undefined' ? document.title.split('|')[0]?.trim() : undefined
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: currentPath,
          pageTitle,
          eventType,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.counted || data.reason === 'already_counted_in_session') {
            sessionStorage.setItem('sanad_visit_logged', 'true')
          }
        })
        .catch(() => {})
    }

    // 1. إرسال إشارة فورية عند دخول الصفحة أو التنقل بين أقسام المنصة
    if (isInitialSessionVisit) {
      sendPresencePing('visit')
    } else if (isNavigationChange) {
      sendPresencePing('navigation')
    }

    // 2. نبض التواجد المباشر (Online Presence Heartbeat) كل 25 ثانية طالما الصفحة مفتوحة لمعرفة المتصلين الآن حياً
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendPresencePing('heartbeat')
      }
    }, 25000)

    // 3. تحديث التواجد فور عودة الطالب لنافذة المتصفح
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendPresencePing('heartbeat')
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [pathname])

  return null
}
