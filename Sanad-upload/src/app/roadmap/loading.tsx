export default function RoadmapLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* ترويسة الخارطة Skeleton */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/60 p-8 dark:border-stone-800 dark:bg-stone-900/60 space-y-4">
        <div className="h-6 w-48 rounded-full bg-stone-200 dark:bg-stone-800" />
        <div className="h-10 w-96 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-full max-w-xl rounded-lg bg-stone-100 dark:bg-stone-850" />
        <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-stone-800 mt-6" />
      </div>

      {/* أزرار التصفية Skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-xl bg-stone-200 dark:bg-stone-800" />
        ))}
      </div>

      {/* شبكة بطاقات المتون Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-3xl border border-stone-200/80 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900/70 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-12 rounded bg-stone-200 dark:bg-stone-800" />
              <div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-800" />
            </div>
            <div className="h-6 w-3/4 rounded-lg bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-1/2 rounded bg-stone-100 dark:bg-stone-850" />
            <div className="h-10 w-full rounded-xl bg-stone-100 dark:bg-stone-850 mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
