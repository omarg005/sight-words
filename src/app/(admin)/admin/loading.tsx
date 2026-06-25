export default function AdminLoading() {
  return (
    <div className="max-w-4xl space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="rounded-lg border bg-white p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-5 flex-1 rounded bg-gray-100" />
            <div className="h-5 w-24 rounded bg-gray-100" />
            <div className="h-5 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
