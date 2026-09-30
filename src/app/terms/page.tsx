import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ShieldCheck, Scale, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'شروط الاستخدام || منصة سَنَد',
  description: 'ميثاق وضوابط استخدام منصة سَنَد للتعليم والتأصيل المنهجي لطلب العلم الشرعي.',
}

export default function TermsPage() {
  const lastUpdated = 'سبتمبر 2026'

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 space-y-10">
        
        {/* الترويسة */}
        <div className="space-y-3 border-b border-stone-200 pb-6 dark:border-stone-800">
          <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
            <Scale className="h-4 w-4 text-amber-600" />
            <span>ميثاق وضوابط الاستخدام الشرعي والنظامي</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-amiri text-stone-900 dark:text-white">
            شروط وأحكام استخدام منصة «سَنَد»
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            تاريخ السريان: {lastUpdated} • وثيقة ملزمة لكافة زوار وطلاب المنصة
          </p>
        </div>

        {/* الميثاق العلمي والأخلاقي */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-3">
          <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <span>ميثاق طالب العلم والأمانة المنهجية</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            إن الغاية من منصة «سَنَد» هي تيسير مدارسة العلم الشرعي المؤصل تقرباً إلى الله تعالى. يُعد استخدامك للمنصة إقراراً وموافقة تامة على التحلي بآداب طلب العلم، والالتزام بالضوابط المنهجية والأخلاقية المبينة في هذه الوثيقة.
          </p>
        </div>

        {/* بنود الشروط */}
        <div className="space-y-8 text-stone-700 dark:text-stone-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. حساب الطالب والمسؤولية */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">١</span>
              <span>حساب الطالب وسلامة الاستخدام</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pr-2 text-stone-600 dark:text-stone-300">
              <li>يلتزم الطالب بالحفاظ على سرية وسيلة دخوله (سواء كلمة المرور أو كود الـ OTP المرسل لبريده أو هاتفه).</li>
              <li>يُحظر استخدام المنصة لأي غرض يخالف المقاصد الشرعية أو الأنظمة المعمول بها.</li>
              <li>يُمنع استخدام أي أدوات برمجية مؤتمتة (Bots/Scrapers) لتعطيل الخوادم أو سحب المحتوى بشكل مكثف يضر بتصفح باقي الطلاب.</li>
            </ul>
          </section>

          {/* 2. آداب مجلس المذاكرة العام */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٢</span>
              <span>ضوابط النشر في مجالس المذاكرة والمدارسة</span>
            </h3>
            <p>مجلس المذاكرة العام بيئة علمية نقية مخصصة لتبادل الفوائد واستشكال المسائل، وعليه يلتزم كل طالب بما يلي:</p>
            <ul className="list-disc list-inside space-y-1.5 pr-2 text-stone-600 dark:text-stone-300">
              <li>التحلي بأدب الخلاف وتوقير العلماء وأئمة المذاهب وحملة الشريعة.</li>
              <li>اجتناب الممارية والجدل العقيم والخصومات الحزبية أو السياسية التي تشوش على صفاء الطلب.</li>
              <li>يحق لإشراف المنصة حذف أي مشاركة تخالف الآداب العامة، أو تعليق حساب العضو المخالف بعد إنذاره.</li>
            </ul>
          </section>

          {/* 3. الملكية الفكرية وحقوق المواد */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٣</span>
              <span>الملكية الفكرية والحقوق العلمية</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pr-2 text-stone-600 dark:text-stone-300">
              <li>المتون الشرعية التراثية ملك للأمة الإسلامية جمعاء ولا يُدعى فيها حجر.</li>
              <li>الشروح الصوتية والمرئية منسوبة لأصحابها من أصحاب الفضيلة العلماء والمشايخ وتُعرض بقصد الإفادة ونشر العلم.</li>
              <li>التصميم البرمجي والهوية البصرية وواجهات منصة «سَنَد» ومحرك تتبع الطالب الذكي مسجلة ومطورة بواسطة المهندس بهاء طارق وتخضع لحقوق الملكية الفكرية البرمجية.</li>
            </ul>
          </section>

          {/* 4. إخلاء المسؤولية العلمية والفقهية */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٤</span>
              <span>إخلاء المسؤولية عن الفتاوى الخاصة</span>
            </h3>
            <p className="rounded-xl bg-stone-100/80 p-4 text-stone-700 dark:bg-stone-850 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              منصة «سَنَد» هي منصة تعليمية تأصيلية لمدارسة المتون والكتب، وليست داراً للفتوى في النوازل الفردية أو القضايا الحياتية الخاصة. يجب على المستفتين الرجوع إلى دور الإفتاء والعلماء المعتمدين في بلدانهم في المسائل الواقعية.
            </p>
          </section>

          {/* 5. التعديل على الشروط */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٥</span>
              <span>تحديث البنود والشروط</span>
            </h3>
            <p>
              تحتفظ إدارة المنصة بالحق في تحديث هذه الشروط بما يخدم المصلحة العلمية، وسيتم إخطار الطلاب المسجلين بأي تعديلات جوهرية عبر صندوق رسائل سَنَد الداخلي.
            </p>
          </section>

        </div>

        {/* تذييل */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <Link
            href="/privacy"
            className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 underline"
          >
            الانتقال إلى سياسة الخصوصية ←
          </Link>
        </div>

      </div>
    </div>
  )
}
