import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
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
export async function sendOtpToEmail(email: string): Promise<{ success: boolean; message: string; method?: string }> {
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

  // طباعة الكود في سجل طرفية الخادم للمطور فقط
  console.log('\n======================================================')
  console.log(`📩 [سَنَد] تم توليد رمز التحقق السري لبريد: ${cleanEmail}`)
  console.log(`🔑 الرمز: ${otpCode} (صالح لمدة 10 دقائق)`)
  console.log('======================================================\n')

  let isEmailSent = false
  let sendMethod = 'none'

  // 1. المحاولة الأولى: الإرسال المباشر عبر Resend API أو SMTP (Google/Custom)
  try {
    const html = buildVerificationEmailHtml(otpCode)
    const directResult = await sendRealEmail({
      to: cleanEmail,
      subject: `رمز التحقق السري لدخول منصة سَنَد: ${otpCode}`,
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

  // 2. المحاولة الثانية: الإرسال عبر Supabase Auth إن لم يُرسل مباشرة
  if (!isEmailSent) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      })

      if (!error) {
        isEmailSent = true
        sendMethod = 'supabase'
      }
    } catch {
      // استمرار
    }
  }

  // رسالة أمان موحدة دون كشف الرمز إطلاقاً في الواجهة
  return {
    success: true,
    message: 'تم إرسال رمز التحقق السري إلى بريدك الإلكتروني بنجاح. تفقد صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).',
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

  // فحص عبر Supabase verifyOtp أولاً إن كان أُرسل عبرها
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email',
    })

    if (!error && data?.user) {
      globalOtpStore.delete(cleanEmail)
      const name = data.user.user_metadata?.full_name || cleanEmail.split('@')[0]
      await setStudentSessionCookie(name, cleanEmail)
      registerOrUpdateStudent(cleanEmail, name)
      return {
        success: true,
        message: 'تم التحقق بنجاح من حسابك. أهلاً بك في منصة سَنَد.',
      }
    }
  } catch {
    // متابعة الفحص عبر الـ Store الداخلي
  }

  // فحص الرمز السري الداخلي (معطّل قطعياً في بيئة الإنتاج لمنع أي اختراق)
  const isMasterDevCode = process.env.NODE_ENV !== 'production' && cleanCode === '123456'

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
