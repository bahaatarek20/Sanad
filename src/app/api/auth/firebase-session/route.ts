import { NextResponse, type NextRequest } from 'next/server'
import { registerOrUpdateStudent, isStudentBanned } from '@/lib/student-tracking'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

async function verifyFirebaseIdToken(idToken: string) {
  if (!FIREBASE_API_KEY) {
    throw new Error('مفتاح Firebase API غير مهيأ في الخادم')
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  )

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const code = errorData?.error?.message || 'INVALID_ID_TOKEN'
    throw new Error(`رمز المصادقة غير صالح أو منتهي الصلاحية (${code})`)
  }

  const data = await res.json()
  const user = data.users?.[0]
  if (!user) {
    throw new Error('لم يتم العثور على بيانات المستخدم في Google Firebase')
  }

  return user as {
    localId: string
    email?: string
    displayName?: string
    photoUrl?: string
    phoneNumber?: string
    emailVerified?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken, authProvider } = body

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'رمز المصادقة الموثق (ID Token) مطلوب لإتمام تسجيل الدخول بأمان' },
        { status: 401 }
      )
    }

    // 1. التحقق الخادمي الصارم من صحة توكن Firebase مباشرة مع خوادم Google الرسمية
    const verifiedGoogleUser = await verifyFirebaseIdToken(idToken)

    let email = verifiedGoogleUser.email ? verifiedGoogleUser.email.trim().toLowerCase() : ''
    const phone = verifiedGoogleUser.phoneNumber ? verifiedGoogleUser.phoneNumber.trim() : undefined

    // في حال تسجيل الدخول برقم الهاتف بدون بريد، توليد بريد داخلي منسق
    if (!email && phone) {
      email = `${phone.replace(/[^0-9]/g, '')}@student.sanad.edu`
    }

    if (!email) {
      return NextResponse.json(
        { error: 'تعذر استخراج البريد الإلكتروني الموثق من حساب Google' },
        { status: 400 }
      )
    }

    // 2. فحص الحظر الإداري
    const banCheck = isStudentBanned(email)
    if (banCheck.isBanned) {
      return NextResponse.json(
        { error: banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.' },
        { status: 403 }
      )
    }

    const fullName =
      (verifiedGoogleUser.displayName || '').trim() ||
      (phone ? `طالب العلم (${phone})` : email.split('@')[0])
    const avatarUrl = verifiedGoogleUser.photoUrl
    const provider = phone && !verifiedGoogleUser.email ? 'phone' : (authProvider === 'phone' ? 'phone' : 'google')
    const clientTelemetry = extractClientTelemetry(request.headers)

    // 3. تسجيل أو تحديث سجل الطالب في المنصة وسحابة Firestore مع البيانات الجغرافية
    const student = registerOrUpdateStudent(email, fullName, {
      phone,
      authProvider: provider,
      avatarUrl,
      ...clientTelemetry,
    })

    // 4. إيداع رسالة ترحيبية وإشعار أمني في صندوق رسائل الطالب
    try {
      depositWelcomeMessage(email, fullName)
      depositSecurityAlert(
        email,
        fullName,
        provider === 'phone'
          ? `تم توثيق الدخول بنجاح عبر رسالة SMS على هاتفك [${phone}]`
          : `تم توثيق الدخول بحساب Google الرسمي المعتمد بنجاح`
      )
    } catch {}

    // 5. حفظ الجلسة الرسمية للطالب في الكوكيز بتوقيع HMAC المشفر
    await setStudentSessionCookie(fullName, email, {
      phone,
      authProvider: provider,
      avatarUrl,
    })

    return NextResponse.json({
      success: true,
      studentId: student.id,
      scholarlyId: student.scholarlyId,
      redirectUrl: '/courses',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل التحقق من جلسة Firebase'
    console.error('Firebase session verification error:', error)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
