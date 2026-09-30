export default function CourseLoading() {
  return (
    <div className="min-h-screen animate-pulse" dir="rtl">
      {/* شريط العنوان */}
      <div className="border-b border-stone-200/80 bg-[#fdfbf7]/90 px-4 py-3 dark:border-stone-800 dark:bg-[#1c1917]/90">
        <div className="container mx-auto max-w-7xl flex items-center gap-3">
          <div className="h-5 w-5 rounded-lg bg-stone-200 dark:bg-stone-700" />
          <div className="h-4 w-24 rounded-lg bg-stone-200 dark:bg-stone-700" />
          <div className="h-4 w-3 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="h-4 w-40 rounded-lg bg-stone-200 dark:bg-stone-700" />
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* عمود المشغّل الرئيسي */}
          <div className="lg:col-span-8 space-y-4">
            {/* منطقة الفيديو */}
            <div className="aspect-video w-full rounded-2xl bg-stone-200 dark:bg-stone-800 shadow-inner" />

            {/* معلومات المتن */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-7 w-3/4 rounded-xl bg-stone-200 dark:bg-stone-700" />
                  <div className="h-4 w-1/2 rounded-lg bg-stone-200 dark:bg-stone-700" />
                </div>
                <div className="h-10 w-28 shrink-0 rounded-xl bg-stone-200 dark:bg-stone-700" />
              </div>
              <div className="h-px bg-stone-100 dark:bg-stone-800" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded-lg bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-5/6 rounded-lg bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-4/6 rounded-lg bg-stone-100 dark:bg-stone-800" />
              </div>
            </div>

            {/* مربع الملاحظات */}
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-900/30 dark:bg-amber-950/20 space-y-3">
              <div className="h-5 w-32 rounded-lg bg-amber-200/60 dark:bg-amber-900/40" />
              <div className="h-28 w-full rounded-xl bg-amber-100/60 dark:bg-amber-900/20" />
              <div className="h-9 w-24 rounded-xl bg-amber-200/60 dark:bg-amber-900/40" />
            </div>
          </div>

          {/* الشريط الجانبي */}
          <div className="lg:col-span-4 space-y-4">
            {/* قائمة الحلقات */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-3">
              <div className="h-5 w-28 rounded-lg bg-stone-200 dark:bg-stone-700" />
              <div className="h-9 w-full rounded-xl bg-stone-100 dark:bg-stone-800" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700" />
                  <div className="flex-1 space-y-1.5">
                    <div
                      className="h-3.5 rounded-lg bg-stone-200 dark:bg-stone-700"
                      style={{ width: `${65 + (i % 3) * 12}%` }}
                    />
                    <div className="h-3 w-16 rounded bg-stone-100 dark:bg-stone-800" />
                  </div>
                </div>
              ))}
            </div>

            {/* متون ذات صلة */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-3">
              <div className="h-5 w-32 rounded-lg bg-stone-200 dark:bg-stone-700" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-stone-200 dark:bg-stone-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded-lg bg-stone-200 dark:bg-stone-700" />
                    <div className="h-3 w-1/2 rounded bg-stone-100 dark:bg-stone-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
