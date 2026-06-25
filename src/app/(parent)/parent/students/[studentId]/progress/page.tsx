import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STICKERS = [
  { emoji: '⭐', bg: 'bg-yellow-50',  border: 'border-yellow-300', label: 'text-yellow-800' },
  { emoji: '🦋', bg: 'bg-purple-50',  border: 'border-purple-300', label: 'text-purple-800' },
  { emoji: '🌈', bg: 'bg-pink-50',    border: 'border-pink-300',   label: 'text-pink-800'   },
  { emoji: '🚀', bg: 'bg-blue-50',    border: 'border-blue-300',   label: 'text-blue-800'   },
  { emoji: '🌺', bg: 'bg-rose-50',    border: 'border-rose-300',   label: 'text-rose-800'   },
  { emoji: '🎯', bg: 'bg-green-50',   border: 'border-green-300',  label: 'text-green-800'  },
  { emoji: '💎', bg: 'bg-cyan-50',    border: 'border-cyan-300',   label: 'text-cyan-800'   },
  { emoji: '🦄', bg: 'bg-violet-50',  border: 'border-violet-300', label: 'text-violet-800' },
  { emoji: '🐉', bg: 'bg-emerald-50', border: 'border-emerald-300',label: 'text-emerald-800'},
  { emoji: '🏅', bg: 'bg-amber-50',   border: 'border-amber-300',  label: 'text-amber-800'  },
]

function stickerFor(listId: string, index: number) {
  // deterministic: same list always gets same sticker style
  const seed = listId.charCodeAt(0) + listId.charCodeAt(listId.length - 1)
  return STICKERS[(seed + index) % STICKERS.length]
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: student } = await supabase
    .from('students')
    .select('id, display_name, grade_level')
    .eq('id', studentId)
    .eq('parent_id', user!.id)
    .is('retired_at', null)
    .single()

  if (!student) notFound()

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, list_id, input_mode')
    .eq('student_id', studentId)

  const listIds = (assignments ?? []).map((a) => a.list_id)
  const assignmentIds = (assignments ?? []).map((a) => a.id)
  const assignmentByListId = Object.fromEntries((assignments ?? []).map((a) => [a.list_id, a]))

  const [
    { data: lists },
    { data: completions },
    { data: progressEvents },
    { data: recentEvents },
  ] = await Promise.all([
    listIds.length
      ? supabase.from('sight_word_lists').select('id, name, grade_level, retired_at').in('id', listIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('list_completions')
      .select('id, list_id, completed_at, practice_rounds_needed')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false }),
    assignmentIds.length
      ? supabase.from('progress_events').select('assignment_id, word_id, correct').in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabase
          .from('progress_events')
          .select('word_id, correct, created_at, assignment_id')
          .in('assignment_id', assignmentIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const listMap = Object.fromEntries((lists ?? []).map((l) => [l.id, l]))

  // Completions grouped by list
  const completionsByList: Record<string, { count: number; latest: string; rounds: number[] }> = {}
  for (const c of completions ?? []) {
    if (!completionsByList[c.list_id]) {
      completionsByList[c.list_id] = { count: 0, latest: c.completed_at, rounds: [] }
    }
    completionsByList[c.list_id].count++
    completionsByList[c.list_id].rounds.push(c.practice_rounds_needed)
    if (c.completed_at > completionsByList[c.list_id].latest) {
      completionsByList[c.list_id].latest = c.completed_at
    }
  }

  // Accuracy per assignment
  const accuracyByAssignment: Record<string, { correct: number; total: number }> = {}
  for (const e of progressEvents ?? []) {
    if (!accuracyByAssignment[e.assignment_id]) {
      accuracyByAssignment[e.assignment_id] = { correct: 0, total: 0 }
    }
    accuracyByAssignment[e.assignment_id].total++
    if (e.correct) accuracyByAssignment[e.assignment_id].correct++
  }

  // Word names for recent activity
  const wordIds = [...new Set((recentEvents ?? []).map((e) => e.word_id))]
  const { data: wordRows } = wordIds.length
    ? await supabase.from('sight_words').select('id, word').in('id', wordIds)
    : { data: [] }
  const wordMap = Object.fromEntries((wordRows ?? []).map((w) => [w.id, w.word]))

  // Lists completed at least once (for sticker collection)
  const completedListIds = Object.keys(completionsByList)

  // All assigned lists sorted: active first, then retired
  const allAssignedLists = (lists ?? []).sort((a, b) => {
    if (!!a.retired_at !== !!b.retired_at) return a.retired_at ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{student.display_name}&apos;s Progress</h1>
          {student.grade_level && (
            <p className="text-muted-foreground">
              {student.grade_level === 'K' ? 'Kindergarten' : `Grade ${student.grade_level}`}
            </p>
          )}
        </div>
        <Link href="/parent" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      {/* ── Sticker Collection ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">🏅 Sticker Collection</h2>
        {completedListIds.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-2">🌟</div>
            <p>Complete a list to earn your first sticker!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {completedListIds.map((listId, i) => {
              const s = stickerFor(listId, i)
              const list = listMap[listId]
              const count = completionsByList[listId]?.count ?? 1
              return (
                <div
                  key={listId}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 ${s.bg} ${s.border} p-3 text-center shadow-sm`}
                >
                  <span className="text-4xl">{s.emoji}</span>
                  <span className={`text-xs font-semibold leading-tight ${s.label}`}>
                    {list?.name ?? 'List'}
                    {list?.retired_at && ' (retired)'}
                  </span>
                  {count > 1 && (
                    <span className={`text-xs ${s.label} opacity-70`}>×{count}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── List Progress ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">📊 List Progress</h2>
        {allAssignedLists.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lists assigned yet.</p>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">List</th>
                  <th className="px-4 py-2 text-center">Completed</th>
                  <th className="px-4 py-2 text-center">Accuracy</th>
                  <th className="px-4 py-2">Last Done</th>
                </tr>
              </thead>
              <tbody>
                {allAssignedLists.map((list) => {
                  const assignment = assignmentByListId[list.id]
                  const comp = completionsByList[list.id]
                  const acc = assignment ? accuracyByAssignment[assignment.id] : undefined
                  const pct = acc && acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : null
                  const isHandwrite = assignment?.input_mode === 'handwrite'

                  return (
                    <tr key={list.id} className={`border-t ${list.retired_at ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 font-medium">
                        {list.name}
                        {list.retired_at && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(retired)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {comp ? (
                          <span className="font-semibold text-green-700">
                            {comp.count}× ✓
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isHandwrite ? (
                          <span className="text-xs text-muted-foreground italic">Self-reported</span>
                        ) : pct !== null ? (
                          <span className={pct >= 80 ? 'text-green-700 font-semibold' : pct >= 50 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {comp ? fmt(comp.latest) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent Activity ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">📅 Recent Activity</h2>
        {!recentEvents?.length ? (
          <p className="text-sm text-muted-foreground">No activity yet — start practicing!</p>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Word</th>
                  <th className="px-4 py-2">Result</th>
                  <th className="px-4 py-2">List</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((e, i) => {
                  const assignment = assignments?.find((a) => a.id === e.assignment_id)
                  const list = assignment ? listMap[assignment.list_id] : undefined
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-mono font-semibold">
                        {wordMap[e.word_id] ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        {e.correct
                          ? <span className="text-green-700 font-medium">✓ Correct</span>
                          : <span className="text-red-600 font-medium">✗ Missed</span>}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {list?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtTime(e.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
