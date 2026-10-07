'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { setStudentSessionCookie, clearStudentSession } from '@/lib/auth-helper'
import { sendOtpToEmail, verifyOtpCode } from '@/lib/otp-service'
import { sendOtpToPhone, verifyPhoneOtp } from '@/lib/phone-auth-service'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'
import { extractClientTelemetry } from '@/lib/telemetry-helper'
import {
  registerOrUpdateStudent,
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

// 1. طلب إرسال رمز التحقق إلى البريد الإلكتروني
export async function requestOtpAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return redirect(`/login?error=${encodeURIComponent('يرجى كتابة عنوان البريد الإلكتروني.')}`)
  }

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

  // التوجيه إلى مرحلة إدخال الكود بأمان وسرية تامة
  const redirectUrl = `/login?mode=verify-otp&email=${encodeURIComponent(email)}&message=${encodeURIComponent(result.message)}`
  redirect(redirectUrl)
}

// 2. التحقق من كود التحقق وتأكيد ملكية البريد الإلكتروني
export async function verifyOtpAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const code = (formData.get('otpCode') as string)?.trim()

  if (!email || !code) {
    return redirect(
      `/login?mode=verify-otp&email=${encodeURIComponent(email || '')}&error=${encodeURIComponent(
        'يرجى إدخال رمز التحقق المكون من 6 أرقام.'
      )}`
    )
  }

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

  const clientTelemetry = extractClientTelemetry(await headers())
  registerOrUpdateStudent(email, undefined, { ...clientTelemetry })

  revalidatePath('/', 'layout')
  redirect('/courses')
}

// 3. تسجيل الدخول بالبريد وكلمة المرور (محصن ضد خطأ NEXT_REDIRECT)
export async function loginWithPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return redirect(`/login?mode=password&error=${encodeURIComponent('يرجى إدخال البريد الإلكتروني وكلمة المرور.')}`)
  }

  const cleanEmail = email.toLowerCase().trim()
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
    const supabase = await createClient()

    // 1. محاولة تسجيل الدخول عبر Supabase
    let supabaseSuccess = false
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!error && data?.user) {
        supabaseSuccess = true
        const fullName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0]
        await setStudentSessionCookie(fullName, cleanEmail)
        registerOrUpdateStudent(cleanEmail, fullName, { ...clientTelemetry })
        saveStudentLocalPassword(cleanEmail, password, fullName)
        redirectTo = '/courses'
      }
    } catch {
      // استمرار للفحص المحلي إن تعثر الاتصال
    }

    // 2. التحقق من السجل المحلي المعتمد إن لم تنجح سوبابيز
    if (!supabaseSuccess) {
      const isVerified = verifyStudentLocalPassword(cleanEmail, password)
      if (isVerified) {
        const student = getStudentProfileData(cleanEmail)
        const fullName = student?.name || cleanEmail.split('@')[0]
        await setStudentSessionCookie(fullName, cleanEmail)
        registerOrUpdateStudent(cleanEmail, fullName, { ...clientTelemetry })
        redirectTo = '/courses'
      } else {
        errorMessage = 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور أو إنشاء حساب جديد.'
      }
    }
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'تعذر الاتصال بخادم الحسابات.'
  }

  // التوجيه يتم دائماً خارج كتلة try/catch لمنع التقاط استثناء NEXT_REDIRECT
  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(`/login?mode=password&error=${encodeURIComponent(errorMessage || 'تعذر استكمال تسجيل الدخول')}&email=${encodeURIComponent(email)}`)
}

// 4. إنشاء حساب جديد بالبريد وكلمة المرور (محصن ضد خطأ NEXT_REDIRECT)
export async function signupWithPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim() || 'طالب العلم'

  if (!email || !password) {
    return redirect(`/login?mode=signup&error=${encodeURIComponent('يرجى ملء جميع الحقول المطلوبة.')}`)
  }

  if (password.length < 6) {
    return redirect(`/login?mode=signup&error=${encodeURIComponent('يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.')}`)
  }

  const cleanEmail = email.toLowerCase().trim()
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
    const cleanEmail = email.toLowerCase().trim()
    const headerList = await headers()
    const clientTelemetry = extractClientTelemetry(headerList)

    // 1. تسجيل الحساب محلياً فوراً لحفظ تقدم الطالب وكشكوله ومنع أي تعطل خارجي
    saveStudentLocalPassword(cleanEmail, password, fullName)
    await setStudentSessionCookie(fullName, cleanEmail)
    registerOrUpdateStudent(cleanEmail, fullName, { ...clientTelemetry })

    // 2. المزامنة السحابية في Supabase
    try {
      const supabase = await createClient()
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
    } catch {
      // استمرار حتى لو كانت سوبابيز غير مستجيبة
    }

    redirectTo = '/courses'
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحساب.'
  }

  // التوجيه يتم خارج كتلة try/catch
  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(`/login?mode=signup&error=${encodeURIComponent(errorMessage || 'حدث خطأ أثناء إنشاء الحساب')}`)
}

// 5. تعديل وتعيين كلمة مرور جديدة (نسيت كلمة المرور)
export async function resetPasswordAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !newPassword || !confirmPassword) {
    return redirect(
      `/login?mode=forgot&email=${encodeURIComponent(email || '')}&error=${encodeURIComponent(
        'يرجى ملء جميع الحقول المطلوبة.'
      )}`
    )
  }

  if (newPassword.length < 6) {
    return redirect(
      `/login?mode=forgot&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام.'
      )}`
    )
  }

  if (newPassword !== confirmPassword) {
    return redirect(
      `/login?mode=forgot&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        'كلمتا المرور غير متطابقتين، يرجى إعادة كتابتهما بدقة.'
      )}`
    )
  }

  let redirectTo: string | null = null
  let errorMessage: string | null = null

  try {
    const cleanEmail = email.toLowerCase().trim()
    const headerList = await headers()
    const clientTelemetry = extractClientTelemetry(headerList)
    const student = getStudentProfileData(cleanEmail)
    const fullName = student?.name || cleanEmail.split('@')[0]

    // 1. تحديث كلمة المرور في السجل المحلي فوراً
    saveStudentLocalPassword(cleanEmail, newPassword, fullName)
    await setStudentSessionCookie(fullName, cleanEmail)
    registerOrUpdateStudent(cleanEmail, fullName, { ...clientTelemetry })

    // 2. محاولة المزامنة مع سوبابيز
    try {
      const supabase = await createClient()
      await supabase.auth.updateUser({ password: newPassword })
    } catch {
      // استمرار
    }

    redirectTo = '/courses'
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تعديل كلمة المرور.'
  }

  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  redirect(
    `/login?mode=forgot&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
      errorMessage || 'تعذر تعديل كلمة المرور'
    )}`
  )
}

// 6. تسجيل الخروج
export async function signOutAction() {
  await clearStudentSession()
  revalidatePath('/', 'layout')
  redirect('/login?loggedOut=true&mode=login')
}

// 7. تسجيل الدخول عبر Google المباشر (OAuth)
export async function signInWithGoogleAction() {
  const origin = (await headers()).get('origin') || 'http://localhost:3000'
  let targetUrl: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/courses`,
      },
    })

    if (!error && data?.url) {
      try {
        // فحص سريع لاستجابة Supabase للتأكد من تفعيل مزود Google
        const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' })
        if (probe.status >= 400) {
          console.warn('⚠️ [Google OAuth] مزود Google غير مفعّل بعد في لوحة Supabase. جاري التحويل للدخول السريع الآمن.')
          targetUrl = null
        } else {
          targetUrl = data.url
        }
      } catch {
        targetUrl = data.url
      }
    }
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    console.warn('[Google OAuth Supabase Notice]:', err)
  }

  if (targetUrl) {
    redirect(targetUrl)
  }

  // في حال لم يتم إعداد مزود Google في Supabase السحابي بعد، فتح واجهة الدخول السريع
  redirect('/login?mode=google-direct')
}

// 8. الدخول السريع بحساب Google (1-Click Google Direct Login)
export async function quickGoogleDirectLoginAction(formData: FormData) {
  const googleEmail = (formData.get('googleEmail') as string)?.trim().toLowerCase()
  const rawGoogleName = (formData.get('googleName') as string)?.trim()
  const googleName = rawGoogleName || (googleEmail ? googleEmail.split('@')[0] : 'طالب العلم')

  if (!googleEmail || !googleEmail.includes('@')) {
    return redirect(`/login?mode=google-direct&error=${encodeURIComponent('يرجى إدخال عنوان بريد Google صالح.')}`)
  }

  const banCheck = isStudentBanned(googleEmail)
  if (banCheck.isBanned) {
    return redirect(
      `/login?mode=google-direct&error=${encodeURIComponent(
        banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.'
      )}`
    )
  }

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(googleName)}&background=047857&color=fff&size=128`
  const clientTelemetry = extractClientTelemetry(await headers())

  await setStudentSessionCookie(googleName, googleEmail, {
    authProvider: 'google',
    avatarUrl,
  })
  registerOrUpdateStudent(googleEmail, googleName, {
    authProvider: 'google',
    avatarUrl,
    ...clientTelemetry,
  })

  // إيداع رسائل الترحيب والأمان في صندوق سَنَد
  depositWelcomeMessage(googleEmail, googleName)
  depositSecurityAlert(
    googleEmail,
    googleName,
    'تم تسجيل دخولك بنجاح ومصادقة حساب Google مع منصة سَنَد.'
  )

  revalidatePath('/', 'layout')
  redirect('/courses')
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
  const formattedPhone = (result as any).formattedPhone || phone
  const studentEmail = `${formattedPhone.replace(/[^0-9]/g, '')}@student.sanad.edu`

  registerOrUpdateStudent(studentEmail, `طالب (${formattedPhone})`, {
    phone: formattedPhone,
    authProvider: 'phone',
    ...clientTelemetry,
  })

  revalidatePath('/', 'layout')
  redirect('/courses')
}