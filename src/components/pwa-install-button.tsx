'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Sparkles, Check } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaInstallButton({
  className = '',
  variant = 'compact', // 'compact' for navbar pill, 'full' for expanded card/drawer
}: {
  className?: string
  variant?: 'compact' | 'full'
}) {
  const router = useRouter()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // فحص ما إذا كان التطبيق يعمل بالفعل داخل نافذة PWA مستقلة
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandaloneMode) {
      setIsStandalone(true)
      return
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // إذا كان التطبيق مثبتاً ويعمل كـ App مستقل لا داعي لعرض زر التثبيت
  if (isStandalone || isInstalled) return null

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
      } catch (e) {
        console.warn('Install prompt error:', e)
        router.push('/download')
      }
    } else {
      // توجيه لصفحة التثبيت والإرشاد المباشر
      router.push('/download')
    }
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 p-3.5 text-white shadow-md hover:from-emerald-950 hover:to-teal-950 transition cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-inner">
            <Download className="h-5 w-5 stroke-[2.5]" />
          </span>
          <div className="text-right">
            <span className="block text-xs font-black text-amber-200">تثبيت تطبيق «سَنَد» الآن</span>
            <span className="block text-[10px] text-emerald-100/80">تطبيق سطح مكتب وهاتف سريع بدون متصفح</span>
          </div>
        </div>
        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
          تثبيت ⤓
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="تثبيت تطبيق سَنَد على جهازك بنقرة واحدة"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-linear-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 px-2.5 py-1 text-xs font-bold text-emerald-900 hover:border-emerald-600 hover:bg-emerald-50 transition cursor-pointer dark:text-amber-300 dark:hover:bg-stone-800 shrink-0 ${className}`}
    >
      <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-bounce" />
      <span className="hidden sm:inline">تثبيت التطبيق</span>
      <span className="sm:hidden">تثبيت</span>
    </button>
  )
}
