import { redirect } from 'next/navigation'
import { getActiveCourseBySlug } from '@/lib/courses-store'

interface LessonPageProps {
  params: Promise<{
    slug: string
    lessonId: string
  }>
}

export async function generateMetadata({ params }: LessonPageProps) {
  const { slug, lessonId } = await params
  const course = getActiveCourseBySlug(slug)

  if (!course) {
    return {
      title: 'المجلس غير موجود',
      description: 'هذا المجلس غير موجود في منصة سَنَد.',
    }
  }

  const lessonNumber = parseInt(lessonId, 10)
  const lessonTitle = !isNaN(lessonNumber)
    ? `المجلس ${lessonNumber} - مدارسة ${course.title}`
    : `مجلس ${lessonId} - مدارسة ${course.title}`

  const description = `مدارسة ${lessonTitle} من متن ${course.title} مع الشارح ${course.instructor} على منصة سَنَد للعلوم الشرعية.`
  const url = `https://sanad-edu1.vercel.app/courses/${slug}/lessons/${lessonId}`

  return {
    title: lessonTitle,
    description,
    openGraph: {
      title: lessonTitle,
      description,
      url,
      type: 'article',
      siteName: 'منصة سَنَد',
      locale: 'ar_SA',
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: `${lessonTitle} — منصة سَنَد`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: lessonTitle,
      description,
      images: ['/og-default.png'],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params
  // إعادة التوجيه لقاعة المدارسة مع فتح المجلس المختار
  redirect(`/courses/${slug}?lesson=${encodeURIComponent(lessonId)}`)
}