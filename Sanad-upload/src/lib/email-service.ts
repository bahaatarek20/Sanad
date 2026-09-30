import tls from 'tls'
import nodemailerLib from 'nodemailer'

// استخدام nodemailer المثبتة مباشرة
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNodemailer(): any {
  return nodemailerLib
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  code: string
}

export interface SendEmailResult {
  success: boolean
  method: 'resend' | 'smtp' | 'brevo' | 'none'
  error?: string
}

/**
 * محرك إرسال البريد الإلكتروني المركزي لمنصة سَنَد
 * يدعم تلقائياً عدة قنوات تسليم حقيقية تصل إلى صندوق بريد Gmail مباشرة:
 * 1. Resend API (عبر fetch أصيل بدون أي مكتبات إضافية)
 * 2. Gmail SMTP / Custom SMTP (عبر مكتبة tls المدمجة في Node.js مباشرة)
 * 3. Brevo API (سابقاً Sendinblue)
 */
export async function sendRealEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const cleanTo = params.to.toLowerCase().trim()

  // 1. القناة الأولى: Resend API (إذا توفر المفتاح في ملف البيئة)
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (resendKey) {
    try {
      const fromAddr = process.env.EMAIL_FROM?.trim() || 'منصة سَنَد <onboarding@resend.dev>'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [cleanTo],
          subject: params.subject,
          html: params.html,
        }),
      })

      const data = await res.json()
      if (res.ok && data?.id) {
        console.log(`[Sanad Email] Sent successfully via Resend to ${cleanTo} (ID: ${data.id})`)
        return { success: true, method: 'resend' }
      } else {
        console.warn('[Sanad Email] Resend API response error:', data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Sanad Email] Resend fetch error:', msg)
    }
  }

  // 2. القناة الثانية: Brevo API (إذا توفر المفتاح)
  const brevoKey = process.env.BREVO_API_KEY?.trim()
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'منصة سَنَد', email: process.env.SMTP_USER || 'no-reply@sanad.edu' },
          to: [{ email: cleanTo }],
          subject: params.subject,
          htmlContent: params.html,
        }),
      })

      if (res.ok) {
        console.log(`[Sanad Email] Sent successfully via Brevo to ${cleanTo}`)
        return { success: true, method: 'brevo' }
      }
    } catch (err: unknown) {
      console.warn('[Sanad Email] Brevo fetch error:', err)
    }
  }

  // 3. الإرسال عبر SMTP
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()

  const smtpHost =
    process.env.SMTP_HOST?.trim() ||
    (smtpUser?.toLowerCase().endsWith('@gmail.com')
      ? 'smtp.gmail.com'
      : '')

  const smtpPort = Number(process.env.SMTP_PORT) || 465

  if (smtpHost && smtpUser && smtpPass) {
    const nm = getNodemailer()

    if (nm) {
      try {
        const transporter = nm.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass.replace(/\s+/g, ''),
          },
        })

        await transporter.sendMail({
          from: `"منصة سَنَد" <${smtpUser}>`,
          to: cleanTo,
          subject: params.subject,
          html: params.html,
          text: `رمز التحقق الخاص بك هو: ${params.code}`,
        })

        console.log(`[Sanad Email] Sent successfully via Nodemailer to ${cleanTo}`)

        return {
          success: true,
          method: 'smtp',
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[Sanad Email] Nodemailer error sending to ${cleanTo}:`, msg)
        return {
          success: false,
          method: 'smtp',
          error: msg,
        }
      }
    } else {
      // إرسال احتياطي عبر المقبس المباشر TLS حتى لا تتوقف المنصة إن لم تُثبت nodemailer بعد
      return new Promise<SendEmailResult>((resolve) => {
        try {
          const cleanPass = smtpPass.replace(/\s+/g, '')

          const socket = tls.connect({
            host: smtpHost,
            port: smtpPort,
            servername: smtpHost,
            rejectUnauthorized: false,
          })

          let step = 0
          let isDone = false

          const finish = (result: SendEmailResult) => {
            if (!isDone) {
              isDone = true
              socket.destroy()
              resolve(result)
            }
          }

          socket.setEncoding('utf8')
          socket.setTimeout(12000)

          socket.on('data', (chunk) => {
            const msg = chunk.toString()

            if (step === 0 && msg.startsWith('220')) {
              step = 1
              socket.write('EHLO sanad.local\r\n')
            } else if (step === 1 && (msg.includes('250-') || msg.includes('250 '))) {
              if (msg.includes('250 ')) {
                step = 2
                socket.write('AUTH LOGIN\r\n')
              }
            } else if (step === 2 && msg.startsWith('334')) {
              step = 3
              socket.write(`${Buffer.from(smtpUser).toString('base64')}\r\n`)
            } else if (step === 3 && msg.startsWith('334')) {
              step = 4
              socket.write(`${Buffer.from(cleanPass).toString('base64')}\r\n`)
            } else if (step === 4 && msg.startsWith('235')) {
              step = 5
              socket.write(`MAIL FROM:<${smtpUser}>\r\n`)
            } else if (step === 5 && msg.startsWith('250')) {
              step = 6
              socket.write(`RCPT TO:<${cleanTo}>\r\n`)
            } else if (step === 6 && msg.startsWith('250')) {
              step = 7
              socket.write('DATA\r\n')
            } else if (step === 7 && msg.startsWith('354')) {
              step = 8
              const emailData = [
                `From: "منصة سَنَد" <${smtpUser}>`,
                `To: <${cleanTo}>`,
                `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
                '',
                Buffer.from(params.html).toString('base64'),
                '.',
                '',
              ].join('\r\n')
              socket.write(emailData)
            } else if (step === 8 && msg.startsWith('250')) {
              step = 9
              socket.write('QUIT\r\n')
              console.log(`[Sanad Email] Sent successfully via SMTP to ${cleanTo}`)
              finish({ success: true, method: 'smtp' })
            } else if (msg.startsWith('4') || msg.startsWith('5')) {
              console.warn('[Sanad Email] SMTP protocol error:', msg.trim())
              finish({ success: false, method: 'smtp', error: msg.trim() })
            }
          })

          socket.on('error', (err) => {
            console.warn('[Sanad Email] SMTP socket error:', err.message)
            finish({ success: false, method: 'smtp', error: err.message })
          })

          socket.on('timeout', () => {
            console.warn('[Sanad Email] SMTP timeout')
            finish({ success: false, method: 'smtp', error: 'انتهت مهلة الاتصال بخادم البريد' })
          })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          resolve({ success: false, method: 'smtp', error: msg })
        }
      })
    }
  }

  return {
    success: false,
    method: 'none',
    error: 'لم يتم تكوين مزود بريد مباشر (Resend أو SMTP).',
  }
}

/**
 * قالب رسالة التحقق البريدية الفاخر لمنصة سَنَد
 */
export function buildVerificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق السري - منصة سَنَد</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5ef; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f5ef; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e7e4dc;">
          
          <!-- الترويسة الذهبية -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #fef3c7; font-size: 28px; font-weight: 900; letter-spacing: 1px;">سَنَد</h1>
              <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px; font-weight: 600;">رفيقك ومُعينك في طريق طلب العلم والتأصيل المنهجي</p>
            </td>
          </tr>

          <!-- محتوى الرسالة -->
          <tr>
            <td style="padding: 36px 30px; text-align: center; color: #1c1917;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #064e3b;">حيّاك الله يا طالب العلم</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #57534e;">
                وصلنا طلب لتسجيل الدخول إلى حسابك في منصة <strong>سَنَد</strong>. استخدم رمز التحقق السري التالي لتأكيد ملكية بريدك:
              </p>

              <!-- صندوق رمز التحقق -->
              <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 18px; padding: 20px; margin: 24px 0; display: inline-block; width: 85%;">
                <div style="font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #064e3b; text-align: center;">
                  ${code}
                </div>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #78716c; line-height: 1.6;">
                ⏳ الرمز صالح للاستخدام لمدة <strong>10 دقائق</strong> فقط.<br>
                🔒 للحفاظ على أمان حسابك وكشكولك، لا تشارك هذا الرمز مع أي شخص.
              </p>
            </td>
          </tr>

          <!-- التذييل -->
          <tr>
            <td style="background-color: #faf8f5; padding: 20px 30px; text-align: center; border-top: 1px solid #f0ede6;">
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.<br>
                منصة سَنَد التعليمية التأصيلية • بإشراف المهندس بهاء طارق
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
