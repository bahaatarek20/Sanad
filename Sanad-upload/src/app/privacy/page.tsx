import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, EyeOff, UserCheck, Bell, Database, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية || منصة سَنَد',
  description: 'سياسة الخصوصية وسرية بيانات الطلاب في منصة سَنَد للتعليم الشرعي والتأصيل المنهجي.',
}

export default function PrivacyPage() {
  const lastUpdated = 'سبتمبر 2026'

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 space-y-10">
        
        {/* الترويسة */}
        <div className="space-y-3 border-b border-stone-200 pb-6 dark:border-stone-800">
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>وثيقة الأمان والخصوصية المعتمدة</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-amiri text-stone-900 dark:text-white">
            سياسة الخصوصية وسرية البيانات
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            تاريخ آخر تحديث: {lastUpdated} • منصة سَنَد للتعليم والتأصيل المنهجي
          </p>
        </div>

        {/* المقدمة والالتزام الشرعي والأخلاقي */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-3">
          <h2 className="text-lg font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <span>التزامنا بحفظ الأمانة وسرية المعلومات</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            تلتزم إدارة منصة «سَنَد» بحماية خصوصية كافة المستخدمين والطلاب المسجلين. إن خصوصية بياناتكم الشخصية هي أمانة نراعي فيها الأحكام الشرعية والقوانين التقنية المنظمة لحماية البيانات. توضح هذه الوثيقة ماهية البيانات التي نجمعها، وسبب جمعها، وكيفية حمايتها.
          </p>
        </div>

        {/* بنود السياسة المفصلة */}
        <div className="space-y-8 text-stone-700 dark:text-stone-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. ما البيانات التي نجمعها؟ */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">١</span>
              <span>البيانات التي نجمعها من الطالب</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pr-2 text-stone-600 dark:text-stone-300">
              <li><strong>البيانات الشخصية الأساسية:</strong> الاسم، البريد الإلكتروني، أو رقم الهاتف عند التسجيل بالهاتف لغرض التحقق وإرسال كود الـ OTP.</li>
              <li><strong>بيانات التحصيل العلمي:</strong> سجل الدروس التي أتممتها، المقامات والرتب العلمية المكتسبة، وتقييداتك في كشكول الطالب.</li>
              <li><strong>البيانات التقنية:</strong> عنوان الـ IP ونوع المتصفح لغرض الحماية ضد محاولات الاختراق، وتأمين جلسات الطلاب فقط.</li>
            </ul>
          </section>

          {/* 2. كيف نستخدم بياناتك؟ */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٢</span>
              <span>أوجه استخدام البيانات</span>
            </h3>
            <p>نستخدم البيانات التي نجمعها حصراً في الأغراض التالية:</p>
            <ul className="list-disc list-inside space-y-1.5 pr-2 text-stone-600 dark:text-stone-300">
              <li>تأمين تسجيل الدخول وتوثيق هويتك عبر Google أو رسائل الهاتف SMS.</li>
              <li>حفظ تقدمك الدراسي ومزامنة إحصاءات مدارستك في لوحة تحكمك الخاصة.</li>
              <li>إرسال الإشعارات الأكاديمية والتنبيهات الإدارية المباشرة في صندوق بريد سَنَد الداخلي.</li>
              <li>تحسين جودة المنصة وقياس استقرار السيرفر وسرعة التصفح.</li>
            </ul>
          </section>

          {/* 3. عدم مشاركة البيانات أو بيعها */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٣</span>
              <span>حظر مشاركة أو بيع البيانات للغير</span>
            </h3>
            <p className="rounded-xl bg-amber-50/80 p-4 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/60 font-medium">
              نؤكد بشكل قاطع أن منصة «سَنَد» لا تقوم مطلقاً ببيع، أو تأجير، أو مشاركة أي بيانات شخصية، أو أرقام هواتف، أو سجلات مدارسة تخص طلابها لأي شركة إعلانية أو جهة تجارية خارجية.
            </p>
          </section>

          {/* 4. ملفات تعريف الارتباط (Cookies) */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٤</span>
              <span>ملفات تعريف الارتباط والجلسات (Cookies)</span>
            </h3>
            <p>
              تستخدم المنصة ملفات كوكيز آمنة ومشفرة (HTTP-Only Secure Cookies) تقتصر فقط على تذكر حالة تسجيل دخولك لتجنب مطالبتك بإعادة إدخال الرمز في كل زيارة، وتفضيلات المظهر (الوضع الليلي والنهاري).
            </p>
          </section>

          {/* 5. حقوق الطالب في تعديل أو حذف حسابه */}
          <section className="space-y-2">
            <h3 className="text-base font-bold font-amiri text-stone-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-xs font-black dark:bg-emerald-950 dark:text-emerald-300">٥</span>
              <span>حقوقك الكاملة في بياناتك</span>
            </h3>
            <p>
              يحق لكل طالب في أي وقت مراجعة كافة بياناته المحفوظة، أو طلب مسح حسابه وجميع تقييداته وسجلاته نهائياً من خوادم المنصة عبر مراسلة الإدارة أو من خلال صفحة إعدادات الحساب.
            </p>
          </section>

        </div>

        {/* تذييل التواصل */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-100 dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
          >
            <span>هل لديك استفسار حول الخصوصية؟ تواصل معنا</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
