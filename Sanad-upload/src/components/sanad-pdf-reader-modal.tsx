'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  X,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  Sparkles,
} from 'lucide-react'

interface SanadPdfReaderModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  title: string
  author?: string
}

export default function SanadPdfReaderModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  author,
}: SanadPdfReaderModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // إغلاق بمفتاح Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFullscreen, onClose])

  if (!isOpen || !pdfUrl) return null

  // تجهيز رابط التحميل المباشر للجهاز
  const getDownloadUrl = () => {
    if (pdfUrl.startsWith('/api/pdf/')) {
      return `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}download=1`
    }
    return pdfUrl
  }

  // تجهيز رابط العارض المدمج
  const viewerUrl = pdfUrl.includes('#') ? pdfUrl : `${pdfUrl}#toolbar=1&navpanes=1`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all duration-300 dark:border-stone-800 dark:bg-stone-900 ${
          isFullscreen
            ? 'fixed inset-2 h-[calc(100vh-1rem)] max-w-none rounded-2xl'
            : 'h-[92vh] max-w-6xl'
        }`}
      >
        {/* شريط علوي تراثي ذهبي */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        {/* ترويسة عارض الكتاب */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 bg-stone-50/90 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-amber-300 shadow-xs dark:bg-emerald-950">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  {title}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>قارئ المتون المعتمد</span>
                </span>
              </div>
              {author && (
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  المؤلف: {author}
                </p>
              )}
            </div>
          </div>

          {/* أزرار التحكم بالعارض والتحميل */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* زر تحميل الكتاب على الجهاز */}
            <a
              href={getDownloadUrl()}
              download
              title="تحميل نسخة من الكتاب على جهازك"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تحميل للجهاز</span>
            </a>

            {/* فتح في نافذة مستقلة */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="فتح في تبويب مستقل"
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
              <span>تبويب خارجي</span>
            </a>

            {/* زر ملء الشاشة */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة لملء النافذة'}
              className="rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-100 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={onClose}
              title="إغلاق العارض"
              className="rounded-xl bg-stone-200/80 p-2 text-stone-700 hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-rose-950 dark:hover:text-rose-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* مساحة العرض التفاعلية للـ PDF */}
        <div className="relative flex-1 w-full bg-stone-100 dark:bg-stone-950 overflow-hidden">
          <iframe
            src={viewerUrl}
            title={title}
            className="w-full h-full border-0"
          />

          {/* تنبيه وشريط احتياطي عند عدم دعم المتصفح للعرض المباشر */}
          <noscript>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="h-12 w-12 text-stone-400 mb-3" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-3">
                يتعذر عرض الملف تلقائياً في هذا المتصفح. يمكنك تحميله مباشرة:
              </p>
              <a
                href={getDownloadUrl()}
                download
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>تحميل الكتاب الآن</span>
              </a>
            </div>
          </noscript>
        </div>
      </div>
    </div>
  )
}
