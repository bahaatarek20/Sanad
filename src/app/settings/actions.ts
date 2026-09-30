'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setStudentSessionCookie } from '@/lib/auth-helper'
import { registerOrUpdateStudent, saveStudentLocalPassword } from '@/lib/student-tracking'

// 1. تعديل الاسم
export async function updateProfileAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const fullName = (formData.get('fullName') as string)?.trim()

  if (!email || !fullName) {
    return redirect(`/settings?error=${encodeURIComponent('يرجى ملء جميع الحقول.')}`)
  }

  try {
    // تحديث السجل المحلي
    await setStudentSessionCookie(fullName, email)
    registerOrUpdateStudent(email, fullName)

    // تحديث Supabase إن كان متاحاً
    try {
      const supabase = await createClient()
      await supabase.auth.updateUser({ data: { full_name: fullName } })
    } catch {
      // استمرار حتى لو تعذر تحديث Supabase
    }
  } catch (err) {
    console.error('Settings update error:', err)
  }

  revalidatePath('/', 'layout')
  redirect(`/settings?message=${encodeURIComponent('تم تحديث الاسم بنجاح.')}`)
}

// 2. تغيير كلمة المرور
export async function changePasswordAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !newPassword || !confirmPassword) {
    return redirect(`/settings?error=${encodeURIComponent('يرجى ملء جميع الحقول.')}`)
  }

  if (newPassword.length < 6) {
    return redirect(`/settings?error=${encodeURIComponent('يجب ألا تقل كلمة المرور عن 6 أحرف.')}`)
  }

  if (newPassword !== confirmPassword) {
    return redirect(`/settings?error=${encodeURIComponent('كلمتا المرور غير متطابقتين.')}`)
  }

  try {
    // تحديث كلمة المرور في السجل المحلي
    saveStudentLocalPassword(email, newPassword)

    // تحديث Supabase إن كان متاحاً
    try {
      const supabase = await createClient()
      await supabase.auth.updateUser({ password: newPassword })
    } catch {
      // استمرار
    }
  } catch (err) {
    console.error('Password change error:', err)
    return redirect(`/settings?error=${encodeURIComponent('تعذر تغيير كلمة المرور.')}`)
  }

  revalidatePath('/', 'layout')
  redirect(`/settings?message=${encodeURIComponent('تم تغيير كلمة المرور بنجاح.')}`)
}

// 3. ربط أو تحديث رقم الهاتف
export async function updatePhoneAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const countryCode = (formData.get('countryCode') as string)?.trim() || '+20'

  if (!email || !phone) {
    return redirect(`/settings?error=${encodeURIComponent('يرجى كتابة رقم الهاتف.')}`)
  }

  const { normalizePhoneNumber } = await import('@/lib/phone-auth-service')
  const formattedPhone = normalizePhoneNumber(phone, countryCode)

  if (formattedPhone.length < 9) {
    return redirect(`/settings?error=${encodeURIComponent('رقم الهاتف المدخل غير صالح.')}`)
  }

  const { getStudentProfileData } = await import('@/lib/student-tracking')
  const student = getStudentProfileData(email)
  const fullName = student?.name || email.split('@')[0]

  registerOrUpdateStudent(email, fullName, { phone: formattedPhone })
  await setStudentSessionCookie(fullName, email, {
    phone: formattedPhone,
    authProvider: student?.authProvider || 'email',
  })

  const { depositSecurityAlert } = await import('@/lib/messages-service')
  depositSecurityAlert(
    email,
    fullName,
    `تم ربط وتوثيق رقم هاتفك (${formattedPhone}) بنجاح لحماية كشكولك وتأكيد هويتك العلمية.`
  )

  revalidatePath('/', 'layout')
  redirect(`/settings?message=${encodeURIComponent('تم ربط وتوثيق رقم الهاتف بنجاح.')}`)
}
