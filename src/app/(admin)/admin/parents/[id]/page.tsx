import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function ParentDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: parent } = await supabase
    .from('users')
    .select('id, email, retired_at, created_at')
    .eq('id', id)
    .eq('role', 'parent')
    .single()

  if (!parent) notFound()

  const { data: students } = await supabase
    .from('students')
    .select('id, display_name, grade_level, retired_at')
    .eq('parent_id', id)
    .order('display_name')

  const studentIds = (students ?? []).map((s) => s.id)

  const [
    { data: assignments },
    { data: completions },
    { data: progressEvents },
  ] = await Promise.all([
    studentIds.length
      ? supabase.from('assignments').select('id, student_id, list_id, input_mode').in('student_id', studentIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase
          .from('list_completions')
          .select('id, student_id, list_id, completed_at, practice_rounds_needed')
          .in('student_id', studentIds)
          .order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase
          .from('progress_events')
          .select('student_id, word_id, correct')
          .in('student_id', studentIds)
      : Promise.resolve({ data: [] }),
  ])

  // Resolve list names for completions
  const completionListIds = [...new Set((completions ?? []).map((c) => c.list_id))]
  const { data: completionLists } = completionListIds.length
    ? await supabase.from('sight_word_lists').select('id, name').in('id', completionListIds)
    : { data: [] }
  const listNameMap = Object.fromEntries((completionLists ?? []).map((l) => [l.id, l.name]))

  // Per-student stats
  const assignmentsByStudent: Record<string, number> = {}
  for (const a of assignments ?? []) {
    assignmentsByStudent[a.student_id] = (assignmentsByStudent[a.student_id] ?? 0) + 1
  }

  const completionsByStudent: Record<string, number> = {}
  for (const c of completions ?? []) {
    completionsByStudent[c.student_id] = (completionsByStudent[c.student_id] ?? 0) + 1
  }

  // Words for review per student
  const studentProgress: Record<string, { gotRight: Set<string>; gotWrong: Set<string> }> = {}
  for (const e of progressEvents ?? []) {
    if (!studentProgress[e.student_id]) {
      studentProgress[e.student_id] = { gotRight: new Set(), gotWrong: new Set() }
    }
    if (e.correct) studentProgress[e.student_id].gotRight.add(e.word_id)
    else studentProgress[e.student_id].gotWrong.add(e.word_id)
  }

  const forReviewByStudent: Record<string, number> = {}
  for (const [sId, p] of Object.entries(studentProgress)) {
    forReviewByStudent[sId] = [...p.gotWrong].filter((wid) => !p.gotRight.has(wid)).length
  }

  const recentCompletions = (completions ?? []).slice(0, 8)
  const studentNameMap = Object.fromEntries((students ?? []).map((s) => [s.id, s.display_name]))

  const totalAssignments = Object.values(assignmentsByStudent).reduce((a, b) => a + b, 0)
  const totalCompletions = (completions ?? []).length

  return (
    <div className="max-w-4xl space-y-8">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/parents" className="text-sm text-muted-foreground hover:text-foreground">
            ← Parents
          </Link>
          <h1 className="text-3xl font-black text-violet-800 break-all">{parent.email}</h1>
          <div className="flex items-center gap-2">
            {parent.retired_at
              ? <Badge variant="secondary">Retired</Badge>
              : <Badge variant="default">Active</Badge>}
            <span className="text-sm text-muted-foreground">
              Joined {fmt(parent.created_at)}
            </span>
          </div>
        </div>
        <Link
          href={`/admin/parents/${id}/reset-password`}
          className={buttonVariants({ variant: 'outline' })}
        >
          🔑 Reset Password
        </Link>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '👧', label: 'Students',    value: (students ?? []).length },
          { emoji: '📋', label: 'Assignments', value: totalAssignments },
          { emoji: '🏆', label: 'Completions', value: totalCompletions },
        ].map(({ emoji, label, value }) => (
          <div key={label} className="flex flex-col gap-1 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100 text-center">
            <span className="text-2xl">{emoji}</span>
            <span className="text-2xl font-black text-violet-700">{value}</span>
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Students ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-violet-800">👧 Students</h2>
          {!(students ?? []).length ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-6 text-center text-muted-foreground">
              <p className="font-semibold">No students yet.</p>
              <Link href="/admin/students/new" className="mt-2 inline-block text-sm text-violet-600 hover:underline">
                + Add a student
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(students ?? []).map((s) => {
                const forReview = forReviewByStudent[s.id] ?? 0
                const completions = completionsByStudent[s.id] ?? 0
                const lists = assignmentsByStudent[s.id] ?? 0
                return (
                  <Link
                    key={s.id}
                    href={`/admin/students/${s.id}?from=${id}`}
                    className={`group flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md ${s.retired_at ? 'opacity-60 border-slate-200' : 'border-violet-100'}`}
                  >
                    <div>
                      <p className="font-bold group-hover:text-violet-700 transition-colors">
                        {s.display_name}
                        {s.retired_at && <span className="ml-2 text-xs text-muted-foreground font-normal">(retired)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade_level ? (s.grade_level === 'K' ? 'Kindergarten' : `Grade ${s.grade_level}`) : 'No grade'}
                        {' · '}{lists} list{lists !== 1 ? 's' : ''}
                        {' · '}{completions} completion{completions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {forReview > 0 && (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">
                          {forReview} to review
                        </Badge>
                      )}
                      {completions > 0 && forReview === 0 && (
                        <Badge variant="outline" className="border-green-400 text-green-700 text-xs">
                          On track ✓
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-sm">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Recent Completions ────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-violet-800">🏆 Recent Completions</h2>
          {!recentCompletions.length ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-6 text-center text-muted-foreground">
              <p className="font-semibold">No completions yet.</p>
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
                      <td className="px-4 py-2.5 font-bold">{studentNameMap[c.student_id] ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{listNameMap[c.list_id] ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {c.practice_rounds_needed === 0
                          ? <Badge variant="default" className="bg-green-500 text-xs">Perfect!</Badge>
                          : <span className="text-muted-foreground">{c.practice_rounds_needed}×</span>}
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
      </div>
    </div>
  )
}
