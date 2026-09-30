'use server'

import {
  issueCourseCertificate,
  getCertificateById,
  verifyCertificateIntegrity,
  VerifiedCertificate,
} from '@/lib/certificate-service'

/**
 * إصدار إجازة قراءة وضبط للمتن باسم المنصة وتوثيقها برمز تجزئة ورقم تسلسلي
 */
export async function issueCourseCertificateAction(
  courseSlug: string,
  studentName: string,
  studentEmail?: string
): Promise<{ success: boolean; certificate?: VerifiedCertificate; error?: string }> {
  try {
    if (!courseSlug || !studentName) {
      return { success: false, error: 'بيانات الطالب والمتن مطلوبة لإصدار الإجازة' }
    }

    const cert = issueCourseCertificate({
      courseSlug,
      studentName,
      studentEmail,
    })

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
 * جلب تفاصيل الإجازة للتحقق منها عاماً من أي متصفح
 */
export async function getVerifiedCertificateAction(
  idOrSerial: string
): Promise<{
  success: boolean
  certificate?: VerifiedCertificate
  integrity?: { isValid: boolean; matchedHash: boolean }
  error?: string
}> {
  try {
    const cert = getCertificateById(idOrSerial)
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
