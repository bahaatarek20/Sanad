import Link from 'next/link'
import { BookOpen, Compass, Users, Sparkles, Globe, ShieldCheck, Smartphone } from 'lucide-react'
import { getActiveCourses, getActiveCategories } from '@/lib/courses-store'
import SupportPlatformCard from '@/components/support-platform-card'

export default function Footer() {
  const courses = getActiveCourses()
  const categories = getActiveCategories()

  return (
    <footer className="no-print border-t border-stone-200/80 bg-white/95 text-stone-600 transition-colors duration-300 dark:border-stone-800 dark:bg-stone-900/95 dark:text-stone-400">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* عمود التعريف بالمنصة */}
          <div className="space-y-3 md:col-span-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-amber-300 shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-xl font-black text-stone-900 dark:text-white">منصة سَنَد</span>
            </div>
            <p className="max-w-md text-sm font-bold text-stone-800 dark:text-stone-200">
              سَنَد || رفيقك ومُعينك في طريق طلب العلم والتأصيل المنهجي الرصين.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              بيئة تعليمية هادئة صُممت لتيسير مدارسة المتون وضبط مسالك العلوم بلا مشتتات، تصحب طالب العلم خطوة بخطوة من المبادئ إلى المقاصد عبر {courses.length} متناً تأصيلياً محققاً في {categories.length} فنون شرعية.
            </p>
          </div>

          {/* فنون المنصة الشرعية المتجددة ديناميكياً */}
          <div className="md:col-span-5">
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
              فنون المنصة ({categories.length} فنون • {courses.length} متناً)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-500 dark:text-stone-400">
              {categories.map((cat) => {
                const count = courses.filter((c) => c.categorySlug === cat.slug || c.category === cat.title).length
                return (
                  <Link
                    key={cat.slug}
                    href={`/courses?cat=${cat.slug}`}
                    className="hover:text-emerald-900 transition dark:hover:text-emerald-400 flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-700/60 group-hover:bg-emerald-600 dark:bg-emerald-500/60 shrink-0" />
                      <span className="truncate">{cat.title}</span>
                    </div>
                    {count > 0 && (
                      <span
                        dir="ltr"
                        className="text-[10px] font-bold text-stone-500 dark:text-stone-400 font-mono shrink-0 bg-stone-100/90 dark:bg-stone-800/80 px-1.5 py-0.2 rounded-md border border-stone-200/50 dark:border-stone-700/50"
                      >
                        ({count})
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* مجالس المنصة وأروقتها */}
          <div className="md:col-span-3">
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
              مجالس المدارسة
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-500 dark:text-stone-400">
              <li>
                <Link href="/download" className="flex items-center gap-2 font-bold text-emerald-800 hover:text-emerald-950 transition dark:text-emerald-400 dark:hover:text-emerald-300">
                  <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>تحميل تطبيق سَنَد على هاتفك (📱 App)</span>
                </Link>
              </li>
              <li>
                <Link href="/community" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <span>مجلس المذاكرة العام (المجهول)</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>كشكول الطالب وإحصاءات المحاريب</span>
                </Link>
              </li>
              <li>
                <Link href="/courses" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <Compass className="h-4 w-4 text-emerald-800" />
                  <span>فهرس ومكتبة المتون المعتمدة</span>
                </Link>
              </li>
              <li>
                <Link href="/verify-ijaza" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>بوابة التحقق من الإجازات والشهادات</span>
                </Link>
              </li>

              <li>
                <Link href="/about" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <BookOpen className="h-4 w-4 text-emerald-800" />
                  <span>عن منصة سَنَد ورسالتها</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="flex items-center gap-2 hover:text-emerald-900 transition dark:hover:text-emerald-400">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <span>تواصل معنا ومكتب الدعم</span>
                </Link>
              </li>
              </ul>
            </div>
          </div>

          {/* بطاقة دعم المنصة والمساهمة الوقفية (اتصالات كاش: 01140373702) */}
          <SupportPlatformCard />

          {/* هوية منصة سَنَد الرسمية والاعتماد الأكاديمي وحقوق المطور */}
          <div className="border-t border-stone-200/80 pt-8 dark:border-stone-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-right space-y-1.5">
                <p className="text-sm font-black text-stone-900 dark:text-white">
                  منصة «سَنَد» لعلوم الشريعة والتأصيل المنهجي
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <span>إشراف واعتماد: <strong className="text-emerald-800 dark:text-emerald-400">إدارة منصة سَنَد للتأصيل الشرعي</strong></span>
                  <span className="hidden sm:inline text-stone-300 dark:text-stone-700">•</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70">
                    💻 برمجة وتطوير: <strong className="font-black">بشمهندس بهاء طارق</strong>
                  </span>
                </div>
              </div>

              {/* أزرار وسائل التواصل المباشرة للبشمهندس بهاء طارق */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {/* واتساب */}
                <a
                  href="https://wa.me/201012728516"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="محادثة واتساب مع المطور: 01012728516"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-2xs"
                >
                  <span className="text-[#25D366] text-sm">💬</span>
                  <span>واتساب</span>
                </a>

                {/* البريد الإلكتروني */}
                <a
                  href="mailto:bhaaljml480@gmail.com"
                  title="مراسلة البريد الإلكتروني: bhaaljml480@gmail.com"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-100 transition dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 shadow-2xs"
                >
                  <span>✉️</span>
                  <span>البريد</span>
                </a>

                {/* معرض الأعمال Portfolio */}
                <a
                  href="https://bahaatarek20.github.io/Bahaa-Portfolio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="معرض أعمال البشمهندس بهاء طارق"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 shadow-2xs"
                >
                  <span>🌐</span>
                  <span>Portfolio</span>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/bahaa-tarek-5008b0340"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="حساب لينكد إن"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs"
                >
                  <span>💼</span>
                  <span>LinkedIn</span>
                </a>

                {/* رابط سجل الإجازات */}
                <Link
                  href="/verify-ijaza"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>سجل الإجازات</span>
                </Link>
              </div>
            </div>
          </div>

          {/* الروابط القانونية وروابط السياسات */}
          <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 dark:border-stone-800 dark:text-stone-500 gap-3">
            <p>
              © {new Date().getFullYear()} منصة سَنَد || جميع الحقوق محفوظة لطلبة العلم والباحثين
              <Link href="/sanad-control-gate" className="opacity-0 hover:opacity-20 transition text-[9px] mr-1" title="بوابة الإدارة الخاصة">·</Link>
            </p>

            <div className="flex flex-wrap items-center gap-3 text-stone-500 dark:text-stone-400">
              <Link href="/about" className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
                عن المنصة
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
                سياسة الخصوصية
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
                شروط الاستخدام
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
                تواصل معنا
              </Link>
            </div>
          </div>
      </div>
    </footer>
  )
}