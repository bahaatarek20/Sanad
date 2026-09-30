'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Compass,
  CheckCircle2,
  Circle,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Sparkles,
  GitFork,
  Check,
  ChevronDown,
  Layers,
  Award,
  Filter,
  Search,
  X,
  Trophy,
} from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'
import { analyzeMatnStage, resolveCourseProgression } from '@/lib/curriculum-intelligence'
import ScholarlyStationsModal from '@/components/scholarly-stations-modal'

interface RoadmapProps {
  courses: MatnCourse[]
  categories?: { slug: string; title: string }[]
  completedCourseSlugs?: string[]
  isLoggedIn?: boolean
}

const STAGES_INFO = [
  {
    stage: 1,
    title: 'مرحلة الأساس الأولى: المدخل والتأسيس',
    desc: 'مبادئ العلوم ومداخل الفنون وضبط معاقد الطلب وآداب التحصيل',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    accentBorder: 'border-emerald-500/40',
  },
  {
    stage: 2,
    title: 'مرحلة البناء والتوسع المنهجي: المتون المتوسطة',
    desc: 'تأصيل القواعد، دراسة الأدلة وتخريج الفروع على الأصول',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    accentBorder: 'border-amber-500/40',
  },
  {
    stage: 3,
    title: 'مرحلة التمكن والتحرير: المتون الكبرى',
    desc: 'فقه الخلاف العالي، دقائق الاستدلال والتحرير الأصولي والحديثي',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800',
    dotColor: 'bg-teal-500',
    accentBorder: 'border-teal-500/40',
  },
]

export default function CurriculumRoadmap({
  courses,
  categories,
  completedCourseSlugs = [],
  isLoggedIn = false,
}: RoadmapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStage, setSelectedStage] = useState<number | 'all'>('all')
  const [isSmartExplorerOpen, setIsSmartExplorerOpen] = useState(false)
  const [smartExplorerQuery, setSmartExplorerQuery] = useState('')
  const [isStationsModalOpen, setIsStationsModalOpen] = useState(false)

  const completedSet = new Set(completedCourseSlugs)
  const completedCount = courses.filter((c) => completedSet.has(c.slug)).length
  const progressPercent = Math.round((completedCount / (courses.length || 1)) * 100)

  // استخراج التصنيفات المتاحة
  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories
    const categoriesMap = new Map<string, string>()
    courses.forEach((c) => {
      if (c.categorySlug && c.category) {
        categoriesMap.set(c.categorySlug, c.category)
      }
    })
    return Array.from(categoriesMap.entries()).map(([slug, title]) => ({ slug, title }))
  }, [categories, courses])

  // فلترة المتون
  const filteredCourses = courses.filter((c) => {
    if (selectedCategory !== 'all') {
      const matchesSlug = c.categorySlug === selectedCategory
      const matchesTitle = availableCategories.find((cat) => cat.slug === selectedCategory)?.title === c.category
      if (!matchesSlug && !matchesTitle) return false
    }
    const courseStage = (c.stage as 1 | 2 | 3) || 1
    if (selectedStage !== 'all' && courseStage !== selectedStage) return false
    return true
  })

  // تقسيم المتون حسب المراحل الثلاث بتوزيع منهجي متوازن
  const stage1Courses = filteredCourses.filter((c) => (c.stage || 1) === 1)
  const stage2Courses = filteredCourses.filter((c) => c.stage === 2)
  const stage3Courses = filteredCourses.filter((c) => c.stage === 3)

  return (
    <div className="space-y-12">
      {/* 1. الترويسة الرئيسية لخارطة الطريق بتصميم فاخر */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-linear-to-b from-[#fbf9f4] via-white to-[#fbf9f4] p-6 sm:p-10 shadow-sm backdrop-blur-md dark:border-stone-800 dark:from-[#1c1917] dark:via-stone-900 dark:to-[#1c1917]">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>خارطة المنهجية التأصيلية لطلب العلم</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white leading-snug">
              خارطة الطريق لضبط متون الشريعة
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
              خارطة بصرية ترتب لك المتون من المبادئ إلى المقاصد، وتختصر عليك سنوات التشتت؛ تدرج من التأسيس إلى البناء حتى الرسوخ، مع كبار العلماء والمحققين.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSmartExplorerOpen(!isSmartExplorerOpen)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-stone-800 border border-amber-300/80 dark:border-amber-700/80 px-4 py-2 text-xs font-bold text-amber-950 dark:text-amber-300 shadow-2xs hover:bg-amber-50 dark:hover:bg-amber-950/60 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>المستكشف التأصيلي الذكي: في أي مرحلة يقع متني؟</span>
                <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400 mr-1">
                  {isSmartExplorerOpen ? '▲ إغلاق' : '▼ فحص سريع'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsStationsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-2xs transition cursor-pointer"
              >
                <Trophy className="h-4 w-4" />
                <span>خزانة المحطات الأربع والشارات والشهادات</span>
              </button>
            </div>
          </div>

          {/* لوحة إحصاءات الإنجاز في الخارطة */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center min-w-28 shadow-2xs dark:border-stone-800 dark:bg-stone-800/90">
              <span className="block text-2xl font-black text-emerald-900 dark:text-emerald-400">
                {courses.length}
              </span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">متناً في الخارطة</span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center min-w-28 shadow-2xs dark:border-stone-800 dark:bg-stone-800/90">
              <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">
                {completedCount}
              </span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">متناً أنجزته ({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* شريط الإنجاز الكلي */}
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
            <span>نسبة تقدمك الإجمالية في خارطة الطريق:</span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-700 via-teal-600 to-amber-500 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* نافذة / بطاقة المستكشف التأصيلي الذكي السريع للطلاب */}
      {isSmartExplorerOpen && (
        <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-6 shadow-md dark:border-amber-800 dark:bg-stone-900 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  المستكشف الذكي لمراتب المتون في المراحل الثلاث
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  اكتب اسم أي متن شرعي لتعرف فوراً هل يناسب المرحلة الأولى (تأسيس) أم الثانية (بناء) أم الثالثة (تمكن)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSmartExplorerOpen(false)}
              className="self-end sm:self-auto rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={smartExplorerQuery}
              onChange={(e) => setSmartExplorerQuery(e.target.value)}
              placeholder="اكتب اسم المتن (مثال: زاد المستقنع، سلم المنورق، الآجرومية، جمع الجوامع، التدمرية...)"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 pr-10 text-xs font-bold text-stone-900 focus:border-amber-600 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
          </div>

          {/* اقتراحات سريعة */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-stone-400">أمثلة:</span>
            {['الآجرومية', 'زاد المستقنع', 'جمع الجوامع', 'المنظومة البيقونية', 'نخبة الفكر', 'ألفية ابن مالك', 'مراقي السعود', 'المغني'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setSmartExplorerQuery(ex)}
                className="rounded-lg bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition cursor-pointer font-medium"
              >
                {ex}
              </button>
            ))}
          </div>

          {smartExplorerQuery.trim().length > 1 && (() => {
            const analysis = analyzeMatnStage({ title: smartExplorerQuery })
            const matchingCourse = courses.find((c) => {
              const q = smartExplorerQuery.toLowerCase().trim()
              return c.title.toLowerCase().includes(q) || (analysis.canonicalTitle && c.title.toLowerCase().includes(analysis.canonicalTitle.toLowerCase()))
            })

            return (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                  analysis.stage === 1
                    ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/40'
                    : analysis.stage === 2
                    ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/40'
                    : 'border-purple-300 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-950/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-stone-200/60 dark:border-stone-700/60">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900 dark:text-white">
                      «{analysis.canonicalTitle || smartExplorerQuery}»
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      ({analysis.categoryTitle})
                    </span>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl text-white shadow-2xs ${
                      analysis.stage === 1
                        ? 'bg-emerald-800'
                        : analysis.stage === 2
                        ? 'bg-amber-700'
                        : 'bg-purple-800'
                    }`}
                  >
                    {analysis.stageName}
                  </span>
                </div>

                <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                  {analysis.rationale}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/50 dark:border-stone-700/50 text-[11px]">
                  <span className="text-stone-500 dark:text-stone-400">
                    الفئة المستهدفة: <strong>{analysis.targetAudience}</strong>
                  </span>

                  {matchingCourse ? (
                    <Link
                      href={`/courses/${matchingCourse.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 text-white px-3.5 py-1.5 font-bold hover:bg-emerald-950 transition shadow-2xs dark:bg-emerald-800"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                      <span>متن متاح بالمنصة: ابدأ دراسته الآن ↗</span>
                    </Link>
                  ) : (
                    <span className="text-stone-500 text-[11px]">
                      يمكن لإدارة المنصة إضافة هذا المتن وتدريسه في المرحلة {analysis.stage}
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 2. مفتاح الخارطة وأزرار التصفية والتنقل السريع بتصميم متجاوب ومنظم */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-5 sm:p-7 shadow-xs backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 space-y-6">
        {/* صف تصفية الفنون الشرعية */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
            <div className="flex items-center gap-2 text-stone-900 dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                <Filter className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black">
                تصفية حسب الفن الشرعي ({availableCategories.length} فنون):
              </span>
            </div>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إلغاء تصفية الفن ✕</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-900 text-white shadow-sm shadow-emerald-950/20 dark:bg-emerald-800 ring-2 ring-emerald-600/30 font-black'
                  : 'border border-stone-200/90 bg-stone-50/80 text-stone-700 hover:border-emerald-600 hover:text-emerald-900 hover:bg-white dark:border-stone-700/80 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:border-emerald-700 dark:hover:bg-stone-800'
              }`}
            >
              <span>جميع الفنون</span>
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-mono ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                {courses.length}
              </span>
            </button>

            {availableCategories.map(({ slug, title }) => {
              const count = courses.filter((c) => c.categorySlug === slug || c.category === title).length
              const isSelected = selectedCategory === slug
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setSelectedCategory(slug)}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-900 text-white shadow-sm shadow-emerald-950/20 dark:bg-emerald-800 ring-2 ring-emerald-600/30 font-black'
                      : 'border border-stone-200/90 bg-stone-50/80 text-stone-700 hover:border-emerald-600 hover:text-emerald-900 hover:bg-white dark:border-stone-700/80 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:border-emerald-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-stone-400/60 dark:bg-stone-500'}`} />
                  <span>{title}</span>
                  <span
                    className={`rounded-lg px-1.5 py-0.5 text-[10px] font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* صف تصفية المراحل الثلاث */}
        <div className="space-y-3 pt-4 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2 text-stone-900 dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black">
                تصفية حسب المرحلة التأصيلية:
              </span>
            </div>

            {selectedStage !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedStage('all')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إلغاء تصفية المرحلة ✕</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedStage('all')}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                selectedStage === 'all'
                  ? 'bg-stone-900 text-white shadow-sm dark:bg-stone-100 dark:text-stone-900 font-black'
                  : 'border border-stone-200/90 bg-stone-50/80 text-stone-700 hover:bg-white dark:border-stone-700/80 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              كافة المراحل (1، 2، 3)
            </button>

            {STAGES_INFO.map((st) => {
              const stageCoursesCount = courses.filter((c) => {
                if (selectedCategory !== 'all') {
                  const matchesCat =
                    c.categorySlug === selectedCategory ||
                    c.category === availableCategories.find((ac) => ac.slug === selectedCategory)?.title
                  if (!matchesCat) return false
                }
                return (c.stage || 1) === st.stage
              }).length

              const isSelected = selectedStage === st.stage

              return (
                <button
                  key={st.stage}
                  type="button"
                  onClick={() => setSelectedStage(st.stage)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${st.badgeColor} ring-2 ring-emerald-600/30 shadow-xs font-black`
                      : 'border-stone-200/90 bg-stone-50/80 text-stone-700 hover:bg-white dark:border-stone-700/80 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${st.dotColor}`} />
                  <span>
                    المرحلة {st.stage}: {st.stage === 1 ? 'تأسيس' : st.stage === 2 ? 'بناء' : 'تمكن'}
                  </span>
                  <span className="rounded-lg bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono opacity-80">
                    {stageCoursesCount}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* 3. المراحل الثلاث المتتابعة (Flow Stages) */}
      <div className="space-y-12">
        {[
          { info: STAGES_INFO[0], stageCourses: stage1Courses },
          { info: STAGES_INFO[1], stageCourses: stage2Courses },
          { info: STAGES_INFO[2], stageCourses: stage3Courses },
        ]
          .filter(({ stageCourses }) => stageCourses.length > 0)
          .map(({ info, stageCourses }, stageIndex) => (
            <div key={info.stage} className="relative space-y-6">
              {/* ترويسة المرحلة */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-200/80 pb-4 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${info.badgeColor} font-black text-base shadow-xs`}>
                    0{info.stage}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                      {info.title}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {info.desc} • ({stageCourses.length} متناً)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold ${info.badgeColor} border`}>
                    <span className={`h-2 w-2 rounded-full ${info.dotColor}`} />
                    <span>المرحلة {info.stage}</span>
                  </span>
                </div>
              </div>

              {/* شبكة بطاقات المتون التابعة للمرحلة مع ترقيم تدفقي متصل */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stageCourses.map((course, idx) => {
                  const isDone = completedSet.has(course.slug)
                  const baseOffset = info.stage === 1 ? 0 : info.stage === 2 ? stage1Courses.length : (stage1Courses.length + stage2Courses.length)
                  const nodeNumber = baseOffset + idx + 1
                  const progression = resolveCourseProgression(course, courses)

                  return (
                    <Link
                      key={course.slug}
                      href={`/courses/${course.slug}`}
                      className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
                        isDone
                          ? 'border-emerald-500/50 bg-emerald-50/40 dark:border-emerald-800/80 dark:bg-emerald-950/20'
                          : 'border-stone-200/90 bg-white hover:border-emerald-700/60 dark:border-stone-800 dark:bg-stone-900/90 dark:hover:border-emerald-600/60'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* الشارة والترقيم */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-black text-stone-400 dark:text-stone-500">
                            #{String(nodeNumber).padStart(2, '0')}
                          </span>

                          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300 truncate max-w-[140px]">
                            {course.category}
                          </span>

                          {isDone ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>تم الضبط ✓</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                              <Circle className="h-2.5 w-2.5 text-stone-400" />
                              <span>متاح للمدارسة</span>
                            </span>
                          )}
                        </div>

                        {/* عنوان المتن */}
                        <div>
                          <h3 className="text-sm font-black text-stone-900 group-hover:text-emerald-900 transition dark:text-white dark:group-hover:text-emerald-400 leading-snug">
                            «{course.title}»
                          </h3>
                        </div>

                        {/* إشارة المتطلب السابق والتدرج المنهجي */}
                        {progression.prerequisites && progression.prerequisites.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px]">
                            <span className="text-stone-400 font-bold shrink-0">المتطلب:</span>
                            {progression.prerequisites.map((p, pIdx) => {
                              const isPComplete = p.slug && completedSet.has(p.slug)
                              return (
                                <span
                                  key={pIdx}
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold border ${
                                    isPComplete
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  }`}
                                  title={isPComplete ? 'تم ضبط هذا المتطلب مسبقاً' : 'يُنصح بإتقان هذا المتطلب أولاً'}
                                >
                                  <span>«{p.title}»</span>
                                  <span>{isPComplete ? '✓' : '⚠️'}</span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (course.stage || 1) === 1 ? (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/60 dark:text-emerald-300">
                              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                              <span>متن مدخلي (نقطة انطلاق)</span>
                            </span>
                          </div>
                        ) : null}

                        {/* المؤلف والشارح */}
                        <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-300">
                          {course.author && (
                            <div className="flex items-center gap-1 font-medium">
                              <span className="text-stone-400 dark:text-stone-500">المؤلف:</span>
                              <span className="font-bold text-stone-800 dark:text-stone-200">{course.author}</span>
                            </div>
                          )}
                          {course.instructor && (
                            <div className="flex items-center gap-1 font-medium">
                              <span className="text-stone-400 dark:text-stone-500">الشارح:</span>
                              <span className="font-bold text-emerald-800 dark:text-emerald-400">{course.instructor}</span>
                            </div>
                          )}
                        </div>

                        {/* الوصف الموجز */}
                        {course.description && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      {/* زر الانتقال للمدارسة في الأسفل */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition dark:border-stone-800/80 dark:text-emerald-400">
                        <span>دخول مجلس المدارسة</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

        {filteredCourses.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-12 text-center space-y-3 bg-stone-50/50 dark:bg-stone-900/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 mx-auto dark:bg-amber-950 dark:text-amber-300">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-stone-900 dark:text-white">
              لا توجد متون تطابق خيارات التصفية المحددة
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              لم نعثر على متون في هذا الفن ضمن المرحلة المحددة. جرب اختيار مرحلة أخرى أو إعادة ضبط الفلاتر.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedStage('all')
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 transition cursor-pointer dark:bg-emerald-800"
            >
              <span>عرض كافة متون الخارطة ({courses.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* نافذة المحطات الأربع والشارات والشهادات */}
      <ScholarlyStationsModal
        isOpen={isStationsModalOpen}
        onClose={() => setIsStationsModalOpen(false)}
        completedCourses={courses.filter((c) => completedSet.has(c.slug))}
        totalCoursesCount={courses.length}
      />
    </div>
  )
}
