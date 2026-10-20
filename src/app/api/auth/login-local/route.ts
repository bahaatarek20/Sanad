import { NextResponse, type NextRequest } from 'next/server'
import {
  verifyStudentLocalPassword,
  getStudentProfileData,
  registerOrUpdateStudentAsync,
  isStudentBanned,
} from '@/lib/student-tracking'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { extractClientTelemetry } from '@/lib/telemetry-helper'
import { syncStudentToFirebaseAuth } from '@/lib/firebase-auth-sync'
import { SUPER_ADMIN_EMAIL } from '@/lib/user-service'

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

    // فحص حظر الحساب
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

    // التحقق من كلمة المرور المسجلة محلياً في سَنَد
    const isVerified = verifyStudentLocalPassword(cleanEmail, password)
    if (!isVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات الدخول غير صحيحة، أو الحساب غير مسجل بعد. تأكد من البريد وكلمة المرور أو أنشئ حساباً جديداً.',
        },
        { status: 401 }
      )
    }

    // المستخدم موثق وكلمة المرور صحيحة
    const student = getStudentProfileData(cleanEmail)
    const fullName = student?.name || cleanEmail.split('@')[0]
    const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL
    const role: 'student' | 'admin' = isSuperAdmin || student?.role === 'admin' ? 'admin' : 'student'

    const telemetry = extractClientTelemetry(request.headers)
    await registerOrUpdateStudentAsync(cleanEmail, fullName, { ...telemetry, authProvider: 'email' })
    await setStudentSessionCookie(fullName, cleanEmail, { authProvider: 'email' })
    syncStudentToFirebaseAuth(cleanEmail, password, fullName).catch(() => {})

    return NextResponse.json({
      success: true,
      user: {
        id: student?.id || cleanEmail,
        email: cleanEmail,
        name: fullName,
        role,
      },
      redirect: role === 'admin' ? '/admin' : '/courses',
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
