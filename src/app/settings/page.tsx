import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Save,
  Smartphone,
  Sparkles,
  BookOpen,
  Flame,
  Clock,
  FileText,
  GraduationCap,
  Calendar,
  AtSign,
  RotateCcw,
  LogOut,
  Crown,
} from 'lucide-react'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  getStudentProfileData,
  hasStudentLocalPassword,
  SUPER_ADMIN_EMAIL,
} from '@/lib/student-tracking'
import {
  updateProfileAction,
  changePasswordAction,
  updatePhoneAction,
  updateAvatarAction,
} from './actions'
import { signOutAction } from '@/app/login/actions'
import AvatarSelector from '@/components/avatar-selector'
import SettingsInteractivePanel from '@/components/settings-interactive-panel'

export const metadata = {
  title: 'الملف الشخصي وإعدادات الحساب | سَنَد',
  description: 'إدارة ملفك الشخصي، صورتك الرمزية، إعدادات الخصوصية، كلمة المرور، والجلسات النشطة في منصة سَنَد.',
}

export default async function SettingsPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const searchParams = await props.searchParams
  const user = await getCurrentStudentUser()

  if (!user) {
    redirect('/login')
  }

  const profile = getStudentProfileData(user.email)
  const displayName = profile?.name || user.user_metadata?.full_name || 'طالب العلم'
  const username =
    profile?.username ||
    user.username ||
    user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  const bio = profile?.bio || ''
  const educationLevel = profile?.educationLevel || 'طالب تأصيل منهجي'
  const scholarlyId = profile?.scholarlyId || 'SND-1001'
  const currentPhone = profile?.phone || user.phone || ''
  const currentAvatar = profile?.avatarUrl || user.avatarUrl || ''
  const registeredAtFormatted = profile?.registeredAt
    ? new Date(profile.registeredAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'منذ انطلاق المنصة'

  const isOwner = user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL || profile?.role === 'owner'
  const role = isOwner ? 'owner' : profile?.role === 'admin' || user.role === 'admin' ? 'admin' : 'student'
  const hasPassword = hasStudentLocalPassword(user.email)

  const totalStudyMinutes = profile?.totalStudyMinutes || 0
  const studyHours = (totalStudyMinutes / 60).toFixed(1)
  const streak = profile?.streak || 0
  const completedCoursesCount = Array.isArray(profile?.completedCourses)
    ? profile.completedCourses.length
    : 0
  const notesCount = profile?.notesCount || 0

  const initialPrivacy = profile?.privacySettings || {
    showRealNameInCommunity: true,
    showAvatarInCommunity: true,
    showStudyStatsPublicly: true,
    showBioPublicly: true,
  }

  const initialNotifications = profile?.notificationSettings || {
    lessons: true,
    community: true,
    spacedRepetition: true,
    security: true,
  }

  const sessionInfo = {
    device: profile?.device || 'كمبيوتر محمول (Windows)',
    browser: profile?.browser || 'Google Chrome',
    country: profile?.country || '🇪🇬 مصر',
    city: profile?.city || 'القاهرة',
    ip: profile?.ip || '156.204.12.34',
    sessionVersion: profile?.sessionVersion || 1,
    lastActive: profile?.lastActive || new Date().toISOString(),
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] py-10 dark:bg-stone-950 transition-colors duration-300">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* رأس الصفحة */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6 dark:border-stone-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/5 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-800/15 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>الملف الشخصي الشامل وإدارة الحساب والأمان</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-amiri text-stone-900 dark:text-white">
              إعدادات الحساب والهوية العلمية
            </h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              إدارة بياناتك الشخصية، صورتك الرمزية، إعدادات الخصوصية، وتأمين جلسات الدخول
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            >
              <ArrowRight className="h-4 w-4" />
              <span>العودة إلى الكشكول</span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </div>

        {/* رسائل التنبيه */}
        {searchParams?.message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-bold text-emerald-900 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{searchParams.message}</span>
          </div>
        )}

        {searchParams?.error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-bold text-red-900 shadow-xs dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{searchParams.error}</span>
          </div>
        )}

        {/* بطاقة الهوية الأكاديمية وملخص النشاط */}
        <div className="mb-8 rounded-3xl border border-stone-200 bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-950 p-6 sm:p-7 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {role === 'owner' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 px-3 py-1 text-xs font-black text-amber-300">
                    <Crown className="h-3.5 w-3.5 text-amber-300" />
                    <span>مالك المنصة والمشرف الأعلى (Owner)</span>
                  </span>
                ) : role === 'admin' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                    <span>مشرف معتمد في المنصة (Admin)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold text-stone-200">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-300" />
                    <span>طالب علم مؤصل (Student)</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>حالة الحساب: نشط وموثق</span>
                </span>

                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  {scholarlyId}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-amiri text-white">
                {displayName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-300">
                <span className="font-mono text-amber-200/90" dir="ltr">
                  @{username}
                </span>
                <span>•</span>
                <span>{educationLevel}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>تاريخ الانضمام: {registeredAtFormatted}</span>
                </span>
              </div>
              {bio && (
                <p className="mt-2.5 text-xs text-stone-200/90 leading-relaxed max-w-2xl">
                  «{bio}»
                </p>
              )}
            </div>
          </div>

          {/* ملخص النشاط العلمي */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>ساعات المدارسة</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {studyHours} <span className="text-xs font-normal text-stone-300">ساعة ({totalStudyMinutes} د)</span>
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <Flame className="h-4 w-4 text-orange-400" />
                <span>سلسلة المواظبة</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {streak} <span className="text-xs font-normal text-stone-300">يوم متواصل</span>
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>المتون المنجزة</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {completedCoursesCount} <span className="text-xs font-normal text-stone-300">متن علمي</span>
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <FileText className="h-4 w-4 text-amber-300" />
                <span>فوائد الكشكول</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {notesCount} <span className="text-xs font-normal text-stone-300">فائدة مقيدة</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* القسم الأول: الهوية العلمية والبيانات الشخصية */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4 dark:border-stone-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white">
                  الهوية البصرية والبيانات الشخصية
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  تخصيص صورتك الشخصية، اسم العرض، اسم المستخدم، المرحلة التعليمية، والنبذة التعريفية
                </p>
              </div>
            </div>

            {/* محدد الصورة الرمزية والهوية البصرية */}
            <AvatarSelector
              email={user.email}
              currentName={displayName}
              currentAvatar={currentAvatar}
              updateAvatarAction={updateAvatarAction}
            />

            <form action={updateProfileAction} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300">
                    البريد الإلكتروني الأساسي (موثق ✓)
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={user.email}
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
                      defaultValue={displayName}
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
                      defaultValue={username}
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
                      defaultValue={educationLevel}
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
                      defaultValue={currentPhone}
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
                    defaultValue={bio}
                    placeholder="اكتب نبذة مختصرة عن اهتماماتك العلمية أو المتون التي تعكف على دراستها..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="reset"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-xs font-bold text-stone-700 hover:bg-stone-200 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>إلغاء التعديلات</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
                >
                  <Save className="h-4 w-4 text-amber-300" />
                  <span>حفظ وتوثيق البيانات الشخصية</span>
                </button>
              </div>
            </form>
          </div>

          {/* القسم الثاني: حماية الحساب وتعيين كلمة المرور */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4 dark:border-stone-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white">
                  تعيين وتحديث كلمة المرور المشفرة
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  تشفير قياسي (scrypt + Salt) مع إبطال تلقائي لأي جلسات قديمة غير مصرح بها
                </p>
              </div>
            </div>

            <form action={changePasswordAction} className="space-y-5">
              {hasPassword && (
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
                  >
                    كلمة المرور الحالية (مطلوبة لتأكيد الهوية)
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                      placeholder="أدخل كلمة المرور الحالية..."
                      dir="ltr"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
                  >
                    كلمة المرور الجديدة (6 أحرف أو أرقام على الأقل)
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-xs font-bold text-stone-700 dark:text-stone-300"
                  >
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 py-3 pr-11 pl-4 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-stone-800 transition dark:bg-amber-600 dark:text-stone-950 dark:hover:bg-amber-500"
                >
                  <Lock className="h-4 w-4" />
                  <span>تحديث وتشفير كلمة المرور</span>
                </button>
              </div>
            </form>
          </div>

          {/* الأقسام التفاعلية المتقدمة: تغيير البريد بـ OTP، الخصوصية، الإشعارات، الجلسات النشطة، وتعطيل الحساب */}
          <SettingsInteractivePanel
            email={user.email}
            role={role}
            isOwner={isOwner}
            initialPrivacy={initialPrivacy}
            initialNotifications={initialNotifications}
            sessionInfo={sessionInfo}
          />
        </div>
      </div>
    </div>
  )
}
