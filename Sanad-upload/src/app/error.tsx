'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // يمكن إرسال الخطأ لخدمة مراقبة هنا
    console.error('[Sanad Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* النقش الزخرفي */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-xl shadow-amber-900/20 border border-amber-700/30">
        <BookOpen className="h-10 w-10 stroke-[1.8]" />
      </div>

      {/* رقم الخطأ */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px w-16 bg-gradient-to-l from-stone-300 to-transparent dark:from-stone-700" />
        <span className="text-6xl font-black text-rose-900/20 dark:text-rose-100/10 select-none">
          ٥٠٠
        </span>
        <div className="h-px w-16 bg-gradient-to-r from-stone-300 to-transparent dark:from-stone-700" />
      </div>

      {/* الرسالة الرئيسية */}
      <h1 className="mb-3 text-2xl font-black text-stone-900 dark:text-white">
        حدث خطأ غير متوقع
      </h1>
      <p className="mb-2 max-w-md text-base text-stone-600 dark:text-stone-400">
        تعثّرت الصفحة في تحميل محتواها. لا داعي للقلق — جرّب إعادة التحميل أو عُد للرئيسية.
      </p>
      <p className="mb-10 text-sm italic text-stone-400 dark:text-stone-600">
        «وما توفيقي إلا بالله عليه توكلت وإليه أُنيب»
      </p>

      {/* أزرار العلاج */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-950 transition dark:bg-emerald-800 dark:hover:bg-emerald-700"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 shadow-xs hover:border-emerald-400 hover:text-emerald-900 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-emerald-400"
        >
          <Home className="h-4 w-4" />
          الصفحة الرئيسية
        </Link>
      </div>

      {/* تفاصيل الخطأ للتطوير فقط */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 max-w-lg text-right">
          <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            تفاصيل الخطأ (وضع التطوير)
          </summary>
          <pre className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 overflow-auto text-left dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}
    </div>
  )
}
