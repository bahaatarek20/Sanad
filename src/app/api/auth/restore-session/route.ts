import { NextResponse, type NextRequest } from 'next/server'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { isStudentBanned, registerOrUpdateStudent } from '@/lib/student-tracking'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, fullName: rawName, phone, authProvider, avatarUrl } = body

    const email = (rawEmail || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب لاستعادة الجلسة' }, { status: 400 })
    }

    const banCheck = isStudentBanned(email)
    if (banCheck.isBanned) {
      return NextResponse.json({ error: banCheck.banReason || 'هذا الحساب معلق' }, { status: 403 })
    }

    const fullName = (rawName || '').trim() || email.split('@')[0] || 'طالب العلم'
    const clientTelemetry = extractClientTelemetry(request.headers)

    // تجديد الكوكي ليكون صالحاً لسنة كاملة
    await setStudentSessionCookie(fullName, email, {
      phone,
      authProvider: authProvider || 'email',
      avatarUrl,
    })

    // تحديث تاريخ آخر زيارة للطالب في السجل مع البيانات الجغرافية
    registerOrUpdateStudent(email, fullName, {
      phone,
      authProvider: authProvider || 'email',
      avatarUrl,
      ...clientTelemetry,
    })

    return NextResponse.json({ success: true, redirect: '/' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل استعادة الجلسة'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
