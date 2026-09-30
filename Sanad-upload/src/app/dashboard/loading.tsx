export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* ترويسة الكشكول Skeleton */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/70 p-6 sm:p-8 dark:border-stone-800 dark:bg-stone-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-full bg-stone-200 dark:bg-stone-800" />
            <div className="h-9 w-64 rounded-xl bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-80 rounded bg-stone-100 dark:bg-stone-850" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-2xl bg-stone-200 dark:bg-stone-800" />
            <div className="h-10 w-28 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      </div>

      {/* بطاقات الإحصاءات الثلاثية Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-3xl border border-stone-200/80 bg-white/80 p-5 dark:border-stone-800 dark:bg-stone-900/80 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-8 w-8 rounded-xl bg-stone-200 dark:bg-stone-800" />
              <div className="h-4 w-16 rounded bg-stone-100 dark:bg-stone-850" />
            </div>
            <div className="h-6 w-20 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        ))}
      </div>

      {/* أقسام المحتوى والكشكول Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-72 rounded-3xl border border-stone-200/80 bg-white/70 p-6 dark:border-stone-800 dark:bg-stone-900/70" />
          <div className="h-60 rounded-3xl border border-stone-200/80 bg-white/70 p-6 dark:border-stone-800 dark:bg-stone-900/70" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="h-96 rounded-3xl border border-stone-200/80 bg-white/70 p-6 dark:border-stone-800 dark:bg-stone-900/70" />
        </div>
      </div>
    </div>
  )
}
