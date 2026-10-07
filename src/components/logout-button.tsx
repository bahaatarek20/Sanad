'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase/config'

interface LogoutButtonProps {
  className?: string
  variant?: 'icon' | 'full'
  showText?: boolean
  redirectTo?: string
}

export default function LogoutButton({
  className = '',
  variant = 'icon',
  showText = false,
  redirectTo = '/login?loggedOut=true&mode=login',
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      // 1. مسح كافة البيانات المخزنة محلياً في متصفح الطالب
      try {
        localStorage.removeItem('sanad_student_user')
        localStorage.removeItem('sanad_student_registered')
        sessionStorage.clear()
        // وضع علامة الخروج في الكوكي من جهة العميل فوراً
        document.cookie = 'sanad_explicit_logout=true; path=/; max-age=86400;'
        document.cookie = 'sanad_student_user=; path=/; max-age=0;'
      } catch {}

      // 2. تسجيل الخروج من Firebase Client إن وجد
      try {
        if (auth) {
          await auth.signOut()
        }
      } catch {}

      // 3. مسح جلسة الخادم وجميع كوكيز المصادقة
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch {}

      // 4. توجيه آمن ونظيف لصفحة تسجيل الدخول لتمكين الطالب من استخدام أي حساب آخر
      window.location.href = redirectTo
    } catch {
      window.location.href = redirectTo
    }
  }

  if (variant === 'full' || showText) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={className || 'flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-900 transition-all cursor-pointer dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 shadow-2xs'}
        title="تسجيل الخروج من الحساب"
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
        ) : (
          <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        )}
        <span>{isLoggingOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج من الحساب'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className || 'flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/90 bg-white/90 text-stone-400 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:hover:text-rose-400 dark:hover:bg-rose-950/50'}
      title="تسجيل الخروج"
    >
      {isLoggingOut ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
