'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  AtSign,
  GraduationCap,
  Smartphone,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { savePersonalProfileDirectAction } from '@/app/settings/actions'

interface PersonalProfileFormProps {
  email: string
  initialFullName: string
  initialUsername: string
  initialEducationLevel: string
  initialPhone: string
  initialBio: string
  isOwner: boolean
}

export default function PersonalProfileForm({
  email,
  initialFullName,
  initialUsername,
  initialEducationLevel,
  initialPhone,
  initialBio,
  isOwner,
}: PersonalProfileFormProps) {
  const router = useRouter()

  const [fullName, setFullName] = useState(initialFullName)
  const [username, setUsername] = useState(initialUsername)
  const [educationLevel, setEducationLevel] = useState(initialEducationLevel)
  const [phone, setPhone] = useState(initialPhone)
  const [bio, setBio] = useState(initialBio)

  const [savedSnapshot, setSavedSnapshot] = useState({
    fullName: initialFullName,
    username: initialUsername,
    educationLevel: initialEducationLevel,
    phone: initialPhone,
    bio: initialBio,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleReset = () => {
    setFullName(savedSnapshot.fullName)
    setUsername(savedSnapshot.username)
    setEducationLevel(savedSnapshot.educationLevel)
    setPhone(savedSnapshot.phone)
    setBio(savedSnapshot.bio)
    setFeedback(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    setFeedback(null)

    try {
      const res = await savePersonalProfileDirectAction({
        fullName,
        username,
        educationLevel,
        phone,
        bio,
      })

      if (!res.success) {
        setFeedback({
          text: res.error || 'تعذر حفظ التعديلات، يرجى المحاولة مرة أخرى.',
          type: 'error',
        })
      } else {
        const nextSnap = {
          fullName: res.student?.name ?? fullName.trim(),
          username: res.student?.username ?? username.trim(),
          educationLevel: res.student?.educationLevel ?? educationLevel,
          phone: res.student?.phone ?? phone.trim(),
          bio: res.student?.bio ?? bio.trim(),
        }
        setFullName(nextSnap.fullName)
        setUsername(nextSnap.username)
        setEducationLevel(nextSnap.educationLevel)
        setPhone(nextSnap.phone)
        setBio(nextSnap.bio)
        setSavedSnapshot(nextSnap)

        setFeedback({
          text: res.message || 'تم حفظ وتوثيق بياناتك الشخصية بنجاح في كافة أنحاء المنصة!',
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setFeedback({
        text: 'حدث خطأ أثناء الاتصال بالخادم لحفظ التعديلات.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs sm:text-sm font-bold shadow-2xs transition ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300">
            البريد الإلكتروني الأساسي (موثق ✓)
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="email"
              value={email}
              disabled
              dir="ltr"
              className="w-full rounded-2xl border border-stone-200 bg-stone-100 py-3 pr-11 pl-4 text-left text-sm font-medium text-stone-500 cursor-not-allowed dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            الاسم الكامل / اسم العرض في المنصة والوثائق
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="اكتب اسمك الثلاثي أو الكامل..."
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            اسم المستخدم الفريد (@username)
          </label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              placeholder="username"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-left font-mono text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="educationLevel"
            className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            المرحلة التعليمية / المستوى التأصيلي
          </label>
          <div className="relative">
            <GraduationCap className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <select
              id="educationLevel"
              name="educationLevel"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            >
              <option value="طالب تأصيل منهجي">طالب تأصيل منهجي</option>
              <option value="مبتدئ في طلب العلم">مبتدئ في طلب العلم</option>
              <option value="متوسط في المتون العلمية">متوسط في المتون العلمية</option>
              <option value="متقدم في الفنون الشرعية">متقدم في الفنون الشرعية</option>
              <option value="طالب إجازة وسند متصل">طالب إجازة وسند متصل</option>
              <option value="باحث أكاديمي شرعي">باحث أكاديمي شرعي</option>
              {isOwner && (
                <option value="المشرف العام ومؤسس المنصة">المشرف العام ومؤسس المنصة</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            رقم الجوال المربوط بالحساب (اختياري)
          </label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 101 234 5678"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-left font-mono text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bio"
            className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            النبذة التعريفية والاهتمامات العلمية (حتى 350 حرفاً)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={2}
            maxLength={350}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب نبذة مختصرة عن اهتماماتك العلمية أو المتون التي تعكف على دراستها..."
            className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          <RotateCcw className="h-4 w-4" />
          <span>إلغاء التعديلات</span>
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
              <span>جارٍ الحفظ والتوثيق...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 text-amber-300" />
              <span>حفظ وتوثيق البيانات الشخصية</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
