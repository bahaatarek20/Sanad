import { redirect } from 'next/navigation'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { getStudentProfileData } from '@/lib/student-tracking'
import { updateProfileAction, changePasswordAction, updatePhoneAction } from './actions'
import { User, Lock, Sparkles, ArrowLeft, Phone, Mail, CheckCircle2, LogOut } from 'lucide-react'
import Link from 'next/link'
import AvatarSelector from '@/components/avatar-selector'
import LogoutButton from '@/components/logout-button'
import NotificationSettings from '@/components/notification-settings'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'إعدادات الحساب',
  description: 'إدارة بيانات حساب طالب العلم في منصة سَنَد.',
  robots: { index: false, follow: false },
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const user = await getCurrentStudentUser()
  if (!user) {
    redirect('/login')
  }

  const { message, error } = await searchParams
  const studentProfile = user.email ? getStudentProfileData(user.email) : null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-8">

      {/* رسائل النجاح والخطأ */}
      {message && (
        <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          ✕ {error}
        </div>
      )}

      {/* ترويسة الصفحة */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-800 via-amber-500 to-emerald-950" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>إعدادات حساب الطالب</span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white">
              {user.user_metadata?.full_name || 'طالب العلم'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {user.email}
              {studentProfile?.scholarlyId && (
                <span className="mr-2 font-mono font-black text-emerald-700 dark:text-emerald-400">
                  #{studentProfile.scholarlyId}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-600 hover:text-emerald-900 hover:border-emerald-800 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            الكشكول
          </Link>
        </div>
      </div>

      {/* قسم الصورة الرمزية والشخصية */}
      <AvatarSelector
        currentAvatarUrl={studentProfile?.avatarUrl || user.user_metadata?.avatar_url || user.avatarUrl}
        studentEmail={user.email || ''}
        studentName={user.user_metadata?.full_name || 'طالب العلم'}
      />

      {/* قسم تعديل الاسم */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/10 dark:bg-emerald-900/30">
            <User className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-white">تعديل الاسم</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">الاسم الظاهر في الكشكول ولوحة الطلاب</p>
          </div>
        </div>

        <form action={updateProfileAction} className="space-y-4">
          <input type="hidden" name="email" value={user.email} />
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={user.user_metadata?.full_name || ''}
              placeholder="اكتب اسمك الكامل"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder-stone-500"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800 dark:hover:bg-emerald-700"
          >
            حفظ الاسم
          </button>
        </form>
      </div>

      {/* قسم ربط وتوثيق رقم الهاتف */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-900/10 dark:bg-teal-900/30">
              <Phone className="h-4 w-4 text-teal-800 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-900 dark:text-white">توثيق رقم الهاتف الجوال</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                لحماية حسابك وتوثيق شهاداتك وإجازاتك العلمية وتلقي رموز الدخول
              </p>
            </div>
          </div>
          {studentProfile?.phone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
              <CheckCircle2 className="h-3 w-3" />
              <span>موثق</span>
            </span>
          )}
        </div>

        <form action={updatePhoneAction} className="space-y-4">
          <input type="hidden" name="email" value={user.email} />
          
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              رقم الهاتف الجوال
            </label>
            <div className="flex gap-2">
              <select
                name="countryCode"
                defaultValue="+20"
                className="w-32 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs text-stone-900 focus:border-teal-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white font-mono"
              >
                <option value="+20">🇪🇬 +20 (مصر)</option>
                <option value="+966">🇸🇦 +966 (السعودية)</option>
                <option value="+971">🇦🇪 +971 (الإمارات)</option>
                <option value="+965">🇰🇼 +965 (الكويت)</option>
                <option value="+974">🇶🇦 +974 (قطر)</option>
                <option value="+968">🇴🇲 +968 (عمان)</option>
                <option value="+962">🇯🇴 +962 (الأردن)</option>
                <option value="+212">🇲🇦 +212 (المغرب)</option>
                <option value="+213">🇩🇿 +213 (الجزائر)</option>
                <option value="+1">🇺🇸 +1 (أمريكا)</option>
              </select>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={studentProfile?.phone || ''}
                placeholder="01012345678"
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-mono"
              />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              يصلك رمز التحقق أو التنبيهات عبر رسالة نصية وفي صندوق بريد سَنَد الداخلي.
            </p>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-teal-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-950 transition cursor-pointer dark:bg-teal-800 dark:hover:bg-teal-700"
          >
            حفظ وتوثيق رقم الهاتف
          </button>
        </form>
      </div>

      {/* قسم حساب Google وبريد سَنَد */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-900/10 dark:bg-sky-900/30">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-white">حساب Google وبريد سَنَد العلمي</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              الدخول السريع وتلقي الرسائل والإشعارات
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                {user.email?.toLowerCase().endsWith('@gmail.com') || user.authProvider === 'google'
                  ? 'حساب Google مرتبط وموثق'
                  : 'بريد الحساب الحالي'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                نشط
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              {user.email}
            </p>
          </div>

          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 transition"
          >
            <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>صندوق بريد سَنَد (Mail) ←</span>
          </Link>
        </div>
      </div>

      {/* قسم تفضيلات الإشعارات والتنبيهات */}
      <NotificationSettings />

      {/* إحصاءات سريعة للطالب */}
      {studentProfile && (
        <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/95">
          <h2 className="text-sm font-black text-stone-900 dark:text-white mb-4">ملخص مسيرتك العلمية</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي دقائق المدارسة', value: `${studentProfile.totalStudyMinutes || 0} د`, color: 'emerald' },
              { label: 'المتون المنجزة', value: `${studentProfile.completedCourses?.length || 0}`, color: 'amber' },
              { label: 'الفوائد المقيدة', value: `${studentProfile.notesCount || 0}`, color: 'sky' },
              { label: 'الأيام المتتالية', value: `${studentProfile.streak || 0}`, color: 'rose' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-stone-100 bg-stone-50/80 p-3 text-center dark:border-stone-800 dark:bg-stone-800/50"
              >
                <span className="block text-lg font-black text-stone-900 dark:text-white">{stat.value}</span>
                <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* قسم تسجيل الخروج وتبديل الحساب */}
      <div className="rounded-3xl border border-rose-200/80 bg-rose-50/40 p-6 shadow-sm dark:border-rose-950/60 dark:bg-rose-950/20 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/40">
            <LogOut className="h-4 w-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-white">تسجيل الخروج والتبديل لحساب آخر</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              إنهاء جلسة الحساب الحالي بأمان للدخول بحساب طالب آخر أو إنشاء حساب جديد
            </p>
          </div>
        </div>

        <div className="pt-2">
          <LogoutButton variant="full" showText={true} />
        </div>
      </div>
    </div>
  )
}
