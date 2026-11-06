'use server'

import { revalidatePath } from 'next/cache'
import {
  issueCourseCertificate,
  getCertificateByIdAsync,
  verifyCertificateIntegrity,
  VerifiedCertificate,
} from '@/lib/certificate-service'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import {
  getStudentProfileData,
  recordStudentCourseCompleted,
  updateStudentExtendedProfile,
} from '@/lib/student-tracking'
import { getActiveCourseBySlug } from '@/lib/courses-store'
import { sendSanadMessage } from '@/lib/messages-service'

/**
 * إصدار إجازة قراءة وضبط للمتن باسم المنصة وتوثيقها برمز تجزئة ورقم تسلسلي
 * مع ربط تلقائي كامل بصفحة الكشكول وخارطة الطريق وصندوق رسائل الطالب
 * مشترطاً إكمال كافة مجالس المتن بنسبة 100%، مع إتاحة تخصيص وتعديل اسم الطالب
 */
export async function issueCourseCertificateAction(
  courseSlug: string,
  studentName: string,
  studentEmail?: string
): Promise<{ success: boolean; certificate?: VerifiedCertificate; error?: string }> {
  try {
    if (!courseSlug) {
      return { success: false, error: 'بيانات المتن مطلوبة لإصدار الإجازة' }
    }

    // 1. استخراج حساب الطالب
    let resolvedEmail = studentEmail?.toLowerCase().trim()
    let resolvedName = studentName?.trim() || ''

    try {
      const user = await getCurrentStudentUser()
      if (user?.email) {
        resolvedEmail = user.email.toLowerCase().trim()
        const profile = getStudentProfileData(resolvedEmail)
        if (!resolvedName) {
          if (profile?.name && profile.name.trim() && profile.name.trim() !== 'طالب العلم') {
            resolvedName = profile.name.trim()
          } else if (
            user.user_metadata?.full_name &&
            user.user_metadata.full_name.trim() &&
            user.user_metadata.full_name.trim() !== 'طالب العلم'
          ) {
            resolvedName = user.user_metadata.full_name.trim()
          }
        }
      }
    } catch {}

    if (!resolvedName) {
      resolvedName = 'طالب العلم'
    }

    // 2. التحقق الصارم: هل أتم الطالب كافة مجالس هذا المتن بنسبة 100%؟
    if (resolvedEmail) {
      const profile = getStudentProfileData(resolvedEmail)
      const course = getActiveCourseBySlug(courseSlug)
      const totalLessons = course?.episodes?.length || course?.videoList?.length || course?.totalLessons || 1
      const completedEpisodes = profile?.completedEpisodesMap?.[courseSlug]?.length || 0
      const isMarkedCompleted = profile?.completedCourses?.includes(courseSlug)

      if (!isMarkedCompleted && completedEpisodes < totalLessons) {
        return {
          success: false,
          error: `يتعذر إصدار أو طباعة شهادة الإجازة: يجب إكمال كافة مجالس المتن بنسبة 100% أولاً (تم إنجاز ${completedEpisodes} من أصل ${totalLessons} مجالس).`,
        }
      }

      // تحديث وحفظ الاسم المخصص في ملف الطالب ليستمر معه في الشهادة والمنصة
      if (resolvedName && resolvedName !== 'طالب العلم') {
        try {
          updateStudentExtendedProfile(resolvedEmail, { name: resolvedName })
        } catch {}
      }
    }

    const cert = issueCourseCertificate({
      courseSlug,
      studentName: resolvedName,
      studentEmail: resolvedEmail,
    })

    // 2. توثيق إتمام المتن تلقائياً في سجل الطالب ليُفتح له المتن التالي في خارطة الطريق ويظهر في الكشكول ولوحة الإدارة
    if (resolvedEmail) {
      try {
        recordStudentCourseCompleted(resolvedEmail, courseSlug, cert.courseTitle, true)
      } catch (err) {
        console.warn('[Certificate Action] Could not mark course completed:', err)
      }

      // 3. إيداع إشعار رسمي مبارك في صندوق رسائل سَنَد مع رابط التحقق المباشر ورقم الإجازة
      try {
        const verifyPath = cert.signedToken
          ? `/verify-ijaza/${encodeURIComponent(cert.id)}?token=${encodeURIComponent(cert.signedToken)}`
          : `/verify-ijaza/${encodeURIComponent(cert.id)}`

        sendSanadMessage({
          recipient: resolvedEmail,
          senderName: 'ديوان الإجازات والسند العلمي',
          senderEmail: 'ijaza@sanad.edu',
          senderTitle: 'اللجنة العلمية للتوثيق والاعتماد — منصة سَنَد',
          subject: `📜 مبارك! صدور إجازتك العلمية الموثقة في متن «${cert.courseTitle}»`,
          snippet: `تم اعتماد إجازتك برقم تسلسلي (${cert.serialNumber}) وتوثيقها بكود التجزئة المشفر SHA-256...`,
          body: `بسم الله الرحمن الرحيم، والحمد لله رب العالمين.

هنيئاً لك يا ${cert.studentName}،

يسر ديوان الإجازات والسند العلمي في منصة «سَنَد» إشعارك باعتماد وتوثيق إجازة القراءة والضبط الخاصة بك بعد اجتيازك اختبار الضبط المنهجي بنجاح:

• المتن العلمي المجاز فيه: «${cert.courseTitle}»
• الرقم التسلسلي الدولي: ${cert.serialNumber}
• تاريخ الاعتماد: ${cert.formattedDate}
• كود التجزئة المشفر (SHA-256): ${cert.verificationHash}

وقد تم تحديث «كشكولك» و«خارطة الطريق» تلقائياً لفتح المتون التالية في السلم التعليمي.
نسأل الله أن ينفعك بما علمك ويجعله حجة لك لا عليك.`,
          category: 'academic',
          isStarred: true,
          actionUrl: verifyPath,
          actionLabel: 'استعراض وتحميل صك الإجازة الموثق ←',
        })
      } catch (err) {
        console.warn('[Certificate Action] Could not send inbox notification:', err)
      }
    }

    try {
      revalidatePath('/dashboard')
      revalidatePath('/roadmap')
      revalidatePath(`/courses/${courseSlug}`)
    } catch {}

    return {
      success: true,
      certificate: cert,
    }
  } catch (err) {
    console.error('Error issuing certificate action:', err)
    return { success: false, error: 'حدث خطأ أثناء إصدار الإجازة الرقمية الموثقة' }
  }
}

/**
 * جلب تفاصيل الإجازة للتحقق منها عاماً من أي متصفح (محلياً أو سحابياً أو عبر التوقيع المشفر)
 */
export async function getVerifiedCertificateAction(
  idOrSerial: string,
  signedToken?: string
): Promise<{
  success: boolean
  certificate?: VerifiedCertificate
  integrity?: { isValid: boolean; matchedHash: boolean }
  error?: string
}> {
  try {
    const cert = await getCertificateByIdAsync(idOrSerial, signedToken)
    if (!cert) {
      return { success: false, error: 'لم يتم العثور على أي إجازة علمية مسجلة بهذا المعرف أو الكود' }
    }

    const integrity = verifyCertificateIntegrity(cert)

    return {
      success: true,
      certificate: cert,
      integrity: {
        isValid: integrity.isValid,
        matchedHash: integrity.matchedHash,
      },
    }
  } catch (err) {
    console.error('Error retrieving certificate:', err)
    return { success: false, error: 'تعذر التحقق من الإجازة حالياً' }
  }
}
