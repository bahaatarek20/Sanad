'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // لا نحتسب زيارات صفحة لوحة التحكم الإدارية نفسها
    if (pathname?.startsWith('/sanad-control-gate') || pathname?.startsWith('/admin')) {
      return
    }

    // إذا احتُسبت الزيارة بالفعل في جلسة المتصفح الحالية
    if (sessionStorage.getItem('sanad_visit_logged') === 'true') {
      return
    }

    // إرسال طلب احتساب الزيارة للتحقق الخادمي الدقيق (يميز المسجل والزائر بدون تسجيل ويستثني جلسة المالك النشطة)
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname || '/' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.counted || data.reason === 'already_counted_in_session') {
          sessionStorage.setItem('sanad_visit_logged', 'true')
        }
      })
      .catch(() => {})
  }, [pathname])

  return null
}
