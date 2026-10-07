import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Sanad Universal Logout Endpoint (نقطة الخروج الشاملة ومسح الجلسة)
 * ═════════════════════════════════════════════════════════════════════
 * تضمن إنهاء جلسة الطالب تماماً على الخادم والعميل،
 * لمنع أي تسجيل دخول تلقائي إجباري عند الرغبة في التبديل لحساب آخر.
 */
export async function POST() {
  try {
    const cookieStore = await cookies()

    // 1. محاولة إنهاء الجلسة في Supabase إن وجدت
    try {
      const supabase = await createClient()
      await supabase.auth.signOut()
    } catch {}

    // 2. تدمير كوكي الطالب بكافة الطرق المعيارية (Path, MaxAge 0, Expired)
    cookieStore.set('sanad_student_user', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    cookieStore.delete('sanad_student_user')

    // 3. تعيين علامة خروج صريحة لمنع الاستعادة التلقائية المؤرقة
    cookieStore.set('sanad_explicit_logout', 'true', {
      path: '/',
      maxAge: 86400, // 24 ساعة
      httpOnly: false,
      sameSite: 'lax',
    })

    return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' })
  } catch (err: any) {
    console.error('Logout error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'فشل تسجيل الخروج' },
      { status: 500 }
    )
  }
}
