import { NextResponse } from 'next/server'
import { clearStudentSession } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * Sanad Universal Logout Endpoint (نقطة الخروج الشاملة ومسح الجلسة)
 * ═════════════════════════════════════════════════════════════════════
 * تضمن تدمير جلسة الطالب المشفرة بـ HMAC ومسح كوكيز الجلسة تماماً.
 */
export async function POST() {
  try {
    await clearStudentSession()
    return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' })
  } catch (err: unknown) {
    console.error('Logout error:', err)
    const message = err instanceof Error ? err.message : 'فشل تسجيل الخروج'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
