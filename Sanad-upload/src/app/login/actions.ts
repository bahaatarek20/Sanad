'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { setStudentSessionCookie, clearStudentSession } from '@/lib/auth-helper'
import { sendOtpToEmail, verifyOtpCode } from '@/lib/otp-service'
import { sendOtpToPhone, verifyPhoneOtp } from '@/lib/phone-auth-service'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'
import { extractClientTelemetry } from '@/lib/telemetry-helper'
import { syncStudentToFirebaseAuth } from '@/lib/firebase-auth-sync'
import {
  registerOrUpdateStudent,
  registerOrUpdateStudentAsync,
  saveStudentLocalPassword,
  verifyStudentLocalPassword,
  getStudentProfileData,
  isStudentBanned,
} from '@/lib/student-tracking'

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { message?: string; digest?: string }
  return (
    err.message === 'NEXT_REDIRECT' ||
    (typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT'))
  )
}

// 1. طلب إرسال رمز التحقق إلى البريد الإلكتروني (Login/Signup via Email OTP)
export async function requestOtpAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()

  if (!rawEmail || !rawEmail.includes('@')) {
    return redirect(`/login?error=${encodeURIComponent('يرجى كتابة عنوان بريد إلكتروني صحيح.')}`)
  }

  const email = rawEmail.toLowerCase()
  const banCheck = isStudentBanned(email)
  if (banCheck.isBanned) {
    return redirect(
      `/login?error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}&email=${encodeURIComponent(email)}`
    )
  }

  const result = await sendOtpToEmail(email)

  if (!result.success) {
    return redirect(`/login?error=${encodeURIComponent(result.message)}&email=${encodeURIComponent(email)}`)
  }

  const redirectUrl = `/login?mode=verify-otp&email=${encodeURIComponent(email)}&message=${encodeURIComponent(result.message)}`
  redirect(redirectUrl)
}

// 2. التحقق من كود التحقق وتأكيد الدخول
export async function verifyOtpAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const code = (formData.get('otpCode') as string)?.trim()

  if (!rawEmail || !code) {
    return redirect(
      `/login?mode=verify-otp&email=${encodeURIComponent(rawEmail || '')}&error=${encodeURIComponent(
        'يرجى إدخال رمز التحقق المكون من 6 أرقام.'
      )}`
    )
  }

  const email = rawEmail.toLowerCase()
  const banCheck = isStudentBanned(email)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=verify-otp&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}`
    )
  }

  const result = await verifyOtpCode(email, code)

  if (!result.success) {
    return redirect(
      `/login?mode=verify-otp&email=${encodeURIComponent(email)}&error=${encodeURIComponent(result.message)}`
    )
  }

  const student = getStudentProfileData(email)
  const fullName = student?.name || email.split('@')[0]
  const clientTelemetry = extractClientTelemetry(await headers())

  await registerOrUpdateStudentAsync(email, fullName, { ...clientTelemetry, authProvider: 'email' })
  await setStudentSessionCookie(fullName, email, { authProvider: 'email' })
  syncStudentToFirebaseAuth(email, undefined, fullName).catch(() => {})

  try {
    depositWelcomeMessage(email, fullName)
    depositSecurityAlert(email, fullName, 'تم تسجيل الدخول بنجاح عبر رمز التحقق الموثق للبريد الإلكتروني')
  } catch {}

  revalidatePath('/', 'layout')
  redirect('/courses')
}

// 3. تسجيل الدخول بالبريد وكلمة المرور
export async function loginWithPassword(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!rawEmail || !password) {
    return redirect(`/login?mode=password&error=${encodeURIComponent('يرجى إدخال البريد الإلكتروني وكلمة المرور.')}`)
  }

  const cleanEmail = rawEmail.toLowerCase()
  const banCheck = isStudentBanned(cleanEmail)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=password&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد. للمراجعة والاستفسار يرجى التواصل مع الإدارة.'
      )}&email=${encodeURIComponent(cleanEmail)}`
    )
  }

  let redirectTo: string | null = null
  let errorMessage: string | null = null

  try {
    const headerList = await headers()
    const clientTelemetry = extractClientTelemetry(headerList)

    const isVerified = verifyStudentLocalPassword(cleanEmail, password)
    if (isVerified) {
      const student = getStudentProfileData(cleanEmail)
      const fullName = student?.name || cleanEmail.split('@')[0]
      await setStudentSessionCookie(fullName, cleanEmail, { authProvider: 'email' })
      await registerOrUpdateStudentAsync(cleanEmail, fullName, { ...clientTelemetry, authProvider: 'email' })
      syncStudentToFirebaseAuth(cleanEmail, password, fullName).catch(() => {})
      redirectTo = '/courses'
    } else {
      errorMessage = 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور أو إنشاء حساب جديد.'
    }
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'تعذر الاتصال بخادم الحسابات.'
  }

  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(`/login?mode=password&error=${encodeURIComponent(errorMessage || 'تعذر استكمال تسجيل الدخول')}&email=${encodeURIComponent(cleanEmail)}`)
}

// 4. إنشاء حساب جديد بالبريد وكلمة المرور
export async function signupWithPassword(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim() || 'طالب العلم'

  if (!rawEmail || !password) {
    return redirect(`/login?mode=signup&error=${encodeURIComponent('يرجى ملء جميع الحقول المطلوبة.')}`)
  }

  if (password.length < 6) {
    return redirect(`/login?mode=signup&error=${encodeURIComponent('يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.')}`)
  }

  const cleanEmail = rawEmail.toLowerCase()
  const banCheck = isStudentBanned(cleanEmail)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=signup&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}&email=${encodeURIComponent(cleanEmail)}`
    )
  }

  let redirectTo: string | null = null
  let errorMessage: string | null = null

  try {
    const headerList = await headers()
    const clientTelemetry = extractClientTelemetry(headerList)

    saveStudentLocalPassword(cleanEmail, password, fullName)
    await setStudentSessionCookie(fullName, cleanEmail, { authProvider: 'email' })
    await registerOrUpdateStudentAsync(cleanEmail, fullName, { ...clientTelemetry, authProvider: 'email' })
    syncStudentToFirebaseAuth(cleanEmail, password, fullName).catch(() => {})

    try {
      depositWelcomeMessage(cleanEmail, fullName)
      depositSecurityAlert(cleanEmail, fullName, 'تم إنشاء حسابك الجديد بنجاح في منصة سَنَد')
    } catch {}

    redirectTo = '/courses'
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحساب.'
  }

  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(`/login?mode=signup&error=${encodeURIComponent(errorMessage || 'حدث خطأ أثناء إنشاء الحساب')}`)
}

// 5. الخطوة الأولى لاسترجاع كلمة المرور: طلب إرسال رمز التحقق للبريد
export async function requestPasswordResetOtpAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()

  if (!rawEmail || !rawEmail.includes('@')) {
    return redirect(`/login?mode=forgot&error=${encodeURIComponent('يرجى كتابة عنوان بريد إلكتروني صحيح.')}`)
  }

  const cleanEmail = rawEmail.toLowerCase()
  const banCheck = isStudentBanned(cleanEmail)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=forgot&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}&email=${encodeURIComponent(cleanEmail)}`
    )
  }

  const result = await sendOtpToEmail(cleanEmail, 'reset-password')
  if (!result.success) {
    return redirect(`/login?mode=forgot&error=${encodeURIComponent(result.message)}&email=${encodeURIComponent(cleanEmail)}`)
  }

  // إرسال طلب رابط Firebase Auth في الخلفية بشكل صامت كنسخة إضافية
  try {
    const fbApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBr8Ch1B8YCx6AC7uTcrZIhD5D3s-iSxy4'
    fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${fbApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: cleanEmail }),
    }).catch(() => {})
  } catch {}

  redirect(
    `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&message=${encodeURIComponent(
      'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح. أدخل الرمز وكلمة المرور الجديدة لإتمام التحديث.'
    )}`
  )
}

// 6. الخطوة الثانية لاسترجاع كلمة المرور: التحقق من الكود وتعيين كلمة المرور الجديدة
export async function resetPasswordAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const otpCode = (formData.get('otpCode') as string)?.trim()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!rawEmail || !otpCode || !newPassword || !confirmPassword) {
    return redirect(
      `/login?mode=reset-step2&email=${encodeURIComponent(rawEmail || '')}&error=${encodeURIComponent(
        'يرجى ملء جميع الحقول ورمز التحقق.'
      )}`
    )
  }

  const cleanEmail = rawEmail.toLowerCase()

  if (newPassword.length < 6) {
    return redirect(
      `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&error=${encodeURIComponent(
        'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام.'
      )}`
    )
  }

  if (newPassword !== confirmPassword) {
    return redirect(
      `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&error=${encodeURIComponent(
        'كلمتا المرور غير متطابقتين، يرجى كتابتهما بدقة.'
      )}`
    )
  }

  const banCheck = isStudentBanned(cleanEmail)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}`
    )
  }

  // التحقق الأمني الإلزامي من رمز التحقق السري OTP قبل السماح بتغيير كلمة المرور
  const otpVerification = await verifyOtpCode(cleanEmail, otpCode)
  if (!otpVerification.success) {
    return redirect(
      `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&error=${encodeURIComponent(
        otpVerification.message
      )}`
    )
  }

  let redirectTo: string | null = null
  let errorMessage: string | null = null

  try {
    const headerList = await headers()
    const clientTelemetry = extractClientTelemetry(headerList)
    const student = getStudentProfileData(cleanEmail)
    const fullName = student?.name || cleanEmail.split('@')[0]

    // تحديث كلمة المرور وتعيين جلسة آمنة
    saveStudentLocalPassword(cleanEmail, newPassword, fullName)
    await setStudentSessionCookie(fullName, cleanEmail, { authProvider: 'email' })
    await registerOrUpdateStudentAsync(cleanEmail, fullName, { ...clientTelemetry, authProvider: 'email' })
    syncStudentToFirebaseAuth(cleanEmail, newPassword, fullName).catch(() => {})

    try {
      depositSecurityAlert(
        cleanEmail,
        fullName,
        'تم تغيير كلمة المرور وتوثيق حسابك بنجاح عبر رمز التحقق'
      )
    } catch {}

    const isUserAdmin = cleanEmail === 'bhaaljml480@gmail.com' || student?.role === 'admin'
    redirectTo = isUserAdmin ? '/admin' : '/courses'
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تعديل كلمة المرور.'
  }

  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(
    `/login?mode=reset-step2&email=${encodeURIComponent(cleanEmail)}&error=${encodeURIComponent(
      errorMessage || 'تعذر تعديل كلمة المرور'
    )}`
  )
}

// 7. تسجيل الخروج
export async function signOutAction() {
  await clearStudentSession()
  revalidatePath('/', 'layout')
  redirect('/login?loggedOut=true&mode=login')
}

// 8. تسجيل الدخول عبر Google
export async function signInWithGoogleAction() {
  redirect('/login')
}

// 9. طلب إرسال رمز التحقق إلى رقم الهاتف (Phone OTP)
export async function requestPhoneOtpAction(formData: FormData) {
  const phone = (formData.get('phone') as string)?.trim()
  const countryCode = (formData.get('countryCode') as string)?.trim() || '+20'
  const studentName = (formData.get('studentName') as string)?.trim()

  if (!phone) {
    return redirect(`/login?mode=phone&error=${encodeURIComponent('يرجى إدخال رقم الهاتف الجوال.')}`)
  }

  const result = await sendOtpToPhone(phone, studentName, countryCode)

  if (!result.success) {
    return redirect(
      `/login?mode=phone&error=${encodeURIComponent(result.message)}&phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode)}`
    )
  }

  redirect(
    `/login?mode=verify-phone-otp&phone=${encodeURIComponent(result.formattedPhone)}&countryCode=${encodeURIComponent(countryCode)}&message=${encodeURIComponent(
      result.message
    )}`
  )
}

// 10. التحقق من كود الهاتف وتأكيد تسجيل الدخول
export async function verifyPhoneOtpAction(formData: FormData) {
  const phone = (formData.get('phone') as string)?.trim()
  const otpCode = (formData.get('otpCode') as string)?.trim()
  const countryCode = (formData.get('countryCode') as string)?.trim() || '+20'

  if (!phone || !otpCode) {
    return redirect(
      `/login?mode=verify-phone-otp&phone=${encodeURIComponent(phone || '')}&countryCode=${encodeURIComponent(countryCode)}&error=${encodeURIComponent(
        'يرجى إدخال رمز التحقق المكون من 6 أرقام.'
      )}`
    )
  }

  const result = await verifyPhoneOtp(phone, otpCode, countryCode)

  if (!result.success) {
    return redirect(
      `/login?mode=verify-phone-otp&phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode)}&error=${encodeURIComponent(result.message)}`
    )
  }

  const clientTelemetry = extractClientTelemetry(await headers())
  const formattedPhone = ('formattedPhone' in result && typeof result.formattedPhone === 'string') ? result.formattedPhone : phone
  const studentEmail = `${formattedPhone.replace(/[^0-9]/g, '')}@student.sanad.edu`
  const studentName = `طالب (${formattedPhone})`

  await registerOrUpdateStudentAsync(studentEmail, studentName, {
    phone: formattedPhone,
    authProvider: 'phone',
    ...clientTelemetry,
  })

  await setStudentSessionCookie(studentName, studentEmail, {
    phone: formattedPhone,
    authProvider: 'phone',
  })

  syncStudentToFirebaseAuth(studentEmail, undefined, studentName).catch(() => {})

  revalidatePath('/', 'layout')
  redirect('/courses')
}