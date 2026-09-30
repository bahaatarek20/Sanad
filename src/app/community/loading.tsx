export default function CommunityLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      {/* ترويسة المجلس Skeleton */}
      <div className="rounded-3xl border border-stone-200/90 bg-white/70 p-6 sm:p-8 dark:border-stone-800 dark:bg-stone-900/70 space-y-3">
        <div className="h-6 w-36 rounded-full bg-stone-200 dark:bg-stone-800" />
        <div className="h-9 w-64 rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-full max-w-lg rounded bg-stone-100 dark:bg-stone-850" />
      </div>

      {/* حقل كتابة مشاركة جديدة Skeleton */}
      <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-5 dark:border-stone-800 dark:bg-stone-900/80 space-y-3">
        <div className="h-20 w-full rounded-2xl bg-stone-100 dark:bg-stone-850" />
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded-xl bg-stone-200 dark:bg-stone-800" />
            <div className="h-7 w-20 rounded-xl bg-stone-200 dark:bg-stone-800" />
          </div>
          <div className="h-9 w-28 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </div>

      {/* قائمة المنشورات Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-stone-200/80 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900/70 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-800" />
                <div className="h-4 w-28 rounded bg-stone-200 dark:bg-stone-800" />
              </div>
              <div className="h-4 w-16 rounded bg-stone-100 dark:bg-stone-850" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-stone-100 dark:bg-stone-850" />
              <div className="h-4 w-3/4 rounded bg-stone-100 dark:bg-stone-850" />
            </div>
            <div className="flex gap-4 pt-2">
              <div className="h-6 w-16 rounded-lg bg-stone-100 dark:bg-stone-850" />
              <div className="h-6 w-16 rounded-lg bg-stone-100 dark:bg-stone-850" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
