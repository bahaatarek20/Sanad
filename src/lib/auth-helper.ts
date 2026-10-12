import { cookies } from 'next/headers'
import { isStudentBanned } from '@/lib/student-tracking'

export interface StudentUser {
  id: string
  email: string
  phone?: string
  authProvider?: 'email' | 'google' | 'phone'
  avatarUrl?: string
  user_metadata: {
    full_name: string
    phone?: string
    authProvider?: string
    avatar_url?: string
  }
}

/**
 * جلب المستخدم الحالي: فحص محلي فوري (0ms) لمنع أي بطء في التنقل بين الصفحات
 */
export async function getCurrentStudentUser(): Promise<StudentUser | null> {
  const cookieStore = await cookies()

  // فحص جلسة الطالب المعتمدة المخزنة في الكوكيز
  try {
    const localSession = cookieStore.get('sanad_student_user')
    if (localSession?.value) {
      const parsed = JSON.parse(localSession.value)
      if (parsed && parsed.email) {
        const banCheck = isStudentBanned(parsed.email)
        if (banCheck.isBanned) {
          cookieStore.delete('sanad_student_user')
          return null
        }
        return {
          id: parsed.id || `student-${Buffer.from(parsed.email).toString('hex').slice(0, 16)}`,
          email: parsed.email,
          phone: parsed.phone,
          authProvider: parsed.authProvider || 'email',
          avatarUrl: parsed.avatarUrl,
          user_metadata: {
            full_name: parsed.full_name || 'طالب العلم',
            phone: parsed.phone,
            authProvider: parsed.authProvider || 'email',
            avatar_url: parsed.avatarUrl,
          },
        }
      }
    }
  } catch {
    // خطأ في فك تشفير الكوكي
  }

  return null
}

/**
 * حفظ جلسة طالب معتمدة في الكوكيز (تدعم البريد الإلكتروني أو الهاتف أو Google)
 */
export async function setStudentSessionCookie(
  fullName: string,
  emailOrPhone: string,
  options?: {
    phone?: string
    authProvider?: 'email' | 'google' | 'phone'
    avatarUrl?: string
  }
) {
  const cookieStore = await cookies()
  const rawIdentifier = (emailOrPhone || options?.phone || 'student').trim()
  const isEmail = rawIdentifier.includes('@')
  const email = isEmail
    ? rawIdentifier.toLowerCase()
    : `${rawIdentifier.replace(/[^0-9]/g, '') || 'user'}@phone.sanad.edu`
  const phone = options?.phone || (!isEmail ? rawIdentifier : undefined)

  const studentData = {
    id: `student-${Buffer.from(rawIdentifier.toLowerCase()).toString('hex').slice(0, 16)}`,
    email,
    full_name: fullName.trim() || 'طالب العلم',
    phone,
    authProvider: options?.authProvider || (phone ? 'phone' : 'email'),
    avatarUrl: options?.avatarUrl,
    created_at: new Date().toISOString(),
  }

  cookieStore.set('sanad_student_user', JSON.stringify(studentData), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // سنة كاملة
    httpOnly: false, // متاح للعميل لضمان حفظ الجلسة والمزامنة الفورية
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return studentData
}

/**
 * تسجيل خروج الطالب ومسح الجلسة نهائياً ومنع الاستعادة التلقائية الإجبارية
 */
export async function clearStudentSession() {
  const cookieStore = await cookies()

  cookieStore.set('sanad_student_user', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  cookieStore.delete('sanad_student_user')

  // تعيين علامة خروج صريحة لمنع أي استعادة تلقائية إجبارية
  cookieStore.set('sanad_explicit_logout', 'true', {
    path: '/',
    maxAge: 86400, // 24 ساعة
    httpOnly: false,
    sameSite: 'lax',
  })
}
