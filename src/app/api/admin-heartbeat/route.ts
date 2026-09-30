import { NextResponse } from 'next/server'
import { verifyAdminSession, refreshAdminSessionCookie } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * نبض إداري دوري لتجديد جلسة المشرف تلقائياً ومنع خروجه أثناء رفع الفيديوهات
 */
export async function POST() {
  try {
    const isAuthorized = await verifyAdminSession()
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 })
    }

    await refreshAdminSessionCookie()

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      message: 'تم تجديد الجلسة بنجاح',
    })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
