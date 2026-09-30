import { redirect } from 'next/navigation'

/**
 * بوابة الإدارة والتحكم الرسمية لمنصة «سَنَد»
 * تقوم بالتوجيه المباشر إلى البوابة الإدارية المحصنة خادمياً
 */
export default function AdminPage() {
  redirect('/sanad-control-gate')
}
