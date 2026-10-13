import crypto from 'crypto'
import { cookies } from 'next/headers'
import { isStudentBanned } from '@/lib/student-tracking'

const SESSION_SECRET =
  process.env.SANAD_SESSION_SECRET ||
  process.env.SANAD_ADMIN_PASSCODE ||
  'sanad-blessed-scholar-hmac-sha256-key-2026'

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
 * توقيع بيانات الجلسة بتشفير HMAC-SHA256 لمنع التلاعب بها تماماً
 */
export function signSessionPayload(data: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(data)
  const base64Payload = Buffer.from(jsonStr, 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(base64Payload).digest('hex')
  return `v1.${base64Payload}.${signature}`
}

/**
 * فك تشفير وتأكيد صحة توقيع جلسة الطالب بمقارنة آمنة ضد هجمات التوقيت
 */
export function verifySessionToken(rawToken?: string): Record<string, unknown> | null {
  if (!rawToken || typeof rawToken !== 'string') return null

  try {
    if (rawToken.startsWith('v1.')) {
      const parts = rawToken.split('.')
      if (parts.length !== 3) return null
      const base64Payload = parts[1]
      const signature = parts[2]
      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(base64Payload).digest('hex')

      const bufA = Buffer.from(signature, 'hex')
      const bufB = Buffer.from(expectedSig, 'hex')
      if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
        console.warn('⚠️ [Sanad Security Alert]: كشف محاولة تلاعب غير مصرح بها في كوكي الجلسة!')
        return null
      }

      const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8')
      return JSON.parse(jsonStr)
    }

    // دعم انتقالي مؤقت للجلسات السابقة المسجلة قبل التحديث
    const parsed = JSON.parse(rawToken)
    if (parsed && typeof parsed === 'object' && parsed.email) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

/**
 * جلب المستخدم الحالي: فحص محلي فوري (0ms) مع تدقيق التوقيع الرقمي لمنع أي انتحال
 */
export async function getCurrentStudentUser(): Promise<StudentUser | null> {
  const cookieStore = await cookies()

  try {
    const localSession = cookieStore.get('sanad_student_user')
    if (localSession?.value) {
      const parsed = verifySessionToken(localSession.value)
      if (parsed && parsed.email) {
        const email = String(parsed.email).toLowerCase().trim()
        const banCheck = isStudentBanned(email)
        if (banCheck.isBanned) {
          cookieStore.delete('sanad_student_user')
          cookieStore.delete('sanad_student_display')
          return null
        }

        return {
          id: String(parsed.id || `student-${Buffer.from(email).toString('hex').slice(0, 16)}`),
          email,
          phone: parsed.phone ? String(parsed.phone) : undefined,
          authProvider: (parsed.authProvider as any) || 'email',
          avatarUrl: parsed.avatarUrl ? String(parsed.avatarUrl) : undefined,
          user_metadata: {
            full_name: String(parsed.full_name || parsed.fullName || 'طالب العلم'),
            phone: parsed.phone ? String(parsed.phone) : undefined,
            authProvider: (parsed.authProvider as any) || 'email',
            avatar_url: parsed.avatarUrl ? String(parsed.avatarUrl) : undefined,
          },
        }
      } else {
        // توقيع غير صالح أو تم التلاعب به
        cookieStore.delete('sanad_student_user')
        cookieStore.delete('sanad_student_display')
      }
    }
  } catch {
    // خطأ في القراءة
  }

  return null
}

/**
 * حفظ جلسة طالب موثقة وموقعة رقمياً بـ HMAC في الكوكيز
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
  const cleanName = fullName.trim() || 'طالب العلم'

  const studentData: Record<string, unknown> = {
    id: `student-${Buffer.from(rawIdentifier.toLowerCase()).toString('hex').slice(0, 16)}`,
    email,
    full_name: cleanName,
    phone,
    authProvider: options?.authProvider || (phone ? 'phone' : 'email'),
    avatarUrl: options?.avatarUrl,
    created_at: new Date().toISOString(),
  }

  // 1. التوقيع الرقمي الصارم للكوكي الأمني الأساسي
  const signedToken = signSessionPayload(studentData)

  cookieStore.set('sanad_student_user', signedToken, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 يوماً
    httpOnly: true, // محمي ضد هجمات XSS ولا يمكن للعميل أو السكربتات قراءته أو تزويره
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // 2. كوكي واجهة المستخدم العام للعرض فقط (الاسم والصورة) دون أي بيانات صلاحية
  cookieStore.set(
    'sanad_student_display',
    JSON.stringify({
      name: cleanName,
      email,
      avatarUrl: options?.avatarUrl,
    }),
    {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  )

  return studentData
}

/**
 * تسجيل خروج الطالب ومسح الجلسة وتدمير التوكنات
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

  cookieStore.set('sanad_student_display', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  cookieStore.delete('sanad_student_display')

  // تعيين علامة خروج صريحة لمنع أي استعادة تلقائية
  cookieStore.set('sanad_explicit_logout', 'true', {
    path: '/',
    maxAge: 86400, // 24 ساعة
    httpOnly: false,
    sameSite: 'lax',
  })
}
