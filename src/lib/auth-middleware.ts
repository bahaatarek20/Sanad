import { NextResponse, type NextRequest } from 'next/server'

const AUTHORIZED_ADMIN_EMAILS = [
  'bhaaljml480@gmail.com',
  'bhaaljml48@gmail.com',
  'bhaaljml66@gmail.com',
  'bhaaljml3@gmail.com',
  'bhaaljml62@gmail.com',
]

function attachSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. استثناء مسارات الدخول والصفحات العامة وملفات النظام
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isApi = pathname.startsWith('/api')
  // الصفحات العامة المستثناة حصراً (التحقق الخارجي من رمز QR للإجازات الموثقة والسياسات القانونية)
  const isPublicExempt =
    pathname.startsWith('/verify-ijaza') ||
    pathname === '/privacy' ||
    pathname === '/terms'
  const isStaticFile =
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname === '/apple-icon.png' ||
    pathname === '/icon.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.includes('.')

  // 2. فحص كوكي الطالب المعتمد
  const studentCookie = request.cookies.get('sanad_student_user')
  const hasUser = Boolean(studentCookie?.value)

  // 2.5. تحصين مسارات الإدارة وبوابة التحكم (Admin Route Fortress)
  // لا يُسمح بدخول أو حتى رؤية بوابة الإدارة إلا للمهندس المشرف العام حصراً
  const isAdminRoute = pathname.startsWith('/sanad-control-gate') || pathname.startsWith('/admin')
  if (isAdminRoute) {
    const adminToken = request.cookies.get('sanad_admin_gate_token')?.value
    const gateKey = request.nextUrl.searchParams.get('gate_key') || request.nextUrl.searchParams.get('key')
    const validEntryKey = process.env.SANAD_ADMIN_ENTRY_KEY || 'bahaa-sanad-owner'

    const host = request.headers.get('host') || ''
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      (host.includes('localhost') || host.includes('127.0.0.1'))

    let isOwnerVerified =
      isLocalDev ||
      (adminToken ? adminToken.includes('.') : false) ||
      (Boolean(gateKey) && gateKey === validEntryKey)

    if (!isOwnerVerified && studentCookie?.value) {
      try {
        let studentEmail = ''
        if (studentCookie.value.startsWith('v1.')) {
          const parts = studentCookie.value.split('.')
          if (parts.length === 3) {
            const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8')
            const parsed = JSON.parse(rawPayload)
            studentEmail = String(parsed.email || '').toLowerCase().trim()
          }
        } else {
          const parsed = JSON.parse(studentCookie.value)
          studentEmail = String(parsed.email || '').toLowerCase().trim()
        }

        const envAdminEmail = (process.env.SANAD_ADMIN_EMAIL || '').toLowerCase().trim()
        if (
          AUTHORIZED_ADMIN_EMAILS.includes(studentEmail) ||
          (envAdminEmail && studentEmail === envAdminEmail)
        ) {
          isOwnerVerified = true
        }
      } catch {}
    }

    // إذا لم يكن المشرف المعتمد، يُحظر الوصول تماماً ويُحوّل للدخول دون كشف البوابة
    if (!isOwnerVerified) {
      const loginUrl = new URL('/login', request.url)
      return attachSecurityHeaders(NextResponse.redirect(loginUrl))
    }
  }

  // 3. قفل المنصة العام: إلزام كل زائر بتسجيل الدخول وإنشاء حساب للوصول إلى المنصة
  if (!hasUser && !isAuthRoute && !isApi && !isPublicExempt && !isStaticFile) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/' && pathname !== '/courses') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return attachSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // 4. إذا كان الطالب مسجلاً بالفعل وفتح صفحة الدخول، يوجه فوراً للمتون أو المسار المطلوب (ما لم يكن يسجل خروجه)
  if (hasUser && pathname === '/login' && !request.nextUrl.searchParams.has('loggedOut')) {
    const targetUrl = request.nextUrl.searchParams.get('redirect') || '/courses'
    const redirectUrl = new URL(targetUrl.startsWith('/') ? targetUrl : '/courses', request.url)
    return attachSecurityHeaders(NextResponse.redirect(redirectUrl))
  }

  return attachSecurityHeaders(NextResponse.next({ request }))
}
