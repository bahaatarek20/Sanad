import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { registerOrUpdateStudent } from '@/lib/student-tracking'
import { depositWelcomeMessage, depositSecurityAlert } from '@/lib/messages-service'
import { extractClientTelemetry } from '@/lib/telemetry-helper'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/courses'

  if (code) {
    try {
      const clientTelemetry = extractClientTelemetry(request.headers)
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data?.user?.email) {
        const user = data.user
        const email = user.email!.toLowerCase().trim()
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split('@')[0]
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          undefined

        // حفظ الجلسة محلياً والمزامنة مع سجل المنصة مع البيانات الجغرافية
        await setStudentSessionCookie(fullName, email, {
          authProvider: 'google',
          avatarUrl,
        })
        registerOrUpdateStudent(email, fullName, {
          authProvider: 'google',
          avatarUrl,
          ...clientTelemetry,
        })

        // إيداع رسائل الترحيب والأمان في صندوق سَنَد (Gmail-like inbox)
        depositWelcomeMessage(email, fullName)
        depositSecurityAlert(
          email,
          fullName,
          'تم تسجيل الدخول بنجاح عبر حساب Google المعتمد.'
        )

        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (err) {
      console.error('[Google OAuth Callback Error]:', err)
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('تعذر استكمال تسجيل الدخول عبر Google. يرجى المحاولة مجدداً أو الدخول المباشر.')}`
  )
}