import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  let status = 'unknown'
  let error = ''

  try {
    const supabase = await createClient()
    const { error: err } = await supabase.from('_health').select('*').limit(1)
    // A "relation does not exist" error still means the DB connection works.
    if (err && !err.message.includes('does not exist')) {
      error = err.message
      status = 'error'
    } else {
      status = 'ok'
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    status = 'error'
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Sight Words App</h1>
      <p className="text-muted-foreground">Phase 1 — scaffold health check</p>

      <div
        className={`rounded-lg border px-6 py-4 text-sm font-mono ${
          status === 'ok'
            ? 'border-green-500 bg-green-50 text-green-800'
            : status === 'error'
              ? 'border-red-500 bg-red-50 text-red-800'
              : 'border-gray-300 bg-gray-50 text-gray-600'
        }`}
      >
        {status === 'ok' && '✅ Supabase connection OK'}
        {status === 'error' && (
          <>
            <p>❌ Supabase connection failed</p>
            <p className="mt-1 text-xs opacity-75">{error}</p>
            <p className="mt-2 text-xs">
              Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY set.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
