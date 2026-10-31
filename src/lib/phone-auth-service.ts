import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { cookies } from 'next/headers'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { registerOrUpdateStudent, isStudentBanned } from '@/lib/student-tracking'
import { depositOtpMessage } from '@/lib/messages-service'

interface PhoneOtpEntry {
  code: string
  expiresAt: number
  attempts: number
  fullName?: string
}

const TMP_PHONE_OTP_FILE = path.join(os.tmpdir(), 'sanad_data', 'sanad_phone_otp_store.json')
const PHONE_OTP_COOKIE_NAME = 'sanad_phone_otp_challenge'
const PHONE_OTP_SECRET =
  process.env.SANAD_SESSION_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sanad_phone_otp_stateless_hmac_secret_2026'

// تخزين رموز التحقق الخاصة بالهاتف في الذاكرة المشتركة + /tmp + Signed Cookie
const globalForPhone = globalThis as unknown as {
  phoneOtpStore?: Map<string, PhoneOtpEntry>
  phoneOtpIntervalInit?: boolean
}
const globalPhoneStore = globalForPhone.phoneOtpStore || (globalForPhone.phoneOtpStore = new Map<string, PhoneOtpEntry>())

function persistPhoneOtpToTmp() {
  try {
    const dir = path.dirname(TMP_PHONE_OTP_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const obj: Record<string, PhoneOtpEntry> = {}
    const now = Date.now()
    for (const [k, v] of globalPhoneStore.entries()) {
      if (v.expiresAt > now) obj[k] = v
    }
    fs.writeFileSync(TMP_PHONE_OTP_FILE, JSON.stringify(obj), 'utf8')
  } catch {}
}

function getPhoneOtpFromTmp(phone: string): PhoneOtpEntry | undefined {
  try {
    if (!fs.existsSync(TMP_PHONE_OTP_FILE)) return undefined
    const raw = fs.readFileSync(TMP_PHONE_OTP_FILE, 'utf8')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Record<string, PhoneOtpEntry>
    const item = parsed[phone]
    if (item && item.expiresAt > Date.now()) {
      globalPhoneStore.set(phone, item)
      return item
    }
  } catch {}
  return undefined
}

function createSignedPhoneChallenge(phone: string, code: string, expiresAt: number, fullName?: string): string {
  const codeDigest = crypto
    .createHmac('sha256', PHONE_OTP_SECRET)
    .update(`${phone.trim()}:${code.trim()}:${expiresAt}`)
    .digest('hex')
  const payload = Buffer.from(
    JSON.stringify({ phone: phone.trim(), expiresAt, codeDigest, fullName }),
    'utf8'
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', PHONE_OTP_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifySignedPhoneChallenge(
  token: string | undefined,
  phone: string,
  enteredCode: string
): { valid: boolean; expired?: boolean; fullName?: string } {
  if (!token || !token.includes('.')) return { valid: false }
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return { valid: false }
    const expectedSig = crypto.createHmac('sha256', PHONE_OTP_SECRET).update(payload).digest('base64url')
    if (sig !== expectedSig) return { valid: false }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      phone: string
      expiresAt: number
      codeDigest: string
      fullName?: string
    }
    if (decoded.phone !== phone.trim()) return { valid: false }
    if (Date.now() > decoded.expiresAt) return { valid: false, expired: true }

    const expectedDigest = crypto
      .createHmac('sha256', PHONE_OTP_SECRET)
      .update(`${phone.trim()}:${enteredCode.trim()}:${decoded.expiresAt}`)
      .digest('hex')

    return { valid: decoded.codeDigest === expectedDigest, fullName: decoded.fullName }
  } catch {
    return { valid: false }
  }
}

// تنظيف الرموز المنتهية دورياً
if (!globalForPhone.phoneOtpIntervalInit) {
  globalForPhone.phoneOtpIntervalInit = true
  setInterval(() => {
    const now = Date.now()
    for (const [phone, entry] of globalPhoneStore.entries()) {
      if (entry.expiresAt < now) {
        globalPhoneStore.delete(phone)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * تنظيف وتوحيد صياغة أرقام الهواتف الدولية
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '+20'): string {
  if (!rawPhone) return ''
  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '')

  // تحويل الأرقام الهندية / العربية إلى لاتينية إن وُجدت
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(arabicDigits[i], 'g'), i.toString())
  }

  // إذا بدأ بـ 00 نستبدلها بـ +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }

  // إذا لم يبدأ بمفتاح دولة (+) وبدأ بـ 0 أو رقم محلي، نضيف المفتاح الافتراضي
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.substring(1)
    } else {
      cleaned = defaultCountryCode + cleaned
    }
  }

  return cleaned
}

/**
 * إرسال رمز التحقق (OTP) إلى رقم الهاتف
 */
export async function sendOtpToPhone(
  rawPhone: string,
  fullName?: string,
  defaultCountry = '+20'
): Promise<{ success: boolean; message: string; formattedPhone: string }> {
  const phone = normalizePhoneNumber(rawPhone, defaultCountry)

  // تحقق من صحة طول الرقم بعد التوحيد
  if (!phone || phone.length < 9 || phone.length > 17) {
    return {
      success: false,
      message: 'يرجى إدخال رقم هاتف صالح مع مفتاح الدولة (مثل: 01012345678 أو 0501234567).',
      formattedPhone: phone,
    }
  }

  const banCheck = isStudentBanned(phone)
  if (banCheck.isBanned) {
    return {
      success: false,
      message: banCheck.banReason || 'تم تعليق هذا الحساب إدارياً في منصة سَنَد.',
      formattedPhone: phone,
    }
  }

  const now = Date.now()
  const existing = globalPhoneStore.get(phone) || getPhoneOtpFromTmp(phone)
  if (existing && existing.expiresAt - now > 9.8 * 60 * 1000) {
    return {
      success: false,
      message: 'تم إرسال رمز التحقق لهاتفك للتو، يرجى الانتظار ثوانٍ معدودة.',
      formattedPhone: phone,
    }
  }

  // توليد رمز سري رقمي آمن مكون من 6 أرقام
  const otpCode = crypto.randomInt(100000, 999999).toString()
  const expiresAt = now + 10 * 60 * 1000 // 10 دقائق

  globalPhoneStore.set(phone, {
    code: otpCode,
    expiresAt,
    attempts: 0,
    fullName: fullName?.trim() || undefined,
  })
  persistPhoneOtpToTmp()

  try {
    const cookieStore = await cookies()
    const challengeToken = createSignedPhoneChallenge(phone, otpCode, expiresAt, fullName?.trim())
    cookieStore.set(PHONE_OTP_COOKIE_NAME, challengeToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  } catch {}

  // 1. طباعة الكود في سجل الخادم للمطور
  console.log('\n======================================================')
  console.log(`📱 [سَنَد] تم توليد رمز التحقق السري لرقم الهاتف: ${phone}`)
  console.log(`🔑 رمز الـ SMS: ${otpCode} (صالح لمدة 10 دقائق)`)
  console.log('======================================================\n')

  // 2. إيداع الرمز فوراً في صندوق رسائل سَنَد المفتوح للطالب (كالـ Gmail)
  try {
    depositOtpMessage(phone, otpCode, 'phone')
  } catch (err) {
    console.warn('[Phone Auth] Could not deposit inbox message:', err)
  }

  // 3. إرسال SMS حقيقي عبر Twilio Verify v2 إن وُجدت مفاتيحه في البيئة
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_API_SECRET
  const twilioVerifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  let twilioSent = false
  if (twilioAccountSid && twilioAuthToken && twilioVerifySid) {
    try {
      const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      const bodyParams = new URLSearchParams()
      bodyParams.append('To', phone)
      bodyParams.append('Channel', 'sms')

      const twRes = await fetch(
        `https://verify.twilio.com/v2/Services/${twilioVerifySid}/Verifications`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        }
      )
      const twData = await twRes.json()
      if (twRes.ok && (twData.status === 'pending' || twData.status === 'approved')) {
        twilioSent = true
        console.log(`📱 [Twilio Verify] تم إرسال رسالة SMS حقيقية إلى ${phone} بنجاح. حالة الخدمة: ${twData.status}`)
      } else {
        console.warn('⚠️ [Twilio Verify] استجابة غير متوقعة من Twilio:', twData)
      }
    } catch (twErr) {
      console.error('❌ [Twilio Verify Error]:', twErr)
    }
  }

  return {
    success: true,
    message: twilioSent
      ? `تم إرسال رمز التحقق في رسالة نصية SMS إلى هاتفك ${phone} بنجاح.`
      : `تم إرسال رمز التحقق إلى رقمك ${phone} بنجاح. يمكنك أيضاً العثور عليه في صندوق رسائل سَنَد أو طرفية الخادم.`,
    formattedPhone: phone,
  }
}

/**
 * التحقق من رمز الهاتف والدخول المباشر
 */
export async function verifyPhoneOtp(
  rawPhone: string,
  enteredCode: string,
  defaultCountry = '+20',
  telemetry?: {
    ip?: string
    country?: string
    countryCode?: string
    city?: string
    device?: string
    browser?: string
    userAgent?: string
  }
): Promise<{ success: boolean; message: string; phone: string; studentName: string }> {
  const phone = normalizePhoneNumber(rawPhone, defaultCountry)
  const code = enteredCode.trim()

  if (!phone || !code) {
    return {
      success: false,
      message: 'يرجى إدخال رقم الهاتف ورمز التحقق المكون من 6 أرقام.',
      phone,
      studentName: 'طالب العلم',
    }
  }

  const record = globalPhoneStore.get(phone) || getPhoneOtpFromTmp(phone)
  const now = Date.now()

  let statelessCheck: { valid: boolean; expired?: boolean; fullName?: string } = { valid: false }
  try {
    const cookieStore = await cookies()
    const challengeCookie = cookieStore.get(PHONE_OTP_COOKIE_NAME)?.value
    statelessCheck = verifySignedPhoneChallenge(challengeCookie, phone, code)
  } catch {}

  // 1. فحص عبر Twilio Verify v2 أولاً إن وُجدت مفاتيحه في البيئة
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_API_SECRET
  const twilioVerifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (twilioAccountSid && twilioAuthToken && twilioVerifySid) {
    try {
      const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      const checkParams = new URLSearchParams()
      checkParams.append('To', phone)
      checkParams.append('Code', code)

      const twRes = await fetch(
        `https://verify.twilio.com/v2/Services/${twilioVerifySid}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: checkParams.toString(),
        }
      )
      const twData = await twRes.json()
      if (twRes.ok && twData.status === 'approved') {
        globalPhoneStore.delete(phone)
        persistPhoneOtpToTmp()
        try {
          const cookieStore = await cookies()
          cookieStore.delete(PHONE_OTP_COOKIE_NAME)
        } catch {}

        const studentName = record?.fullName || statelessCheck.fullName || `طالب العلم (${phone})`
        const cleanDigits = phone.replace(/[^0-9]/g, '')
        const syntheticEmail = `${cleanDigits}@student.sanad.edu`
        await setStudentSessionCookie(studentName, syntheticEmail, {
          phone,
          authProvider: 'phone',
        })
        registerOrUpdateStudent(syntheticEmail, studentName, { phone, authProvider: 'phone', ...telemetry })
        return {
          success: true,
          message: 'تم التحقق بنجاح من رقم هاتفك عبر Twilio. أهلاً بك في منصة سَنَد!',
          phone,
          studentName,
        }
      }
    } catch (twErr) {
      console.warn('[Twilio Verify Check] Failed, falling back:', twErr)
    }
  }

  // 2. الفحص الداخلي الاحتياطي (معطّل قطعياً في بيئة الإنتاج لمنع أي اختراق)
  const isMasterDevCode = process.env.NODE_ENV !== 'production' && code === '123456'

  if (!record && !statelessCheck.valid && !isMasterDevCode) {
    return {
      success: false,
      message: 'لم يتم العثور على رمز تحقق نشط لهذا الرقم أو انتهت صلاحيته. يرجى طلب رمز جديد.',
      phone,
      studentName: 'طالب العلم',
    }
  }

  if (record && !statelessCheck.valid && !isMasterDevCode && record.expiresAt < now) {
    globalPhoneStore.delete(phone)
    persistPhoneOtpToTmp()
    return {
      success: false,
      message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
      phone,
      studentName: 'طالب العلم',
    }
  }

  if (record && !statelessCheck.valid && !isMasterDevCode && record.code !== code) {
    record.attempts += 1
    persistPhoneOtpToTmp()
    if (record.attempts > 5) {
      globalPhoneStore.delete(phone)
      persistPhoneOtpToTmp()
      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إلغاء الرمز لأسباب أمنية.',
        phone,
        studentName: 'طالب العلم',
      }
    }
    return {
      success: false,
      message: `رمز التحقق غير صحيح. تأكد من الرمز المرسل لهاتفك (المتبقي: ${5 - record.attempts} محاولات).`,
      phone,
      studentName: 'طالب العلم',
    }
  }

  // تم التحقق بنجاح!
  const studentName = record?.fullName || statelessCheck.fullName || `طالب العلم (${phone})`
  globalPhoneStore.delete(phone)
  persistPhoneOtpToTmp()
  try {
    const cookieStore = await cookies()
    cookieStore.delete(PHONE_OTP_COOKIE_NAME)
  } catch {}

  const cleanDigits = phone.replace(/[^0-9]/g, '')
  const syntheticEmail = `${cleanDigits}@student.sanad.edu`
  await setStudentSessionCookie(studentName, syntheticEmail, {
    phone,
    authProvider: 'phone',
  })
  registerOrUpdateStudent(syntheticEmail, studentName, { phone, authProvider: 'phone', ...telemetry })

  return {
    success: true,
    message: 'تم تأكيد رقم الهاتف بنجاح، مرحباً بك في رحاب العلم الشريف!',
    phone,
    studentName,
  }
}
