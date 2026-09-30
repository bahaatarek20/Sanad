'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, Play, ArrowLeft, BookOpen, Layers } from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'

interface CoursesExplorerProps {
  courses: MatnCourse[]
  categories: { slug: string; title: string }[]
}

export default function CoursesExplorer({ courses, categories }: CoursesExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = selectedCategory === 'all' || c.categorySlug === selectedCategory
      const q = searchQuery.trim().toLowerCase()
      const matchSearch =
        q === '' ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.instructor && c.instructor.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [courses, searchQuery, selectedCategory])

  return (
    <div className="space-y-6">
      {/* شريط البحث وفلاتر الفنون المتجاوبة للهواتف والتابلت واللابتوب */}
      <div className="space-y-4 rounded-3xl border border-stone-200/90 bg-white/95 p-4 sm:p-6 shadow-xs backdrop-blur-md">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في المتون والعلوم (مثال: الأصول الثلاثة، البيقونية، النحو)..."
            className="w-full rounded-2xl border border-stone-200 bg-[#fbf9f4] py-3 pr-11 pl-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-850 focus:bg-white focus:outline-none"
          />
          <Search className="absolute right-4 top-3.5 h-4 w-4 text-stone-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3.5 rounded-full p-0.5 text-stone-400 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* أزرار الفنون (تمرير أفقي سلس على الهواتف والأجهزة اللوحية) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'border border-stone-200 bg-[#fbf9f4] text-stone-600 hover:bg-stone-100'
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
                onClick={() => setSelectedCategory(cat.slug)}
                className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'border border-stone-200 bg-[#fbf9f4] text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>{cat.title}</span>
                <span className="font-mono text-[10px] opacity-75" dir="ltr">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* شبكة الكروت المتجاوبة */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <div
              key={course.slug}
              className="group flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md hover:border-emerald-800/40"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-xl border border-amber-200/90 bg-amber-50/70 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                    {course.category}
                  </span>
                  {course.instructor && (
                    <span className="text-[11px] font-bold text-stone-500">
                      {course.instructor}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-emerald-900 transition line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-xs leading-relaxed text-stone-500 line-clamp-2">
                  {course.description}
                </p>
              </div>

              <div className="mt-5 border-t border-stone-100 pt-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400">
                  <Play className="h-3 w-3 fill-stone-400 text-stone-400" />
                  <span>{course.isPlaylist ? 'سلسلة مجالس' : 'مجلس مرئي'}</span>
                </span>

                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-950 transition cursor-pointer"
                >
                  <span>دخول المجلس</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-stone-300" />
          <h3 className="mt-4 text-base font-bold text-stone-800">لم يُعثر على متن يطابق بحثك</h3>
          <p className="mt-1 text-xs text-stone-500">
            جرب البحث بكلمة أخرى أو اختر كافة العلوم.
          </p>
        </div>
      )}
    </div>
  )
}