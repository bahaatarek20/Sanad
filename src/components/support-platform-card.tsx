'use client'

import { useState } from 'react'
import { HeartHandshake, Copy, Check, PhoneCall } from 'lucide-react'

export default function SupportPlatformCard() {
  const [copied, setCopied] = useState(false)
  const etisalatCashNumber = '01140373702'

  const handleCopy = () => {
    navigator.clipboard.writeText(etisalatCashNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-linear-to-r from-emerald-50/50 to-amber-50/30 px-4 py-3 shadow-2xs dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-amber-950/10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* النص المختصر */}
        <div className="flex items-center gap-2.5 min-w-0">
          <HeartHandshake className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">
              لدعم المنصة ووقفها العلمي
            </span>
            <span className="block text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
              اتصالات كاش:
              <span className="font-mono font-black text-emerald-900 dark:text-emerald-300 tracking-wider mr-1">
                {etisalatCashNumber}
              </span>
            </span>
          </div>
        </div>

        {/* أزرار النسخ والتحويل */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="نسخ رقم اتصالات كاش"
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
              copied
                ? 'bg-emerald-800 text-white dark:bg-emerald-700'
                : 'bg-stone-100 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-amber-300" />
                <span>تم!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>نسخ</span>
              </>
            )}
          </button>

          <a
            href={`tel:${etisalatCashNumber}`}
            title="تحويل كاش"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
          >
            <PhoneCall className="h-3 w-3 text-amber-300" />
            <span>تحويل</span>
          </a>
        </div>
      </div>
    </div>
  )
}
