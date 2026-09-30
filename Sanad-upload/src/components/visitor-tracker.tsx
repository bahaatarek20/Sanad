'use client'

import { useEffect } from 'react'

export default function VisitorTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. إذا كان هذا المتصفح محفوظاً كمتصفح صاحب المنصة / المشرف العام
    if (
      localStorage.getItem('sanad_is_platform_owner') === 'true' ||
      document.cookie.includes('sanad_admin_gate_token') ||
      document.cookie.includes('sanad_is_platform_owner')
    ) {
      localStorage.setItem('sanad_is_platform_owner', 'true')
      return
    }

    // 2. إذا احتُسبت الزيارة بالفعل في جلسة المتصفح الحالية
    if (sessionStorage.getItem('sanad_visit_logged') === 'true') {
      return
    }

    // 3. إرسال طلب احتساب الزيارة للتحقق الخادمي
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.counted) {
          sessionStorage.setItem('sanad_visit_logged', 'true')
        } else if (
          data.reason === 'owner_excluded' ||
          data.reason === 'owner_account_excluded'
        ) {
          localStorage.setItem('sanad_is_platform_owner', 'true')
        } else if (data.reason === 'already_counted_in_session') {
          sessionStorage.setItem('sanad_visit_logged', 'true')
        }
      })
      .catch(() => {})
  }, [])

  return null
}
