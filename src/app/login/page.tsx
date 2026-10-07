'use client'

import { useState, useEffect, use, Suspense } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  KeyRound,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Send,
  RefreshCw,
  Lock,
  Sparkles,
  Inbox,
  Eye,
  EyeOff,
} from 'lucide-react'
import { auth, googleProvider } from '@/lib/firebase/config'
import { signInWithPopup } from 'firebase/auth'
import {
  requestOtpAction,
  verifyOtpAction,
  loginWithPassword,
  signupWithPassword,
  resetPasswordAction,
  signInWithGoogleAction,
  quickGoogleDirectLoginAction,
} from './actions'

interface LoginPageProps {
  searchParams: Promise<{
    error?: string
    message?: string
    mode?: string
    email?: string
    loggedOut?: string
  }>
}

function LoginFormContent({ searchParams }: LoginPageProps) {
  const params = use(searchParams)

  const isVerifyEmailOtp = params.mode === 'verify-otp'
  const isExplicitLogin = params.mode === 'login'
  const [directGoogleMode, setDirectGoogleMode] = useState(false)
  const isGoogleDirect = params.mode === 'google-direct' || directGoogleMode
  const isPasswordMode = params.mode === 'password' || params.mode === 'signup' || params.mode === 'forgot'
  const isLoggedOut = params.loggedOut === 'true'

  // الزائر الجديد تظهر له واجهة إنشاء الحساب تلقائياً، إلا إذا اختار الدخول
  const [authTab, setAuthTab] = useState<'password' | 'otp'>('password')
  const [isSignup, setIsSignup] = useState<boolean>(!isExplicitLogin)
  const [isForgot, setIsForgot] = useState<boolean>(params.mode === 'forgot')

  // حالات إظهار/إخفاء كلمة المرور للتحقق البصري
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // حالات Firebase Auth للتحقق والمصادقة
  const [firebaseLoading, setFirebaseLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)

  // الحساب السابق المكتشف على الجهاز (اختياري للاستئناف دون إجبار)
  const [savedUser, setSavedUser] = useState<{ email: string; fullName?: string } | null>(null)

  // تنظيف جلسة الخروج أو قراءة الحساب السابق اختيارياً دون إجبار على التحويل التلقائي
  useEffect(() => {
    try {
      const hasLogoutCookie = document.cookie.includes('sanad_explicit_logout=true')
      if (isLoggedOut || hasLogoutCookie) {
        localStorage.removeItem('sanad_student_user')
        localStorage.removeItem('sanad_student_registered')
        setSavedUser(null)
        return
      }

      const localSession = localStorage.getItem('sanad_student_user')
      if (localSession) {
        const parsed = JSON.parse(localSession)
        if (parsed?.email) {
          setSavedUser(parsed)
        }
      }
    } catch {}
  }, [isLoggedOut])

  const handleResumeSavedUser = async () => {
    if (!savedUser) return
    try {
      const res = await fetch('/api/auth/restore-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedUser),
      })
      if (res.ok) {
        window.location.replace('/')
      }
    } catch {
      window.location.replace('/')
    }
  }

  const handleForgetSavedUser = () => {
    try {
      localStorage.removeItem('sanad_student_user')
      localStorage.removeItem('sanad_student_registered')
      document.cookie = 'sanad_explicit_logout=true; path=/; max-age=86400;'
    } catch {}
    setSavedUser(null)
  }

  // حفظ بيانات الطالب في localStorage عند إرسال نموذج كلمة المرور
  const handlePasswordFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    try {
      const form = e.currentTarget
      const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement
      const nameInput = form.querySelector('input[name="fullName"]') as HTMLInputElement
      if (emailInput?.value) {
        const cleanEmail = emailInput.value.trim().toLowerCase()
        const fullName = nameInput?.value?.trim() || cleanEmail.split('@')[0]
        localStorage.setItem(
          'sanad_student_user',
          JSON.stringify({
            email: cleanEmail,
            fullName,
            authProvider: 'email',
          })
        )
        localStorage.setItem('sanad_student_registered', 'true')
      }
    } catch {}
  }

  // 1. تسجيل الدخول المباشر بحساب Google عبر Firebase
  const handleGoogleSignIn = async () => {
    setFirebaseLoading(true)
    setFirebaseError(null)
    try {
      const res = await signInWithPopup(auth, googleProvider)
      const fbUser = res.user
      const syncRes = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fbUser.email,
          fullName: fbUser.displayName || fbUser.email?.split('@')[0],
          avatarUrl: fbUser.photoURL,
          authProvider: 'google',
        }),
      })
      if (syncRes.ok) {
        try {
          localStorage.setItem(
            'sanad_student_user',
            JSON.stringify({
              email: fbUser.email,
              fullName: fbUser.displayName || fbUser.email?.split('@')[0],
              avatarUrl: fbUser.photoURL,
              authProvider: 'google',
            })
          )
          localStorage.setItem('sanad_student_registered', 'true')
        } catch {}
        window.location.href = '/courses'
      } else {
        const data = await syncRes.json()
        setFirebaseError(data.error || 'فشل مزامنة جلسة Google')
      }
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string }
      if (fbErr.code === 'auth/popup-closed-by-user') {
        // المستخدم أغلق نافذة Google بنفسه، نلغي التحميل بهدوء دون أي رسالة مزعجة
        return
      }
      // في حال واجه المتصفح حظر النوافذ المنبثقة أو أي تعذر تقني، نتحول فوراً وبسلاسة إلى نموذج الدخول المباشر بحساب Google
      setDirectGoogleMode(true)
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/login?mode=google-direct')
      }
    } finally {
      setFirebaseLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center justify-center px-4 py-12">
      <div className="card-3d relative w-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95">
        
        {/* شريط تذهيب علوي فاخر */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        {/* ترويسة النموذج */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-900 to-teal-950 text-amber-300 shadow-md ring-1 ring-amber-400/30">
            <BookOpen className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-2xl font-black text-stone-900 dark:text-white">
            {isVerifyEmailOtp
              ? 'تأكيد ملكية البريد الإلكتروني'
              : isGoogleDirect
              ? 'تسجيل الدخول المباشر بحساب Google'
              : authTab === 'otp'
              ? 'الدخول الموثق عبر البريد الإلكتروني'
              : isForgot
              ? 'تعديل وتعيين كلمة المرور'
              : isSignup
              ? 'إنشاء حساب جديد لطالب العلم'
              : 'حيّاك الله في منصة سَنَد'}
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            {isVerifyEmailOtp
              ? 'أدخل رمز التحقق السري المرسل إلى بريدك الإلكتروني للتأكد من هويتك والدخول الآمن'
              : isGoogleDirect
              ? 'أدخل بريد Google واسمك ليتم تسجيلك فوراً مع ربط كشكولك ومجالسك العلمية'
              : authTab === 'otp'
              ? 'اكتب بريدك وسنرسل رمز تحقق سرياً يصلك فوراً في بريدك وصندوق سَنَد'
              : isForgot
              ? 'أدخل بريدك الإلكتروني وكلمة المرور الجديدة لتحديث حسابك والدخول فوراً'
              : isSignup
              ? 'أنشئ حسابك لمزامنة كشكول الفوائد وقيود المتون والتقارير العلمية'
              : 'سجل دخولك ببريدك وكلمة المرور لمتابعة مجالسك التأصيلية'}
          </p>
        </div>

        {/* إشعار تأكيد تسجيل الخروج بنجاح */}
        {isLoggedOut && !params.error && !params.message && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">تم تسجيل الخروج بنجاح. يمكنك الآن تسجيل الدخول بحساب آخر أو إنشاء حساب جديد.</span>
          </div>
        )}

        {/* خيار الاستئناف الاختياري للحساب السابق (دون أي إجبار) */}
        {savedUser && !isLoggedOut && !isVerifyEmailOtp && (
          <div className="mt-4 rounded-2xl border border-emerald-300/80 bg-emerald-50/70 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  حساب مسجل سابقاً على هذا الجهاز: {savedUser.fullName || 'طالب العلم'}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                  {savedUser.email}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResumeSavedUser}
                  className="flex-1 sm:flex-initial rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition cursor-pointer"
                >
                  متابعة بهذا الحساب ←
                </button>
                <button
                  type="button"
                  onClick={handleForgetSavedUser}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                  title="الدخول بحساب آخر"
                >
                  حساب آخر ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* رسائل التنبيه والنجاح */}
        {params.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-bold leading-relaxed">{params.error}</span>
            </div>
            {params.error.includes('غير صحيحة') && !isForgot && (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('password')
                  setIsForgot(true)
                  setIsSignup(false)
                }}
                className="mt-1 block text-[11px] font-bold text-rose-900 underline hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer"
              >
                نسيت كلمة المرور؟ اضغط هنا لتعديلها وتعيين كلمة جديدة ←
              </button>
            )}
          </div>
        )}

        {params.message && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{params.message}</span>
          </div>
        )}

        {firebaseError && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span className="font-bold leading-relaxed">{firebaseError}</span>
          </div>
        )}

        {/* ========================================================
            حالة 1: تأكيد كود التحقق للبريد الإلكتروني (Verify Email OTP)
           ======================================================== */}
        {isVerifyEmailOtp ? (
          <form action={verifyOtpAction} className="mt-6 space-y-4">
            <input type="hidden" name="email" value={params.email || ''} />

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>رمز التحقق السري للبريد (6 أرقام) *</span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  {params.email}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="otpCode"
                  required
                  maxLength={6}
                  autoFocus
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-xl rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-3 text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>
              <p className="text-[11px] text-stone-400">
                صالح لمدة 10 دقائق. راجع صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-linear-to-r from-emerald-800 to-emerald-950 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/20 hover:from-emerald-700 hover:to-emerald-900 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600/30"
            >
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              <span>تحقق والدخول إلى المنصة</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                href={`/login?email=${encodeURIComponent(params.email || '')}`}
                className="text-xs font-bold text-stone-500 hover:text-emerald-800 transition dark:text-stone-400 dark:hover:text-emerald-400"
              >
                ← تغيير البريد أو إعادة إرسال الرمز
              </Link>
            </div>
          </form>
        ) : isGoogleDirect ? (
          /* ========================================================
             حالة 2: الدخول المباشر بحساب Google (Google 1-Click Direct)
             ======================================================== */
          <form action={quickGoogleDirectLoginAction} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>دخول مباشر وآمن يربط حساب Google فوراً بكشكولك دون الحاجة لنوافذ منبثقة.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                عنوان بريد Google (Gmail) *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="googleEmail"
                  required
                  autoFocus
                  defaultValue={params.email || ''}
                  placeholder="name@gmail.com"
                  className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <Mail className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                اسم طالب العلم (اختياري)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="googleName"
                  placeholder="الاسم الكريم أو اللقب (أو اتركه فارغاً)"
                  className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <User className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white border border-stone-300 py-3 text-xs sm:text-sm font-black text-stone-800 shadow-sm hover:bg-stone-50 transition-all cursor-pointer flex items-center justify-center gap-3 dark:bg-stone-800 dark:border-stone-700 dark:text-white dark:hover:bg-stone-750"
            >
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
              <span>تأكيد المتابعة بحساب Google المعتمد</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                onClick={() => setDirectGoogleMode(false)}
                className="text-xs font-bold text-stone-500 hover:text-emerald-800 transition dark:text-stone-400 dark:hover:text-emerald-400"
              >
                ← العودة إلى خيارات الدخول الأخرى
              </Link>
            </div>
          </form>
        ) : (
          /* ========================================================
             الحالة العامة: زر Google المباشر + التبويبات الثنائية
             ======================================================== */
          <>
            {/* زر تسجيل الدخول المباشر عبر Google (Firebase Auth) */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={firebaseLoading}
                className="w-full rounded-2xl bg-white border border-stone-200 py-3 px-4 text-xs sm:text-sm font-bold text-stone-800 shadow-xs hover:bg-stone-50 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-3 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-750 disabled:opacity-50"
              >
                {firebaseLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-emerald-800 dark:text-emerald-400" />
                ) : (
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                )}
                <span>{isSignup ? 'التسجيل السريع بنقرة واحدة عبر Google' : 'تسجيل الدخول السريع عبر Google'}</span>
              </button>

              <div className="text-center pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDirectGoogleMode(true)
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', '/login?mode=google-direct')
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300 transition cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>أو المتابعة بكتابة بريد Google مباشرة ←</span>
                </button>
              </div>
            </div>

            {/* فاصل أنيق */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-stone-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/95 px-3 text-stone-400 dark:bg-stone-900/95 font-medium">
                  أو اختر وسيلة الدخول
                </span>
              </div>
            </div>

            {/* أزرار التبديل الثنائية النظيفة */}
            <div className="flex rounded-2xl border border-stone-200 bg-stone-100/70 p-1 text-[11px] sm:text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setAuthTab('password')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  authTab === 'password'
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <User className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                <span>{isSignup ? 'حساب جديد' : 'كلمة المرور'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthTab('otp')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  authTab === 'otp'
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <Mail className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                <span>رمز البريد</span>
              </button>
            </div>

            {/* النموذج 1: البريد الإلكتروني (OTP) */}
            {authTab === 'otp' && (
              <form action={requestOtpAction} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    عنوان بريدك الإلكتروني *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={params.email || ''}
                      placeholder="student@example.com"
                      className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                    />
                    <Mail className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    🔒 سنرسل رمز تحقق سرياً للتأكد من هويتك كطالب علم وربط كشكولك.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-linear-to-r from-emerald-800 to-emerald-950 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/20 hover:from-emerald-700 hover:to-emerald-900 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600/30"
                >
                  <Send className="h-4 w-4 text-amber-300" />
                  <span>إرسال رمز التحقق إلى البريد ←</span>
                </button>
              </form>
            )}

            {/* النموذج 2: كلمة المرور (دخول / إنشاء حساب / استرجاع) */}
            {authTab === 'password' && (
              isForgot ? (
                /* استرجاع كلمة المرور */
                <form action={resetPasswordAction} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      البريد الإلكتروني المسجل *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={params.email || ''}
                        placeholder="student@example.com"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <Mail className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      كلمة المرور الجديدة *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 pl-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <KeyRound className="absolute right-3.5 top-3 h-4 w-4 text-stone-400 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 dark:hover:text-stone-200 dark:hover:bg-stone-700/50 transition cursor-pointer"
                        title={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      تأكيد كلمة المرور الجديدة *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 pl-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <KeyRound className="absolute right-3.5 top-3 h-4 w-4 text-stone-400 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 dark:hover:text-stone-200 dark:hover:bg-stone-700/50 transition cursor-pointer"
                        title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-linear-to-r from-emerald-800 to-emerald-950 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/20 hover:from-emerald-700 hover:to-emerald-900 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600/30"
                  >
                    <RefreshCw className="h-4 w-4 text-amber-300" />
                    <span>تحديث كلمة المرور والدخول إلى المنصة ←</span>
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setIsForgot(false)}
                      className="text-xs font-bold text-stone-500 hover:text-emerald-800 transition dark:text-stone-400 dark:hover:text-emerald-400 cursor-pointer"
                    >
                      ← الرجوع لتسجيل الدخول بكلمة المرور
                    </button>
                  </div>
                </form>
              ) : (
                /* دخول أو إنشاء حساب بكلمة المرور */
                <form
                  action={isSignup ? signupWithPassword : loginWithPassword}
                  onSubmit={handlePasswordFormSubmit}
                  className="mt-5 space-y-4"
                >
                  {isSignup && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        اسم الطالب أو الكنية *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="fullName"
                          required
                          placeholder="الاسم الكريم أو اللقب"
                          className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                        />
                        <User className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      البريد الإلكتروني *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={params.email || ''}
                        placeholder="student@example.com"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <Mail className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        كلمة المرور *
                      </label>
                      {!isSignup && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgot(true)
                            setIsSignup(false)
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline dark:text-amber-400 cursor-pointer"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 pl-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <KeyRound className="absolute right-3.5 top-3 h-4 w-4 text-stone-400 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 dark:hover:text-stone-200 dark:hover:bg-stone-700/50 transition cursor-pointer"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-emerald-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-emerald-950 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSignup ? (
                      <>
                        <User className="h-4 w-4" />
                        <span>تأكيد إنشاء الحساب الجديد</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>تسجيل الدخول بالمرور</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setIsSignup(!isSignup)}
                      className="text-xs font-bold text-stone-500 hover:text-emerald-800 transition dark:text-stone-400 dark:hover:text-emerald-400 cursor-pointer"
                    >
                      {isSignup
                        ? 'لديك حساب بالفعل؟ تسجيل الدخول'
                        : 'طالب جديد في المنصة؟ أنشئ حسابك من هنا'}
                    </button>
                  </div>
                </form>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center justify-center px-4 py-12">
          <div className="flex h-32 w-full items-center justify-center rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/95">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
          </div>
        </div>
      }
    >
      <LoginFormContent {...props} />
    </Suspense>
  )
}