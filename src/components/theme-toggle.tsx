'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sanad_theme') : null
    if (stored === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      // الوضع الافتراضي الحتمي هو الوضع النهاري
      setIsDark(false)
      document.documentElement.classList.remove('dark')
      if (!stored && typeof window !== 'undefined') {
        localStorage.setItem('sanad_theme', 'light')
      }
    }
  }, [])

  const toggleTheme = () => {
    const nextState = !isDark
    setIsDark(nextState)
    if (nextState) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('sanad_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('sanad_theme', 'light')
    }
  }

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-xl border border-stone-200/60 bg-white/60 dark:border-stone-800 dark:bg-stone-800" />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'التبديل إلى نمط الرقاع النهاري' : 'التبديل إلى نمط القراءة الليلية التراثي'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300/80 bg-white text-stone-700 shadow-2xs hover:border-emerald-700 hover:text-emerald-800 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-stone-600" />
      )}
    </button>
  )
}
