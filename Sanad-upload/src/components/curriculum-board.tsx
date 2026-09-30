'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowLeft, Layers, Search, BookOpen, Video, ListVideo, Sparkles } from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'
import { resolveCourseProgression } from '@/lib/curriculum-intelligence'
import { toggleCourseCompletion } from '@/app/courses/[slug]/actions'

export interface BoardCategory {
  slug: string
  title: string
  description?: string
}

interface CurriculumBoardProps {
  categories: BoardCategory[]
  courses: MatnCourse[]
  completedCourseSlugs?: string[]
  isLoggedIn?: boolean
}

export default function CurriculumBoard({
  categories,
  courses,
  completedCourseSlugs = [],
  isLoggedIn = false,
}: CurriculumBoardProps) {
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set(completedCourseSlugs))

  const [displayCourses, setDisplayCourses] = useState<MatnCourse[]>(courses)

  // مزامنة حالة الإنجاز والتعديلات الإدارية على المتون مع المتصفح
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_completed_courses')
      if (stored) {
        const localList: string[] = JSON.parse(stored)
        setCompletedSlugs((prev) => new Set([...prev, ...localList]))
      } else if (completedCourseSlugs.length > 0) {
        setCompletedSlugs(new Set(completedCourseSlugs))
      }

      // اعتماد المتون المعتمدة القادمة من السيرفر كمرجع نهائي موحد للمنصة
      setDisplayCourses(courses)
    } catch {
      setDisplayCourses(courses)
    }
  }, [completedCourseSlugs, courses])

  // قراءة فئة المتن أو كلمة البحث من الرابط لدعم بحث Google والروابط المباشرة
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const catParam = params.get('cat') || params.get('category')
      if (catParam) {
        setActiveCategoryTab(catParam)
      }
      const qParam = params.get('q') || params.get('search')
      if (qParam) {
        setSearchQuery(qParam)
      }
    } catch {}
  }, [])

  // تبديل حالة إنجاز المتن مع الحفظ السحابي الدائم المرتبط بحساب الطالب
  const toggleCompletion = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const willBeCompleted = !completedSlugs.has(slug)

    setCompletedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      try {
        localStorage.setItem('sanad_completed_courses', JSON.stringify(Array.from(next)))
      } catch {
        // LocalStorage fallback
      }
      return next
    })

    try {
      await toggleCourseCompletion(slug, willBeCompleted)
    } catch (err) {
      console.error('Error syncing course completion with server:', err)
    }
  }

  // تصفية المتون حسب البحث والتبويب
  const filteredCourses = displayCourses.filter((course) => {
    const matchesCategory =
      activeCategoryTab === 'all' ||
      course.categorySlug === activeCategoryTab ||
      categories.some((cat) => cat.slug === activeCategoryTab && cat.title === course.category)

    const matchesSearch =
      searchQuery.trim() === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  // الفنون المتاحة في العرض الحالي
  const displayedCategories = categories.filter((category) => {
    if (activeCategoryTab !== 'all' && category.slug !== activeCategoryTab) {
      return false
    }
    return filteredCourses.some((c) => c.categorySlug === category.slug || c.category === category.title)
  })

  const totalCompletedInView = displayCourses.filter((c) => completedSlugs.has(c.slug)).length

  return (
    <div className="space-y-8">
      {/* شريط الإحصائية الهادئة والبحث */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-6 dark:border-stone-800">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900 font-bold dark:bg-emerald-950 dark:text-emerald-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-xl font-black text-stone-900 dark:text-white leading-snug">
              خريطة المتون التأصيلية
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-normal">
              {courses.length} متناً محرراً • أنجزت منها {totalCompletedInView} متناً ({Math.round((totalCompletedInView/courses.length)*100)}%)
            </p>
            <div className="mt-3.5 h-2 w-52 sm:w-64 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-700 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round((totalCompletedInView/courses.length)*100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* حقل البحث السريع */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في المتون أو الشارح..."
            className="w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-2.5 pr-10 text-xs text-stone-900 placeholder-stone-400 shadow-2xs focus:border-emerald-800 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder-stone-400"
          />
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
        </div>
      </div>

      {/* فلاتر الفنون الهادئة */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategoryTab('all')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'all'
              ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
              : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>كافة العلوم ({courses.length})</span>
        </button>

        {categories.map((cat) => {
          const count = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
          return (
            <button
              key={cat.slug}
              onClick={() => setActiveCategoryTab(cat.slug)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeCategoryTab === cat.slug
                  ? 'bg-emerald-900 text-white shadow-xs dark:bg-emerald-800'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <span>{cat.title}</span>
              <span className="mr-1.5 text-[10px] opacity-75 font-mono" dir="ltr">({count})</span>
            </button>
          )
        })}
      </div>

      {/* تنبيه عند عدم وجود نتائج للبحث */}
      {filteredCourses.length === 0 && (
        <div className="rounded-3xl border border-stone-200 bg-white/80 p-12 text-center text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          <BookOpen className="mx-auto h-10 w-10 text-stone-300 stroke-1 dark:text-stone-600" />
          <p className="mt-3 text-sm font-bold text-stone-700 dark:text-stone-200">لم نجد متوناً مطابقة لبحثك</p>
          <p className="mt-1 text-xs text-stone-400">جرب كتابة كلمة أخرى أو تصفح كافة العلوم</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setActiveCategoryTab('all')
            }}
            className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      )}

      {/* شبكة الفنون والمتون التأصيلية */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {displayedCategories.map((category) => {
          const categoryCourses = filteredCourses.filter((c) => c.categorySlug === category.slug)
          if (categoryCourses.length === 0) return null

          const categoryCompleted = categoryCourses.filter((c) => completedSlugs.has(c.slug)).length

          return (
            <div
              key={category.slug}
              className="flex flex-col rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-xs hover:border-amber-900/20 transition dark:border-stone-800 dark:bg-stone-900/95"
            >
              {/* ترويسة الفن */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-stone-900 dark:text-white leading-snug">{category.title}</h3>
                  <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                    {categoryCourses.length} متناً تأصيلياً
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {categoryCompleted} / {categoryCourses.length} منجز
                  </span>
                  <div className="mt-1.5 h-1 w-24 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600/70 transition-all"
                      style={{ width: `${Math.round((categoryCompleted/categoryCourses.length)*100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* قائمة متون الفن المفتوحة بالكامل بالتوازي */}
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800 flex-1">
                {categoryCourses.map((course) => {
                  const isDone = completedSlugs.has(course.slug)
                  const progression = resolveCourseProgression(course, displayCourses)

                  return (
                    <div
                      key={course.slug}
                      className="group flex items-center justify-between py-3 px-2 rounded-xl transition hover:bg-stone-50 dark:hover:bg-stone-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* زر التحديد المباشر */}
                        <button
                          type="button"
                          onClick={(e) => toggleCompletion(course.slug, e)}
                          title={isDone ? 'متن مُنجز ومضبوط' : 'تحديد كمنجز'}
                          className="shrink-0 p-1 hover:scale-110 transition cursor-pointer text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-400"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-stone-300 dark:text-stone-600" />
                          )}
                        </button>

                        <div className="min-w-0 space-y-1">
                          <Link
                            href={`/courses/${course.slug}`}
                            className={`flex flex-wrap items-center gap-2 font-bold text-xs sm:text-sm hover:text-emerald-800 transition dark:hover:text-emerald-400 leading-snug ${
                              isDone ? 'text-stone-500 line-through decoration-emerald-800/40 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            <span className="truncate">{course.title}</span>
                            {course.stage && (
                              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                                course.stage === 1
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                                  : course.stage === 3
                                  ? 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60'
                                  : 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                              }`}>
                                {course.stage === 1 ? 'مرحلة 1: تأسيس' : course.stage === 3 ? 'مرحلة 3: تمكن' : 'مرحلة 2: بناء'}
                              </span>
                            )}
                            {course.instructor && (
                              <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200/60 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">
                                الشارح: {course.instructor}
                              </span>
                            )}
                          </Link>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-stone-400 dark:text-stone-400">
                            <span className="inline-flex items-center gap-0.5 text-stone-400">
                              {course.isPlaylist ? (
                                <>
                                  <ListVideo className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                                  <span>سلسلة ({course.totalLessons ? `${course.totalLessons} مجلساً` : 'مجالس'})</span>
                                </>
                              ) : (
                                <>
                                  <Video className="h-3 w-3 text-stone-400" />
                                  <span>مجلس كامل</span>
                                </>
                              )}
                            </span>

                            {/* شارة المتطلب السابق والتوجيه المنهجي */}
                            {progression.prerequisites && progression.prerequisites.length > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px]">
                                <span className="text-stone-400">المتطلب:</span>
                                {progression.prerequisites.map((p, pIdx) => {
                                  const isPrereqDone = p.slug && completedSlugs.has(p.slug)
                                  return (
                                    <span
                                      key={pIdx}
                                      className={`rounded-md px-1.5 py-0.5 border ${
                                        isPrereqDone
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                      }`}
                                    >
                                      {p.title} {isPrereqDone ? '✓' : ''}
                                    </span>
                                  )
                                })}
                              </span>
                            ) : (course.stage || 1) === 1 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                <span>نقطة انطلاق</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/courses/${course.slug}`}
                        className="mr-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:border-emerald-800 hover:bg-emerald-900 hover:text-white transition cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-emerald-800 dark:hover:text-white"
                      >
                        <span>مدارسة</span>
                        <ArrowLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}