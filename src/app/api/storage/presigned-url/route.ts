import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-security'
import { generatePresignedDirectUploadUrl } from '@/lib/storage-provider'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Direct Upload Presigned URL Generator (نظام توليد روابط الرفع المباشر)
 * ═════════════════════════════════════════════════════════════════════
 * المبدأ: "الملفات الضخمة (حتى 5GB+) لا تمر عبر الـ VPS أو الـ Next.js Backend إطلاقاً"
 * 
 * Flow:
 * 1. المتصفح يطلب رابط رفع مسبق التوقيع (Presigned PUT URL).
 * 2. الخادم يتحقق من الصلاحيات ويولّد الرابط في 5ms دون استهلاك أي ذاكرة.
 * 3. المتصفح يرفع الملف مباشرة إلى مساحة التخزين (Cloudflare R2 / S3 / MinIO).
 * 4. صفر استهلاك للباندويث والمعالج على خادم التطبيق!
 * ═════════════════════════════════════════════════════════════════════
 */
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminSession()
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح: يتطلب صلاحيات المشرف العام لتوليد رابط الرفع المباشر' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const {
      courseSlug,
      episodeNumber = 1,
      fileName,
      fileSizeBytes = 0,
      mimeType = 'video/mp4',
      title = 'مجلس علمي',
      sourceReference,
    } = body

    if (!fileName || !courseSlug) {
      return NextResponse.json(
        { success: false, error: 'البيانات غير مكتملة: مطلوب اسم الملف ومعرف المتن (slug)' },
        { status: 400 }
      )
    }

    // توليد رابط الرفع المباشر
    const presignedData = await generatePresignedDirectUploadUrl({
      courseSlug,
      episodeNumber: Number(episodeNumber),
      fileName,
      fileSizeBytes: Number(fileSizeBytes),
      mimeType,
      title,
      sourceReference,
    })

    return NextResponse.json({
      success: true,
      ...presignedData,
    })
  } catch (err: any) {
    console.error('Error in presigned upload route:', err)
    return NextResponse.json(
      { success: false, error: `فشل توليد رابط الرفع المباشر: ${err.message || String(err)}` },
      { status: 500 }
    )
  }
}
