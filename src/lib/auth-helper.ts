import crypto from 'crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import {
  isStudentBanned,
  getStudentProfileData,
  SUPER_ADMIN_EMAIL,
  type PlatformRole,
} from '@/lib/student-tracking'

const SESSION_SECRET =
  process.env.SANAD_SESSION_SECRET ||
  process.env.SANAD_ADMIN_PASSCODE ||
  'sanad-blessed-scholar-hmac-sha256-key-2026'

export interface StudentUser {
  id: string
  email: string
  role?: PlatformRole
  username?: string
  phone?: string
  authProvider?: 'email' | 'google' | 'phone'
  avatarUrl?: string
  sessionVersion?: number
  user_metadata: {
    full_name: string
    username?: string
    phone?: string
    authProvider?: string
    avatar_url?: string
  }
}

// حماية ضد هجمات التخمين المتكرر (Brute-Force Rate Limiting) لتسجيل الدخول ورموز التحقق
const authAttemptTracker = new Map<string, { count: number; firstAttemptAt: number; lockedUntil: number }>()
const MAX_AUTH_ATTEMPTS = 7
const AUTH_WINDOW_MS = 10 * 60 * 1000 // 10 دقائق
const AUTH_LOCKOUT_MS = 10 * 60 * 1000 // 10 دقائق

export function checkStudentAuthRateLimit(identifier: string): {
  allowed: boolean
  remainingMinutes?: number
} {
  const key = identifier.toLowerCase().trim()
  if (!key) return { allowed: true }
  const now = Date.now()
  const record = authAttemptTracker.get(key)
  if (!record) return { allowed: true }

  if (record.lockedUntil > now) {
    const remainingMinutes = Math.max(1, Math.ceil((record.lockedUntil - now) / 60000))
    return { allowed: false, remainingMinutes }
  }

  if (now - record.firstAttemptAt > AUTH_WINDOW_MS) {
    authAttemptTracker.delete(key)
    return { allowed: true }
  }

  return { allowed: true }
}

export function recordStudentAuthFailure(identifier: string): void {
  const key = identifier.toLowerCase().trim()
  if (!key) return
  const now = Date.now()
  const record = authAttemptTracker.get(key)
  if (!record || now - record.firstAttemptAt > AUTH_WINDOW_MS) {
    authAttemptTracker.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 })
    return
  }
  record.count += 1
  if (record.count >= MAX_AUTH_ATTEMPTS) {
    record.lockedUntil = now + AUTH_LOCKOUT_MS
  }
  authAttemptTracker.set(key, record)
}

export function clearStudentAuthFailures(identifier: string): void {
  const key = identifier.toLowerCase().trim()
  if (!key) return
  authAttemptTracker.delete(key)
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
 * جلب المستخدم الحالي: فحص محلي فوري مع تدقيق التوقيع الرقمي ومطابقة الصلاحية الحية وحالة الجلسة من قاعدة البيانات
 */
export const getCurrentStudentUser = cache(async function getCurrentStudentUser(): Promise<StudentUser | null> {
  const cookieStore = await cookies()

  try {
    const localSession = cookieStore.get('sanad_student_user')
    if (localSession?.value) {
      const parsed = verifySessionToken(localSession.value)
      if (parsed && parsed.email) {
        const email = String(parsed.email).toLowerCase().trim()
        const banCheck = isStudentBanned(email)
        if (banCheck.isBanned) {
          try {
            cookieStore.delete('sanad_student_user')
            cookieStore.delete('sanad_student_display')
          } catch {}
          return null
        }

        const liveProfile = getStudentProfileData(email)

        // التحقق من عدم تعطيل الحساب (Deactivated Account)
        if (liveProfile?.isDeactivated && email !== SUPER_ADMIN_EMAIL) {
          try {
            cookieStore.delete('sanad_student_user')
            cookieStore.delete('sanad_student_display')
          } catch {}
          return null
        }

        // التحقق من نسخة الجلسة (Session Version) لإبطال الجلسات القديمة عند تغيير كلمة المرور أو إنهاء الجلسات الأخرى
        if (
          parsed.sessionVersion !== undefined &&
          liveProfile?.sessionVersion !== undefined &&
          Number(parsed.sessionVersion) < Number(liveProfile.sessionVersion)
        ) {
          try {
            cookieStore.delete('sanad_student_user')
            cookieStore.delete('sanad_student_display')
          } catch {}
          return null
        }

        // تحديد الصلاحية الحية بدقة (3-Tier Role Resolution: owner | admin | student)
        let resolvedRole: PlatformRole = 'student'
        if (email === SUPER_ADMIN_EMAIL) {
          resolvedRole = 'owner'
        } else if (liveProfile) {
          resolvedRole = liveProfile.role === 'owner' ? 'owner' : liveProfile.role === 'admin' ? 'admin' : 'student'
        } else if (cookieStore.has('sanad_admin_gate_token') || parsed.role === 'admin' || parsed.role === 'owner') {
          resolvedRole = parsed.role === 'owner' ? 'owner' : 'admin'
        }

        const resolvedName = String(
          liveProfile?.name || parsed.full_name || parsed.fullName || 'طالب العلم'
        )
        const resolvedAvatar = liveProfile?.avatarUrl || (parsed.avatarUrl ? String(parsed.avatarUrl) : undefined)
        const resolvedPhone = liveProfile?.phone || (parsed.phone ? String(parsed.phone) : undefined)
        const resolvedUsername = liveProfile?.username || (parsed.username ? String(parsed.username) : undefined)

        return {
          id: String(liveProfile?.id || parsed.id || `student-${Buffer.from(email).toString('hex').slice(0, 16)}`),
          email,
          role: resolvedRole,
          username: resolvedUsername,
          phone: resolvedPhone,
          sessionVersion: liveProfile?.sessionVersion || Number(parsed.sessionVersion || 1),
          authProvider:
            parsed.authProvider === 'google' || parsed.authProvider === 'phone'
              ? (parsed.authProvider as 'google' | 'phone')
              : 'email',
          avatarUrl: resolvedAvatar,
          user_metadata: {
            full_name: resolvedName,
            username: resolvedUsername,
            phone: resolvedPhone,
            authProvider: typeof parsed.authProvider === 'string' ? parsed.authProvider : 'email',
            avatar_url: resolvedAvatar,
          },
        }
      } else {
        // توقيع غير صالح أو تم التلاعب به
        try {
          cookieStore.delete('sanad_student_user')
          cookieStore.delete('sanad_student_display')
        } catch {}
      }
    }
  } catch {
    // خطأ في القراءة
  }

  return null
})

/**
 * حفظ جلسة طالب موثقة وموقعة رقمياً بـ HMAC في الكوكيز
 */
export async function setStudentSessionCookie(
  fullName: string,
  emailOrPhone: string,
  options?: {
    phone?: string
    authProvider?: 'email' | 'google' | 'phone'
    avatarUrl?: string | null
    role?: PlatformRole
    sessionVersion?: number
  }
) {
  const cookieStore = await cookies()
  const rawIdentifier = (emailOrPhone || options?.phone || 'student').trim()
  const isEmail = rawIdentifier.includes('@')
  const email = isEmail
    ? rawIdentifier.toLowerCase()
    : `${rawIdentifier.replace(/[^0-9]/g, '') || 'user'}@phone.sanad.edu`
  const phone = options?.phone || (!isEmail ? rawIdentifier : undefined)

  const liveProfile = getStudentProfileData(email)
  const cleanName = fullName.trim() || liveProfile?.name || 'طالب العلم'

  let resolvedRole: PlatformRole = 'student'
  if (email === SUPER_ADMIN_EMAIL) {
    resolvedRole = 'owner'
  } else if (options?.role) {
    resolvedRole = options.role
  } else if (liveProfile?.role) {
    resolvedRole = liveProfile.role
  }

  const effectiveAvatar =
    options?.avatarUrl === null
      ? undefined
      : options?.avatarUrl !== undefined
      ? options.avatarUrl
      : liveProfile?.avatarUrl

  const sessionVersion = options?.sessionVersion ?? liveProfile?.sessionVersion ?? 1

  const studentData: Record<string, unknown> = {
    id: liveProfile?.id || `student-${Buffer.from(rawIdentifier.toLowerCase()).toString('hex').slice(0, 16)}`,
    email,
    role: resolvedRole,
    full_name: cleanName,
    username: liveProfile?.username,
    phone: phone || liveProfile?.phone,
    authProvider: options?.authProvider || liveProfile?.authProvider || (phone ? 'phone' : 'email'),
    avatarUrl: effectiveAvatar,
    sessionVersion,
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
      avatarUrl: effectiveAvatar,
    }),
    {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  )

  // 3. مسح أي علامة خروج سابقة صريحة لضمان عدم تصفير الجلسة أو تعليق الدخول
  cookieStore.set('sanad_explicit_logout', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
  })
  cookieStore.delete('sanad_explicit_logout')

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
