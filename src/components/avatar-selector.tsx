'use client'

import { useState } from 'react'
import { Camera, Image as ImageIcon, Sparkles, Check, Upload } from 'lucide-react'
import { updateAvatarAction } from '@/app/settings/actions'

interface AvatarSelectorProps {
  currentAvatarUrl?: string
  studentEmail: string
  studentName: string
}

const PRESET_AVATARS = [
  {
    id: 'quran',
    title: 'مصحف مذهب',
    url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=150&auto=format&fit=crop&q=80',
    emoji: '📖',
  },
  {
    id: 'minaret',
    title: 'منارة وقورة',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80',
    emoji: '🏛️',
  },
  {
    id: 'ink',
    title: 'محبرة وقلم',
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=150&auto=format&fit=crop&q=80',
    emoji: '✍️',
  },
  {
    id: 'dome',
    title: 'قبة المسجد',
    url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=150&auto=format&fit=crop&q=80',
    emoji: '🕌',
  },
  {
    id: 'scroll',
    title: 'مخطوطة أصيلة',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=150&auto=format&fit=crop&q=80',
    emoji: '📜',
  },
  {
    id: 'lantern',
    title: 'نور التأصيل',
    url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=150&auto=format&fit=crop&q=80',
    emoji: '🌟',
  },
]

export default function AvatarSelector({
  currentAvatarUrl,
  studentEmail,
  studentName,
}: AvatarSelectorProps) {
  const [selectedUrl, setSelectedUrl] = useState(currentAvatarUrl || PRESET_AVATARS[0].url)
  const [customInput, setCustomInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 2 ميجابايت.')
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setSelectedUrl(dataUrl)
      }
      setIsUploading(false)
    }
    reader.onerror = () => {
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/10 dark:bg-amber-900/30">
          <Camera className="h-4 w-4 text-amber-800 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-black text-stone-900 dark:text-white">الصورة الرمزية والشخصية</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            تظهر صورتك في الكشكول ومجلس المذاكرة وشريط التنقل العلوي
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* معاينة الصورة الحالية */}
        <div className="relative group shrink-0">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            {selectedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedUrl}
                alt={studentName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-bold font-amiri text-2xl text-stone-700 dark:text-stone-300">
                {studentName ? studentName[0] : 'ط'}
              </span>
            )}
          </div>
          <span className="absolute -bottom-2 right-1/2 translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
            المعاينة
          </span>
        </div>

        {/* خيارات النماذج الجاهزة */}
        <div className="flex-1 space-y-3 w-full">
          <span className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            اختر من الرموز التأصيلية المعتمدة:
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = selectedUrl === preset.url
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedUrl(preset.url)}
                  title={preset.title}
                  className={`relative flex flex-col items-center gap-1 rounded-xl p-1.5 border transition cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 ring-2 ring-amber-400/50'
                      : 'border-stone-200 bg-stone-50/70 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/60'
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-600/30 flex items-center justify-center text-white">
                        <Check className="h-4 w-4 drop-shadow-md stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-stone-600 dark:text-stone-300 truncate max-w-full">
                    {preset.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* نموذج الحفظ ورفع صورة مخصصة */}
      <form action={updateAvatarAction} className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3">
        <input type="hidden" name="email" value={studentEmail} />
        <input type="hidden" name="avatarUrl" value={selectedUrl} />

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="url"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value)
                if (e.target.value.startsWith('http')) {
                  setSelectedUrl(e.target.value)
                }
              }}
              placeholder="أو الصق رابط صورة مخصصة (https://...)"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>

          <label className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
            <Upload className="h-3.5 w-3.5 text-stone-500" />
            <span>{isUploading ? 'جاري التحميل...' : 'رفع من جهازك'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-amber-800 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-900 transition cursor-pointer dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            حفظ الصورة الرمزية
          </button>
        </div>
      </form>
    </div>
  )
}
