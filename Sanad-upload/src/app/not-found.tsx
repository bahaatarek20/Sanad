import Link from 'next/link'
import { BookOpen, Home, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* النقش الزخرفي */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-xl shadow-emerald-900/20 border border-emerald-700/30">
        <BookOpen className="h-10 w-10 stroke-[1.8]" />
      </div>

      {/* رقم الخطأ */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px w-16 bg-linear-to-l from-stone-300 to-transparent dark:from-stone-700" />
        <span className="text-6xl font-black text-emerald-900/20 dark:text-emerald-100/10 select-none">
          ٤٠٤
        </span>
        <div className="h-px w-16 bg-linear-to-r from-stone-300 to-transparent dark:from-stone-700" />
      </div>

      {/* الرسالة الرئيسية */}
      <h1 className="mb-3 text-2xl font-black text-stone-900 dark:text-white">
        هذه الصفحة غير موجودة
      </h1>
      <p className="mb-2 max-w-md text-base text-stone-600 dark:text-stone-400">
        ربما تغيّر عنوان الرابط، أو أن المتن الذي تبحث عنه لم يُضَف بعد إلى المنصة.
      </p>
      <p className="mb-10 text-sm italic text-stone-400 dark:text-stone-600">
        «من سلك طريقًا يلتمس فيه علمًا سهّل الله له طريقًا إلى الجنة»
      </p>

      {/* أزرار العودة */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-950 transition dark:bg-emerald-800 dark:hover:bg-emerald-700"
        >
          <Home className="h-4 w-4" />
          الصفحة الرئيسية
        </Link>
        <Link
          href="/courses"
          className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 shadow-xs hover:border-emerald-400 hover:text-emerald-900 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-emerald-400"
        >
          <Compass className="h-4 w-4" />
          تصفح المتون
        </Link>
      </div>
    </div>
  )
}
