'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Bell,
  Eye,
  Mail,
  Laptop,
  LogOut,
  AlertTriangle,
  Check,
  Lock,
  RefreshCw,
  KeyRound,
  RotateCcw,
  Globe,
  Smartphone,
  UserX,
} from 'lucide-react'
import {
  updatePrivacyAndNotificationsAction,
  requestEmailChangeOtpAction,
  confirmEmailChangeAction,
  revokeOtherSessionsAction,
  deactivateAccountAction,
} from '@/app/settings/actions'
import type {
  StudentPrivacySettings,
  StudentNotificationSettings,
  PlatformRole,
} from '@/lib/student-tracking'

interface SettingsInteractivePanelProps {
  email: string
  role: PlatformRole
  isOwner: boolean
  initialPrivacy: StudentPrivacySettings
  initialNotifications: StudentNotificationSettings
  sessionInfo: {
    device: string
    browser: string
    country: string
    city: string
    ip: string
    sessionVersion: number
    lastActive: string
  }
}

export default function SettingsInteractivePanel({
  email,
  isOwner,
  initialPrivacy,
  initialNotifications,
  sessionInfo,
}: SettingsInteractivePanelProps) {
  const router = useRouter()

  // 1. حالة الخصوصية والإشعارات
  const [privacy, setPrivacy] = useState<StudentPrivacySettings>(initialPrivacy)
  const [notifications, setNotifications] = useState<StudentNotificationSettings>(initialNotifications)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsMsg, setPrefsMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 2. حالة تغيير البريد الإلكتروني عبر OTP
  const [newEmail, setNewEmail] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 3. حالة الجلسات النشطة
  const [sessionVersion, setSessionVersion] = useState(sessionInfo.sessionVersion || 1)
  const [revokingSessions, setRevokingSessions] = useState(false)
  const [sessionMsg, setSessionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 4. حالة تعطيل الحساب
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateConfirmText, setDeactivateConfirmText] = useState('')
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const handleTogglePrivacy = async (key: keyof StudentPrivacySettings) => {
    const nextPrivacy = { ...privacy, [key]: !privacy[key] }
    setPrivacy(nextPrivacy)
    setSavingPrefs(true)
    setPrefsMsg(null)
    try {
      const res = await updatePrivacyAndNotificationsAction({ privacySettings: nextPrivacy })
      if (res.success) {
        setPrefsMsg({ text: 'تم حفظ إعدادات الخصوصية والظهور على الخادم بنجاح', type: 'success' })
        router.refresh()
      } else {
        setPrefsMsg({ text: res.error || 'تعذر حفظ الإعدادات', type: 'error' })
      }
    } catch {
      setPrefsMsg({ text: 'حدث خطأ أثناء الاتصال بالخادم', type: 'error' })
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleToggleNotification = async (key: keyof StudentNotificationSettings) => {
    const nextNotifications = { ...notifications, [key]: !notifications[key] }
    setNotifications(nextNotifications)
    try {
      localStorage.setItem('sanad_notification_prefs', JSON.stringify(nextNotifications))
    } catch {}
    setSavingPrefs(true)
    setPrefsMsg(null)
    try {
      const res = await updatePrivacyAndNotificationsAction({
        notificationSettings: nextNotifications,
      })
      if (res.success) {
        setPrefsMsg({ text: 'تم حفظ تفضيلات الإشعارات ومزامنتها مع حسابك', type: 'success' })
      } else {
        setPrefsMsg({ text: res.error || 'تعذر حفظ التفضيلات', type: 'error' })
      }
    } catch {
      setPrefsMsg({ text: 'حدث خطأ أثناء الاتصال بالخادم', type: 'error' })
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailMsg(null)
    setDevOtpHint(null)

    try {
      const res = await requestEmailChangeOtpAction(newEmail)
      if (!res.success) {
        setEmailMsg({ text: res.error || 'تعذر إرسال رمز التحقق', type: 'error' })
      } else {
        setEmailOtpSent(true)
        if (res.devOtpCode) {
          setDevOtpHint(res.devOtpCode)
        }
        setEmailMsg({
          text: res.message || 'تم إرسال رمز التحقق إلى البريد الجديد.',
          type: 'success',
        })
      }
    } catch {
      setEmailMsg({ text: 'تعذر الاتصال بالخادم لإرسال الرمز', type: 'error' })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleConfirmEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !emailOtpCode.trim()) return
    setEmailLoading(true)
    setEmailMsg(null)

    try {
      const res = await confirmEmailChangeAction(newEmail, emailOtpCode)
      if (!res.success) {
        setEmailMsg({ text: res.error || 'رمز التحقق غير صحيح', type: 'error' })
      } else {
        setEmailOtpSent(false)
        setEmailOtpCode('')
        setNewEmail('')
        setDevOtpHint(null)
        setEmailMsg({
          text: res.message || 'تم تحديث البريد الإلكتروني بنجاح!',
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setEmailMsg({ text: 'حدث خطأ أثناء تأكيد البريد الجديد', type: 'error' })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleRevokeOtherSessions = async () => {
    setRevokingSessions(true)
    setSessionMsg(null)
    try {
      const res = await revokeOtherSessionsAction()
      if (!res.success) {
        setSessionMsg({ text: res.error || 'تعذر إنهاء الجلسات الأخرى', type: 'error' })
      } else {
        if (res.sessionVersion) setSessionVersion(res.sessionVersion)
        setSessionMsg({
          text: res.message || 'تم إبطال كافة الجلسات الأخرى بنجاح.',
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setSessionMsg({ text: 'حدث خطأ أثناء الاتصال بالخادم', type: 'error' })
    } finally {
      setRevokingSessions(false)
    }
  }

  const handleDeactivateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeactivating(true)
    setDeactivateError(null)
    try {
      const res = await deactivateAccountAction(deactivateConfirmText, deactivateReason)
      if (!res.success) {
        setDeactivateError(res.error || 'تعذر تعطيل الحساب')
        setDeactivating(false)
      } else {
        window.location.href = '/login?loggedOut=true&mode=login'
      }
    } catch {
      setDeactivateError('حدث خطأ أثناء تنفيذ الطلب')
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. تغيير البريد الإلكتروني مع التحقق عبر OTP */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-3 mb-5 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white">
              تغيير البريد الإلكتروني الموثق
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              البريد الحالي: <span className="font-mono font-bold text-stone-700 dark:text-stone-300" dir="ltr">{email}</span>
            </p>
          </div>
        </div>

        {isOwner ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              حماية سيادية لمالك المنصة: البريد الإلكتروني ({email}) مرتبط بالملكية السيادية لمنصة سَنَد ومحصّن ضد التغيير.
            </span>
          </div>
        ) : (
          <div>
            {emailMsg && (
              <div
                className={`mb-4 rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 ${
                  emailMsg.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>{emailMsg.text}</span>
              </div>
            )}

            {!emailOtpSent ? (
              <form onSubmit={handleRequestEmailOtp} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني الجديد..."
                  dir="ltr"
                  className="flex-1 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4 text-amber-300" />
                  <span>{emailLoading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailOtp} className="space-y-3">
                {devOtpHint && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    رمز التحقق الفوري لتأكيد البريد الجديد: <span className="font-mono text-sm underline">{devOtpHint}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value)}
                    placeholder="أدخل رمز التحقق (6 أرقام)"
                    dir="ltr"
                    className="flex-1 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-center font-mono text-base font-bold tracking-widest text-stone-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>تأكيد وتحديث البريد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailOtpSent(false)
                      setEmailOtpCode('')
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-200 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>تغيير البريد</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* 2. إعدادات الخصوصية والظهور + تفضيلات الإشعارات */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white">
                إعدادات الخصوصية والظهور والإشعارات
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                تحكم في ظهور هويتك وإحصائياتك في مجلس المذاكرة ولوحة الشرف وتنبيهات المنصة
              </p>
            </div>
          </div>
          {prefsMsg && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                prefsMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {prefsMsg.text}
            </span>
          )}
        </div>

        {/* عناصر الخصوصية */}
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-3">
          أولاً: خصوصية الظهور في مجلس المذاكرة ولوحة الشرف
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            {
              key: 'showRealNameInCommunity' as const,
              title: 'إظهار اسمي الكامل في مجلس المذاكرة',
              desc: 'عند الإيقاف ستظهر مشاركاتك بلقب «طالب علم» مع رمزك الأكاديمي',
            },
            {
              key: 'showAvatarInCommunity' as const,
              title: 'إظهار صورتي الشخصية في المشاركات والردود',
              desc: 'عرض صورتك الرمزية أو وسامك بجانب فوائدك ومداخلاتك في المجلس',
            },
            {
              key: 'showStudyStatsPublicly' as const,
              title: 'إظهار إحصائيات المدارسة في لوحة الشرف',
              desc: 'مشاركة ساعات مدارستك وسلسلة المواظبة في ميدان التنافس المحمود',
            },
            {
              key: 'showBioPublicly' as const,
              title: 'إظهار النبذة التعريفية ومرحلة الطلب',
              desc: 'السماح لطلاب العلم برؤية مرحلتك التأصيلية ونبذتك العلمية',
            },
          ].map((item) => {
            const active = privacy[item.key]
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/50"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  disabled={savingPrefs}
                  onClick={() => handleTogglePrivacy(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    active ? 'bg-emerald-700' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      active ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {/* عناصر الإشعارات */}
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-amber-500" />
          <span>ثانياً: تفضيلات الإشعارات والتنبيهات</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              key: 'lessons' as const,
              title: 'إشعارات المجالس والمتون الجديدة',
              desc: 'تنبيهك فور إضافة شروح أو مجالس جديدة في المتون المسجلة',
            },
            {
              key: 'community' as const,
              title: 'تفاعلات وردود مجلس المذاكرة',
              desc: 'إشعارك عند الرد على أسئلتك أو الإعجاب بفوائدك العلمية',
            },
            {
              key: 'spacedRepetition' as const,
              title: 'تذكيرات المراجعة المتباعدة والورد اليومي',
              desc: 'تذكيرك بمواعيد تثبيت المحفوظات ومراجعة الكشكول',
            },
            {
              key: 'security' as const,
              title: 'تنبيهات الأمان وتسجيل الدخول',
              desc: 'إشعارات فورية في صندوق الرسائل عند تغيير كلمة المرور أو الدخول',
            },
          ].map((item) => {
            const active = notifications[item.key]
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/50"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  disabled={savingPrefs}
                  onClick={() => handleToggleNotification(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    active ? 'bg-emerald-700' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      active ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. إدارة الجلسات النشطة والأمان */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white">
                الجلسات النشطة وإدارة الأمان
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                مراقبة الأجهزة المتصلة بحسابك وإبطال الجلسات الأخرى فوراً
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            نسخة الجلسة الآمنة: v{sessionVersion}
          </span>
        </div>

        {sessionMsg && (
          <div
            className={`mb-4 rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 ${
              sessionMsg.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{sessionMsg.text}</span>
          </div>
        )}

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 mb-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
                {sessionInfo.device.includes('هاتف') || sessionInfo.device.includes('آيفون') ? (
                  <Smartphone className="h-5 w-5" />
                ) : (
                  <Laptop className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-white">
                    {sessionInfo.device} — {sessionInfo.browser}
                  </span>
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                    الجلسة الحالية النشطة
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                    {sessionInfo.country} ({sessionInfo.city})
                  </span>
                  <span className="font-mono text-[11px]" dir="ltr">
                    IP: {sessionInfo.ip}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokingSessions}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${revokingSessions ? 'animate-spin' : ''}`} />
              <span>{revokingSessions ? 'جارٍ التأمين...' : 'إنهاء كافة الجلسات الأخرى'}</span>
            </button>
          </div>
        </div>

        {/* تعطيل الحساب (محمي لمالك المنصة) */}
        {!isOwner && (
          <div className="mt-6 pt-5 border-t border-stone-200/80 dark:border-stone-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <UserX className="h-4 w-4" />
                  <span>طلب تعطيل الحساب المؤقت</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  سيؤدي تعطيل الحساب إلى إنهاء جلستك فوراً وإخفاء ملفك من لوحة الشرف حتى تعاود تفعيله.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(!showDeactivateConfirm)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{showDeactivateConfirm ? 'إلغاء الطلب' : 'طلب تعطيل الحساب'}</span>
              </button>
            </div>

            {showDeactivateConfirm && (
              <form
                onSubmit={handleDeactivateAccount}
                className="mt-4 rounded-2xl border border-red-300 bg-red-50/60 p-4 space-y-3 dark:border-red-900/60 dark:bg-red-950/30"
              >
                <p className="text-xs font-bold text-red-900 dark:text-red-200">
                  لتأكيد تعطيل حسابك وإغلاق الجلسة الحالية، يرجى كتابة عبارة{' '}
                  <span className="underline font-black">تعطيل حسابي</span> في الحقل أدناه:
                </p>
                {deactivateError && (
                  <p className="text-xs font-bold text-red-700 dark:text-red-300">{deactivateError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={deactivateConfirmText}
                    onChange={(e) => setDeactivateConfirmText(e.target.value)}
                    placeholder="اكتب: تعطيل حسابي"
                    className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none dark:border-red-800 dark:bg-stone-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    placeholder="سبب التعطيل (اختياري)"
                    className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={deactivating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{deactivating ? 'جارٍ تعطيل الحساب...' : 'تأكيد تعطيل الحساب الآن'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
