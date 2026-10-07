'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Flame, Megaphone, Volume2, Calendar, CheckCircle2 } from 'lucide-react'

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    dailyReminders: true,
    spacedRepetition: true,
    quotesEnabled: true,
    broadcastsEnabled: true,
    soundEnabled: true,
  })
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPreferences({
        dailyReminders: localStorage.getItem('sanad_notify_daily_reminders') !== 'false',
        spacedRepetition: localStorage.getItem('sanad_notify_spaced_repetition') !== 'false',
        quotesEnabled: localStorage.getItem('sanad_notify_quotes_enabled') !== 'false',
        broadcastsEnabled: localStorage.getItem('sanad_notify_broadcasts_enabled') !== 'false',
        soundEnabled: localStorage.getItem('sanad_notify_sound_enabled') !== 'false',
      })
    }
  }, [])

  const togglePreference = (key: keyof typeof preferences) => {
    const updated = { ...preferences, [key]: !preferences[key] }
    setPreferences(updated)

    if (typeof window !== 'undefined') {
      const storageKey =
        key === 'dailyReminders'
          ? 'sanad_notify_daily_reminders'
          : key === 'spacedRepetition'
          ? 'sanad_notify_spaced_repetition'
          : key === 'quotesEnabled'
          ? 'sanad_notify_quotes_enabled'
          : key === 'broadcastsEnabled'
          ? 'sanad_notify_broadcasts_enabled'
          : 'sanad_notify_sound_enabled'

      localStorage.setItem(storageKey, updated[key] ? 'true' : 'false')

      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  const items = [
    {
      key: 'dailyReminders' as const,
      title: 'التذكير بالورد العلمي اليومي',
      desc: 'تنبيهك بلزوم المدارسة اليومية وحفظ السلسلة المتواصلة (Streak) في طلب العلم.',
      icon: Calendar,
      color: 'emerald',
    },
    {
      key: 'spacedRepetition' as const,
      title: 'إشعارات التكرار المتباعد للمتون',
      desc: 'تذكير ذكي لمراجعة المتون والمسائل المحفوظة قبل أن تتفلت مع تقادم العهد.',
      icon: Bell,
      color: 'amber',
    },
    {
      key: 'quotesEnabled' as const,
      title: 'ومضات شحذة الهمم وأقوال السلف',
      desc: 'إظهار نصائح وأقوال أئمة السلف والأعلام أثناء القراءة والمدارسة كل 15 دقيقة.',
      icon: Flame,
      color: 'orange',
    },
    {
      key: 'broadcastsEnabled' as const,
      title: 'بيانات وإعلانات المنصة الإدارية',
      desc: 'تلقي التنبيهات المباشرة الصادرة من إدارة سَنَد ومواعيد مجالس السماع الجديدة.',
      icon: Megaphone,
      color: 'sky',
    },
    {
      key: 'soundEnabled' as const,
      title: 'نغمة التنبيه الهادئة (Chime)',
      desc: 'تشغيل نغمة خافتة ومريحة عند وصول إشعار مهم أثناء تصفح المنصة.',
      icon: Volume2,
      color: 'purple',
    },
  ]

  return (
    <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-white">تفضيلات الإشعارات والتنبيهات</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">تحكم بالكامل في ما يظهر لك من رسائل وومضات علمية</p>
          </div>
        </div>

        {savedMsg && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-3 w-3" />
            <span>تم الحفظ تلقائياً</span>
          </span>
        )}
      </div>

      <div className="space-y-3 divide-y divide-stone-100 dark:divide-stone-800/80">
        {items.map((item) => {
          const Icon = item.icon
          const isChecked = preferences[item.key]
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 pt-3 first:pt-0"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                    {item.title}
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Toggle switch button */}
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={() => togglePreference(item.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  isChecked ? 'bg-emerald-700 dark:bg-emerald-600' : 'bg-stone-200 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isChecked ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
