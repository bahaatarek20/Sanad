import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudentUser } from '@/lib/auth-helper'
import CurriculumBoard from '@/components/curriculum-board'
import DynamicQuotesBanner from '@/components/dynamic-quotes-banner'
import { Sparkles, Compass, BookOpen, Star, ArrowLeft, Flame } from 'lucide-react'
import Link from 'next/link'
import { getActiveCourses, getActiveCategories } from '@/lib/courses-store'
import { getStudentProfileData } from '@/lib/student-tracking'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'سند',
  description: 'منصة سَنَد: بيئة علمية رصينة لمدارسة المتون الشرعية وضبط الفنون التسعة بالتدرج مع كبار مشايخ أهل السنة بلا مشتتات.',
  alternates: {
    canonical: 'https://sanad-edu1.vercel.app',
  },
  openGraph: {
    title: 'سَنَد || رفيقك ومُعينك في طريق طلب العلم والتأصيل المنهجي',
    description: 'بيئة علمية رصينة لمدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
    url: 'https://sanad-edu1.vercel.app',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'منصة سَنَد' }],
  },
}

// خطوات رحلة طالب العلم
const JOURNEY_STEPS = [
  {
    number: '١',
    title: 'اختر علمًا',
    description: 'انطلق من تسعة فنون شرعية مرتبة ومصنّفة وفق منهج أهل العلم',
    icon: '🧭',
  },
  {
    number: '٢',
    title: 'اختر متناً',
    description: 'تصفّح المتون المعتمدة مرتبةً من المبادئ إلى المقاصد بلا تشتت',
    icon: '📖',
  },
  {
    number: '٣',
    title: 'ادرس مع الشيخ',
    description: 'استمع للشرح المرئي المنتقى وتفاعل مع محطات الفهم والمراجعة',
    icon: '🎓',
  },
  {
    number: '٤',
    title: 'قيّد الفوائد',
    description: 'دوّن فوائدك في كشكولك الشخصي المنظم ليرافقك في مسيرتك العلمية',
    icon: '✍️',
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  // جلب كافة المتون المعتمدة والنشطة من السيرفر (بما فيها تعديلات المشرف الفورية)
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

    // 2. مزامنة مع Supabase فقط إذا كان المستخدم مسجلاً في سحابة Supabase بمعرف UUID صالح
    const isSupabaseUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user?.id || '')
    if (isSupabaseUuid) {
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
        // الاعتماد على السجل المحلي
      }
    }
  }

  // استخراج كافة الفنون الشرعية المعتمدة ديناميكياً من الخادم
  const allCategories = getActiveCategories()

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-20 sm:space-y-28 lg:space-y-32">

      {/* ═══════════════════════════════════════════════════
          القسم الأول: الواجهة الترحيبية الرئيسية
      ═══════════════════════════════════════════════════ */}
      <section className="text-center pt-4 pb-8 sm:pt-6 sm:pb-12 space-y-8 relative">

        {/* شارة الجودة */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-4 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>العلم ينال بالتدرج والتأصيل المنهجي الرصين</span>
        </div>

        {/* العنوان الرئيسي المحوري */}
        <h1 className="text-4xl font-bold text-stone-900 sm:text-5xl lg:text-7xl leading-normal sm:leading-relaxed dark:text-white">
          <span className="block leading-normal pb-1">لا تَحمل همَّ البداية..</span>
          <span className="block mt-2 sm:mt-3 text-emerald-800 dark:text-emerald-400 leading-normal pb-2">
            نحن سَنَدُك في طريق العلم
          </span>
        </h1>

        {/* الوصف الديناميكي */}
        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300 font-medium mt-4 sm:mt-6">
          منصة صُمّمت لتسندك خطوة بخطوة؛ نرتب لك المتون، ونفكك لك الألفاظ الصعبة، ونحفظ لك فوائدك في كشكول منظم،
          لنصل معاً من أول مسألة حتى إتقان الفن عبر{' '}
          <span className="font-bold text-emerald-800 dark:text-emerald-400">{courses.length} متناً</span> تأصيلياً محققاً.
        </p>

        {/* بطاقات المؤشرات الأربع التفاعلية الفخمة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-4">
          {/* عدد المتون */}
          <Link
            href="/courses"
            className="group relative flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white/90 p-3 sm:p-3.5 shadow-xs hover:border-emerald-600/80 hover:shadow-md hover:-translate-y-0.5 transition-all text-right dark:border-emerald-900/60 dark:bg-stone-900/90 dark:hover:border-emerald-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-stone-900 dark:text-white truncate">
                {courses.length} متناً تأصيلياً
              </span>
              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                محققة ومضبوطة بالسند
              </span>
            </div>
          </Link>

          {/* عدد العلوم */}
          <Link
            href="/roadmap"
            className="group relative flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-white/90 p-3 sm:p-3.5 shadow-xs hover:border-amber-600/80 hover:shadow-md hover:-translate-y-0.5 transition-all text-right dark:border-amber-900/60 dark:bg-stone-900/90 dark:hover:border-amber-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-stone-900 dark:text-white truncate">
                {allCategories.length} علوم شرعية
              </span>
              <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-bold truncate">
                مسارات منهجية شاملة
              </span>
            </div>
          </Link>

          {/* ميدان التنافس والهمة */}
          <Link
            href="/community"
            className="group relative flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-white/90 p-3 sm:p-3.5 shadow-xs hover:border-rose-600/80 hover:shadow-md hover:-translate-y-0.5 transition-all text-right dark:border-rose-900/60 dark:bg-stone-900/90 dark:hover:border-rose-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5 fill-rose-500" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-stone-900 dark:text-white truncate">
                ميدان الهمة والتنافس
              </span>
              <span className="block text-[10px] text-rose-700 dark:text-rose-400 font-bold truncate">
                لوحة شرف طلبة العلم
              </span>
            </div>
          </Link>

          {/* مجلس المذاكرة العام */}
          <Link
            href="/community"
            className="group relative flex items-center gap-3 rounded-2xl border border-sky-200/80 bg-white/90 p-3 sm:p-3.5 shadow-xs hover:border-sky-600/80 hover:shadow-md hover:-translate-y-0.5 transition-all text-right dark:border-sky-900/60 dark:bg-stone-900/90 dark:hover:border-sky-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 group-hover:scale-110 transition-transform">
              <Star className="h-5 w-5 fill-sky-400 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-black text-stone-900 dark:text-white truncate">
                مجلس المذاكرة
              </span>
              <span className="block text-[10px] text-sky-700 dark:text-sky-400 font-bold truncate">
                مذاكرة تشاركية للأقران
              </span>
            </div>
          </Link>
        </div>

        {/* أزرار الدعوة للعمل */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-900 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-950 hover:shadow-emerald-950/40 transition-all duration-200 cursor-pointer dark:bg-emerald-800 dark:hover:bg-emerald-700"
          >
            <Compass className="h-4 w-4 text-amber-300" />
            <span>خارطة الطريق لطلب العلم (المسارات المنهجية)</span>
          </Link>

          <a
            href="#curriculum"
            className="inline-flex items-center gap-2.5 rounded-2xl border border-stone-300/80 bg-white px-6 py-3.5 text-sm font-bold text-stone-800 shadow-sm hover:border-emerald-800 hover:text-emerald-900 hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:text-emerald-400 dark:hover:bg-stone-700"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
            <span>فهرس المتون ({courses.length} متناً)</span>
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          القسم الثاني: شريط درر الوحي وأقوال العلماء المتجدد تلقائياً
      ═══════════════════════════════════════════════════ */}
      <DynamicQuotesBanner />

      {/* ═══════════════════════════════════════════════════
          القسم الثالث: رحلة طالب العلم خطوة بخطوة
      ═══════════════════════════════════════════════════ */}
      <section aria-label="رحلة طالب العلم" className="pt-4 sm:pt-8">
        <div className="text-center mb-12 sm:mb-16 space-y-3.5">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 dark:text-white leading-snug">
            رحلة طالب العلم خطوة بخطوة
          </h2>
          <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 font-medium leading-relaxed max-w-xl mx-auto">
            منهج واضح المعالم يأخذك من الصفر إلى الإتقان بخطى راسخة
          </p>
        </div>

        {/* Stepper: أفقي على الشاشات الكبيرة، عمودي على الموبايل */}
        <div className="relative">
          {/* خط الوصل الأفقي (يظهر فقط على الشاشات المتوسطة وما فوق) */}
          <div
            className="hidden md:block absolute top-9 left-[12.5%] right-[12.5%] h-px bg-gradient-to-l from-emerald-200 via-amber-200 to-emerald-200 dark:from-emerald-900/60 dark:via-amber-900/40 dark:to-emerald-900/60"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
            {JOURNEY_STEPS.map((step, idx) => (
              <div key={idx} className="flex md:flex-col items-start md:items-center gap-4 md:gap-4 md:text-center relative">
                {/* الرقم والأيقونة */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white shadow-md shadow-emerald-900/10 dark:border-emerald-800/60 dark:bg-stone-900">
                    <span className="text-3xl leading-none" role="img" aria-hidden="true">
                      {step.icon}
                    </span>
                  </div>
                  {/* رقم الخطوة */}
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900 text-[11px] font-black text-amber-300 shadow-sm dark:bg-emerald-800">
                    {step.number}
                  </span>
                </div>

                {/* النص */}
                <div className="flex-1 md:flex-none space-y-2">
                  <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white leading-snug">{step.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-stone-500 dark:text-stone-400">{step.description}</p>
                </div>

                {/* سهم الوصل بين الخطوات (موبايل فقط) */}
                {idx < JOURNEY_STEPS.length - 1 && (
                  <div className="md:hidden self-stretch flex items-center justify-center" aria-hidden="true">
                    {/* لا يوجد شيء هنا — خط CSS يربط الخطوات */}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          القسم الرابع: خريطة المتون المنهجية التفاعلية
      ═══════════════════════════════════════════════════ */}
      <section id="curriculum" className="pt-12 sm:pt-20 border-t border-stone-200/80 dark:border-stone-800/80 space-y-8">
        <CurriculumBoard
          categories={allCategories}
          courses={courses}
          completedCourseSlugs={completedCourseSlugs}
        />
      </section>
    </div>
  )
}