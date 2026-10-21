import { notFound, redirect } from 'next/navigation'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { getActiveCourseBySlug, getActiveCourses } from '@/lib/courses-store'
import { getStudentProfileData, getStudentLocalNotes } from '@/lib/student-tracking'
import ClassroomView, { NoteItem } from '@/components/classroom-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CoursePageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ lesson?: string }>
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { slug } = await params
  const course = getActiveCourseBySlug(slug)

  if (!course) {
    return {
      title: 'المتن غير موجود',
      description: 'هذا المتن غير موجود في منصة سَنَد.',
    }
  }

  const title = `مدارسة ${course.title}`
  const description = course.description || `مدارسة متن ${course.title} مع أمهر المشايخ على منصة سَنَد للعلوم الشرعية.`
  const courseUrl = `https://sanad-edu1.vercel.app/courses/${slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: courseUrl,
      type: 'article',
      siteName: 'منصة سَنَد',
      locale: 'ar_SA',
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: `${course.title} — منصة سَنَد`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-default.png'],
    },
    alternates: {
      canonical: courseUrl,
    },
  }
}


export default async function CourseDetailPage({ params, searchParams }: CoursePageProps) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const lessonParam = resolvedSearchParams?.lesson
  let initialEpisodeIndex = 0
  if (lessonParam) {
    const parsed = parseInt(lessonParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      initialEpisodeIndex = parsed - 1
    }
  }

  // جلب المتن النشط مباشرة من مستودع الخادم المركزي (شاملاً تعديلات المشرف الفورية)
  const course = getActiveCourseBySlug(slug)

  if (!course) {
    notFound()
  }

  const allCourses = getActiveCourses()
  // المتون في نفس الفن
  const relatedCourses = allCourses.filter(
    (c) => c.categorySlug === course.categorySlug
  )

  let user = null
  try {
    user = await getCurrentStudentUser()
  } catch (err) {
    console.warn('Failed to fetch student user in course SSR:', err)
  }

  if (!user) {
    redirect(`/login?redirect=/courses/${slug}`)
  }

  let initialNotes: NoteItem[] = []
  let initialIsCompleted = false
  let initialCompletedEpisodes: number[] = []

  if (user) {
    // 1. مزامنة بيانات حساب الطالب والفوائد من سجل الخادم الدائم
    if (user.email) {
      try {
        const studentProfile = getStudentProfileData(user.email)
        if (studentProfile) {
          if (studentProfile.completedCourses.includes(slug)) {
            initialIsCompleted = true
          }
          if (studentProfile.completedEpisodesMap?.[slug]) {
            initialCompletedEpisodes = studentProfile.completedEpisodesMap[slug]
          }
        }

        const localNotes = getStudentLocalNotes(user.email, slug)
        if (localNotes && localNotes.length > 0) {
          initialNotes = localNotes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            tag: n.tag,
            created_at: n.created_at,
          }))
        }
      } catch (err) {
        console.warn('Failed to sync student local notes:', err)
      }
    }
  }

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://sanad-edu1.vercel.app' },
          { '@type': 'ListItem', position: 2, name: 'فهرس المتون', item: 'https://sanad-edu1.vercel.app/courses' },
          { '@type': 'ListItem', position: 3, name: course.title, item: `https://sanad-edu1.vercel.app/courses/${course.slug}` },
        ],
      },
      {
        '@type': 'Course',
        '@id': `https://sanad-edu1.vercel.app/courses/${course.slug}#course`,
        name: `مدارسة ${course.title}`,
        description: course.description || `مدارسة وشرح متن ${course.title} في فن ${course.category} على منصة سَنَد.`,
        provider: {
          '@type': 'Organization',
          name: 'منصة سَنَد للتعليم الشرعي والتأصيل المنهجي',
          url: 'https://sanad-edu1.vercel.app',
        },
        educationalLevel: ('difficulty' in course && typeof (course as Record<string, unknown>).difficulty === 'string')
          ? String((course as Record<string, unknown>).difficulty)
          : (course.stage === 1 ? 'تأسيس' : course.stage === 2 ? 'بناء' : 'تمكن'),
        inLanguage: 'ar',
        isAccessibleForFree: true,
        ...(course.instructor
          ? {
              instructor: {
                '@type': 'Person',
                name: course.instructor,
              },
            }
          : {}),
      },
    ],
  }

  // تجميع قائمة المتون المنجزة للطالب للتحقق من المتطلبات السابقة
  const completedCourseSlugs: string[] = []
  if (user && user.email) {
    const studentProfile = getStudentProfileData(user.email)
    if (studentProfile?.completedCourses) {
      completedCourseSlugs.push(...studentProfile.completedCourses)
    }
  }
  if (initialIsCompleted && !completedCourseSlugs.includes(slug)) {
    completedCourseSlugs.push(slug)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* البيانات المهيكلة لنتائج بحث Google الغنية (Rich Snippets) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <ClassroomView
        course={course}
        relatedCourses={relatedCourses}
        allCourses={allCourses}
        completedCourseSlugs={completedCourseSlugs}
        initialNotes={initialNotes}
        initialIsCompleted={initialIsCompleted}
        initialCompletedEpisodes={initialCompletedEpisodes}
        initialEpisodeIndex={initialEpisodeIndex}
        isLoggedIn={Boolean(user)}
      />
    </div>
  )
}