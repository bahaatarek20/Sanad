import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminSession, validateAdminTokenString, getAdminActor } from '@/lib/admin-security'
import {
  getAdminDashboardDataAsync,
  getLatestRegisteredStudent,
  getAuditLogs,
  getDeletedStudentEmails,
} from '@/lib/student-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * البث اللحظي الحي لسجل الطلاب المسجلين من جميع أنحاء العالم
 * Sanad Admin Real-Time Global Students & Telemetry Live Feed API
 */
export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get('sanad_admin_gate_token')?.value
    const isTokenValid = validateAdminTokenString(cookieToken)
    const actor = await getAdminActor()

    if (!actor.authorized && !isTokenValid) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالوصول إلى بيانات البث الحي' },
        { status: 401 }
      )
    }

    const forceRefresh = request.nextUrl.searchParams.get('force') === '1'
    const data = await getAdminDashboardDataAsync(forceRefresh)
    const sanitizedStudents = data.students.map(({ passwordHash, passwordSalt, ...rest }) => {
      void passwordHash
      void passwordSalt
      return rest
    })
    const latestStudent = getLatestRegisteredStudent() || sanitizedStudents[0] || null
    const auditLogs = getAuditLogs(40)

    return NextResponse.json(
      {
        success: true,
        students: sanitizedStudents,
        count: sanitizedStudents.length,
        latestStudent,
        stats: data.stats,
        recentEvents: data.recentEvents?.slice(0, 20) || [],
        auditLogs,
        deletedEmails: Array.from(getDeletedStudentEmails()),
        currentActor: {
          email: actor.email || 'bhaaljml480@gmail.com',
          role: actor.role || 'owner',
          isOwner: actor.isOwner || isTokenValid,
        },
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
