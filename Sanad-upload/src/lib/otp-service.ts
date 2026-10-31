import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { cookies } from 'next/headers'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { registerOrUpdateStudent, getStudentProfileData } from '@/lib/student-tracking'
import { sendRealEmail, buildVerificationEmailHtml } from '@/lib/email-service'
import { depositOtpMessage } from '@/lib/messages-service'

interface OtpEntry {
  code: string
  expiresAt: number
  attempts: number
}

const TMP_OTP_FILE = path.join(os.tmpdir(), 'sanad_data', 'sanad_otp_store.json')
const OTP_COOKIE_NAME = 'sanad_otp_challenge'
const OTP_SECRET =
  process.env.SANAD_SESSION_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sanad_otp_stateless_hmac_secret_2026'

// تخزين رموز التحقق المؤقتة (Memory Store + /tmp + Signed Cookie لضمان العمل عبر جميع خوادم Vercel)
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpEntry>
  otpIntervalInit?: boolean
}
const globalOtpStore = globalForOtp.otpStore || (globalForOtp.otpStore = new Map<string, OtpEntry>())

function persistOtpToTmp() {
  try {
    const dir = path.dirname(TMP_OTP_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const obj: Record<string, OtpEntry> = {}
    const now = Date.now()
    for (const [k, v] of globalOtpStore.entries()) {
      if (v.expiresAt > now) obj[k] = v
    }
    fs.writeFileSync(TMP_OTP_FILE, JSON.stringify(obj), 'utf8')
  } catch {}
}

function getOtpFromTmp(email: string): OtpEntry | undefined {
  try {
    if (!fs.existsSync(TMP_OTP_FILE)) return undefined
    const raw = fs.readFileSync(TMP_OTP_FILE, 'utf8')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Record<string, OtpEntry>
    const item = parsed[email]
    if (item && item.expiresAt > Date.now()) {
      globalOtpStore.set(email, item)
      return item
    }
  } catch {}
  return undefined
}

function createSignedOtpChallenge(target: string, code: string, expiresAt: number): string {
  const codeDigest = crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${target.toLowerCase().trim()}:${code.trim()}:${expiresAt}`)
    .digest('hex')
  const payload = Buffer.from(
    JSON.stringify({ target: target.toLowerCase().trim(), expiresAt, codeDigest }),
    'utf8'
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifySignedOtpChallenge(
  token: string | undefined,
  target: string,
  enteredCode: string
): { valid: boolean; expired?: boolean } {
  if (!token || !token.includes('.')) return { valid: false }
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return { valid: false }
    const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('base64url')
    if (sig !== expectedSig) return { valid: false }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      target: string
      expiresAt: number
      codeDigest: string
    }
    if (decoded.target !== target.toLowerCase().trim()) return { valid: false }
    if (Date.now() > decoded.expiresAt) return { valid: false, expired: true }

    const expectedDigest = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${target.toLowerCase().trim()}:${enteredCode.trim()}:${decoded.expiresAt}`)
      .digest('hex')

    return { valid: decoded.codeDigest === expectedDigest }
  } catch {
    return { valid: false }
  }
}

// تنظيف الرموز المنتهية كل 5 دقائق
if (!globalForOtp.otpIntervalInit) {
  globalForOtp.otpIntervalInit = true
  setInterval(() => {
    const now = Date.now()
    for (const [email, entry] of globalOtpStore.entries()) {
      if (entry.expiresAt < now) {
        globalOtpStore.delete(email)
      }
    }
  }, 5 * 60 * 1000)
}

// 1. توليد وإرسال رمز التحقق للبريد الإلكتروني
export async function sendOtpToEmail(
  email: string,
  purpose: 'login' | 'reset-password' = 'login'
): Promise<{ success: boolean; message: string; method?: string }> {
  const cleanEmail = email.toLowerCase().trim()

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return {
      success: false,
      message: 'يرجى إدخال عنوان بريد إلكتروني صحيح (مثل: student@example.com).',
    }
  }

  // منع الإغراق (Rate Limiting)
  const existing = globalOtpStore.get(cleanEmail) || getOtpFromTmp(cleanEmail)
  const now = Date.now()
  if (existing && existing.expiresAt - now > 9.9 * 60 * 1000) {
    return {
      success: false,
      message: 'تم إرسال رمز التحقق للتو، يرجى الانتظار ثوانٍ معدودة.',
    }
  }

  // توليد رمز سري رقمي آمن مكون من 6 أرقام
  const otpCode = crypto.randomInt(100000, 999999).toString()
  const expiresAt = now + 10 * 60 * 1000 // صالح لمدة 10 دقائق

  globalOtpStore.set(cleanEmail, {
    code: otpCode,
    expiresAt,
    attempts: 0,
  })
  persistOtpToTmp()

  // حفظ بصمة مشفرة للرمز في كوكي محمي (Stateless Challenge) لضمان التحقق حتى لو انتقل الطلب لخادم سحابي آخر على Vercel
  try {
    const cookieStore = await cookies()
    const challengeToken = createSignedOtpChallenge(cleanEmail, otpCode, expiresAt)
    cookieStore.set(OTP_COOKIE_NAME, challengeToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  } catch {}

  // إيداع الرمز أيضاً في صندوق رسائل سَنَد الخاص بالطالب
  try {
    depositOtpMessage(cleanEmail, otpCode, 'email')
  } catch {}

  const isReset = purpose === 'reset-password'

  // طباعة الكود في سجل طرفية الخادم للمطور فقط
  console.log('\n======================================================')
  console.log(`📩 [سَنَد] تم توليد رمز التحقق (${isReset ? 'استعادة كلمة المرور' : 'تسجيل الدخول'}) لبريد: ${cleanEmail}`)
  console.log(`🔑 الرمز: ${otpCode} (صالح لمدة 10 دقائق)`)
  console.log('======================================================\n')

  let isEmailSent = false
  let sendMethod = 'none'

  // الإرسال المباشر عبر Gmail SMTP المعتمد
  try {
    const html = buildVerificationEmailHtml(otpCode, purpose)
    const subject = isReset
      ? `رمز استعادة كلمة المرور في منصة سَنَد: ${otpCode}`
      : `رمز التحقق السري لدخول منصة سَنَد: ${otpCode}`

    const directResult = await sendRealEmail({
      to: cleanEmail,
      subject,
      html,
      code: otpCode,
    })

    if (directResult.success) {
      isEmailSent = true
      sendMethod = directResult.method
    }
  } catch (err: unknown) {
    console.warn('[Sanad OTP] Direct email transport failed:', err)
  }

  // رسالة أمان موحدة دون كشف الرمز إطلاقاً في الواجهة
  return {
    success: true,
    message: isEmailSent
      ? isReset
        ? 'تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح. راجع صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).'
        : 'تم إرسال رمز التحقق السري إلى بريدك الإلكتروني بنجاح. تفقد صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).'
      : 'تم توليد رمز التحقق بنجاح. تفقد بريدك الإلكتروني أو أعد المحاولة.',
    method: sendMethod,
  }
}

// 2. التحقق من كود التحقق وتسجيل الدخول بالبريد المعتمد
export async function verifyOtpCode(
  email: string,
  enteredCode: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim()
  const cleanCode = enteredCode.trim()

  if (!cleanEmail || !cleanCode) {
    return {
      success: false,
      message: 'يرجى إدخال البريد الإلكتروني ورمز التحقق.',
    }
  }

  const record = globalOtpStore.get(cleanEmail) || getOtpFromTmp(cleanEmail)
  const now = Date.now()

  // التحقق عبر الكوكي المشفر (Stateless Serverless Fallback) في حال تغيرت حاوية الخادم
  let statelessCheck: { valid: boolean; expired?: boolean } = { valid: false }
  try {
    const cookieStore = await cookies()
    const challengeCookie = cookieStore.get(OTP_COOKIE_NAME)?.value
    statelessCheck = verifySignedOtpChallenge(challengeCookie, cleanEmail, cleanCode)
  } catch {}

  // فحص الرمز السري الداخلي (معطّل قطعياً إلا في حال تفعيله الصريح بالمطور)
  const isMasterDevCode =
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEV_OTP === 'true' &&
    cleanCode === '123456'

  if (!record && !statelessCheck.valid && !isMasterDevCode) {
    if (statelessCheck.expired) {
      return {
        success: false,
        message: 'انتهت صلاحية رمز التحقق (أكثر من 10 دقائق). يرجى طلب رمز جديد.',
      }
    }
    return {
      success: false,
      message: 'لم يتم العثور على رمز تحقق نشط لهذا البريد أو انتهت صلاحيته. يرجى طلب رمز جديد.',
    }
  }

  if (record && !statelessCheck.valid && !isMasterDevCode && record.expiresAt < now) {
    globalOtpStore.delete(cleanEmail)
    persistOtpToTmp()
    return {
      success: false,
      message: 'انتهت صلاحية رمز التحقق (أكثر من 10 دقائق). يرجى طلب رمز جديد.',
    }
  }

  if (record && !statelessCheck.valid && !isMasterDevCode && record.code !== cleanCode) {
    record.attempts += 1
    persistOtpToTmp()
    if (record.attempts > 5) {
      globalOtpStore.delete(cleanEmail)
      persistOtpToTmp()
      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إلغاء الرمز لأسباب أمنية، يرجى طلب رمز جديد.',
      }
    }
    return {
      success: false,
      message: `رمز التحقق غير صحيح. يرجى التأكد من الرمز المرسل إلى بريدك (المحاولات المتبقية: ${5 - record.attempts}).`,
    }
  }

  // تم التحقق بنجاح!
  globalOtpStore.delete(cleanEmail)
  persistOtpToTmp()
  try {
    const cookieStore = await cookies()
    cookieStore.delete(OTP_COOKIE_NAME)
  } catch {}

  const existingProfile = getStudentProfileData(cleanEmail)
  const studentName = existingProfile?.name || cleanEmail.split('@')[0]
  await setStudentSessionCookie(studentName, cleanEmail)
  registerOrUpdateStudent(cleanEmail, studentName)

  return {
    success: true,
    message: 'تم التحقق بنجاح وتأكيد ملكية البريد الإلكتروني. أهلاً بك في سَنَد!',
  }
}
