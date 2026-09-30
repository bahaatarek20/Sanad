'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  authenticateAdmin,
  verifyAdminSession,
  revokeAdminSession,
} from '@/lib/admin-security'
import { getAdminDashboardData, toggleStudentBan, resetVisitorCount } from '@/lib/student-tracking'
import {
  getActiveCourses,
  saveCourseToServer,
  deleteCourseFromServer,
  moveCourseInServer,
  updateCourseCategoryInServer,
  reorderCoursesInServer,
  getBroadcastNotice,
  saveBroadcastNotice,
  getActiveCategories,
  saveCategoryToServer,
  deleteCategoryFromServer,
  BroadcastNotice,
  CategoryItem,
} from '@/lib/courses-store'
import { MatnCourse } from '@/lib/curriculum-data'

/**
 * 1. تسجيل دخول المشرف العام بالتحقق الخادمي والحماية ضد التخمين (Brute-force)
 */
export async function loginAdminAction(formData: FormData) {
  const passcode = (formData.get('passcode') as string) || ''
  const headerList = await headers()
  const clientIp = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'client-ip'

  const result = await authenticateAdmin(passcode, clientIp)
  if (result.success) {
    revalidatePath('/sanad-control-gate')
  }

  return result
}

/**
 * 2. قفل لوحة التحكم والخروج الآمن
 */
export async function logoutAdminAction() {
  await revokeAdminSession()
  revalidatePath('/sanad-control-gate')
  return { success: true }
}

/**
 * 3. جلب بيانات لوحة التحكم وسجل الطلاب المشفر (محمي بجلسة المشرف الخادمية)
 */
export async function getAdminDashboardAction() {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بالوصول إلى بيانات الطلاب' }
  }

  const data = getAdminDashboardData()
  const courses = getActiveCourses()
  const categories = getActiveCategories()
  const broadcast = getBroadcastNotice()

  return {
    success: true,
    courses,
    categories,
    broadcast,
    ...data,
  }
}

/**
 * 4. حفظ أو تعديل متن علمي من لوحة الإدارة مع التحديث الفوري المباشر للمنصة كاملة
 */
export async function saveCourseAdminAction(course: MatnCourse, oldSlug?: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بحفظ المتون' }
  }

  const updatedCourses = saveCourseToServer(course, oldSlug)

  // إعادة تدقيق وإلغاء كاش كافة مسارات المنصة فوراً لتسمع التعديلات لجميع الطلاب
  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath(`/courses/${course.slug}`)
  if (oldSlug && oldSlug !== course.slug) {
    revalidatePath(`/courses/${oldSlug}`)
  }
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    courses: updatedCourses,
  }
}

/**
 * 5. حذف متن علمي من لوحة الإدارة مع التحديث الفوري المباشر للمنصة
 */
export async function deleteCourseAdminAction(slug: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بحذف المتون' }
  }

  const updatedCourses = deleteCourseFromServer(slug)

  // تحديث المسارات فورياً
  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath(`/courses/${slug}`)
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    courses: updatedCourses,
  }
}

/**
 * 5.1. تقديم أو تأخير متن علمي (Move Up / Down) في الفهرس والمسار التأصيلي
 */
export async function moveCourseAdminAction(slug: string, direction: 'up' | 'down') {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بإعادة ترتيب المتون' }
  }

  const updatedCourses = moveCourseInServer(slug, direction)

  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    courses: updatedCourses,
  }
}

/**
 * 5.2. تغيير الفن الشرعي لمتن معين فوراً من الجدول أو النموذج مع تحديث كافة أرجاء المنصة
 */
export async function quickChangeCourseCategoryAdminAction(slug: string, newCategorySlug: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بتعديل فن المتن' }
  }

  const updatedCourses = updateCourseCategoryInServer(slug, newCategorySlug)

  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath(`/courses/${slug}`)
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    courses: updatedCourses,
  }
}

/**
 * 5.3. حفظ الترتيب الكامل للمتون بعد السحب أو التبديل
 */
export async function reorderCoursesAdminAction(orderedCourses: MatnCourse[]) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بإعادة ترتيب المتون' }
  }

  const updatedCourses = reorderCoursesInServer(orderedCourses)

  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    courses: updatedCourses,
  }
}

/**
 * 6. حفظ وبث الإعلان الإداري لجميع الطلاب والزوار فوراً
 */
export async function saveBroadcastAdminAction(broadcast: BroadcastNotice) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بنشر الإعلانات' }
  }

  const updatedBroadcast = saveBroadcastNotice(broadcast)

  // التحديث الفوري لجميع الصفحات
  revalidatePath('/', 'layout')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    broadcast: updatedBroadcast,
  }
}

/**
 * 7. حذف منشور مخالف (مشرف فقط)
 */
export async function deleteCommunityPostAdminAction(postId: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/community')
    revalidatePath('/sanad-control-gate')
    return { success: true }
  } catch (err) {
    console.error('Delete post exception:', err)
    return { success: false, error: 'تعذر حذف المنشور' }
  }
}

/**
 * 8. حذف تعليق مخالف (مشرف فقط)
 */
export async function deleteCommunityReplyAdminAction(replyId: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('community_replies')
      .delete()
      .eq('id', replyId)

    if (error) {
      console.error('Error deleting reply:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/community')
    revalidatePath('/sanad-control-gate')
    return { success: true }
  } catch (err) {
    console.error('Delete reply exception:', err)
    return { success: false, error: 'تعذر حذف التعليق' }
  }
}

/**
 * 9. حفظ أو تعديل فن شرعي وتعميم الاسم الجديد على جميع المتون التابعة له في كافة أنحاء المنصة
 */
export async function saveCategoryAdminAction(params: {
  slug: string
  title: string
  oldSlug?: string
  oldTitle?: string
}) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بتعديل الفنون الشرعية' }
  }

  const result = saveCategoryToServer(params)

  // تعميم التعديلات فوراً على كافة مسارات المنصة
  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    categories: result.categories,
    courses: result.courses,
  }
}

/**
 * 10. حذف فن شرعي من لوحة الإدارة
 */
export async function deleteCategoryAdminAction(slug: string) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بحذف الفنون الشرعية' }
  }

  const updatedCategories = deleteCategoryFromServer(slug)

  revalidatePath('/', 'layout')
  revalidatePath('/courses')
  revalidatePath('/roadmap')
  revalidatePath('/dashboard')
  revalidatePath('/sanad-control-gate')

  return {
    success: true,
    categories: updatedCategories,
  }
}

/**
 * 11. حظر أو فك حظر حساب طالب إدارياً (مشرف فقط)
 */
export async function toggleBanStudentAdminAction(
  studentEmailOrId: string,
  isBanned: boolean,
  banReason?: string
) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بالقيام بهذا الإجراء الإداري' }
  }

  const result = toggleStudentBan(studentEmailOrId, isBanned, banReason)

  revalidatePath('/sanad-control-gate')
  revalidatePath('/community')
  revalidatePath('/dashboard')
  revalidatePath('/courses')

  return result
}

/**
 * 12. تصفير أو تصحيح عداد زوار المنصة واستثناء زيارات الإدارة
 */
export async function resetVisitorCountAdminAction(targetCount: number = 0) {
  const isValid = await verifyAdminSession()
  if (!isValid) {
    return { success: false, error: 'غير مصرح بتعديل عداد الزوار' }
  }

  const updatedCount = resetVisitorCount(targetCount)
  revalidatePath('/sanad-control-gate')
  revalidatePath('/')
  return { success: true, totalVisitors: updatedCount }
}
