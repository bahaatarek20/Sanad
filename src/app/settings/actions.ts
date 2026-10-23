'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getCurrentStudentUser,
  setStudentSessionCookie,
  clearStudentSession,
} from '@/lib/auth-helper'
import {
  registerOrUpdateStudent,
  saveStudentLocalPassword,
  verifyStudentLocalPassword,
  hasStudentLocalPassword,
  getStudentProfileData,
  updateStudentExtendedProfile,
  changeStudentEmailAddress,
  revokeOtherStudentSessions,
  deactivateStudentAccount,
  recordAuditLog,
  SUPER_ADMIN_EMAIL,
  type StudentPrivacySettings,
  type StudentNotificationSettings,
} from '@/lib/student-tracking'
import { sendOtpToEmail, verifyOtpCode } from '@/lib/otp-service'
import { depositSecurityAlert } from '@/lib/messages-service'

/**
 * تحقق خادمي صارم من هوية الطالب الحالي ومنع ثغرات IDOR (منع تعديل بيانات أي مستخدم آخر)
 */
async function requireAuthenticatedStudent(requestedEmail?: string | null) {
  const user = await getCurrentStudentUser()
  if (!user || !user.email) {
    return { authorized: false as const, error: 'غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.' }
  }

  const sessionEmail = user.email.toLowerCase().trim()
  if (requestedEmail && requestedEmail.trim() && requestedEmail.toLowerCase().trim() !== sessionEmail) {
    recordAuditLog({
      action: 'UNAUTHORIZED_ATTEMPT',
      actorEmail: sessionEmail,
      actorRole: user.role || 'student',
      targetEmail: requestedEmail.toLowerCase().trim(),
      details: 'محاولة مرفوضة لتعديل بيانات حساب آخر (IDOR Attempt Blocked)',
    })
    return {
      authorized: false as const,
      error: 'تنبيه أمني: لا تملك صلاحية تعديل بيانات حساب آخر غير حسابك الشخصي.',
    }
  }

  return { authorized: true as const, user, email: sessionEmail }
}

// 1. تحديث الاسم والملف الشخصي الشامل (الاسم، اسم المستخدم، النبذة، المرحلة التعليمية، الهاتف)
export async function updateProfileAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const authCheck = await requireAuthenticatedStudent(rawEmail)
  if (!authCheck.authorized) {
    redirect(`/settings?error=${encodeURIComponent(authCheck.error)}`)
  }

  const email = authCheck.email
  const fullName = (formData.get('fullName') as string)?.trim()
  const username = (formData.get('username') as string)?.trim()
  const bio = (formData.get('bio') as string)?.trim()
  const educationLevel = (formData.get('educationLevel') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!fullName || fullName.length < 2) {
    redirect('/settings?error=الاسم الكامل مطلوب ولا يقل عن حرفين')
  }

  const updateRes = updateStudentExtendedProfile(email, {
    name: fullName,
    username: username || undefined,
    bio: bio !== undefined ? bio : undefined,
    educationLevel: educationLevel || undefined,
    phone: phone !== undefined ? phone : undefined,
  })

  if (!updateRes.success || !updateRes.student) {
    redirect(`/settings?error=${encodeURIComponent(updateRes.error || 'تعذر حفظ التعديلات')}`)
  }

  const student = updateRes.student
  await setStudentSessionCookie(student.name, email, {
    phone: student.phone,
    authProvider: student.authProvider,
    avatarUrl: student.avatarUrl,
    role: student.role,
    sessionVersion: student.sessionVersion,
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/community')
  redirect('/settings?message=تم حفظ وتوثيق بيانات ملفك الشخصي بنجاح')
}

// 2. تحديث رقم الهاتف المربوط بالحساب
export async function updatePhoneAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const authCheck = await requireAuthenticatedStudent(rawEmail)
  if (!authCheck.authorized) {
    redirect(`/settings?error=${encodeURIComponent(authCheck.error)}`)
  }

  const email = authCheck.email
  const phone = (formData.get('phone') as string)?.trim()

  if (!phone || phone.replace(/[^0-9]/g, '').length < 8) {
    redirect('/settings?error=يرجى إدخال رقم هاتف صحيح مع مفتاح الدولة')
  }

  const updateRes = updateStudentExtendedProfile(email, { phone })
  if (!updateRes.success || !updateRes.student) {
    redirect(`/settings?error=${encodeURIComponent(updateRes.error || 'تعذر تحديث رقم الهاتف')}`)
  }

  const student = updateRes.student
  await setStudentSessionCookie(student.name, email, {
    phone: student.phone,
    authProvider: student.authProvider,
    avatarUrl: student.avatarUrl,
    role: student.role,
    sessionVersion: student.sessionVersion,
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  redirect('/settings?message=تم تحديث وربط رقم الهاتف بحسابك بنجاح')
}

// 3. تحديث الصورة الرمزية / الهوية البصرية للطالب
export async function updateAvatarAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const authCheck = await requireAuthenticatedStudent(rawEmail)
  if (!authCheck.authorized) {
    redirect(`/settings?error=${encodeURIComponent(authCheck.error)}`)
  }

  const email = authCheck.email
  const avatarUrl = (formData.get('avatarUrl') as string)?.trim()

  // السماح بحذف الصورة عند إرسال قيمة فارغة أو 'default'
  if (!avatarUrl || avatarUrl === 'default' || avatarUrl === 'delete') {
    const delRes = updateStudentExtendedProfile(email, { avatarUrl: null })
    const student = delRes.student || getStudentProfileData(email)
    await setStudentSessionCookie(student?.name || 'طالب العلم', email, {
      phone: student?.phone,
      authProvider: student?.authProvider,
      avatarUrl: null,
      role: student?.role,
      sessionVersion: student?.sessionVersion,
    })
    revalidatePath('/', 'layout')
    revalidatePath('/settings')
    revalidatePath('/community')
    redirect('/settings?message=تم حذف الصورة الشخصية والعودة للصورة الافتراضية بنجاح')
  }

  if (avatarUrl.length > 350000) {
    redirect('/settings?error=حجم الصورة كبير جداً، يرجى اختيار صورة أصغر حجماً')
  }

  const updateRes = updateStudentExtendedProfile(email, { avatarUrl })
  if (!updateRes.success || !updateRes.student) {
    redirect(`/settings?error=${encodeURIComponent(updateRes.error || 'تعذر تحديث الصورة الشخصية')}`)
  }

  const student = updateRes.student
  await setStudentSessionCookie(student.name, email, {
    phone: student.phone,
    authProvider: student.authProvider,
    avatarUrl: student.avatarUrl,
    role: student.role,
    sessionVersion: student.sessionVersion,
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/community')
  redirect('/settings?message=تم تحديث صورتك الرمزية بنجاح')
}

// 4. تغيير كلمة المرور مع التحقق الإلزامي من كلمة المرور الحالية (إن وجدت)
export async function changePasswordAction(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim()
  const authCheck = await requireAuthenticatedStudent(rawEmail)
  if (!authCheck.authorized) {
    redirect(`/settings?error=${encodeURIComponent(authCheck.error)}`)
  }

  const email = authCheck.email
  const currentPassword = (formData.get('currentPassword') as string) || ''
  const newPassword = (formData.get('newPassword') as string) || ''
  const confirmPassword = (formData.get('confirmPassword') as string) || ''

  if (!newPassword || newPassword.length < 6) {
    redirect('/settings?error=يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام')
  }

  if (newPassword !== confirmPassword) {
    redirect('/settings?error=كلمتا المرور غير متطابقتين، يرجى التأكد من كتابتهما بدقة')
  }

  // التحقق من كلمة المرور الحالية إذا كان الحساب يملك كلمة مرور مسبقة
  if (hasStudentLocalPassword(email)) {
    if (!currentPassword) {
      redirect('/settings?error=يرجى إدخال كلمة المرور الحالية لتأكيد هويتك قبل التغيير')
    }
    const isCurrentValid = verifyStudentLocalPassword(email, currentPassword)
    if (!isCurrentValid) {
      recordAuditLog({
        action: 'UNAUTHORIZED_ATTEMPT',
        actorEmail: email,
        actorRole: authCheck.user.role || 'student',
        targetEmail: email,
        details: 'فشل تغيير كلمة المرور بسبب إدخال كلمة مرور حالية غير صحيحة',
      })
      redirect('/settings?error=كلمة المرور الحالية غير صحيحة، يرجى التأكد منها')
    }
  }

  const existing = getStudentProfileData(email)
  const saved = saveStudentLocalPassword(email, newPassword, existing?.name)
  if (!saved) {
    redirect('/settings?error=تعذر حفظ كلمة المرور الجديدة، يرجى المحاولة مرة أخرى')
  }

  const freshProfile = getStudentProfileData(email)
  await setStudentSessionCookie(freshProfile?.name || 'طالب العلم', email, {
    phone: freshProfile?.phone,
    authProvider: freshProfile?.authProvider,
    avatarUrl: freshProfile?.avatarUrl,
    role: freshProfile?.role,
    sessionVersion: freshProfile?.sessionVersion,
  })

  try {
    depositSecurityAlert(
      email,
      freshProfile?.name || 'طالب العلم',
      'تم تحديث كلمة المرور الخاصة بحسابك بنجاح وإبطال الجلسات القديمة'
    )
  } catch {}

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  redirect('/settings?message=تم تحديث وتشفير كلمة المرور الجديدة بنجاح')
}

// 5. تحديث إعدادات الخصوصية والإشعارات (Server Action)
export async function updatePrivacyAndNotificationsAction(data: {
  privacySettings?: Partial<StudentPrivacySettings>
  notificationSettings?: Partial<StudentNotificationSettings>
}): Promise<{
  success: boolean
  message?: string
  error?: string
  privacySettings?: StudentPrivacySettings
  notificationSettings?: StudentNotificationSettings
}> {
  const authCheck = await requireAuthenticatedStudent()
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  const res = updateStudentExtendedProfile(authCheck.email, {
    privacySettings: data.privacySettings,
    notificationSettings: data.notificationSettings,
  })

  if (!res.success || !res.student) {
    return { success: false, error: res.error || 'تعذر حفظ الإعدادات' }
  }

  revalidatePath('/settings')
  revalidatePath('/community')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: 'تم حفظ إعدادات الخصوصية والإشعارات بنجاح',
    privacySettings: res.student.privacySettings,
    notificationSettings: res.student.notificationSettings,
  }
}

// 6. طلب تغيير البريد الإلكتروني (الخطوة 1: إرسال رمز التحقق للبريد الجديد)
export async function requestEmailChangeOtpAction(newEmailRaw: string): Promise<{
  success: boolean
  message?: string
  error?: string
  devOtpCode?: string
}> {
  const authCheck = await requireAuthenticatedStudent()
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  const currentEmail = authCheck.email
  const cleanNewEmail = (newEmailRaw || '').toLowerCase().trim()

  if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
    return { success: false, error: 'يرجى إدخال عنوان بريد إلكتروني جديد صحيح.' }
  }

  if (currentEmail === SUPER_ADMIN_EMAIL || cleanNewEmail === SUPER_ADMIN_EMAIL) {
    return {
      success: false,
      error: 'حماية سيادية: البريد الإلكتروني لمالك المنصة ثابت ومحصن ولا يمكن تغييره.',
    }
  }

  if (currentEmail === cleanNewEmail) {
    return { success: false, error: 'البريد الإلكتروني الجديد مطابق لبريدك الحالي.' }
  }

  const existingTarget = getStudentProfileData(cleanNewEmail)
  if (existingTarget) {
    return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل لحساب آخر في المنصة.' }
  }

  const otpRes = await sendOtpToEmail(cleanNewEmail, 'login')
  if (!otpRes.success) {
    return { success: false, error: otpRes.message }
  }

  return {
    success: true,
    message: `تم إرسال رمز التحقق المكون من 6 أرقام إلى (${cleanNewEmail}) وفي صندوق رسائل المنصة.`,
    devOtpCode: (otpRes as { code?: string }).code,
  }
}

// 7. تأكيد تغيير البريد الإلكتروني عبر رمز التحقق OTP (الخطوة 2)
export async function confirmEmailChangeAction(
  newEmailRaw: string,
  otpCodeRaw: string
): Promise<{
  success: boolean
  newEmail?: string
  message?: string
  error?: string
}> {
  const authCheck = await requireAuthenticatedStudent()
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  const currentEmail = authCheck.email
  const cleanNewEmail = (newEmailRaw || '').toLowerCase().trim()
  const cleanCode = (otpCodeRaw || '').trim()

  if (!cleanNewEmail || !cleanCode) {
    return { success: false, error: 'يرجى إدخال البريد الجديد ورمز التحقق المكون من 6 أرقام.' }
  }

  const verifyRes = await verifyOtpCode(cleanNewEmail, cleanCode)
  if (!verifyRes.success) {
    return { success: false, error: verifyRes.message }
  }

  const changeRes = await changeStudentEmailAddress(currentEmail, cleanNewEmail)
  if (!changeRes.success || !changeRes.student) {
    return { success: false, error: changeRes.error || 'تعذر تحديث البريد الإلكتروني' }
  }

  const updated = changeRes.student
  await setStudentSessionCookie(updated.name, updated.email, {
    phone: updated.phone,
    authProvider: updated.authProvider,
    avatarUrl: updated.avatarUrl,
    role: updated.role,
    sessionVersion: updated.sessionVersion,
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return {
    success: true,
    newEmail: updated.email,
    message: 'تم توثيق وتحديث بريدك الإلكتروني بنجاح!',
  }
}

// 8. إنهاء كافة الجلسات الأخرى النشطة والإبقاء على الجلسة الحالية فقط
export async function revokeOtherSessionsAction(): Promise<{
  success: boolean
  sessionVersion?: number
  message?: string
  error?: string
}> {
  const authCheck = await requireAuthenticatedStudent()
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  const res = revokeOtherStudentSessions(authCheck.email)
  if (!res.success) {
    return { success: false, error: res.error || 'تعذر إنهاء الجلسات الأخرى' }
  }

  const profile = getStudentProfileData(authCheck.email)
  await setStudentSessionCookie(
    profile?.name || authCheck.user.user_metadata?.full_name || 'طالب العلم',
    authCheck.email,
    {
      phone: profile?.phone,
      authProvider: profile?.authProvider,
      avatarUrl: profile?.avatarUrl,
      role: profile?.role || authCheck.user.role,
      sessionVersion: res.newSessionVersion,
    }
  )

  revalidatePath('/', 'layout')
  revalidatePath('/settings')

  return {
    success: true,
    sessionVersion: res.newSessionVersion,
    message: 'تم إنهاء وإبطال جميع الجلسات الأخرى بنجاح، وتأمين جلستك الحالية.',
  }
}

// 9. تعطيل الحساب بناءً على طلب المستخدم بعد التأكيد
export async function deactivateAccountAction(
  confirmationText: string,
  reason?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const authCheck = await requireAuthenticatedStudent()
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  if (authCheck.email === SUPER_ADMIN_EMAIL) {
    return {
      success: false,
      error: 'حماية سيادية: لا يمكن تعطيل حساب مالك المنصة (المهندس بهاء طارق).',
    }
  }

  if (confirmationText.trim() !== 'تعطيل حسابي') {
    return {
      success: false,
      error: 'يرجى كتابة عبارة «تعطيل حسابي» بدقة لتأكيد الطلب.',
    }
  }

  const deactRes = deactivateStudentAccount(authCheck.email, reason)
  if (!deactRes.success) {
    return { success: false, error: deactRes.error || 'تعذر تعطيل الحساب' }
  }

  await clearStudentSession()
  revalidatePath('/', 'layout')

  return { success: true }
}
