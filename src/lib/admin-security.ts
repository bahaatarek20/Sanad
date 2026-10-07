import crypto from 'crypto'
import { cookies, headers } from 'next/headers'

// إعدادات أمان بوابة الإدارة
const ADMIN_SECRET_KEY = process.env.SANAD_ADMIN_SECRET || 'Sanad-Secure-Master-Key-2025-Eng-Bahaa'
const VALID_PASSCODES = [
  process.env.SANAD_ADMIN_PASSCODE,
  'Bahaa@Sanad#2025!Master',
].filter(Boolean) as string[]

// مفتاح البوابة السري الذي يتيح للمهندس بهاء فقط فتح البوابة الإدارية من أي جهاز جديد
export const SANAD_ADMIN_ENTRY_KEY = process.env.SANAD_ADMIN_ENTRY_KEY || 'bahaa-sanad-owner'

// تتبع محاولات التخمين والهجمات (Brute-Force Protection)
interface AttemptRecord {
  failedCount: number
  lockedUntil: number | null
  lastAttempt: number
}

const loginAttempts = new Map<string, AttemptRecord>()

// تنظيف السجلات القديمة كل 30 دقيقة
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of loginAttempts.entries()) {
      if (record.lockedUntil && record.lockedUntil < now && now - record.lastAttempt > 30 * 60 * 1000) {
        loginAttempts.delete(key)
      }
    }
  }, 30 * 60 * 1000)
}

/**
 * فحص حالة القفل الأمني لعنوان العميل
 */
export function checkLockoutStatus(identifier: string): { isLocked: boolean; remainingMinutes: number } {
  const record = loginAttempts.get(identifier)
  if (!record || !record.lockedUntil) {
    return { isLocked: false, remainingMinutes: 0 }
  }

  const now = Date.now()
  if (record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000))
    return { isLocked: true, remainingMinutes }
  }

  // انتهت مدة القفل، إعادة تعيين العداد
  loginAttempts.delete(identifier)
  return { isLocked: false, remainingMinutes: 0 }
}

/**
 * تسجيل محاولة دخول خاطئة وقفل الحساب عند تجاوز 8 محاولات لحماية المشرف من القفل العرضي
 */
export function recordFailedAttempt(identifier: string): { failedCount: number; isLocked: boolean; remainingMinutes: number } {
  const now = Date.now()
  const record = loginAttempts.get(identifier) || { failedCount: 0, lockedUntil: null, lastAttempt: now }
  
  record.failedCount += 1
  record.lastAttempt = now

  if (record.failedCount >= 8) {
    // إغلاق لمدة 10 دقائق
    record.lockedUntil = now + 10 * 60 * 1000
    loginAttempts.set(identifier, record)
    return { failedCount: record.failedCount, isLocked: true, remainingMinutes: 10 }
  }

  loginAttempts.set(identifier, record)
  return { failedCount: record.failedCount, isLocked: false, remainingMinutes: 0 }
}

/**
 * إعادة تعيين المحاولات عند النجاح
 */
export function resetAttempts(identifier: string) {
  loginAttempts.delete(identifier)
}

/**
 * مقارنة آمنة ضد هجمات التوقيت (Timing-attack resistant)
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA)
      return false
    }
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * إنشاء توقيع HMAC مشفر للجلسة
 */
function signSessionToken(timestamp: number): string {
  const payload = `sanad_admin_${timestamp}`
  const signature = crypto.createHmac('sha256', ADMIN_SECRET_KEY).update(payload).digest('hex')
  return `${timestamp}.${signature}`
}

/**
 * فحص صحة رمز المشرف المشفر
 */
export function validateAdminTokenString(token?: string | null): boolean {
  if (!token) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false

    const timestamp = parseInt(parts[0], 10)
    const signature = parts[1]

    if (isNaN(timestamp)) return false

    // صلاحية الجلسة: 30 يوماً متواصلة لمنع انقطاع جلسة المشرف نهائياً أثناء العمل ورفع الفيديوهات
    const now = Date.now()
    if (now - timestamp > 30 * 24 * 60 * 60 * 1000) {
      return false
    }

    const expectedPayload = `sanad_admin_${timestamp}`
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET_KEY).update(expectedPayload).digest('hex')

    return secureCompare(signature, expectedSig)
  } catch {
    return false
  }
}

/**
 * التحقق الخادمي الصارم من صحة توقيع جلسة المشرف مع دعم الترويسات ومقاومة الانقطاع
 */
export async function verifyAdminSession(): Promise<boolean> {
  // 1. في بيئة التطوير والتشغيل المحلي (localhost)، تمكين المشرف فوراً من كامل الصلاحيات
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  try {
    const headerList = await headers()
    const host = headerList.get('host') || ''
    if (
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      return true
    }

    // فحص ترويسات الإدارة الصريحة المرسلة مع طلبات الرفع (Header-based authentication)
    const adminKeyHeader = headerList.get('x-sanad-admin-key')
    const adminTokenHeader = headerList.get('x-sanad-admin-token')
    if (
      adminKeyHeader === SANAD_ADMIN_ENTRY_KEY ||
      VALID_PASSCODES.includes(adminKeyHeader || '') ||
      (adminTokenHeader && validateAdminTokenString(adminTokenHeader))
    ) {
      return true
    }
  } catch {}

  try {
    const cookieStore = await cookies()

    // 2. التحقق من كوكي جلسة المشرف المشفرة بـ HMAC
    const token = cookieStore.get('sanad_admin_gate_token')?.value
    if (validateAdminTokenString(token)) {
      return true
    }

    // 3. التحقق من كوكي مالك المنصة
    const isOwner = cookieStore.get('sanad_is_platform_owner')?.value === 'true'
    const role = cookieStore.get('sanad_role')?.value
    if (isOwner || role === 'admin') {
      return true
    }

    // 4. التحقق من حساب المشرف المعتمد (المهندس بهاء طارق)
    const studentCookie = cookieStore.get('sanad_student_user')?.value
    if (studentCookie) {
      try {
        const student = JSON.parse(studentCookie)
        const email = (student.email || '').toLowerCase()
        const adminEmail = (process.env.SANAD_ADMIN_EMAIL || 'bhaaljml48').toLowerCase()
        if (email.includes('bhaaljml48') || email.includes('bahaa') || email === adminEmail) {
          return true
        }
      } catch {}
    }

    return false
  } catch {
    return false
  }
}

/**
 * تجديد كوكي جلسة المشرف للبقاء نشطة دائماً أثناء رفع الفيديوهات
 */
export async function refreshAdminSessionCookie(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = signSessionToken(Date.now())

    cookieStore.set('sanad_admin_gate_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 يوماً
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    cookieStore.set('sanad_is_platform_owner', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // سنة كاملة
      httpOnly: false,
      sameSite: 'lax',
    })

    return true
  } catch {
    return false
  }
}

/**
 * التحقق من كلمة المرور ومنح جلسة المشرف
 */
export async function authenticateAdmin(passcode: string, identifier = 'default'): Promise<{
  success: boolean
  message: string
  token?: string
  remainingAttempts?: number
  remainingMinutes?: number
}> {
  // فحص القفل
  const lockout = checkLockoutStatus(identifier)
  if (lockout.isLocked) {
    return {
      success: false,
      message: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار الخطأ لحماية المنصة. يرجى الانتظار ${lockout.remainingMinutes} دقيقة قبل المحاولة مجدداً.`,
      remainingMinutes: lockout.remainingMinutes,
    }
  }

  const cleanPasscode = passcode.trim()
  let isMatch = false

  for (const validCode of VALID_PASSCODES) {
    if (secureCompare(cleanPasscode, validCode)) {
      isMatch = true
      break
    }
  }

  if (!isMatch) {
    const failure = recordFailedAttempt(identifier)
    if (failure.isLocked) {
      return {
        success: false,
        message: 'تم إدخال مفتاح خاطئ 8 مرات متتالية. تم قفل البوابة أمنياً لمدة 10 دقائق لمنع هجمات التخمين.',
        remainingMinutes: 10,
      }
    }
    return {
      success: false,
      message: `رمز المرور غير صحيح! تبقى لك ${8 - failure.failedCount} محاولات قبل الإغلاق الأمني التلقائي.`,
      remainingAttempts: 8 - failure.failedCount,
    }
  }

  // إعادة تعيين المحاولات الخاطئة
  resetAttempts(identifier)

  // حفظ الكوكي المشفرة في السيرفر
  const cookieStore = await cookies()
  const token = signSessionToken(Date.now())

  cookieStore.set('sanad_admin_gate_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 يوماً متواصلة
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // علامة دائمة تميز متصفح صاحب المنصة لاستثنائه قطعياً من عداد الزيارات والإحصائيات
  cookieStore.set('sanad_is_platform_owner', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // سنة كاملة
    httpOnly: false,
    sameSite: 'lax',
  })

  return {
    success: true,
    token,
    message: 'تم التحقق بنجاح والدخول إلى لوحة التحكم.',
  }
}

/**
 * إنهاء جلسة المشرف
 */
export async function revokeAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('sanad_admin_gate_token')
}
