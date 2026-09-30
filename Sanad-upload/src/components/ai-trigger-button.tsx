'use client'

import { Sparkles } from 'lucide-react'

export default function AiTriggerButton() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('toggle-sanad-ai'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="صاحبك في الطلب • المساعد الذكي (AI)"
      aria-label="المساعد الذكي"
      className="flex h-8 items-center gap-1 rounded-lg border border-emerald-300/70 bg-emerald-50/70 px-2 text-[11px] font-bold text-emerald-950 shadow-2xs hover:bg-emerald-100/80 hover:border-emerald-500 transition cursor-pointer dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
    >
      <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
      <span className="hidden sm:inline">صاحبك بالطلب</span>
      <span className="rounded bg-amber-400/25 px-1 py-0.2 text-[9px] font-black text-amber-800 dark:text-amber-300">
        AI
      </span>
    </button>
  )
}
