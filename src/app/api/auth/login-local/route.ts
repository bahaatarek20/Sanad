import { NextResponse, type NextRequest } from 'next/server'
import {
  verifyStudentLocalPassword,
  getStudentProfileData,
  registerOrUpdateStudentAsync,
  isStudentBanned,
  SUPER_ADMIN_EMAIL,
  type PlatformRole,
} from '@/lib/student-tracking'
import {
  setStudentSessionCookie,
  checkStudentAuthRateLimit,
  recordStudentAuthFailure,
  clearStudentAuthFailures,
} from '@/lib/auth-helper'
import { extractClientTelemetry } from '@/lib/telemetry-helper'
import { syncStudentToFirebaseAuth } from '@/lib/firebase-auth-sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawEmail = body.email
    const password = body.password

    if (!rawEmail || !password || typeof rawEmail !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور بدقة.' },
        { status: 400 }
      )
    }

    const cleanEmail = rawEmail.trim().toLowerCase()
    const telemetry = extractClientTelemetry(request.headers)
    const rateKey = `${cleanEmail}:${telemetry.ip || 'local'}`

    // 1. فحص الحماية ضد التخمين المتكرر (Brute-Force Protection)
    const rateCheck = checkStudentAuthRateLimit(rateKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `تم إيقاف المحاولات مؤقتاً لحماية الحساب بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${rateCheck.remainingMinutes || 10} دقائق.`,
        },
        { status: 429 }
      )
    }

    // 2. فحص حظر الحساب
    const banCheck = isStudentBanned(cleanEmail)
    if (banCheck.isBanned) {
      return NextResponse.json(
        {
          success: false,
          error: banCheck.banReason || 'تم تعليق هذا الحساب إدارياً من قِبل إدارة منصة سَنَد.',
        },
        { status: 403 }
      )
    }

    // 3. التحقق من كلمة المرور المسجلة محلياً في سَنَد
    const isVerified = verifyStudentLocalPassword(cleanEmail, password)
    if (!isVerified) {
      recordStudentAuthFailure(rateKey)
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات الدخول غير صحيحة، أو الحساب غير مسجل بعد. تأكد من البريد وكلمة المرور أو أنشئ حساباً جديداً.',
        },
        { status: 401 }
      )
    }

    clearStudentAuthFailures(rateKey)

    // المستخدم موثق وكلمة المرور صحيحة
    const existingStudent = getStudentProfileData(cleanEmail)
    const fullName = existingStudent?.name || cleanEmail.split('@')[0]
    const isOwner = cleanEmail === SUPER_ADMIN_EMAIL
    const role: PlatformRole = isOwner
      ? 'owner'
      : existingStudent?.role === 'admin'
      ? 'admin'
      : 'student'

    const updatedStudent = await registerOrUpdateStudentAsync(cleanEmail, fullName, {
      ...telemetry,
      authProvider: 'email',
    })
    await setStudentSessionCookie(fullName, cleanEmail, {
      authProvider: 'email',
      role,
      avatarUrl: updatedStudent.avatarUrl,
      sessionVersion: updatedStudent.sessionVersion,
    })
    syncStudentToFirebaseAuth(cleanEmail, password, fullName).catch(() => {})

    return NextResponse.json({
      success: true,
      user: {
        id: updatedStudent?.id || cleanEmail,
        email: cleanEmail,
        name: fullName,
        role,
        avatarUrl: updatedStudent?.avatarUrl,
      },
      redirect: role === 'owner' || role === 'admin' ? '/admin' : '/courses',
    })
  } catch (error: unknown) {
    console.error('❌ [API /api/auth/login-local Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء معالجة تسجيل الدخول. يرجى المحاولة مرة أخرى.',
      },
      { status: 500 }
    )
  }
}
