import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-8">
      <div className="text-7xl">🔍</div>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Go home
      </Link>
    </div>
  )
}
