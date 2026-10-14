'use client'

import React, { useState, useEffect, use, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Eye,
  EyeOff,
} from 'lucide-react'
import { auth, googleProvider } from '@/lib/firebase/config'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { syncUserToFirestore, verifyUserAccount } from '@/lib/user-service'
import {
  requestOtpAction,
  verifyOtpAction,
  resetPasswordAction,
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
  const router = useRouter()
  const params = use(searchParams)

  const isVerifyEmailOtp = params.mode === 'verify-otp'
  const isResetStep2 = params.mode === 'reset-step2'
  const isExplicitLogin = params.mode === 'login'
  const isLoggedOut = params.loggedOut === 'true'

  // التبويبات والخيارات
  const [authTab, setAuthTab] = useState<'password' | 'otp'>('password')
  const [isSignup, setIsSignup] = useState<boolean>(!isExplicitLogin && params.mode !== 'forgot' && !isResetStep2)
  const [isForgot, setIsForgot] = useState<boolean>(params.mode === 'forgot')

  // حالات إظهار/إخفاء كلمة المرور للتحقق البصري
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // حالات Firebase Auth
  const [firebaseLoading, setFirebaseLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null)

  // حقول الإدخال
  const [emailInput, setEmailInput] = useState(params.email || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [fullNameInput, setFullNameInput] = useState('')

  // تنظيف أي مخلفات قديمة في التخزين المحلي عند تسجيل الخروج
  useEffect(() => {
    try {
      if (isLoggedOut || document.cookie.includes('sanad_explicit_logout=true')) {
        localStorage.removeItem('sanad_student_user')
        localStorage.removeItem('sanad_student_registered')
      }
    } catch {}
  }, [isLoggedOut])

  // تسجيل الدخول الموثق بحساب Google عبر Firebase و Cloud Firestore
  const handleGoogleSignIn = async () => {
    setFirebaseLoading(true)
    setFirebaseError(null)
    setResetSuccessMsg(null)
    try {
      const res = await signInWithPopup(auth, googleProvider)
      const fbUser = res.user

      // 1. مزامنة فورية في Firestore (users/{uid}) وزيادة عداد الإحصائيات
      const synced = await syncUserToFirestore(fbUser.uid, {
        fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'طالب العلم',
        email: fbUser.email || '',
        phoneNumber: fbUser.phoneNumber,
        avatarUrl: fbUser.photoURL,
        isNewUser: false,
      })

      // 2. التحقق من حالة الحساب (حظر أو صلاحية الإدارة)
      const check = await verifyUserAccount(fbUser.uid)
      if (!check.allowed) {
        await signOut(auth).catch(() => {})
        setFirebaseError(check.message || 'تم تجميد حسابك، يُرجى التواصل مع إدارة منصة سَنَد للمراجعة.')
        return
      }

      // 3. توثيق جلسة الكوكي المشفرة عبر السيرفر
      const idToken = await fbUser.getIdToken()
      await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          authProvider: 'google',
        }),
      })

      // 4. التوجيه بناءً على الصلاحيات
      if (check.role === 'admin' || synced.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/courses')
      }
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string }
      if (fbErr.code === 'auth/popup-closed-by-user') {
        return
      }
      if (fbErr.code === 'auth/popup-blocked') {
        setFirebaseError('تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة أو استخدام الدخول بالبريد.')
        return
      }
      if (fbErr.code === 'auth/unauthorized-domain') {
        setFirebaseError('نطاق المنصة الحالي غير مدرج في النطاقات المعتمدة لـ Google Firebase. يرجى إضافة النطاق في إعدادات Firebase Console.')
        return
      }
      setFirebaseError(fbErr.message || 'تعذر استكمال تسجيل الدخول عبر Google حالياً. يرجى المحاولة لاحقاً أو استخدام البريد.')
    } finally {
      setFirebaseLoading(false)
    }
  }

  // تسجيل حساب جديد أو دخول بالبريد وكلمة المرور عبر Firebase Auth & Firestore
  const handleEmailPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFirebaseLoading(true)
    setFirebaseError(null)
    setResetSuccessMsg(null)

    const cleanEmail = emailInput.trim().toLowerCase()
    const password = passwordInput

    if (!cleanEmail || !password) {
      setFirebaseError('يرجى ملء جميع الحقول المطلوبة بدقة.')
      setFirebaseLoading(false)
      return
    }

    try {
      if (isSignup) {
        const cleanName = fullNameInput.trim() || cleanEmail.split('@')[0]
        if (password.length < 6) {
          setFirebaseError('يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.')
          setFirebaseLoading(false)
          return
        }

        // 1. إنشاء الحساب في Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password)
        const fbUser = cred.user

        // 2. تحديث الاسم في ملف Auth
        await updateProfile(fbUser, { displayName: cleanName }).catch(() => {})

        // 3. إنشاء مستند Firestore في users/{uid} وزيادة إجمالي الطلاب في site_stats/overview
        const synced = await syncUserToFirestore(fbUser.uid, {
          fullName: cleanName,
          email: cleanEmail,
          isNewUser: true,
        })

        // 4. مزامنة جلسة الكوكي في الخادم
        const idToken = await fbUser.getIdToken()
        await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            authProvider: 'email',
          }),
        })

        // 5. التوجيه الفوري
        if (synced.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/courses')
        }
      } else {
        // تسجيل الدخول بالبريد وكلمة المرور
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password)
        const fbUser = cred.user

        // 1. فحص حالة الحساب (حظر أو نشط)
        const check = await verifyUserAccount(fbUser.uid)
        if (!check.allowed) {
          await signOut(auth).catch(() => {})
          setFirebaseError(check.message || 'تم تجميد حسابك، يُرجى التواصل مع إدارة منصة سَنَد للمراجعة.')
          setFirebaseLoading(false)
          return
        }

        // 2. مزامنة الكوكي عبر السيرفر
        const idToken = await fbUser.getIdToken()
        await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            authProvider: 'email',
          }),
        })

        // 3. التوجيه بناءً على الصلاحيات
        if (check.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/courses')
        }
      }
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string }
      if (fbErr.code === 'auth/email-already-in-use') {
        setFirebaseError('هذا البريد مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة بكلمة المرور.')
      } else if (
        fbErr.code === 'auth/invalid-credential' ||
        fbErr.code === 'auth/wrong-password' ||
        fbErr.code === 'auth/user-not-found'
      ) {
        setFirebaseError('بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور أو إنشاء حساب جديد.')
      } else if (fbErr.code === 'auth/invalid-email') {
        setFirebaseError('عنوان البريد الإلكتروني غير صحيح.')
      } else if (fbErr.code === 'auth/weak-password') {
        setFirebaseError('كلمة المرور ضعيفة، يجب أن تحتوي على 6 أحرف أو أرقام على الأقل.')
      } else if (fbErr.code === 'auth/too-many-requests') {
        setFirebaseError('تم إجراء محاولات متكررة، يرجى الانتظار قليلاً أو استعادة كلمة المرور.')
      } else {
        setFirebaseError(fbErr.message || 'حدث خطأ أثناء الاتصال بخادم المصادقة.')
      }
    } finally {
      setFirebaseLoading(false)
    }
  }

  // استعادة كلمة المرور عبر رابط Firebase Auth الرسمي
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFirebaseLoading(true)
    setFirebaseError(null)
    setResetSuccessMsg(null)

    const cleanEmail = emailInput.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFirebaseError('يرجى كتابة عنوان بريد إلكتروني صحيح.')
      setFirebaseLoading(false)
      return
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail)
      setResetSuccessMsg('تم إرسال رابط استعادة وتعديل كلمة المرور إلى بريدك الإلكتروني بنجاح. راجع صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).')
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string }
      if (fbErr.code === 'auth/user-not-found') {
        setFirebaseError('هذا البريد الإلكتروني غير مسجل في المنصة.')
      } else {
        setFirebaseError(fbErr.message || 'تعذر إرسال رابط استعادة كلمة المرور حالياً.')
      }
    } finally {
      setFirebaseLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-start justify-center px-4 pt-6 sm:pt-10 pb-16">
      <div className="card-3d relative w-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95">
        
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
              : isResetStep2
              ? 'تعيين كلمة المرور الجديدة'
              : isForgot
              ? 'استعادة وتعديل كلمة المرور'
              : authTab === 'otp'
              ? 'الدخول الموثق عبر البريد الإلكتروني'
              : isSignup
              ? 'إنشاء حساب جديد لطالب العلم'
              : 'حيّاك الله في منصة سَنَد'}
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            {isVerifyEmailOtp
              ? 'أدخل رمز التحقق السري المرسل إلى بريدك الإلكتروني للتأكد من هويتك والدخول الآمن'
              : isResetStep2
              ? 'أدخل رمز التحقق المرسل لبريدك مع كلمة المرور الجديدة لتحديث حسابك'
              : isForgot
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور بأمان'
              : authTab === 'otp'
              ? 'اكتب بريدك وسنرسل رمز تحقق سرياً يصلك فوراً في بريدك الإلكتروني'
              : isSignup
              ? 'أنشئ حسابك لمزامنة كشكول الفوائد وقيود المتون والتقارير العلمية'
              : 'سجل دخولك ببريدك وكلمة المرور لمتابعة مجالسك التأصيلية'}
          </p>
        </div>

        {/* إشعار تأكيد تسجيل الخروج بنجاح */}
        {isLoggedOut && !params.error && !params.message && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">تم تسجيل الخروج بنجاح. يمكنك الآن تسجيل الدخول أو إنشاء حساب جديد.</span>
          </div>
        )}

        {/* رسائل التنبيه والنجاح */}
        {params.error && !firebaseError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-bold leading-relaxed">{params.error}</span>
            </div>
            {params.error.includes('غير صحيحة') && !isForgot && !isResetStep2 && (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('password')
                  setIsForgot(true)
                  setIsSignup(false)
                }}
                className="mt-1 block text-[11px] font-bold text-rose-900 underline hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer"
              >
                نسيت كلمة المرور؟ اضغط هنا لاستعادتها بأمان ←
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

        {resetSuccessMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="font-bold leading-relaxed">{resetSuccessMsg}</span>
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
        ) : isResetStep2 ? (
          /* ========================================================
             حالة 2: استرجاع كلمة المرور - الخطوة 2 (كود OTP + كلمة المرور الجديدة)
             ======================================================== */
          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input type="hidden" name="email" value={params.email || ''} />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>رمز التحقق المرسل لبريدك (6 أرقام) *</span>
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
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-lg rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
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
              <Link
                href="/login"
                className="text-xs font-bold text-stone-500 hover:text-emerald-800 transition dark:text-stone-400 dark:hover:text-emerald-400"
              >
                ← العودة إلى تسجيل الدخول
              </Link>
            </div>
          </form>
        ) : (
          /* ========================================================
             الحالة العامة: زر Google الموثق + التبويبات الرسمية
             ======================================================== */
          <>
            {/* زر تسجيل الدخول الموثق عبر Google (Firebase Auth) */}
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
                <span>{isSignup ? 'التسجيل المباشر الموثق عبر Google' : 'تسجيل الدخول الموثق عبر Google'}</span>
              </button>
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
                onClick={() => {
                  setAuthTab('password')
                  setIsForgot(false)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  authTab === 'password' && !isForgot
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <User className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                <span>{isSignup ? 'حساب جديد' : 'كلمة المرور'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('otp')
                  setIsForgot(false)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  authTab === 'otp'
                    ? 'bg-white text-emerald-950 shadow-xs dark:bg-stone-700 dark:text-emerald-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                <Mail className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                <span>رمز البريد السري</span>
              </button>
            </div>

            {/* النموذج 1: البريد الإلكتروني برمز التحقق (OTP) */}
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
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
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

            {/* النموذج 2: كلمة المرور (دخول / إنشاء حساب / استرجاع) عبر Firebase */}
            {authTab === 'password' && (
              isForgot ? (
                /* استرجاع كلمة المرور: إرسال رابط رسمي عبر Firebase Auth */
                <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      البريد الإلكتروني المسجل في سَنَد *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="student@example.com"
                        className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] px-4 py-2.5 pr-10 text-xs text-stone-900 focus:border-emerald-800 focus:bg-white dark:focus:bg-stone-800 dark:text-stone-100 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                      <Mail className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      🔒 سنرسل رابط استعادة وتعديل كلمة المرور المعتمد رسمياً إلى هذا البريد.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={firebaseLoading}
                    className="w-full rounded-2xl bg-linear-to-r from-emerald-800 to-emerald-950 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/20 hover:from-emerald-700 hover:to-emerald-900 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600/30 disabled:opacity-50"
                  >
                    {firebaseLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                    ) : (
                      <Send className="h-4 w-4 text-amber-300" />
                    )}
                    <span>إرسال رابط إعادة التعيين للبريد ←</span>
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
                /* دخول أو إنشاء حساب بكلمة المرور عبر Firebase Auth الموثق */
                <form
                  onSubmit={handleEmailPasswordSubmit}
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
                          value={fullNameInput}
                          onChange={(e) => setFullNameInput(e.target.value)}
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
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
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
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
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
                    disabled={firebaseLoading}
                    className="w-full rounded-2xl bg-emerald-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-emerald-950 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {firebaseLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                    ) : isSignup ? (
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
                      onClick={() => {
                        setIsSignup(!isSignup)
                        setFirebaseError(null)
                      }}
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