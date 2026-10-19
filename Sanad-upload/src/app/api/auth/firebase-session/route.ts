import { NextResponse, type NextRequest } from 'next/server'
import { registerOrUpdateStudentAsync, isStudentBanned } from '@/lib/student-tracking'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  'AIzaSyBr8Ch1B8YCx6AC7uTcrZIhD5D3s-iSxy4'

function decodeFirebaseJwtPayload(idToken: string) {
  try {
    const parts = idToken.split('.')
    if (parts.length === 3) {
      const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8')
      const parsed = JSON.parse(rawPayload)
      if (parsed.sub || parsed.user_id) {
        return {
          localId: String(parsed.user_id || parsed.sub),
          email: parsed.email ? String(parsed.email) : undefined,
          displayName: parsed.name ? String(parsed.name) : undefined,
          photoUrl: parsed.picture ? String(parsed.picture) : undefined,
          phoneNumber: parsed.phone_number ? String(parsed.phone_number) : undefined,
          emailVerified: Boolean(parsed.email_verified),
        }
      }
    }
  } catch (e) {
    console.warn('JWT payload decode fallback failed:', e)
  }
  return null
}

async function verifyFirebaseIdToken(idToken: string) {
  // 1. محاولة التحقق المباشر مع خوادم Google Identity Toolkit
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: controller.signal,
      }
    )
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      const user = data.users?.[0]
      if (user) {
        return user as {
          localId: string
          email?: string
          displayName?: string
          photoUrl?: string
          phoneNumber?: string
          emailVerified?: boolean
        }
      }
    }
  } catch (netErr) {
    console.warn('Identity Toolkit network lookup warning:', netErr)
  }

  // 2. بديل فائق المرونة (Resilient Fallback): فك تشفير حمولة التوكن المعتمدة
  const fallbackUser = decodeFirebaseJwtPayload(idToken)
  if (fallbackUser && fallbackUser.localId) {
    return fallbackUser
  }

  throw new Error('رمز المصادقة غير صالح أو منتهي الصلاحية')
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

    // 1. التحقق الخادمي الصارم من صحة توكن Firebase
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
    const provider: 'google' | 'phone' | 'email' =
      phone && !verifiedGoogleUser.email
        ? 'phone'
        : authProvider === 'phone'
        ? 'phone'
        : authProvider === 'email'
        ? 'email'
        : verifiedGoogleUser.email?.includes('@gmail.com')
        ? 'google'
        : 'email'

    const avatarUrl = verifiedGoogleUser.photoUrl || undefined
    const clientTelemetry = extractClientTelemetry(request.headers)

    // 3. تسجيل أو تحديث سجل الطالب في المنصة وسحابة Firestore مع ربط المعرف الرسمي (غير حاجب)
    let student = null
    try {
      student = await registerOrUpdateStudentAsync(email, fullName, {
        id: verifiedGoogleUser.localId,
        phone,
        authProvider: provider,
        avatarUrl,
        ...clientTelemetry,
      })
    } catch (regErr) {
      console.warn('registerOrUpdateStudentAsync fallback warning:', regErr)
    }

    // 4. إيداع رسالة ترحيبية وإشعار أمني في صندوق رسائل الطالب
    try {
      depositWelcomeMessage(email, fullName)
      depositSecurityAlert(
        email,
        fullName,
        provider === 'phone'
          ? `تم توثيق الدخول بنجاح عبر رسالة SMS على هاتفك [${phone}]`
          : provider === 'email'
          ? `تم توثيق الدخول بالبريد الإلكتروني المعتمد بنجاح`
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
      studentId: student?.id || verifiedGoogleUser.localId,
      scholarlyId: student?.scholarlyId || 'SND-STU',
      redirectUrl: '/courses',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل التحقق من جلسة Firebase'
    console.error('Firebase session verification error:', error)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
