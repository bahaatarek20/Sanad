export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#151311] animate-pulse" dir="rtl">
      {/* هيدر الصفحة الرئيسية والترحيب */}
      <div className="border-b border-stone-200/80 bg-linear-to-b from-stone-100/40 to-transparent py-14 px-4 sm:px-6 lg:px-8 dark:border-stone-800">
        <div className="container mx-auto max-w-5xl text-center space-y-4">
          <div className="mx-auto h-8 w-44 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60" />
          <div className="mx-auto h-12 w-3/4 max-w-xl rounded-2xl bg-stone-200 dark:bg-stone-800" />
          <div className="mx-auto h-5 w-2/3 max-w-md rounded-xl bg-stone-100 dark:bg-stone-800/60" />
          <div className="mx-auto mt-6 flex justify-center gap-3">
            <div className="h-11 w-36 rounded-2xl bg-emerald-900/30 dark:bg-emerald-800/40" />
            <div className="h-11 w-32 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      </div>

      {/* قسم الفئات والتصفح السريع */}
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-xl bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-64 rounded-lg bg-stone-100 dark:bg-stone-800/60" />
          </div>
          <div className="h-9 w-28 rounded-xl bg-stone-100 dark:bg-stone-800/60" />
        </div>

        {/* شرائح التصنيفات */}
        <div className="flex gap-2.5 overflow-hidden pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 shrink-0 rounded-2xl bg-stone-200/80 dark:bg-stone-800/80"
            />
          ))}
        </div>

        {/* شبكة كروت المتون العلمية */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-4 dark:border-stone-800 dark:bg-stone-900/70"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-2xl bg-stone-200 dark:bg-stone-800" />
                <div className="h-5 w-20 rounded-full bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-4/5 rounded-lg bg-stone-200 dark:bg-stone-800" />
                <div className="h-4 w-3/5 rounded-lg bg-stone-100 dark:bg-stone-800/60" />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="h-3 w-full rounded bg-stone-100 dark:bg-stone-800/40" />
                <div className="h-3 w-3/4 rounded bg-stone-100 dark:bg-stone-800/40" />
              </div>
              <div className="h-9 w-full rounded-2xl bg-stone-100 dark:bg-stone-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
