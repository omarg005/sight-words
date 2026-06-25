import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function ParentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('email, retired_at')
    .eq('id', user!.id)
    .single()

  const { data: students } = await supabase
    .from('students')
    .select('id, display_name, grade_level')
    .eq('parent_id', user!.id)
    .is('retired_at', null)
    .order('display_name')

  const studentIds = (students ?? []).map((s) => s.id)

  const [{ data: assignments }, { data: completions }, { data: progressEvents }] =
    await Promise.all([
      studentIds.length
        ? supabase.from('assignments').select('id, student_id, list_id').in('student_id', studentIds)
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

  const completionListIds = [...new Set((completions ?? []).map((c) => c.list_id))]
  const { data: completionLists } = completionListIds.length
    ? await supabase.from('sight_word_lists').select('id, name').in('id', completionListIds)
    : { data: [] }
  const listNameMap = Object.fromEntries((completionLists ?? []).map((l) => [l.id, l.name]))
  const studentNameMap = Object.fromEntries((students ?? []).map((s) => [s.id, s.display_name]))

  // Per-student stats
  const assignmentsByStudent: Record<string, number> = {}
  for (const a of assignments ?? []) {
    assignmentsByStudent[a.student_id] = (assignmentsByStudent[a.student_id] ?? 0) + 1
  }

  const completionsByStudent: Record<string, number> = {}
  for (const c of completions ?? []) {
    completionsByStudent[c.student_id] = (completionsByStudent[c.student_id] ?? 0) + 1
  }

  const studentProgress: Record<string, { gotRight: Set<string>; gotWrong: Set<string> }> = {}
  for (const e of progressEvents ?? []) {
    if (!studentProgress[e.student_id])
      studentProgress[e.student_id] = { gotRight: new Set(), gotWrong: new Set() }
    if (e.correct) studentProgress[e.student_id].gotRight.add(e.word_id)
    else studentProgress[e.student_id].gotWrong.add(e.word_id)
  }

  const forReviewByStudent: Record<string, number> = {}
  for (const [sid, p] of Object.entries(studentProgress)) {
    forReviewByStudent[sid] = [...p.gotWrong].filter((w) => !p.gotRight.has(w)).length
  }

  const totalAssignments = Object.values(assignmentsByStudent).reduce((a, b) => a + b, 0)
  const totalCompletions = (completions ?? []).length
  const recentCompletions = (completions ?? []).slice(0, 6)
  const isRetired = !!profile?.retired_at

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-violet-800">Welcome back! 👋</h1>
          <p className="text-muted-foreground font-semibold">{profile?.email}</p>
        </div>

        {isRetired ? (
          <div className="flex flex-col items-end gap-1">
            <span
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl bg-gray-200 px-6 py-3 text-base font-extrabold text-gray-400 shadow-sm"
            >
              🚀 Start Activity
            </span>
            <p className="text-xs text-red-600 font-semibold">
              Account deactivated — contact your teacher.
            </p>
          </div>
        ) : (
          <Link
            href="/parent/start"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-base font-extrabold text-white shadow-md shadow-violet-300 transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
          >
            🚀 Start Activity
          </Link>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '👧', label: 'Students',    value: (students ?? []).length },
          { emoji: '📋', label: 'Lists',       value: totalAssignments },
          { emoji: '🏆', label: 'Completions', value: totalCompletions },
        ].map(({ emoji, label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100 text-center">
            <span className="text-2xl">{emoji}</span>
            <span className="text-2xl font-black text-violet-700">{value}</span>
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Students ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-violet-800">👧 Students</h2>
          {!(students ?? []).length ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-6 text-center text-muted-foreground">
              <p className="font-semibold">No students set up yet.</p>
              <p className="text-sm mt-1">Ask your teacher to add your child.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(students ?? []).map((s) => {
                const lists = assignmentsByStudent[s.id] ?? 0
                const done = completionsByStudent[s.id] ?? 0
                const forReview = forReviewByStudent[s.id] ?? 0
                return (
                  <Link
                    key={s.id}
                    href={`/parent/students/${s.id}/progress`}
                    className="group flex items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
                  >
                    <div>
                      <p className="font-bold group-hover:text-violet-700 transition-colors">
                        {s.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade_level
                          ? s.grade_level === 'K' ? 'Kindergarten' : `Grade ${s.grade_level}`
                          : 'No grade'}
                        {' · '}{lists} list{lists !== 1 ? 's' : ''}
                        {' · '}{done} completion{done !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {forReview > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          {forReview} to review
                        </span>
                      ) : done > 0 ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                          On track ✓
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">→</span>
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
              <div className="text-4xl mb-2">🌱</div>
              <p className="font-semibold">No completions yet.</p>
              <p className="text-sm mt-1">Hit <strong>Start Activity</strong> to begin!</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-100 bg-white overflow-hidden shadow-sm shadow-violet-100">
              <table className="w-full text-sm">
                <thead className="bg-violet-50 text-left text-xs text-violet-600 font-bold uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">List</th>
                    <th className="px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompletions.map((c) => (
                    <tr key={c.id} className="border-t border-violet-50 hover:bg-violet-50/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold">{studentNameMap[c.student_id] ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{listNameMap[c.list_id] ?? '—'}</td>
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
