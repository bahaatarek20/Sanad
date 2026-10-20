import crypto from 'crypto'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { registerOrUpdateStudent } from '@/lib/student-tracking'
import { sendRealEmail, buildVerificationEmailHtml } from '@/lib/email-service'

interface OtpEntry {
  code: string
  expiresAt: number
  attempts: number
}

// تخزين رموز التحقق المؤقتة (Memory Store مع ربط بـ globalThis لمنع مسحه أثناء Hot Reload)
const globalForOtp = globalThis as unknown as { otpStore?: Map<string, OtpEntry> }
const globalOtpStore = globalForOtp.otpStore || (globalForOtp.otpStore = new Map<string, OtpEntry>())

// تنظيف الرموز المنتهية كل 5 دقائق
if (!globalForOtp.otpStore) {
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
  const existing = globalOtpStore.get(cleanEmail)
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

  const record = globalOtpStore.get(cleanEmail)
  const now = Date.now()

  // فحص الرمز السري الداخلي (معطّل قطعياً إلا في حال تفعيله الصريح بالمطور)
  const isMasterDevCode =
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEV_OTP === 'true' &&
    cleanCode === '123456'

  if (!record && !isMasterDevCode) {
    return {
      success: false,
      message: 'لم يتم العثور على رمز تحقق نشط لهذا البريد أو انتهت صلاحيته. يرجى طلب رمز جديد.',
    }
  }

  if (record && !isMasterDevCode && record.expiresAt < now) {
    globalOtpStore.delete(cleanEmail)
    return {
      success: false,
      message: 'انتهت صلاحية رمز التحقق (أكثر من 10 دقائق). يرجى طلب رمز جديد.',
    }
  }

  if (record && !isMasterDevCode && record.code !== cleanCode) {
    record.attempts += 1
    if (record.attempts > 5) {
      globalOtpStore.delete(cleanEmail)
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
  const studentName = cleanEmail.split('@')[0]
  await setStudentSessionCookie(studentName, cleanEmail)
  registerOrUpdateStudent(cleanEmail, studentName)

  return {
    success: true,
    message: 'تم التحقق بنجاح وتأكيد ملكية البريد الإلكتروني. أهلاً بك في سَنَد!',
  }
}
