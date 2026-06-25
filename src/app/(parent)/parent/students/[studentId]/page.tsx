import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type ListInfo = { id: string; name: string; grade_level: string; retired_at: string | null }
type Assignment = { id: string; input_mode: string; list_id: string }
type ProgressEntry = { gotRight: Set<string>; gotWrong: Set<string> }

function AssignmentCard({
  a,
  studentId,
  listMap,
  wordCountMap,
  completionCountMap,
  progressMap,
}: {
  a: Assignment
  studentId: string
  listMap: Record<string, ListInfo>
  wordCountMap: Record<string, number>
  completionCountMap: Record<string, number>
  progressMap: Record<string, ProgressEntry>
}) {
  const list = listMap[a.list_id]
  if (!list) return null

  const totalWords = wordCountMap[a.list_id] ?? 0
  const completionCount = completionCountMap[a.list_id] ?? 0
  const progress = progressMap[a.id]
  const gotRight = progress?.gotRight.size ?? 0
  const forReview = progress
    ? [...progress.gotWrong].filter((id) => !progress.gotRight.has(id)).length
    : 0
  const hasStarted = !!progress

  let statusIcon: string
  let statusBadge: React.ReactNode
  let statusLine: React.ReactNode

  if (completionCount > 0) {
    statusIcon = '🏆'
    statusBadge = (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        {completionCount > 1 ? `Completed ${completionCount}×` : 'Completed'} ✓
      </span>
    )
    statusLine = forReview > 0
      ? <span className="text-amber-600">{forReview} word{forReview !== 1 ? 's' : ''} to review</span>
      : <span className="text-green-600">All words mastered!</span>
  } else if (!hasStarted) {
    statusIcon = '📖'
    statusBadge = null
    statusLine = <span className="text-muted-foreground">Not started yet</span>
  } else {
    statusIcon = '✏️'
    statusBadge = null
    const pct = totalWords > 0 ? Math.round((gotRight / totalWords) * 100) : 0
    statusLine = (
      <span>
        <span className="text-primary font-medium">{gotRight} of {totalWords} words done</span>
        {forReview > 0 && <span className="text-amber-600"> · {forReview} for review</span>}
        {totalWords > 0 && <span className="text-muted-foreground"> ({pct}%)</span>}
      </span>
    )
  }

  return (
    <Link
      href={`/parent/students/${studentId}/activity/${a.id}`}
      className="group flex items-center gap-4 rounded-3xl border-2 border-violet-200 bg-white p-5 shadow-md shadow-violet-100 transition-all hover:border-violet-400 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="text-4xl">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold group-hover:text-violet-600 transition-colors">{list.name}</span>
          {statusBadge}
        </div>
        <p className="text-sm text-muted-foreground">
          {list.grade_level === 'K' ? 'Kindergarten' : `Grade ${list.grade_level}`}
          {' · '}<span className="capitalize">{a.input_mode} mode</span>
        </p>
        <p className="mt-0.5 text-sm">{statusLine}</p>
      </div>
      <span className="text-2xl text-primary opacity-0 transition-opacity group-hover:opacity-100 shrink-0">→</span>
    </Link>
  )
}

export default async function StudentHomePage({
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
    .select('id, input_mode, list_id')
    .eq('student_id', studentId)

  const assignmentIds = (assignments ?? []).map((a) => a.id)
  const listIds = (assignments ?? []).map((a) => a.list_id)

  const [
    { data: lists },
    { data: completions },
    { data: wordRows },
    { data: progressEvents },
  ] = await Promise.all([
    listIds.length
      ? supabase.from('sight_word_lists').select('id, name, grade_level, retired_at').in('id', listIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('list_completions')
      .select('list_id')
      .eq('student_id', studentId),
    listIds.length
      ? supabase.from('sight_words').select('list_id').in('list_id', listIds).is('retired_at', null)
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabase
          .from('progress_events')
          .select('assignment_id, word_id, correct')
          .in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [] }),
  ])

  const listMap = Object.fromEntries((lists ?? []).map((l) => [l.id, l]))

  // Count completions per list (multiple completions allowed)
  const completionCountMap: Record<string, number> = {}
  for (const c of completions ?? []) {
    completionCountMap[c.list_id] = (completionCountMap[c.list_id] ?? 0) + 1
  }

  // Total active word count per list
  const wordCountMap: Record<string, number> = {}
  for (const w of wordRows ?? []) {
    wordCountMap[w.list_id] = (wordCountMap[w.list_id] ?? 0) + 1
  }

  // Per-assignment progress: which word_ids have been gotten right, which have been missed
  const progressMap: Record<string, { gotRight: Set<string>; gotWrong: Set<string> }> = {}
  for (const e of progressEvents ?? []) {
    if (!progressMap[e.assignment_id]) {
      progressMap[e.assignment_id] = { gotRight: new Set(), gotWrong: new Set() }
    }
    if (e.correct) {
      progressMap[e.assignment_id].gotRight.add(e.word_id)
    } else {
      progressMap[e.assignment_id].gotWrong.add(e.word_id)
    }
  }

  const activeAssignments = (assignments ?? []).filter((a) => !listMap[a.list_id]?.retired_at)
  const retiredAssignments = (assignments ?? []).filter((a) => listMap[a.list_id]?.retired_at)

  const openAssignments = activeAssignments.filter((a) => !(completionCountMap[a.list_id] ?? 0))
  const doneAssignments = activeAssignments.filter((a) => !!(completionCountMap[a.list_id] ?? 0))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/parent/start" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <Link href={`/parent/students/${studentId}/progress`} className="text-sm font-semibold text-violet-600 hover:text-violet-800 hover:underline">
          📊 View Progress
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold">{student.display_name}&apos;s Lists</h1>
        {student.grade_level && (
          <p className="text-muted-foreground">
            {student.grade_level === 'K' ? 'Kindergarten' : `Grade ${student.grade_level}`}
          </p>
        )}
      </div>

      {activeAssignments.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p>No word lists assigned yet. Ask your teacher!</p>
        </div>
      )}

      {activeAssignments.length > 0 && (
        <div className="space-y-8">
          {/* ── Open lists ── */}
          {openAssignments.length > 0 && (
            <div className="grid gap-4">
              {openAssignments.map((a) => <AssignmentCard key={a.id} a={a} studentId={studentId} listMap={listMap} wordCountMap={wordCountMap} completionCountMap={completionCountMap} progressMap={progressMap} />)}
            </div>
          )}

          {/* ── Divider ── */}
          {openAssignments.length > 0 && doneAssignments.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-violet-200" />
              <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Completed</span>
              <div className="flex-1 border-t border-violet-200" />
            </div>
          )}

          {/* ── Completed lists ── */}
          {doneAssignments.length > 0 && (
            <div className="grid gap-4">
              {doneAssignments.map((a) => <AssignmentCard key={a.id} a={a} studentId={studentId} listMap={listMap} wordCountMap={wordCountMap} completionCountMap={completionCountMap} progressMap={progressMap} />)}
            </div>
          )}
        </div>
      )}

      {retiredAssignments.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {retiredAssignments.length} retired list{retiredAssignments.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1 pl-3">
            {retiredAssignments.map((a) => (
              <p key={a.id} className="line-through">
                {listMap[a.list_id]?.name ?? 'Unknown'} (retired)
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
