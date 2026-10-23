'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Check,
  Sparkles,
  BookOpen,
  Feather,
  Compass,
  Award,
  Star,
  Shield,
  Trash2,
  Eye,
  X,
  Upload,
  AlertCircle,
} from 'lucide-react'

interface AvatarSelectorProps {
  email: string
  currentName: string
  currentAvatar?: string
  updateAvatarAction: (formData: FormData) => Promise<void>
}

export const PRESET_AVATARS = [
  {
    id: 'preset:emerald-scholar',
    label: 'وسام التأصيل',
    gradient: 'from-emerald-700 to-teal-900',
    icon: BookOpen,
    emoji: '📖',
  },
  {
    id: 'preset:amber-scribe',
    label: 'قلم الرواية',
    gradient: 'from-amber-600 to-yellow-800',
    icon: Feather,
    emoji: '🪶',
  },
  {
    id: 'preset:indigo-seeker',
    label: 'بوصلة السالك',
    gradient: 'from-indigo-700 to-slate-900',
    icon: Compass,
    emoji: '🧭',
  },
  {
    id: 'preset:rose-hafiz',
    label: 'تاج الحفاظ',
    gradient: 'from-rose-700 to-red-950',
    icon: Award,
    emoji: '👑',
  },
  {
    id: 'preset:cyan-hikmah',
    label: 'نور الحكمة',
    gradient: 'from-cyan-700 to-blue-950',
    icon: Star,
    emoji: '✨',
  },
  {
    id: 'preset:stone-murabit',
    label: 'درع الإتقان',
    gradient: 'from-stone-700 to-stone-950',
    icon: Shield,
    emoji: '🛡️',
  },
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function AvatarSelector({
  email,
  currentName,
  currentAvatar,
}: AvatarSelectorProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<string>(currentAvatar || '')
  const [previewPending, setPreviewPending] = useState<{
    dataUrl: string
    file?: File
    fileName?: string
    fileSizeKB?: number
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [imgError, setImgError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatusMsg(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatusMsg({
        text: 'يرجى اختيار ملف صورة صالح بصيغة JPG أو PNG أو WebP فقط.',
        type: 'error',
      })
      e.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatusMsg({
        text: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت). يرجى اختيار صورة أصغر.',
        type: 'error',
      })
      e.target.value = ''
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // ضغط ذكي للصورة في Canvas بحجم 256×256 عالية النقاء
        const canvas = document.createElement('canvas')
        const SIZE = 256
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86)
          setPreviewPending({
            dataUrl: compressedDataUrl,
            file,
            fileName: file.name,
            fileSizeKB: Math.max(1, Math.round(file.size / 1024)),
          })
          setImgError(false)
        }
        setIsUploading(false)
      }
      img.onerror = () => {
        setIsUploading(false)
        setStatusMsg({
          text: 'تعذر قراءة ملف الصورة، يرجى التأكد من أن الملف صورة سليمة غير تالفة.',
          type: 'error',
        })
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!previewPending) return
    setIsUploading(true)
    setStatusMsg(null)

    try {
      const formData = new FormData()
      if (previewPending.file) {
        formData.append('avatar', previewPending.file)
      }
      formData.append('compressedDataUrl', previewPending.dataUrl)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setStatusMsg({
          text: data.error || 'تعذر حفظ الصورة الشخصية على الخادم.',
          type: 'error',
        })
        setIsUploading(false)
        return
      }

      setSelected(data.avatarUrl || previewPending.dataUrl)
      setPreviewPending(null)
      setImgError(false)
      setStatusMsg({
        text: 'تم رفع وحفظ صورتك الشخصية بنجاح وتحديثها في كافة أنحاء المنصة!',
        type: 'success',
      })
      router.refresh()
    } catch {
      setStatusMsg({
        text: 'حدث خطأ أثناء الاتصال بالخادم لرفع الصورة.',
        type: 'error',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelectPreset = async (presetId: string) => {
    setIsUploading(true)
    setStatusMsg(null)
    setPreviewPending(null)

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: presetId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStatusMsg({ text: data.error || 'تعذر حفظ الوسام الرمزي', type: 'error' })
      } else {
        setSelected(presetId)
        setStatusMsg({ text: 'تم اعتماد الوسام الرمزي لحسابك بنجاح!', type: 'success' })
        router.refresh()
      }
    } catch {
      setStatusMsg({ text: 'تعذر الاتصال بالخادم لتحديث الوسام', type: 'error' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    setIsUploading(true)
    setStatusMsg(null)
    setPreviewPending(null)

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStatusMsg({ text: data.error || 'تعذر حذف الصورة الشخصية', type: 'error' })
      } else {
        setSelected('')
        setImgError(false)
        setStatusMsg({
          text: 'تم حذف الصورة الشخصية والعودة للصورة الافتراضية بنجاح.',
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setStatusMsg({ text: 'حدث خطأ أثناء حذف الصورة الشخصية', type: 'error' })
    } finally {
      setIsUploading(false)
    }
  }

  const activeValue = previewPending ? previewPending.dataUrl : selected
  const activePreset = PRESET_AVATARS.find((p) => p.id === activeValue)
  const isImageAvatar =
    !imgError &&
    Boolean(
      activeValue &&
        (activeValue.startsWith('data:image/') ||
          activeValue.startsWith('http') ||
          activeValue.startsWith('/uploads/'))
    )

  return (
    <div className="mb-8 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-5 dark:border-stone-800 dark:bg-stone-950/60">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* عرض الصورة الرمزية الحالية أو المعاينة */}
        <div className="relative group shrink-0">
          {isImageAvatar ? (
            <img
              src={activeValue}
              alt={currentName}
              onError={() => setImgError(true)}
              className="h-24 w-24 rounded-2xl object-cover border-2 border-emerald-600 shadow-md"
            />
          ) : activePreset ? (
            <div
              className={`flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${activePreset.gradient} text-white shadow-md border-2 border-amber-400/60`}
            >
              <span className="text-3xl">{activePreset.emoji}</span>
              <span className="mt-1 text-[10px] font-bold text-amber-200">{activePreset.label}</span>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-950 text-3xl font-bold font-amiri text-amber-300 shadow-md border border-emerald-700">
              {(currentName || email || 'ط')[0].toUpperCase()}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-2 -left-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-md hover:bg-emerald-700 transition border-2 border-white dark:border-stone-900"
            title="رفع صورة شخصية من جهازك"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* خيارات الأوسمة والرفع والحذف */}
        <div className="flex-1 w-full text-center sm:text-right">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 mb-1.5">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>الصورة الشخصية والوسام الرمزي</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{selected ? 'تغيير الصورة من الجهاز' : 'رفع صورة من الجهاز'}</span>
              </button>

              {selected && !previewPending && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  title="حذف الصورة والعودة للصورة الافتراضية"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف الصورة</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            يدعم الصور بصيغة JPG و PNG و WebP (بحد أقصى 5 ميجابايت) مع ضغط ومعاينة فورية، أو اختر وساماً علمياً:
          </p>

          {/* بطاقة معاينة الصورة قبل الحفظ */}
          {previewPending && (
            <div className="mb-4 rounded-xl border-2 border-amber-400/80 bg-amber-50/90 p-3.5 dark:border-amber-700 dark:bg-amber-950/40">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                  <Eye className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    معاينة الصورة الجديدة ({previewPending.fileName} — {previewPending.fileSizeKB} كيلوبايت). هل ترغب في اعتمادها؟
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{isUploading ? 'جارٍ الحفظ...' : 'اعتماد وحفظ الصورة'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPending(null)}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>إلغاء</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* رسائل النجاح أو الخطأ */}
          {statusMsg && (
            <div
              className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                statusMsg.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = selected === preset.id && !previewPending
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isUploading}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`relative flex flex-col items-center justify-center rounded-xl p-2 transition border ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/90 dark:border-emerald-500 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30'
                      : 'border-stone-200/80 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900'
                  }`}
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="mt-1 text-[10px] font-bold text-stone-700 dark:text-stone-300 truncate max-w-full">
                    {preset.label}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
