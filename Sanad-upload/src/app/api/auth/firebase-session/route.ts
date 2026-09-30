import { NextResponse, type NextRequest } from 'next/server'
import { registerOrUpdateStudent } from '@/lib/student-tracking'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, phone: rawPhone, fullName: rawName, authProvider, avatarUrl } = body

    const phone = rawPhone ? String(rawPhone).trim() : undefined
    let email = rawEmail ? String(rawEmail).trim().toLowerCase() : ''

    // إذا تم التسجيل برقم الهاتف فقط، توليد بريد داخلي منسق
    if (!email && phone) {
      email = `${phone.replace(/[^0-9]/g, '')}@phone.sanad.edu`
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'البريد الإلكتروني أو رقم الهاتف مطلوب' }, { status: 400 })
    }

    const fullName = (rawName || '').trim() || (phone ? `طالب العلم (${phone})` : 'طالب العلم')
    const provider = authProvider === 'phone' ? 'phone' : 'google'

    // 1. تسجيل أو تحديث سجل الطالب في المنصة
    const student = registerOrUpdateStudent(email, fullName, {
      phone,
      authProvider: provider,
      avatarUrl,
    })

    // 2. إيداع رسالة ترحيبية أو إشعار أمني في صندوق رسائل الطالب
    try {
      depositWelcomeMessage(email, fullName)
      depositSecurityAlert(
        email,
        provider === 'phone'
          ? `تم توثيق الدخول بنجاح عبر رسالة SMS على هاتفك [${phone}]`
          : `تم توثيق الدخول السريع المباشر بحساب Google`
      )
    } catch {}

    // 3. حفظ الجلسة الرسمية للطالب في الكوكيز
    await setStudentSessionCookie(fullName, email, {
      phone,
      authProvider: provider,
      avatarUrl,
    })

    return NextResponse.json({
      success: true,
      studentId: student.id,
      scholarlyId: student.scholarlyId,
      redirectUrl: '/dashboard',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل مزامنة جلسة Firebase'
    console.error('Firebase session sync error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
