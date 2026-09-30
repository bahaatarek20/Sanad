import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const courseUrl = `https://sanad.vercel.app/courses/${slug}`

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

  const supabase = await createClient()
  const user = await getCurrentStudentUser()

  let initialNotes: NoteItem[] = []
  let initialIsCompleted = false
  let initialCompletedEpisodes: number[] = []

  if (user) {
    // 1. مزامنة بيانات حساب الطالب والفوائد من سجل الخادم الدائم
    if (user.email) {
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
    }

    // 2. جلب البيانات من Supabase فقط إذا كان الحساب سحابياً
    if (!user.id.startsWith('student-')) {
      try {
        const [{ data: notesData }, { data: progressData }] = await Promise.all([
          supabase
            .from('student_notes')
            .select('*')
            .eq('course_slug', slug)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('student_progress')
            .select('is_completed')
            .eq('course_slug', slug)
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        if (notesData && notesData.length > 0) {
          const remoteNotes: NoteItem[] = notesData.map((n: Record<string, unknown>) => ({
            id: String(n.id),
            title: String(n.title || ''),
            content: String(n.content || n.note_text || ''),
            tag: String(n.tag || (Array.isArray(n.tags) && n.tags[0]) || 'فائدة'),
            created_at: String(n.created_at || new Date().toISOString()),
          }))

          // دمج الفوائد السحابية مع المحلية مع منع التكرار
          const existingIds = new Set(initialNotes.map((n) => n.id))
          const existingContents = new Set(initialNotes.map((n) => n.content.trim()))
          for (const rNote of remoteNotes) {
            if (!existingIds.has(rNote.id) && !existingContents.has(rNote.content.trim())) {
              initialNotes.push(rNote)
              existingIds.add(rNote.id)
            }
          }
          // ترتيب تنازلي حسب تاريخ التدوين
          initialNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }

        if (progressData?.is_completed) {
          initialIsCompleted = true
        }
      } catch (e) {
        console.error('Error fetching student course data:', e)
      }
    }
  }

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://sanad.vercel.app' },
          { '@type': 'ListItem', position: 2, name: 'فهرس المتون', item: 'https://sanad.vercel.app/courses' },
          { '@type': 'ListItem', position: 3, name: course.title, item: `https://sanad.vercel.app/courses/${course.slug}` },
        ],
      },
      {
        '@type': 'Course',
        '@id': `https://sanad.vercel.app/courses/${course.slug}#course`,
        name: `مدارسة ${course.title}`,
        description: course.description || `مدارسة وشرح متن ${course.title} في فن ${course.category} على منصة سَنَد.`,
        provider: {
          '@type': 'Organization',
          name: 'منصة سَنَد للتعليم الشرعي والتأصيل المنهجي',
          url: 'https://sanad.vercel.app',
        },
        educationalLevel: course.difficulty || 'تأصيلي',
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