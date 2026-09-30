import Link from 'next/link'
import {  User, ArrowLeft } from 'lucide-react'
import { Course } from '@/types/database'

interface CourseCardProps {
  course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
  const levelLabels = {
    beginner: { text: 'مدخل • للمبتدئين', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 ring-1 ring-emerald-900/5' },
    intermediate: { text: 'تأصيل • للمتوسطين', color: 'bg-amber-50 text-amber-900 border-amber-200/80 ring-1 ring-amber-900/5' },
    advanced: { text: 'تحقيق • للمتقدمين', color: 'bg-stone-100 text-stone-800 border-stone-300 ring-1 ring-stone-900/5' },
  }

  const levelInfo = levelLabels[course.level] || levelLabels.beginner

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-7 shadow-xs backdrop-blur-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-700/40 hover:shadow-xl hover:shadow-emerald-950/5">
      {/* شريط تذهيب علوي رفيع يشبه غلاف المخطوطات القديمة */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-900" />

      <div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {course.category && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-850">
              <span className="h-2 w-2 rounded-full bg-emerald-700 shadow-xs" />
              {course.category.title}
            </span>
          )}
          <span className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${levelInfo.color}`}>
            {levelInfo.text}
          </span>
        </div>

        <h3 className="mt-5 text-xl font-black leading-snug text-stone-900 group-hover:text-emerald-900 transition">
          <Link href={`/courses/${course.slug}`}>
            {course.title}
          </Link>
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-stone-600 line-clamp-2">
          {course.description || 'شرح تأصيلي ميسر لضبط مسائل هذا المتن مع بيان مقاصده وتفريعاته.'}
        </p>
      </div>

      <div className="mt-7 border-t border-amber-900/10 pt-5">
        {course.instructor && (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100/70 text-amber-900 text-xs font-bold ring-1 ring-amber-300/40">
              <User className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-stone-400 block font-medium">الشارح والمُقرر</span>
              <span className="font-bold text-stone-850">{course.instructor.name}</span>
            </div>
          </div>
        )}

        <Link
          href={`/courses/${course.slug}`}
          className="flex items-center justify-between rounded-2xl bg-stone-100/80 px-4 py-3 text-sm font-bold text-emerald-900 transition group-hover:bg-emerald-900 group-hover:text-amber-200 shadow-2xs"
        >
          <span>تصفح المتن والدروس</span>
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1.5" />
        </Link>
      </div>
    </div>
  )
}