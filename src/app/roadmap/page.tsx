import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import { getActiveCourses, getActiveCategories } from '@/lib/courses-store'
import { getStudentProfileData } from '@/lib/student-tracking'
import CurriculumRoadmap from '@/components/curriculum-roadmap'

export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'خارطة الطريق لطلب العلم والتأصيل الشرعي',
  description: 'خارطة طريق بصرية متسلسلة للمتون والعلوم الشرعية ترتب لك البداية من المبادئ إلى التمكن في 9 فنون مباركة.',
  alternates: {
    canonical: 'https://sanad-edu1.vercel.app/roadmap',
  },
  openGraph: {
    title: 'خارطة الطريق لطلب العلم والتأصيل الشرعي || منصة سَنَد',
    description: 'خارطة طريق بصرية متسلسلة للمتون والعلوم الشرعية ترتب لك البداية من المبادئ إلى التمكن.',
    url: 'https://sanad-edu1.vercel.app/roadmap',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'خارطة الطريق — منصة سَنَد',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'خارطة الطريق لطلب العلم والتأصيل الشرعي || منصة سَنَد',
    description: 'خارطة طريق بصرية متسلسلة للمتون والعلوم الشرعية ترتب لك البداية من المبادئ إلى التمكن.',
    images: ['/og-default.png'],
  },
}

export default async function RoadmapPage() {
  const courses = getActiveCourses()
  const categories = getActiveCategories()
  const user = await getCurrentStudentUser()
  const supabase = await createClient()

  let completedCourseSlugs: string[] = []

  if (user) {
    if (user.email) {
      const studentProfile = getStudentProfileData(user.email)
      if (studentProfile?.completedCourses) {
        completedCourseSlugs = [...studentProfile.completedCourses]
      }
    }

    if (!user.id.startsWith('student-')) {
      try {
        const { data: progress } = await supabase
          .from('student_progress')
          .select('course_slug')
          .eq('user_id', user.id)
          .eq('is_completed', true)

        if (progress) {
          const fromDb = progress
            .map((p) => p.course_slug)
            .filter((slug): slug is string => Boolean(slug))
          completedCourseSlugs = Array.from(new Set([...completedCourseSlugs, ...fromDb]))
        }
      } catch {
        // Fallback
      }
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* مسار التنقل المهيكل لمحركات البحث */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://sanad-edu1.vercel.app' },
              { '@type': 'ListItem', position: 2, name: 'خارطة الطريق', item: 'https://sanad-edu1.vercel.app/roadmap' },
            ],
          }),
        }}
      />
      <CurriculumRoadmap
        courses={courses}
        categories={categories}
        completedCourseSlugs={completedCourseSlugs}
        isLoggedIn={Boolean(user)}
      />
    </div>
  )
}
