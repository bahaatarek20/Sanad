'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  WifiOff,
  Wifi,
  Download,
  Smartphone,
  Laptop,
  Check,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react'

export default function PwaOfflineCompanion() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [showOnlineToast, setShowOnlineToast] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // 1. تسجيل الـ Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // SW registered successfully
        })
        .catch((err) => {
          console.warn('Sanad PWA ServiceWorker registration failed:', err)
        })
    }

    // 2. التحقق من حالة الشبكة
    setIsOnline(navigator.onLine)

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineBanner(true)
      setShowOnlineToast(false)
    }

    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineBanner(false)
      setShowOnlineToast(true)
      setTimeout(() => setShowOnlineToast(false), 4000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // 3. التحقق من إمكانية التثبيت (PWA Install Prompt)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // تحقق هل تم رفض التثبيت مسبقاً مؤخراً
      const dismissed = localStorage.getItem('sanad_pwa_dismissed')
      if (!dismissed) {
        setShowInstallPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // التحقق هل التطبيق مثبت بالفعل في وضع standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      setShowInstallPrompt(false)
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismissInstall = () => {
    setShowInstallPrompt(false)
    try {
      localStorage.setItem('sanad_pwa_dismissed', 'true')
    } catch {}
  }

  return (
    <>
      {/* شريط حالة انقطاع النت (وضع المسجد الأوفلاين) */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-linear-to-r from-amber-700 via-amber-800 to-emerald-950 text-white px-4 py-2 text-xs shadow-md border-b border-amber-600/40 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mx-auto">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-semibold">
              وضع المدارسة في المسجد نشط (بلا إنترنت):
            </span>
            <span className="text-amber-100 hidden sm:inline">
              المتون المحفوظة وكشكول الفوائد متاحة للعمل بالكامل دون انقطاع.
            </span>
            <Link
              href="/offline"
              className="mr-2 underline font-bold text-amber-200 hover:text-white"
            >
              فتح رفيق المسجد ←
            </Link>
          </div>
        </div>
      )}

      {/* توست عودة الاتصال بالإنترنت */}
      {showOnlineToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-emerald-100 border border-emerald-500/50 px-5 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <Wifi className="w-4 h-4 text-emerald-300" />
          <span>تم استعادة الاتصال بالإنترنت بنجاح</span>
        </div>
      )}

      {/* نافذة تثبيت التطبيق على الهاتف أو الحاسوب PWA Banner */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full bg-white dark:bg-stone-900 border-2 border-emerald-700/60 dark:border-emerald-600/60 rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm font-amiri">
                  تثبيت منصة سَنَد كتطبيق
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                  ثبّت سَنَد على هاتفك أو لابتوبك لتشغيل المتون والفوائد في المساجد بلا إنترنت.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismissInstall}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleDismissInstall}
              className="px-3 py-1.5 rounded-xl text-stone-500 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              لاحقاً
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت التطبيق الآن</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
