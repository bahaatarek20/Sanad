import { NextResponse, type NextRequest } from 'next/server'
import { recordVisitorHit } from '@/lib/student-tracking'

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies

    // 1. استثناء جلسة المشرف وصاحب المنصة
    const hasAdminToken = cookies.has('sanad_admin_gate_token')
    const isOwner = cookies.has('sanad_is_platform_owner')
    const role = cookies.get('sanad_role')?.value

    if (hasAdminToken || isOwner || role === 'admin') {
      return NextResponse.json({ counted: false, reason: 'owner_excluded' })
    }

    // 2. استثناء حسابات المشرف عند دخوله بحساب طالب العلم
    const studentUserCookie = cookies.get('sanad_student_user')?.value
    if (studentUserCookie) {
      try {
        const student = JSON.parse(studentUserCookie)
        const email = (student.email || '').toLowerCase()
        if (email.includes('bhaaljml48') || email.includes('bahaa')) {
          return NextResponse.json({ counted: false, reason: 'owner_account_excluded' })
        }
      } catch {}
    }

    // 3. منع التكرار في نفس الجلسة (خلال 24 ساعة للزائر الواحد)
    const hasVisitedSession = cookies.has('sanad_visitor_session')
    if (hasVisitedSession) {
      return NextResponse.json({ counted: false, reason: 'already_counted_in_session' })
    }

    // 4. احتساب الزيارة الحقيقية لمستخدم أو طالب المنصة
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
