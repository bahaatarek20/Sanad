import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const isPublicPage =
    pathname.startsWith('/verify-ijaza') ||
    pathname.startsWith('/download') ||
    pathname.startsWith('/app') ||
    pathname === '/offline' ||
    pathname === '/about' ||
    pathname === '/contact'
  const isStaticFile =
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname.includes('.')

  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. فحص كوكي الطالب المحلي أولاً
  const studentCookie = request.cookies.get('sanad_student_user')
  let hasUser = Boolean(studentCookie?.value)

  // 2.5. تحصين مسارات الإدارة وبوابة التحكم (Admin Route Fortress)
  // لا يُسمح بدخول أو حتى رؤية بوابة الإدارة إلا للمهندس بهاء طارق حصراً
  const isAdminRoute = pathname.startsWith('/sanad-control-gate') || pathname.startsWith('/admin')
  if (isAdminRoute) {
    const adminToken = request.cookies.get('sanad_admin_gate_token')?.value
    const gateKey = request.nextUrl.searchParams.get('gate_key') || request.nextUrl.searchParams.get('key')
    const validEntryKey = process.env.SANAD_ADMIN_ENTRY_KEY || 'bahaa-sanad-owner'

    const isPlatformOwnerCookie = request.cookies.get('sanad_is_platform_owner')?.value === 'true'
    const roleCookie = request.cookies.get('sanad_role')?.value
    const host = request.headers.get('host') || ''
    const isLocalAccess = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')

    let isOwnerVerified =
      isLocalAccess ||
      Boolean(adminToken) ||
      isPlatformOwnerCookie ||
      roleCookie === 'admin' ||
      (Boolean(gateKey) && gateKey === validEntryKey)

    if (!isOwnerVerified && studentCookie?.value) {
      try {
        const student = JSON.parse(studentCookie.value)
        const email = (student.email || '').toLowerCase()
        const adminEmail = (process.env.SANAD_ADMIN_EMAIL || 'bhaaljml48').toLowerCase()
        if (email.includes('bhaaljml48') || email.includes('bahaa') || email === adminEmail) {
          isOwnerVerified = true
        }
      } catch {}
    }

    // إذا لم يكن المشرف المعتمد (المهندس بهاء)، يُحظر الوصول تماماً ويُحوّل للرئيسية دون كشف البوابة
    if (!isOwnerVerified) {
      const homeUrl = new URL('/', request.url)
      return attachSecurityHeaders(NextResponse.redirect(homeUrl))
    }
  }

  // 3. فحص جلسة Supabase فقط إذا كانت هناك كوكيز لـ Supabase (لمنع أي بطء أو مهلة شبكية)
  if (!hasUser) {
    const allCookies = request.cookies.getAll()
    const hasSbCookie = allCookies.some(
      (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'supabase-auth-token'
    )

    if (hasSbCookie) {
      try {
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zzsgeyqyhfmfqglcowkd.supabase.co'
        const sbKey =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2dleXF5aGZtZnFnbGNvd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDk4NzMsImV4cCI6MjA1ODIyNTg3M30.jIndrHU_Uwvj60IkMICZkjb426s1bt7wn-k_fXk'

        const supabase = createServerClient(
          sbUrl,
          sbKey,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll()
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                supabaseResponse = NextResponse.next({
                  request,
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                  supabaseResponse.cookies.set(name, value, options)
                )
              },
            },
          }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          hasUser = true
        }
      } catch {
        // تجاوز أي خطأ في الاتصال
      }
    }
  }

  // إذا لم يكن مسجلاً وحاول فتح مسار مقيد، يتم إلزامه بصفحة الدخول والتسجيل
  if (!hasUser && !isAuthRoute && !isApi && !isPublicPage && !isStaticFile) {
    const loginUrl = new URL('/login', request.url)
    return attachSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // إذا كان مسجلاً بالفعل وفتح صفحة الدخول، يوجه فوراً للمنصة
  if (hasUser && pathname === '/login') {
    const homeUrl = new URL('/', request.url)
    return attachSecurityHeaders(NextResponse.redirect(homeUrl))
  }

  return attachSecurityHeaders(supabaseResponse)
}