export default function QuotationsLoading() {
  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="h-10 w-56 rounded-xl bg-gray-200/80 dark:bg-gray-800/80 animate-pulse" />
            <div className="mt-4 h-5 w-80 max-w-full rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
          </div>
          <div className="h-12 w-full md:w-44 rounded-xl bg-blue-200/70 dark:bg-blue-900/40 animate-pulse" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 rounded-[24px] border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#111111]/80 p-6 shadow-xl"
            >
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="mt-5 h-8 w-20 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#111111]/90 p-8 shadow-xl">
          <div className="space-y-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="grid grid-cols-6 gap-4">
                <div className="col-span-2 h-5 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                <div className="h-5 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                <div className="h-5 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                <div className="h-5 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                <div className="h-5 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
