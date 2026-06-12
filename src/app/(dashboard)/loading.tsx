export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-64" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-64" />
      </div>
    </div>
  )
}
