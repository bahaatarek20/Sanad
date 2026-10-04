'use client'

import {
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Library,
  Award,
  HelpCircle,
  FileCheck,
} from 'lucide-react'
import { getVerifiedEdition } from '@/lib/course-sources-data'
import { MatnCourse } from '@/lib/curriculum-data'

interface VerifiedSourcesTabProps {
  course: MatnCourse
}

export default function VerifiedSourcesTab({ course }: VerifiedSourcesTabProps) {
  const editionInfo = getVerifiedEdition(course.slug)

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4 pr-1 text-xs">
      <div className="space-y-4">
        {/* الترويسة وشارة التوثيق */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
            <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>التوثيق العلمي وتخريج المصادر</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Award className="h-3 w-3" />
            <span>متن محقق ومعتمد</span>
          </span>
        </div>

        {/* بطاقة الطبعة المعتمدة والتحقيق */}
        <div className="rounded-2xl border border-stone-200/90 bg-stone-50/70 p-4 space-y-3 dark:border-stone-800 dark:bg-stone-800/50">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              النسخة والطبعة المعتمدة في المدارسة:
            </span>
            <h4 className="font-bold text-sm text-stone-900 dark:text-white font-amiri">
              {editionInfo?.matnName || course.title}
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-start justify-between gap-2">
              <span className="text-stone-500 dark:text-stone-400">المؤلف / الناظم:</span>
              <span className="font-bold text-stone-800 dark:text-stone-200 text-left">
                {editionInfo?.author || course.author || 'من أئمة السلف'}
              </span>
            </div>

            {editionInfo?.investigator && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500 dark:text-stone-400">التحقيق والضبط:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-400 text-left">
                  {editionInfo.investigator}
                </span>
              </div>
            )}

            {editionInfo?.publisher && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500 dark:text-stone-400">دار النشر:</span>
                <span className="font-medium text-stone-700 dark:text-stone-300 text-left">
                  {editionInfo.publisher}
                </span>
              </div>
            )}
          </div>

          {editionInfo?.verificationNotes && (
            <div className="rounded-xl bg-white p-3 border border-stone-200/80 text-[11px] text-stone-600 dark:bg-stone-900/80 dark:border-stone-700/80 dark:text-stone-300 leading-relaxed">
              <p>{editionInfo.verificationNotes}</p>
            </div>
          )}
        </div>

        {/* روابط المكتبات الرقمية المعتمدة */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 block">
            المراجع الرقمية المباشرة (التكامل الخارجي):
          </span>

          <div className="grid grid-cols-1 gap-2">
            {editionInfo?.shamelaUrl && (
              <a
                href={editionInfo.shamelaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 bg-white hover:border-emerald-600 hover:bg-emerald-50/30 transition group dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-emerald-950/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <Library className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
                      تصفح في المكتبة الشاملة
                    </span>
                    <span className="text-[10px] text-stone-400">
                      النص الكامل المرقوم للمتن مع شروحه
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-emerald-700" />
              </a>
            )}

            {editionInfo?.dorarUrl && (
              <a
                href={editionInfo.dorarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 bg-white hover:border-emerald-600 hover:bg-emerald-50/30 transition group dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-emerald-950/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
                      تخريج الموسوعة العقدية والفقهية (الدرر السنية)
                    </span>
                    <span className="text-[10px] text-stone-400">
                      تخريج الأحاديث وبيان درجة الصحة والضعف
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-emerald-700" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* معيار الأمانة العلمية في الأسفل */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-[10px] text-emerald-950 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300 space-y-1">
        <span className="font-bold flex items-center gap-1.5">
          <FileCheck className="h-3.5 w-3.5 text-emerald-700" />
          <span>ميثاق الأمانة العلمية في سَنَد:</span>
        </span>
        <p className="leading-relaxed">
          تعتمد المنصة المتون المحررة الخالية من الدخيل، وتراجع كل مادة وصوتية عبر لجنة المراجعة قبل تثبيتها لضمان صفاء منهل التلقي.
        </p>
      </div>
    </div>
  )
}
