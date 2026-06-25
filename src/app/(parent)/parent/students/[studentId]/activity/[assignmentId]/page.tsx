import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SightWordsActivity from '@/components/parent/activity/SightWordsActivity'

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ studentId: string; assignmentId: string }>
}) {
  const { studentId, assignmentId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verify this assignment belongs to one of this parent's students
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, list_id, input_mode, student_id, required_completions')
    .eq('id', assignmentId)
    .eq('student_id', studentId)
    .single()

  if (!assignment) notFound()

  // Verify student belongs to this parent
  const { data: student } = await supabase
    .from('students')
    .select('id, display_name')
    .eq('id', studentId)
    .eq('parent_id', user!.id)
    .single()

  if (!student) notFound()

  const { data: list } = await supabase
    .from('sight_word_lists')
    .select('id, name, grade_level')
    .eq('id', assignment.list_id)
    .single()

  if (!list) notFound()

  const { count: priorCompletions } = await supabase
    .from('list_completions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('list_id', assignment.list_id)

  const { data: words } = await supabase
    .from('sight_words')
    .select('id, word, image_url, display_order')
    .eq('list_id', assignment.list_id)
    .is('retired_at', null)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!words?.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="text-6xl">📭</div>
        <h2 className="text-2xl font-bold">No words in this list yet</h2>
        <p className="text-muted-foreground">Ask your teacher to add words to this list.</p>
        <Link
          href={`/parent/students/${studentId}`}
          className="mt-2 text-sm text-primary hover:underline"
        >
          ← Back to lists
        </Link>
      </div>
    )
  }

  // Resolve image paths to public URLs
  const wordsWithUrls = words.map((w) => ({
    id: w.id,
    word: w.word,
    imageUrl: w.image_url
      ? admin.storage.from('word-images').getPublicUrl(w.image_url).data.publicUrl
      : null,
  }))

  return (
    <SightWordsActivity
      assignmentId={assignmentId}
      studentId={studentId}
      listId={list.id}
      listName={list.name}
      studentName={student.display_name}
      inputMode={assignment.input_mode as 'handwrite' | 'type'}
      words={wordsWithUrls}
      backHref={`/parent/students/${studentId}`}
      requiredCompletions={assignment.required_completions ?? 1}
      priorCompletions={priorCompletions ?? 0}
    />
  )
}
