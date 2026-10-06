/**
 * Sanad Storage Abstraction & Direct Upload Engine (S3-Compatible)
 * ═══════════════════════════════════════════════════════════════════════════
 * معمارية التخزين السحابي الموحدة لمنصة «سَنَد»
 * 
 * المبادئ الهندسية:
 * 1. Storage Abstraction Layer (S3-Compatible): التبديل بين مزودي التخزين 
 *    (Cloudflare R2, AWS S3, Wasabi, Backblaze B2, MinIO, Supabase)
 *    يتم عبر متغيرات البيئة فقط دون تعديل سطر واحد في الكود البرمجي.
 * 2. Direct Upload Architecture: الملفات الضخمة (فيديوهات وصوتيات 5GB+) 
 *    تُرفع مباشرة من متصفح المشرف إلى مساحة التخزين عبر Presigned URL
 *    دون المرور بخادم الـ Next.js / VPS، مما يوفر استهلاك المعالج والذاكرة والباندويث.
 * 3. Immutable Metadata & Waqf Licensing: كل ملف له ID ثابت مشفر، 
 *    مع كامل بيانات التوثيق، والمصدر، وترخيص الوقف لوجه الله.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface SanadAssetMetadata {
  id: string
  courseSlug: string
  episodeNumber: number
  title: string
  fileName: string
  fileSizeBytes: number
  mimeType: string
  storageProvider: 'cloudflare-r2' | 'aws-s3' | 'wasabi' | 'minio' | 'supabase' | 'local'
  storageKey: string
  cdnUrl: string
  checksumSha256?: string
  license: 'Waqf-Lillah' | 'Open-Educational' | 'Public-Domain'
  sourceReference?: string
  uploadedAt: string
}

export interface PresignedUploadResponse {
  uploadUrl: string
  storageKey: string
  publicCdnUrl: string
  headers: Record<string, string>
  expiresInSeconds: number
  assetMetadata: SanadAssetMetadata
}

export interface StorageConfig {
  provider: 'cloudflare-r2' | 'aws-s3' | 'wasabi' | 'minio' | 'supabase' | 'local'
  bucket: string
  region: string
  endpoint?: string
  cdnBaseUrl?: string
  accessKeyId?: string
  secretAccessKey?: string
}

/**
 * جلب إعدادات التخزين النشطة من متغيرات البيئة
 */
export function getActiveStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER as any) || 'cloudflare-r2'
  return {
    provider,
    bucket: process.env.STORAGE_BUCKET || 'sanad-curriculum-assets',
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
    cdnBaseUrl: process.env.STORAGE_CDN_BASE_URL || 'https://cdn.sanad.edu',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  }
}

/**
 * توليد رابط رفع مباشر (Presigned URL) للملفات الكبيرة من المتصفح مباشرة
 * يسمح برفع ملفات حتى 10GB مباشرة لمزود التخزين السحابي
 */
export async function generatePresignedDirectUploadUrl(params: {
  courseSlug: string
  episodeNumber: number
  fileName: string
  fileSizeBytes: number
  mimeType: string
  title: string
  sourceReference?: string
}): Promise<PresignedUploadResponse> {
  const config = getActiveStorageConfig()
  
  // توليد معرف فريد ومفتاح تخزين منظم هرمياً: courses/{courseSlug}/episodes/{num}-{timestamp}.mp4
  const timestamp = Date.now()
  const cleanExt = params.fileName.split('.').pop()?.toLowerCase() || 'mp4'
  const assetId = `sanad-asset-${params.courseSlug}-${params.episodeNumber}-${timestamp}`
  const storageKey = `courses/${params.courseSlug}/episodes/${String(params.episodeNumber).padStart(2, '0')}-${timestamp}.${cleanExt}`
  
  const publicCdnUrl = `${config.cdnBaseUrl}/${storageKey}`

  // رابط Presigned URL (يحاكي بروتوكول S3 standard PUT)
  // في بيئة الإنتاج يتم استخدام @aws-sdk/s3-request-presigner
  const uploadEndpoint = config.endpoint
    ? `${config.endpoint}/${config.bucket}/${storageKey}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${storageKey}`

  const metadata: SanadAssetMetadata = {
    id: assetId,
    courseSlug: params.courseSlug,
    episodeNumber: params.episodeNumber,
    title: params.title,
    fileName: params.fileName,
    fileSizeBytes: params.fileSizeBytes,
    mimeType: params.mimeType,
    storageProvider: config.provider,
    storageKey,
    cdnUrl: publicCdnUrl,
    license: 'Waqf-Lillah',
    sourceReference: params.sourceReference || 'منصة سَنَد للتعليم والتأصيل الشرعي',
    uploadedAt: new Date().toISOString(),
  }

  return {
    uploadUrl: uploadEndpoint,
    storageKey,
    publicCdnUrl,
    headers: {
      'Content-Type': params.mimeType,
      'x-amz-acl': 'public-read',
    },
    expiresInSeconds: 3600, // صالح لمدة ساعة لرفع الملفات الضخمة براحة
    assetMetadata: metadata,
  }
}

/**
 * تصدير حزمة الأرشيف الكاملة للمتون والدروس كملف محمول (Full JSON Export Archive)
 * يضمن عدم الاعتماد على أي منصة أو مزود خارجي مستقبلاً
 */
export function exportCurriculumArchiveJson(allCourses: any[]): string {
  const archive = {
    sanadVersion: '2.4.0',
    exportedAt: new Date().toISOString(),
    totalCourses: allCourses.length,
    license: 'Waqf-Lillah (وقف لله تعالى)',
    supervisor: 'المهندس بهاء طارق',
    courses: allCourses.map((c) => ({
      slug: c.slug,
      title: c.title,
      category: c.category,
      instructor: c.instructor,
      author: c.author,
      stage: c.stage,
      totalEpisodes: c.episodes?.length || 0,
      episodes: c.episodes || [],
    })),
  }

  return JSON.stringify(archive, null, 2)
}
