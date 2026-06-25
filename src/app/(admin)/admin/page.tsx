import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function StatCard({
  emoji,
  label,
  value,
  href,
}: {
  emoji: string
  label: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100 transition-all hover:border-violet-300 hover:shadow-md hover:shadow-violet-100 hover:-translate-y-0.5"
    >
      <span className="text-3xl">{emoji}</span>
      <span className="text-3xl font-black text-violet-700">{value}</span>
      <span className="text-sm font-semibold text-muted-foreground group-hover:text-violet-600 transition-colors">
        {label}
      </span>
    </Link>
  )
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: studentCount },
    { count: parentCount },
    { count: listCount },
    { count: wordCount },
    { data: recentCompletions },
    { data: progressEvents },
    { data: allStudents },
    { data: allAssignments },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).is('retired_at', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'parent').is('retired_at', null),
    supabase.from('sight_word_lists').select('*', { count: 'exact', head: true }).is('retired_at', null),
    supabase.from('sight_words').select('*', { count: 'exact', head: true }).is('retired_at', null),
    supabase
      .from('list_completions')
      .select('id, student_id, list_id, completed_at, practice_rounds_needed, assignment_id')
      .order('completed_at', { ascending: false })
      .limit(10),
    supabase
      .from('progress_events')
      .select('student_id, word_id, assignment_id, correct'),
    supabase.from('students').select('id, display_name').is('retired_at', null),
    supabase.from('assignments').select('id, student_id, list_id'),
  ])

  // Resolve names for recent completions
  const completionStudentIds = [...new Set((recentCompletions ?? []).map((c) => c.student_id))]
  const completionListIds = [...new Set((recentCompletions ?? []).map((c) => c.list_id))]

  const [{ data: completionStudents }, { data: completionLists }] = await Promise.all([
    completionStudentIds.length
      ? supabase.from('students').select('id, display_name').in('id', completionStudentIds)
      : Promise.resolve({ data: [] }),
    completionListIds.length
      ? supabase.from('sight_word_lists').select('id, name').in('id', completionListIds)
      : Promise.resolve({ data: [] }),
  ])

  const studentNameMap = Object.fromEntries((completionStudents ?? []).map((s) => [s.id, s.display_name]))
  const listNameMap = Object.fromEntries((completionLists ?? []).map((l) => [l.id, l.name]))

  // Students needing attention: any words missed but never gotten right, per student
  const assignmentMap = Object.fromEntries((allAssignments ?? []).map((a) => [a.id, a]))
  const studentProgress: Record<string, { gotRight: Set<string>; gotWrong: Set<string> }> = {}

  for (const e of progressEvents ?? []) {
    if (!studentProgress[e.student_id]) {
      studentProgress[e.student_id] = { gotRight: new Set(), gotWrong: new Set() }
    }
    if (e.correct) {
      studentProgress[e.student_id].gotRight.add(e.word_id)
    } else {
      studentProgress[e.student_id].gotWrong.add(e.word_id)
    }
  }

  const studentsNeedingAttention = (allStudents ?? [])
    .map((s) => {
      const p = studentProgress[s.id]
      if (!p) return null
      const forReview = [...p.gotWrong].filter((id) => !p.gotRight.has(id)).length
      if (forReview === 0) return null
      return { id: s.id, name: s.display_name, forReview }
    })
    .filter(Boolean)
    .sort((a, b) => b!.forReview - a!.forReview)
    .slice(0, 8) as { id: string; name: string; forReview: number }[]

  // Students with no activity at all
  const studentsWithActivity = new Set(Object.keys(studentProgress))
  const studentsNoActivity = (allStudents ?? []).filter((s) => !studentsWithActivity.has(s.id))

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-violet-800">Dashboard</h1>
          <p className="text-muted-foreground font-semibold">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/students/new" className={buttonVariants({ variant: 'outline' })}>
            + Student
          </Link>
          <Link href="/admin/lists/new" className={buttonVariants()}>
            + List
          </Link>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard emoji="👧" label="Active Students"  value={studentCount ?? 0} href="/admin/students" />
        <StatCard emoji="👨‍👩‍👧" label="Active Parents"   value={parentCount ?? 0}  href="/admin/parents"  />
        <StatCard emoji="📚" label="Word Lists"       value={listCount ?? 0}    href="/admin/lists"    />
        <StatCard emoji="✏️" label="Total Words"      value={wordCount ?? 0}    href="/admin/lists"    />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Recent Completions ──────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-violet-800">🏆 Recent Completions</h2>
          {!recentCompletions?.length ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center text-muted-foreground">
              <p className="text-3xl mb-2">🌱</p>
              <p className="font-semibold">No completions yet — keep practicing!</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-100 bg-white overflow-hidden shadow-sm shadow-violet-100">
              <table className="w-full text-sm">
                <thead className="bg-violet-50 text-left text-xs text-violet-600 font-bold uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">List</th>
                    <th className="px-4 py-2.5">Rounds</th>
                    <th className="px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompletions.map((c) => (
                    <tr key={c.id} className="border-t border-violet-50 hover:bg-violet-50/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold">
                        <Link href={`/admin/students/${c.student_id}`} className="hover:text-violet-600 transition-colors">
                          {studentNameMap[c.student_id] ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-semibold">
                        {listNameMap[c.list_id] ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {c.practice_rounds_needed === 0 ? (
                          <Badge variant="default" className="bg-green-500 text-xs">Perfect!</Badge>
                        ) : (
                          <span className="text-muted-foreground">{c.practice_rounds_needed}×</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(c.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Needs Attention ─────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-violet-800">⚠️ Needs Attention</h2>

          {studentsNeedingAttention.length === 0 && studentsNoActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center text-muted-foreground">
              <p className="text-3xl mb-2">🌟</p>
              <p className="font-semibold">All students are on track!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {studentsNeedingAttention.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/students/${s.id}`}
                  className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition-all hover:border-amber-400 hover:bg-amber-100"
                >
                  <span className="font-bold text-amber-900">{s.name}</span>
                  <Badge variant="outline" className="border-amber-400 text-amber-700 font-bold">
                    {s.forReview} word{s.forReview !== 1 ? 's' : ''} to review
                  </Badge>
                </Link>
              ))}
              {studentsNoActivity.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/students/${s.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:border-slate-300 hover:bg-slate-100"
                >
                  <span className="font-bold text-slate-600">{s.display_name}</span>
                  <Badge variant="outline" className="text-slate-500 font-semibold">
                    Not started
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
