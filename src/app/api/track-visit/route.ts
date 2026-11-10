import { NextResponse, type NextRequest } from 'next/server'
import {
  recordVisitorHit,
  registerOrUpdateStudentAsync,
  recordStudentPresenceHeartbeat,
  recordActiveStudyPresence,
  ADMIN_EMAILS,
} from '@/lib/student-tracking'
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
    let pageTitle: string | undefined
    let eventType: 'visit' | 'navigation' | 'heartbeat' = 'visit'
    let trackStudyMinute = false
    let body: any = null

    try {
      body = await request.json()
      if (body && typeof body.page === 'string') {
        pagePath = body.page
      }
      if (body && typeof body.pageTitle === 'string') {
        pageTitle = body.pageTitle
      }
      if (
        body &&
        (body.eventType === 'visit' || body.eventType === 'navigation' || body.eventType === 'heartbeat')
      ) {
        eventType = body.eventType
      }
      if (body && body.trackStudyMinute === true) {
        trackStudyMinute = true
      }
    } catch {}

    // 1. مزامنة تسجيل الطالب الفعلي وتحديث حالته (متصل الآن + الصفحة الحالية + التحرك اللحظي)
    let registeredStudentEmail = ''
    let registeredStudentName = ''
    let studyMinutesResult: { totalMinutes: number; todayMinutes: number; streak: number } | null = null
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

          if (eventType === 'visit') {
            await registerOrUpdateStudentAsync(email, registeredStudentName, {
              phone: student.phone as string,
              authProvider,
              avatarUrl: student.avatarUrl as string,
              ...clientTelemetry,
            })
          }

          await recordStudentPresenceHeartbeat({
            email,
            name: registeredStudentName,
            pagePath,
            pageTitle,
            eventType: eventType === 'navigation' ? 'navigation' : 'heartbeat',
            telemetry: clientTelemetry,
          })

          // احتساب مدة البقاء في طلب العلم طالما الطالب نشط داخل المنصة
          if (trackStudyMinute) {
            studyMinutesResult = recordActiveStudyPresence(email, 1)
          }
        }
      } catch {}
    }

    // دعم إضافي موثوق: في حال كان الكوكي محجوباً أو غير مفعل في بعض الهواتف، نعتمد إيميل الجلسة المُرسل من العميل
    if (!registeredStudentEmail && body && typeof body.email === 'string') {
      const cleanEmail = body.email.trim().toLowerCase()
      if (cleanEmail.includes('@') && cleanEmail !== 'guest@visitor.sanad') {
        registeredStudentEmail = cleanEmail
        registeredStudentName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : cleanEmail.split('@')[0]

        try {
          if (eventType === 'visit') {
            await registerOrUpdateStudentAsync(cleanEmail, registeredStudentName, {
              ...clientTelemetry,
            })
          }

          await recordStudentPresenceHeartbeat({
            email: cleanEmail,
            name: registeredStudentName,
            pagePath,
            pageTitle,
            eventType: eventType === 'navigation' ? 'navigation' : 'heartbeat',
            telemetry: clientTelemetry,
          })

          if (trackStudyMinute) {
            studyMinutesResult = recordActiveStudyPresence(cleanEmail, 1)
          }
        } catch {}
      }
    }

    // 2. إذا كان الطلب مجرد نبض تواجد (heartbeat) أو تنقل داخلي (navigation)، لا نزيد عداد الزيارات الكلية مرة أخرى
    if (eventType === 'heartbeat' || eventType === 'navigation') {
      return NextResponse.json({
        counted: false,
        presenceUpdated: Boolean(registeredStudentEmail),
        studyMinutes: studyMinutesResult?.totalMinutes,
        todayMinutes: studyMinutesResult?.todayMinutes,
        reason: 'presence_heartbeat_updated',
      })
    }

    // 3. استثناء جلسة المشرف النشطة فعلياً من عداد الزيارات
    const hasAdminToken = cookies.has('sanad_admin_gate_token')
    const role = cookies.get('sanad_role')?.value

    if (hasAdminToken || role === 'admin' || role === 'owner') {
      return NextResponse.json({ counted: false, reason: 'owner_excluded' })
    }

    // 4. استثناء حسابات المشرف عند دخوله بحساب طالب العلم من عداد الزيارات
    if (
      registeredStudentEmail &&
      (EXCLUDED_ADMIN_EMAILS.includes(registeredStudentEmail) ||
        registeredStudentEmail === (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim())
    ) {
      return NextResponse.json({ counted: false, reason: 'owner_account_excluded' })
    }

    // 5. منع التكرار في نفس الجلسة (خلال 24 ساعة للزائر الواحد)
    const hasVisitedSession = cookies.has('sanad_visitor_session')
    if (hasVisitedSession) {
      return NextResponse.json({
        counted: false,
        reason: 'already_counted_in_session',
        isRegistered: Boolean(registeredStudentEmail),
      })
    }

    // 6. احتساب الزيارة الحقيقية وتصنيفها (مسجل أم زائر بدون تسجيل) مع تسجيل بياناته الجغرافية
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
