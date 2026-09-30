import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  Compass,
  Award,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  ScrollText,
  HeartHandshake,
  Feather,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'عن منصة سَنَد || الرؤية والمنهج ورسالة التأصيل',
  description: 'تعرّف على منصة سَنَد، بيئة علمية رصينة صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
  alternates: {
    canonical: 'https://sanad.vercel.app/about',
  },
  openGraph: {
    title: 'عن منصة سَنَد || الرؤية والمنهج ورسالة التأصيل',
    description: 'تعرّف على منصة سَنَد، بيئة علمية رصينة صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية بلا مشتتات.',
    url: 'https://sanad.vercel.app/about',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'عن منصة سَنَد' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'عن منصة سَنَد || الرؤية والمنهج ورسالة التأصيل',
    description: 'تعرّف على منصة سَنَد، بيئة علمية رصينة صُممت لتيسير مدارسة المتون وضبط مسالك العلوم الشرعية.',
    images: ['/og-default.png'],
  },
}

export default function AboutPage() {
  const pillars = [
    {
      icon: ScrollText,
      title: 'التأصيل بالمتون المحققة',
      description: 'اعتماد المتون الجامعة التي استقر عليها أئمة الفنون، مع تحقيق نصوصها وتيسير شروحها المعتمدة.',
    },
    {
      icon: Compass,
      title: 'التدرج المنهجي الصارم',
      description: 'الانتقال بالطالب من المبادئ إلى المتوسطات ثم المطولات، منعاً للتشتت والقفز فوق المراحل.',
    },
    {
      icon: Feather,
      title: 'تقييد الفوائد والشوارد',
      description: 'توفير كشكول إلكتروني متكامل لكل متن ومجلس، لترسيخ العلم عملاً بوصية السلف: قيدوا العلم بالكتاب.',
    },
    {
      icon: Users,
      title: 'المذاكرة الحية الهادئة',
      description: 'أروقة تفاعلية تجمع طلبة العلم لمدارسة الإشكالات وتبادل الإيضاحات بعيداً عن صخب الشبكات الاجتماعية.',
    },
  ]

  const stages = [
    {
      level: 'المرحلة الأولى',
      title: 'المدخل والتمهيد',
      desc: 'ضبط التصور الإجمالي للعلوم، وفهم مصطلحات أهل الفن، وبناء الملكة الأولية بحفظ وضبط صغار المتون.',
    },
    {
      level: 'المرحلة الثانية',
      title: 'البناء والتأصيل',
      desc: 'دراسة المتون المعتمدة في المذاهب وفنون الآلة، وحل ألفاظها، وتصوير مسائلها بدقة مع مشايخ الفن.',
    },
    {
      level: 'المرحلة الثالثة',
      title: 'التحصيل والترسيخ',
      desc: 'التوسع في الدلائل والعلل الفقهية، ودراسة الخلاف العالي الموجه، واستيعاب تفريعات المسائل وأصولها.',
    },
    {
      level: 'المرحلة الرابعة',
      title: 'التحقيق والتمكن',
      desc: 'مدارسة أمهات الكتب والمطولات، وبناء القدرة على الاستنباط، والترجيح المنهجي بأدوات العلم الرصينة.',
    },
  ]

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* الترويسة الرئيسية */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200/80 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>رسالة ورؤية منصة «سَنَد»</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-amiri text-stone-900 dark:text-white leading-tight">
            بيئة علمية رصينة.. تجمع بين أصالة التلقي وعصرنة الأدوات
          </h1>

          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
            أُسست منصة «سَنَد» لتكون رفيقاً ومُعيناً لطالب العلم الشرعي في العالم الإسلامي، لتبديد حيرة البدايات ووضع السالكين على جادة التأصيل المنهجي الرصين بلا مشتتات رقمية.
          </p>
        </div>

        {/* بطاقة الشعار والبيان المنهجي */}
        <div className="mt-12 rounded-3xl border border-stone-200 bg-white/90 p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/90 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-800 via-amber-500 to-emerald-950" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4">
              <h2 className="text-2xl font-bold font-amiri text-emerald-950 dark:text-emerald-400">
                لماذا «سَنَد»؟
              </h2>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-loose">
                كثرت في هذا العصر مصادر المعرفة وتفرقت، وابتُلي طالب العلم بتشتت المواد، وضياع المقاييد، وانقطاع الاستمرار. من هنا انطلقت فكرة «سَنَد» لتجمع متون العلم التأصيلية في الفنون التسعة الكبرى (القرآن وتفسيره، الحديث، العقيدة، الفقه، أصول الفقه، القواعد، السيرة، اللغة وآلاتها، الآداب والسلوك)، مقرونة بشروح المحققين وقوارئ الكتب وكشاكيل التقييد ونوافذ المدارسة.
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-center">
              <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-emerald-800 to-emerald-950 text-amber-300 flex items-center justify-center shadow-md mb-3">
                <BookOpen className="h-7 w-7" />
              </div>
              <span className="font-amiri text-2xl font-bold text-stone-900 dark:text-white">من طلب العلم جُملة</span>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">ذهب عنه جُملة</span>
              <p className="text-[11px] text-stone-500 mt-2">«والتأصيل بالتدرج هو معقد الإتقان»</p>
            </div>
          </div>
        </div>

        {/* ركائز المنصة الأربع */}
        <div className="mt-14 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-amiri text-stone-900 dark:text-white">
              ركائز التعليم في سَنَد
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              أربعة أعمدة يقوم عليها صرح المدارسة داخل المنصة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pillars.map((p, idx) => {
              const Icon = p.icon
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 hover:border-emerald-500/80 transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 mb-3 group-hover:scale-105 transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold font-amiri text-stone-900 dark:text-white mb-1.5">
                    {p.title}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* مسالك التدرج والمراحل */}
        <div className="mt-16 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-amiri text-stone-900 dark:text-white">
              خارطة المراحل الأربع
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              منهجية مستقاة من تراث أئمة الإسلام في توريث العلم طبقة بعد طبقة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((st, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5 dark:border-stone-800 dark:bg-stone-900/60 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 bg-amber-100/80 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md">
                    {st.level}
                  </span>
                  <span className="font-mono text-xs text-stone-400">0{i + 1}</span>
                </div>
                <h5 className="font-amiri text-lg font-bold text-stone-900 dark:text-white">
                  {st.title}
                </h5>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* الإشراف والتطوير */}
        <div className="mt-16 rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-8 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center mx-auto shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold font-amiri text-emerald-950 dark:text-emerald-200">
            تطوير وهندسة برمجية خالصة لخدمة العلم وأهله
          </h3>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
            تم تصميم وبرمجة منصة «سَنَد» بمعايير تقنية رائدة تجمع بين خفة الأداء وأعلى مستويات الحماية، بإشراف وهندسة البشمهندس <strong className="font-bold text-emerald-950 dark:text-white">بهاء طارق</strong>، لتكون وقفاً تعليمياً معرفياً ينتفع به الباحثون والطلاب في كل مكان.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-950 transition shadow-sm"
            >
              <Compass className="h-4 w-4" />
              <span>تصفح مكتبة المتون</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-50 transition dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300"
            >
              <HeartHandshake className="h-4 w-4" />
              <span>تواصل مع الإدارة</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
