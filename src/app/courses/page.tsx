import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import CurriculumBoard from '@/components/curriculum-board'
import { Compass, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { getActiveCourses, getActiveCategories } from '@/lib/courses-store'
import { getStudentProfileData } from '@/lib/student-tracking'

export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'خرائط العلوم والمتون التأصيلية',
  description: 'فهرس شامل للمتون الشرعية التأصيلية في 9 فنون مباركة بالتوازي وبلا قيود مع المشايخ المتقنين.',
  alternates: {
    canonical: 'https://sanad-edu1.vercel.app/courses',
  },
  openGraph: {
    title: 'خرائط العلوم والمتون التأصيلية || منصة سَنَد',
    description: 'فهرس شامل للمتون الشرعية التأصيلية في 9 فنون مباركة بالتوازي وبلا قيود.',
    url: 'https://sanad-edu1.vercel.app/courses',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'خرائط العلوم والمتون التأصيلية — منصة سَنَد',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'خرائط العلوم والمتون التأصيلية || منصة سَنَد',
    description: 'فهرس شامل للمتون الشرعية التأصيلية في 9 فنون مباركة بالتوازي وبلا قيود.',
    images: ['/og-default.png'],
  },
}


export default async function CoursesCatalogPage() {
  const supabase = await createClient()

  // جلب كافة المتون المعتمدة والنشطة من الخادم (بما فيها التعديلات والإضافات الإدارية)
  const courses = getActiveCourses()

  // جلب بيانات الطالب للتعرف على المتون المنجزة
  const user = await getCurrentStudentUser()

  let completedCourseSlugs: string[] = []

  if (user) {
    // 1. مزامنة المتون المكتملة المحفوظة في سجل الطالب الدائم على السيرفر
    if (user.email) {
      const studentProfile = getStudentProfileData(user.email)
      if (studentProfile?.completedCourses) {
        completedCourseSlugs = [...studentProfile.completedCourses]
      }
    }

    // 2. مزامنة مع Supabase فقط إذا كان الحساب سحابياً
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
        // Fallback to server registry
      }
    }
  }

  // استخراج كافة الفنون الشرعية المعتمدة ديناميكياً من الخادم
  const allCategories = getActiveCategories()

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* ترويسة فهرس المتون والعلوم مع دعم الوضع الليلي الكامل */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 p-8 shadow-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <Compass className="h-3.5 w-3.5 text-emerald-700" />
              <span>فهرس العلوم والمتون التأصيلية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-snug">
              خرائط العلوم والمتون
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
              اختر الفن والمتن الذي ترغب في مدارسته؛ كل المتون الـ {courses.length} متاحة من اللحظة الأولى لتدرس ما يناسب همتك ووقتك بالتوازي وبلا قيود مسبقة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-stone-200 bg-[#fbf9f4] p-3 text-center min-w-24 dark:border-stone-800 dark:bg-stone-800">
              <span className="block text-xl font-black text-emerald-900 dark:text-emerald-400">{courses.length}</span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">متناً تأصيلياً</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-[#fbf9f4] p-3 text-center min-w-24 dark:border-stone-800 dark:bg-stone-800">
              <span className="block text-xl font-black text-amber-900 dark:text-amber-400">{allCategories.length}</span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">فنون شرعية</span>
            </div>
          </div>
        </div>
      </div>

      {/* تنبيه ترحيبي للزائر لتشجيعه على إنشاء كشكول دائم */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-amber-200/90 bg-amber-50/80 p-5 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                أهلاً بك في منصة سَنَد!
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                جميع المتون مفتوحة للمدارسة والاستماع مباشرة. أنشئ حسابك لحفظ كشكول فوائدك وسلسلة إنجازك سحابياً.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
          >
            <span>تسجيل كشكول الطالب</span>
          </Link>
        </div>
      )}

      {/* البيانات المهيكلة لدليل المتون ومسار التنقل */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://sanad-edu1.vercel.app' },
                  { '@type': 'ListItem', position: 2, name: 'فهرس المتون', item: 'https://sanad-edu1.vercel.app/courses' },
                ],
              },
              {
                '@type': 'ItemList',
                name: 'المتون الشرعية المعتمدة في منصة سَنَد',
                itemListElement: courses.slice(0, 30).map((c, idx) => ({
                  '@type': 'ListItem',
                  position: idx + 1,
                  url: `https://sanad-edu1.vercel.app/courses/${c.slug}`,
                  name: c.title,
                })),
              },
            ],
          }),
        }}
      />

      {/* لوحة عرض المتون والبحث */}
      <CurriculumBoard
        categories={allCategories}
        courses={courses}
        completedCourseSlugs={completedCourseSlugs}
        isLoggedIn={Boolean(user)}
      />
    </div>
  )
}