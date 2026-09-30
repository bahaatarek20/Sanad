'use client'

import { Sparkles, Lock } from 'lucide-react'

interface Milestone {
  level: string
  title: string
  book: string
  desc: string
  status: 'completed' | 'current' | 'upcoming'
}

const milestones: Milestone[] = [
  {
    level: 'المرحلة الأولى',
    title: 'تأسيس العقيدة الصحيحة',
    book: 'الأصول الثلاثة وأدلتها',
    desc: 'معرفة العبد ربه، ودينه، ونبيه محمد ﷺ بالبراهين والأدلة الواضحة.',
    status: 'current',
  },
  {
    level: 'المرحلة الثانية',
    title: 'حماية جناب التوحيد',
    book: 'كتاب التوحيد للإمام المجدد',
    desc: 'ضبط مسائل التوحيد العملي، وفهم حقيقة الشرك الأصغر والأكبر ونواقض الإسلام.',
    status: 'upcoming',
  },
  {
    level: 'المرحلة الثالثة',
    title: 'ضبط العبادات والمعاملات',
    book: 'عمدة الأحكام في أحاديث سيد الأنام',
    desc: 'بناء الملكة الفقهية والحديثية من خلال دراسة نصوص الصحيحين المتفق عليها.',
    status: 'upcoming',
  },
  {
    level: 'المرحلة الرابعة',
    title: 'تأصيل قواعد الحديث ومصطلحه',
    book: 'المنظومة البيقونية وشروحها',
    desc: 'فهم معايير قبول الرواية، ورتب الأحاديث، وقوانين أئمة الجرح والتعديل.',
    status: 'upcoming',
  },
]

export default function Roadmap3D() {
  return (
    <div className="relative py-12">
      {/* هالة إضاءة خلفية دافئة */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {milestones.map((m, idx) => {
          const isCurrent = m.status === 'current'
          return (
            <div key={idx} className="relative">
              {/* الخط الرابط بين المحطات */}
              {idx < milestones.length - 1 && (
                <div className="absolute top-16 right-9 w-0.5 h-24 bg-linear-to-b from-amber-400 via-emerald-800/40 to-stone-300 hidden sm:block" />
              )}

              <div
                className={`card-3d relative flex flex-col sm:flex-row items-start gap-6 rounded-3xl p-6 sm:p-8 backdrop-blur-md border ${
                  isCurrent
                    ? 'bg-white/95 border-amber-500/50 ring-2 ring-amber-400/30'
                    : 'bg-white/70 border-stone-200/90 opacity-90'
                }`}
              >
                {/* أيقونة المحطة المجسمة */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg ring-4 ${
                    isCurrent
                      ? 'bg-linear-to-br from-emerald-850 via-emerald-800 to-teal-950 text-amber-300 ring-amber-300/40 shadow-emerald-950/20'
                      : 'bg-stone-100 text-stone-400 ring-stone-200'
                  }`}
                >
                  {isCurrent ? (
                    <Sparkles className="h-8 w-8 animate-pulse" />
                  ) : (
                    <Lock className="h-7 w-7 text-stone-400" />
                  )}
                </div>

                {/* تفاصيل المحطة العلمية */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black border ${
                        isCurrent
                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {m.level}
                    </span>

                    {isCurrent && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                        محطتك الحالية المقترحة
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-stone-900">{m.book}</h3>
                  <p className="text-sm font-semibold text-emerald-900">{m.title}</p>
                  <p className="text-xs leading-relaxed text-stone-600 pt-1">{m.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}