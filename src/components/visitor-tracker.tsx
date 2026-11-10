'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function getClientStudentUser(): { email?: string; name?: string } | null {
  try {
    if (typeof window === 'undefined') return null

    // 1. فحص كوكيز العرض المباشرة
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(/sanad_student_display=([^;]+)/)
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]))
          if (parsed?.email && typeof parsed.email === 'string') {
            return {
              email: parsed.email.toLowerCase().trim(),
              name: parsed.name || parsed.email.split('@')[0],
            }
          }
        } catch {}
      }
    }

    // 2. فحص كافة مفاتيح التخزين المحلي المحتملة
    for (const key of ['sanad_student_user', 'sanad_student_user_info', 'sanad_user']) {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          const em = parsed?.email || parsed?.user?.email
          if (em && typeof em === 'string' && em.includes('@')) {
            return {
              email: em.toLowerCase().trim(),
              name: parsed?.name || parsed?.fullName || parsed?.displayName || em.split('@')[0],
            }
          }
        } catch {}
      }
    }

    // 3. فحص البريد المباشر في التخزين المحلي
    const directEmail = localStorage.getItem('sanad_student_email') || localStorage.getItem('sanad_email')
    if (directEmail && directEmail.includes('@')) {
      return {
        email: directEmail.toLowerCase().trim(),
        name: localStorage.getItem('sanad_student_name') || directEmail.split('@')[0],
      }
    }
  } catch {}
  return null
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const pathnameRef = useRef<string>(pathname || '/')
  const lastTrackedPathRef = useRef<string>('')

  // تحديث المسار اللحظي دائماً في الـ Ref ليستخدمه المؤقت المستمر دون إعادة بناء الـ Interval
  useEffect(() => {
    pathnameRef.current = pathname || '/'
  }, [pathname])

  // 1. عداد جلسة طلب العلم المستمر عبر كامل صفحات المنصة (من أول فتح للمنصة وحتى الخروج النهائي)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // تثبيت أو استرجاع وقت بدء الجلسة في sessionStorage (يستمر عبر كل صفحات المنصة والتنقل)
    let sessionStart = 0
    try {
      const stored = sessionStorage.getItem('sanad_session_start_timestamp')
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed > 0) {
          sessionStart = parsed
        }
      }
      if (!sessionStart) {
        sessionStart = Date.now()
        sessionStorage.setItem('sanad_session_start_timestamp', String(sessionStart))
      }
    } catch {
      sessionStart = Date.now()
    }

    // تحديث الثواني المنقضية كل ثانية طالما المنصة مفتوحة وحفظها وبثها للواجهة
    const updateSessionElapsed = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000))
      try {
        sessionStorage.setItem('sanad_active_session_seconds', String(elapsed))
      } catch {}
      window.dispatchEvent(
        new CustomEvent('sanad_session_seconds_tick', { detail: { seconds: elapsed } })
      )
    }

    updateSessionElapsed()
    const secondTicker = setInterval(updateSessionElapsed, 1000)

    return () => {
      clearInterval(secondTicker)
    }
  }, [])

  // 2. تتبع التنقل وزيارات الصفحات اللحظية (يتفاعل فور تغيير المسار)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentPath = pathname || '/'
    if (currentPath.startsWith('/sanad-control-gate') || currentPath.startsWith('/admin')) {
      return
    }

    const isInitialSessionVisit = sessionStorage.getItem('sanad_visit_logged') !== 'true'
    const isNavigationChange = lastTrackedPathRef.current !== currentPath
    lastTrackedPathRef.current = currentPath

    const student = getClientStudentUser()
    const pageTitle = typeof document !== 'undefined' ? document.title.split('|')[0]?.trim() : undefined

    const sendNavigationPing = (eventType: 'visit' | 'navigation') => {
      fetch('/api/track-visit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: currentPath,
          pageTitle,
          eventType,
          email: student?.email,
          name: student?.name,
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

    if (isInitialSessionVisit) {
      sendNavigationPing('visit')
    } else if (isNavigationChange) {
      sendNavigationPing('navigation')
    }
  }, [pathname])

  // 3. مؤقت طلب العلم التراكمي والتواجد الحي المستمر (يعمل بلا انقطاع طالما المنصة مفتوحة ولا يتأثر بالتنقل)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const sendHeartbeat = (isStudyMinute: boolean = false) => {
      const currentPath = pathnameRef.current || '/'
      // عدم تسجيل جلسات لوحة التحكم
      if (currentPath.startsWith('/sanad-control-gate') || currentPath.startsWith('/admin')) {
        return
      }

      const student = getClientStudentUser()
      const pageTitle = typeof document !== 'undefined' ? document.title.split('|')[0]?.trim() : undefined

      fetch('/api/track-visit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: currentPath,
          pageTitle,
          eventType: 'heartbeat',
          trackStudyMinute: isStudyMinute,
          email: student?.email,
          name: student?.name,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data?.studyMinutes === 'number') {
            localStorage.setItem('sanad_total_study_minutes', String(data.studyMinutes))
            window.dispatchEvent(
              new CustomEvent('sanad_study_minutes_updated', {
                detail: { totalMinutes: data.studyMinutes, todayMinutes: data.todayMinutes },
              })
            )
          }
        })
        .catch(() => {})
    }

    // إرسال نبض تواجد أولي فور فتح المنصة
    sendHeartbeat(false)

    // نبض التواجد الحي المتصل الآن كل 20 ثانية (لضمان ظهور نقطة "متصل الآن" الخضراء للمشرف فوراً)
    const presenceInterval = setInterval(() => {
      sendHeartbeat(false)
    }, 20000)

    // عداد مدة البقاء في طلب العلم: احتساب دقيقة تحصيل كل 60 ثانية نشطة طالما المنصة مفتوحة عبر أي صفحة
    const studyTimerInterval = setInterval(() => {
      sendHeartbeat(true)
    }, 60000)

    // تحديث التواجد اللحظي عند عودة الطالب للنافذة
    const handleFocus = () => {
      sendHeartbeat(false)
    }

    // إرسال إشعار ختامي خفيف عند إغلاق المنصة أو الخروج
    const handleUnload = () => {
      const student = getClientStudentUser()
      if (student?.email && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/track-visit',
          JSON.stringify({
            page: pathnameRef.current || '/',
            eventType: 'heartbeat',
            email: student.email,
            name: student.name,
          })
        )
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(presenceInterval)
      clearInterval(studyTimerInterval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, []) // مصفوفة تبعيات فارغة ليعمل طوال فترة فتح المنصة دون توقف

  return null
}
