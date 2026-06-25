export default function ParentLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-white/60" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/70" />
      ))}
    </div>
  )
}
