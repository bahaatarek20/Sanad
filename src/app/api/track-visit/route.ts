import { NextResponse, type NextRequest } from 'next/server'
import { recordVisitorHit, registerOrUpdateStudent, ADMIN_EMAILS } from '@/lib/student-tracking'
import { verifySessionToken } from '@/lib/auth-helper'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

const EXCLUDED_ADMIN_EMAILS = [
  ...ADMIN_EMAILS,
  (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean)

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies

    // 1. مزامنة تسجيل الطالب الفعلي عبر فك تشفير توكن الجلسة الموقّع بـ HMAC
    const studentUserCookie = cookies.get('sanad_student_user')?.value
    if (studentUserCookie) {
      try {
        const student = verifySessionToken(studentUserCookie)
        if (student && student.email) {
          const email = String(student.email).trim().toLowerCase()
          const clientTelemetry = extractClientTelemetry(request.headers)
          const authProvider = (student.authProvider === 'google' || student.authProvider === 'phone') ? student.authProvider : 'email'
          registerOrUpdateStudent(email, (student.full_name || student.name) as string, {
            phone: student.phone as string,
            authProvider,
            avatarUrl: student.avatarUrl as string,
            ...clientTelemetry,
          })
        }
      } catch {}
    }

    // 2. استثناء جلسة المشرف من عداد الزيارات
    const hasAdminToken = cookies.has('sanad_admin_gate_token')
    const isOwner = cookies.has('sanad_is_platform_owner')
    const role = cookies.get('sanad_role')?.value

    if (hasAdminToken || isOwner || role === 'admin') {
      return NextResponse.json({ counted: false, reason: 'owner_excluded' })
    }

    // 3. استثناء حسابات المشرف عند دخوله بحساب طالب العلم من عداد الزيارات
    if (studentUserCookie) {
      try {
        const student = verifySessionToken(studentUserCookie)
        const email = student?.email ? String(student.email).toLowerCase().trim() : ''
        if (EXCLUDED_ADMIN_EMAILS.includes(email) || email === (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim()) {
          return NextResponse.json({ counted: false, reason: 'owner_account_excluded' })
        }
      } catch {}
    }

    // 4. منع التكرار في نفس الجلسة (خلال 24 ساعة للزائر الواحد)
    const hasVisitedSession = cookies.has('sanad_visitor_session')
    if (hasVisitedSession) {
      return NextResponse.json({ counted: false, reason: 'already_counted_in_session' })
    }

    // 5. احتساب الزيارة الحقيقية لمستخدم أو طالب المنصة
    const count = recordVisitorHit()

    const res = NextResponse.json({ counted: true, totalVisitors: count })

    // تعيين كوكي الجلسة للزائر لمدة 24 ساعة لعدم تكرار الاحتساب مع كثرة التنقل والريفريش
    res.cookies.set('sanad_visitor_session', '1', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 ساعة
      httpOnly: true,
      sameSite: 'lax',
    })

    return res
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 })
  }
}
