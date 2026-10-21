import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Mail,
  Phone,
  MessageSquare,
  Globe,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  HelpCircle,
} from 'lucide-react'
import SupportPlatformCard from '@/components/support-platform-card'

export const metadata: Metadata = {
  title: 'تواصل معنا || منصة سَنَد',
  description: 'قنوات التواصل الرسمية مع إدارة منصة سَنَد والمطور المشرف على المنظومة.',
  alternates: {
    canonical: 'https://sanad-edu1.vercel.app/contact',
  },
  openGraph: {
    title: 'تواصل معنا || منصة سَنَد',
    description: 'قنوات التواصل الرسمية مع إدارة منصة سَنَد والمطور المشرف على المنظومة.',
    url: 'https://sanad-edu1.vercel.app/contact',
    siteName: 'منصة سَنَد',
    locale: 'ar_SA',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'تواصل مع منصة سَنَد' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'تواصل معنا || منصة سَنَد',
    description: 'قنوات التواصل الرسمية مع إدارة منصة سَنَد والمطور المشرف على المنظومة.',
    images: ['/og-default.png'],
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
        
        {/* الترويسة */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200/80 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
            <MessageSquare className="h-4 w-4 text-emerald-700" />
            <span>مكتب التواصل والدعم الفني والمنهجي</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-amiri text-stone-900 dark:text-white leading-tight">
            نسعد بتواصلكم ومقترحاتكم
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            باب التواصل مفتوح دائماً لطلبة العلم، المشايخ، والمبرمجين المهتمين بتطوير المنصة والمساهمة في خدمتها.
          </p>
        </div>

        {/* بطاقات قنوات التواصل المباشرة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. واتساب المطور الرسمي */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                <svg className="h-6 w-6 fill-current text-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.554zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <h3 className="font-amiri text-lg font-bold text-stone-900 dark:text-white">
                واتساب المطور المباشر
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                للاستفسارات العاجلة، المقترحات المنهجية، أو الإبلاغ عن أي خلل برمجي في المنصة.
              </p>
            </div>
            <a
              href="https://wa.me/201012728516"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-950 transition shadow-2xs"
            >
              <span>محادثة واتساب: 01012728516</span>
            </a>
          </div>

          {/* 2. البريد الإلكتروني الرسمي */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-800 dark:text-sky-300">
                <Mail className="h-6 w-6 text-sky-700" />
              </div>
              <h3 className="font-amiri text-lg font-bold text-stone-900 dark:text-white">
                البريد الإلكتروني للإدارة
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                للمراسلات الرسمية والشراكات العلمية وطلبات إضافة المتون والشروح المعتمدة.
              </p>
            </div>
            <a
              href="mailto:bhaaljml480@gmail.com"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/80 bg-sky-50/70 px-4 py-2.5 text-xs font-bold text-sky-900 hover:bg-sky-100 transition dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>bhaaljml480@gmail.com</span>
            </a>
          </div>

          {/* 3. معرض الأعمال والشبكات المهنية */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300">
                <Globe className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-amiri text-lg font-bold text-stone-900 dark:text-white">
                معرض الأعمال والشبكات
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                الاطلاع على سابقة الأعمال والمشاريع البرمجية للبشمهندس بهاء طارق والتواصل المهني.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://bahaatarek20.github.io/Bahaa-Portfolio/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                <span>Portfolio</span>
              </a>
              <a
                href="https://www.linkedin.com/in/bahaa-tarek-5008b0340"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
              >
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

        </div>

        {/* بطاقة دعم المنصة والمساهمة الوقفية */}
        <SupportPlatformCard />

        {/* الأسئلة الشائعة السريعة */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900 space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-xl font-bold font-amiri text-stone-900 dark:text-white">
              الأسئلة الشائعة حول المنصة
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-stone-600 dark:text-stone-300">
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-1.5">
              <h4 className="font-bold text-stone-900 dark:text-white text-sm">هل المنصة مجانية لجميع الطلاب؟</h4>
              <p>نعم، منصة «سَنَد» متاحة ومجانية بالكامل لكافة طلاب العلم والباحثين ابتغاء وجه الله تعالى، ولا تفرض أي رسوم على المتون أو الكشاكيل.</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-1.5">
              <h4 className="font-bold text-stone-900 dark:text-white text-sm">كيف أقترح متناً أو شرحاً لإضافته؟</h4>
              <p>تواصل معنا عبر رسائل الواتساب أو البريد الإلكتروني مع ذكر اسم المتن والشارح والتحقيق المعتمد لدراسته وإضافته للمكتبة.</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-1.5">
              <h4 className="font-bold text-stone-900 dark:text-white text-sm">هل تحفظ المنصة تقييداتي وملاحظاتي بأمان؟</h4>
              <p>نعم، تُحفظ ملاحظاتك في «كشكول الطالب» فورياً وتزامَن مع حسابك لتتمكن من الرجوع إليها من أي جهاز في أي وقت.</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-1.5">
              <h4 className="font-bold text-stone-900 dark:text-white text-sm">كيف يمكنني المساهمة في تطوير المنصة؟</h4>
              <p>نرحب بأي مبرمج أو مصمم أو باحث شرعي يرغب في المشاركة في صيانة وتطوير المنظومة التقنية عبر التواصل المباشر مع المهندس المشرف.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
