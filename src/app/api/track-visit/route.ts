import { NextResponse, type NextRequest } from 'next/server'
import { recordVisitorHit, registerOrUpdateStudentAsync, ADMIN_EMAILS } from '@/lib/student-tracking'
import { verifySessionToken } from '@/lib/auth-helper'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

const EXCLUDED_ADMIN_EMAILS = [
  ...ADMIN_EMAILS,
  (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean)

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies
    const clientTelemetry = extractClientTelemetry(request.headers)
    let pagePath = '/'
    try {
      const body = await request.json()
      if (body && typeof body.page === 'string') {
        pagePath = body.page
      }
    } catch {}

    // 1. مزامنة تسجيل الطالب الفعلي عبر فك تشفير توكن الجلسة الموقّع بـ HMAC
    let registeredStudentEmail = ''
    let registeredStudentName = ''
    const studentUserCookie = cookies.get('sanad_student_user')?.value
    if (studentUserCookie) {
      try {
        const student = verifySessionToken(studentUserCookie)
        if (student && student.email) {
          const email = String(student.email).trim().toLowerCase()
          registeredStudentEmail = email
          registeredStudentName = String(student.full_name || student.name || email.split('@')[0])
          const authProvider =
            student.authProvider === 'google' || student.authProvider === 'phone'
              ? student.authProvider
              : 'email'
          await registerOrUpdateStudentAsync(email, registeredStudentName, {
            phone: student.phone as string,
            authProvider,
            avatarUrl: student.avatarUrl as string,
            ...clientTelemetry,
          })
        }
      } catch {}
    }

    // 2. استثناء جلسة المشرف النشطة فعلياً من عداد الزيارات
    const hasAdminToken = cookies.has('sanad_admin_gate_token')
    const role = cookies.get('sanad_role')?.value

    if (hasAdminToken || role === 'admin' || role === 'owner') {
      return NextResponse.json({ counted: false, reason: 'owner_excluded' })
    }

    // 3. استثناء حسابات المشرف عند دخوله بحساب طالب العلم من عداد الزيارات
    if (
      registeredStudentEmail &&
      (EXCLUDED_ADMIN_EMAILS.includes(registeredStudentEmail) ||
        registeredStudentEmail === (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim())
    ) {
      return NextResponse.json({ counted: false, reason: 'owner_account_excluded' })
    }

    // 4. منع التكرار في نفس الجلسة (خلال 24 ساعة للزائر الواحد)
    const hasVisitedSession = cookies.has('sanad_visitor_session')
    if (hasVisitedSession) {
      return NextResponse.json({
        counted: false,
        reason: 'already_counted_in_session',
        isRegistered: Boolean(registeredStudentEmail),
      })
    }

    // 5. احتساب الزيارة الحقيقية وتصنيفها (مسجل أم زائر بدون تسجيل) مع تسجيل بياناته الجغرافية
    const isRegistered = Boolean(registeredStudentEmail)
    const count = recordVisitorHit({
      isRegistered,
      email: registeredStudentEmail || undefined,
      name: registeredStudentName || undefined,
      ip: clientTelemetry.ip,
      country: clientTelemetry.country,
      city: clientTelemetry.city,
      device: clientTelemetry.device,
      browser: clientTelemetry.browser,
      page: pagePath,
    })

    const res = NextResponse.json({
      counted: true,
      totalVisitors: count,
      isRegistered,
    })

    // تعيين كوكي الجلسة للزائر لمدة 24 ساعة لعدم تكرار الاحتساب مع كثرة التنقل والريفريش
    res.cookies.set('sanad_visitor_session', isRegistered ? 'registered' : 'guest', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 ساعة
      httpOnly: true,
      sameSite: 'lax',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 })
  }
}
