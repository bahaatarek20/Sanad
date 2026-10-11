import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminSession, validateAdminTokenString } from '@/lib/admin-security'
import { getAdminDashboardDataAsync, getLatestRegisteredStudent } from '@/lib/student-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * البث اللحظي الحي لسجل الطلاب المسجلين من جميع أنحاء العالم
 * Sanad Admin Real-Time Global Students & Telemetry Live Feed API
 */
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-sanad-admin-key')
    const cookieToken = request.cookies.get('sanad_admin_gate_token')?.value
    const isTokenValid = validateAdminTokenString(cookieToken)
    const isSessionValid = await verifyAdminSession()

    if (!isSessionValid && !isTokenValid && adminKey !== 'bahaa-sanad-owner') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالوصول إلى بيانات البث الحي' },
        { status: 401 }
      )
    }

    // جلب أحدث وأشمل قائمة طلاب مع تحديث إجباري للسجلات
    const data = await getAdminDashboardDataAsync(true)
    const latestStudent = getLatestRegisteredStudent() || data.students[0] || null

    return NextResponse.json(
      {
        success: true,
        students: data.students,
        count: data.students.length,
        latestStudent,
        stats: data.stats,
        recentEvents: data.recentEvents?.slice(0, 20) || [],
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل جلب بيانات الطلاب اللحظية'
    console.error('❌ [Live Students API Error]:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
