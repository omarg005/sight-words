'use server'

import { createClient } from '@/lib/supabase/server'

async function getParentStudentIds(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('parent_id', user.id)
    .single()
  if (!data) throw new Error('Student not found or not yours')
  return true
}

export async function recordWordAttempt({
  studentId,
  assignmentId,
  wordId,
  correct,
  selfReported,
}: {
  studentId: string
  assignmentId: string
  wordId: string
  correct: boolean
  selfReported: boolean
}) {
  const supabase = await createClient()
  await getParentStudentIds(supabase, studentId)

  await supabase.from('progress_events').insert({
    student_id: studentId,
    assignment_id: assignmentId,
    word_id: wordId,
    correct,
    self_reported: selfReported,
  })
}

export async function recordListCompletion({
  studentId,
  listId,
  assignmentId,
  practiceRoundsNeeded,
}: {
  studentId: string
  listId: string
  assignmentId: string
  practiceRoundsNeeded: number
}) {
  const supabase = await createClient()
  await getParentStudentIds(supabase, studentId)

  const { error } = await supabase.from('list_completions').insert({
    student_id: studentId,
    list_id: listId,
    assignment_id: assignmentId,
    practice_rounds_needed: practiceRoundsNeeded,
  })

  if (error) return { error: error.message }
  return { success: true }
}
