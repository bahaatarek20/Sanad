export default function CoursesLoading() {
  return (
    <div className="min-h-screen animate-pulse" dir="rtl">
      {/* Hero Section */}
      <div className="border-b border-stone-200/80 bg-[#fdfbf7]/60 px-4 py-10 dark:border-stone-800 dark:bg-[#1c1917]/60">
        <div className="container mx-auto max-w-7xl space-y-4">
          <div className="mx-auto h-10 w-48 rounded-2xl bg-stone-200 dark:bg-stone-700" />
          <div className="mx-auto h-5 w-72 rounded-xl bg-stone-100 dark:bg-stone-800" />
          {/* شريط البحث */}
          <div className="mx-auto mt-6 h-12 w-full max-w-xl rounded-2xl bg-stone-200 dark:bg-stone-700" />
        </div>
      </div>

      {/* الفئات */}
      <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700" />
          ))}
        </div>

        {/* شبكة الكروت */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-stone-200 dark:bg-stone-700" />
                <div className="h-5 w-16 rounded-full bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-4/5 rounded-lg bg-stone-200 dark:bg-stone-700" />
                <div className="h-4 w-3/5 rounded-lg bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-full rounded bg-stone-100 dark:bg-stone-800" />
                <div className="h-3.5 w-5/6 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="h-9 w-full rounded-xl bg-stone-200 dark:bg-stone-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
