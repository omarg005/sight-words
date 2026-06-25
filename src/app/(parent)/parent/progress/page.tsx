import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProgressPickerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: students } = await supabase
    .from('students')
    .select('id, display_name, grade_level')
    .eq('parent_id', user!.id)
    .is('retired_at', null)
    .order('display_name')

  if (!students?.length) {
    redirect('/parent')
  }

  if (students.length === 1) {
    redirect(`/parent/students/${students[0].id}/progress`)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/parent" className="text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </Link>
      <div className="text-center space-y-2">
        <div className="text-5xl">📊</div>
        <h1 className="text-3xl font-bold">Whose progress?</h1>
      </div>
      <div className="grid gap-4">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/parent/students/${s.id}/progress`}
            className="flex flex-col items-center gap-1 rounded-3xl border-2 border-violet-200 bg-white p-8 text-center shadow-md shadow-violet-100 transition-all hover:border-violet-400 hover:shadow-lg hover:-translate-y-1 active:scale-95"
          >
            <div className="text-5xl">🌟</div>
            <span className="text-2xl font-bold">{s.display_name}</span>
            {s.grade_level && (
              <span className="text-sm text-muted-foreground">
                {s.grade_level === 'K' ? 'Kindergarten' : `Grade ${s.grade_level}`}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
