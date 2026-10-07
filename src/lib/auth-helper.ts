import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isStudentBanned } from '@/lib/student-tracking'

export interface StudentUser {
  id: string
  email: string
  phone?: string
  authProvider?: 'email' | 'google' | 'phone'
  avatarUrl?: string
  user_metadata: {
    full_name: string
    phone?: string
    authProvider?: string
    avatar_url?: string
  }
}

// جلب المستخدم الحالي: فحص محلي فوري (0ms) لمنع أي بطء في التنقل بين الصفحات
export async function getCurrentStudentUser(): Promise<StudentUser | null> {
  const cookieStore = await cookies()

  // 1. فحص جلسة الطالب المحلية المخزنة في الكوكيز أولاً (فوري 0ms بدون استدعاءات شبكة)
  try {
    const localSession = cookieStore.get('sanad_student_user')
    if (localSession?.value) {
      const parsed = JSON.parse(localSession.value)
      if (parsed && parsed.email) {
        const banCheck = isStudentBanned(parsed.email)
        if (banCheck.isBanned) {
          cookieStore.delete('sanad_student_user')
          return null
        }
        return {
          id: parsed.id || `student-${Buffer.from(parsed.email).toString('hex').slice(0, 16)}`,
          email: parsed.email,
          phone: parsed.phone,
          authProvider: parsed.authProvider || 'email',
          avatarUrl: parsed.avatarUrl,
          user_metadata: {
            full_name: parsed.full_name || 'طالب العلم',
            phone: parsed.phone,
            authProvider: parsed.authProvider || 'email',
            avatar_url: parsed.avatarUrl,
          },
        }
      }
    }
  } catch {
    // خطأ في فك تشفير الكوكي
  }

  // 2. فحص سريع: هل توجد أي كوكيز لـ Supabase أصلاً قبل محاولة الاتصال بالشبكة؟
  const allCookies = cookieStore.getAll()
  const hasSupabaseCookie = allCookies.some(
    (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'supabase-auth-token'
  )

  // إذا لم يكن مسجلاً في Supabase ولا توجد كوكيز، نعيد null فوراً دون تعطيل الصفحة
  if (!hasSupabaseCookie) {
    return null
  }

  // 3. فقط إذا كان كوكي Supabase موجوداً فعلياً، نقوم بالتحقق منه
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user && !error && user.email) {
      const banCheck = isStudentBanned(user.email)
      if (banCheck.isBanned) {
        cookieStore.delete('sanad_student_user')
        return null
      }
      const provider = (user.app_metadata?.provider as 'google' | 'phone' | 'email') || 'email'
      return {
        id: user.id,
        email: user.email,
        phone: user.phone || user.user_metadata?.phone,
        authProvider: provider,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        user_metadata: {
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'طالب العلم',
          phone: user.phone || user.user_metadata?.phone,
          authProvider: provider,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        },
      }
    }
  } catch {
    // تجاوز أخطاء الاتصال أو بطء الشبكة
  }

  return null
}

// حفظ جلسة طالب محلية في الكوكيز (تدعم البريد الإلكتروني أو الهاتف)
export async function setStudentSessionCookie(
  fullName: string,
  emailOrPhone: string,
  options?: {
    phone?: string
    authProvider?: 'email' | 'google' | 'phone'
    avatarUrl?: string
  }
) {
  const cookieStore = await cookies()
  const rawIdentifier = (emailOrPhone || options?.phone || 'student').trim()
  const isEmail = rawIdentifier.includes('@')
  const email = isEmail
    ? rawIdentifier.toLowerCase()
    : `${rawIdentifier.replace(/[^0-9]/g, '') || 'user'}@phone.sanad.edu`
  const phone = options?.phone || (!isEmail ? rawIdentifier : undefined)

  const studentData = {
    id: `student-${Buffer.from(rawIdentifier.toLowerCase()).toString('hex').slice(0, 16)}`,
    email,
    full_name: fullName.trim() || 'طالب العلم',
    phone,
    authProvider: options?.authProvider || (phone ? 'phone' : 'email'),
    avatarUrl: options?.avatarUrl,
    created_at: new Date().toISOString(),
  }

  cookieStore.set('sanad_student_user', JSON.stringify(studentData), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // سنة كاملة
    httpOnly: false, // متاح للعميل لضمان حفظ الجلسة محلياً والمزامنة التلقائية
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return studentData
}

// تسجيل خروج الطالب ومسح الجلسة نهائياً
export async function clearStudentSession() {
  const cookieStore = await cookies()

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // تجاوز أخطاء Supabase
  }

  cookieStore.set('sanad_student_user', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  cookieStore.delete('sanad_student_user')

  // تعيين علامة خروج صريحة لمنع أي استعادة تلقائية إجبارية
  cookieStore.set('sanad_explicit_logout', 'true', {
    path: '/',
    maxAge: 86400, // 24 ساعة
    httpOnly: false,
    sameSite: 'lax',
  })
}
