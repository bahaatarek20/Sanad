/**
 * تنظيف مسار ملف الفيديو دون المساس بالنص العربي مطلقاً:
 * 1. إزالة امتداد ملف الفيديو فقط من النهاية (.mp4, .mkv, إلخ).
 * 2. تحويل الشرطات السفلية إلى مسافات إن وُجدت في اسم الملف.
 * 3. عدم حذف أي كلمة عربية، أو سوابق، أو أرقام، أو علامات ترقيم، للحفاظ على النص كما كتبه المستخدم حرفياً.
 */
export function cleanVideoTitle(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return ''

  let text = raw.trim()

  // 1. إزالة امتداد ملف الفيديو الشائع فقط من نهاية النص (.mp4, .mkv, إلخ)
  text = text.replace(/\.(mp4|mkv|avi|mov|webm|wmv|flv|m4v|ts|3gp|ogv|ogg|mpg|mpeg)$/i, '')

  // 2. إذا كان اسم الملف يحتوي على شرطات سفلية بدلاً من المسافات يتم تحويلها لمسافات
  text = text.replace(/_+/g, ' ')

  // 3. إزالة دلالات الجودة الإنجليزية الملحقة بين أقواس مثل (720p) أو [1080p] دون المساس بأي حرف عربي
  text = text.replace(/[\(\[]\s*(?:144|240|360|480|720|1080|1440|2160|4k|hd|fhd)\s*p?\s*[\)\]]/gi, '')

  return text.trim()
}

/**
 * تنظيف وصف المجلس دون المساس بأي نص عربي
 */
export function cleanEpisodeDescription(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return ''
  return raw.trim()
}
