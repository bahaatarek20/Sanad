import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import {
  WifiOff,
  BookOpen,
  FileText,
  Bookmark,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react'
import OfflineCompanionView from './offline-companion-view'

export const metadata: Metadata = {
  title: 'وضع المدارسة بلا إنترنت || منصة سَنَد',
  description: 'المرافق العلمي المكتبي والمسجدي لطالب العلم للعمل بلا إنترنت في المساجد والأسفار.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121110] text-stone-800 dark:text-stone-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* شريط التنقل */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>وضع المسجد والسفر (أوفلاين)</span>
            </span>
          </div>
        </div>

        {/* عرض المحتوى المحفوظ أوفلاين والكشكول */}
        <OfflineCompanionView />

      </div>
    </div>
  )
}
