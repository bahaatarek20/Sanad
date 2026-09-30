'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  Search,
  Award,
  ChevronRight,
  Lock,
  Sparkles,
  QrCode,
  CheckCircle2,
} from 'lucide-react'

export default function VerifyIjazaIndexPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/verify-ijaza/${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121110] text-stone-800 dark:text-stone-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* شريط التنقل */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </Link>

          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            بوابة التحقق الرسمية
          </span>
        </div>

        {/* بطاقة البحث والتحقق */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
          
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-amiri text-stone-900 dark:text-amber-100">
              التحقق من صحة الإجازة والشهادة العلمية
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
              تحقق من صحة «إجازة القراءة والضبط» أو الشهادة الصادرة عن إدارة منصة سَنَد للتأصيل الشرعي بواسطة المعرف الفريد أو الرقم التسلسلي.
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-md mx-auto space-y-3 pt-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="أدخل رقم الإجازة (مثال: SND-IJZ-2026-X8F9Q)"
                className="w-full bg-[#fcfaf7] dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-emerald-600 font-mono text-center tracking-wider"
                dir="ltr"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>فحص الوثيقة وسجل التوثيق المشفر</span>
            </button>
          </form>

          {/* مزايا نظام التوثيق المشفر */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-right border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-stone-800 dark:text-stone-200 font-semibold">تشفير SHA-256</strong>
                <span className="text-stone-500">حماية تامة من التعديل أو التزوير</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <QrCode className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-stone-800 dark:text-stone-200 font-semibold">رمز QR فوري</strong>
                <span className="text-stone-500">مسح سريع بكاميرا الهاتف</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-stone-800 dark:text-stone-200 font-semibold">اعتماد منصة سَنَد</strong>
                <span className="text-stone-500">موثقة باسم المنصة رسمياً</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
