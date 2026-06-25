import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import StudentEditForm from '@/components/admin/students/StudentEditForm'
import StudentAssignSection from '@/components/admin/lists/StudentAssignSection'

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from: parentId } = await searchParams
  const supabase = await createClient()

  const [
    { data: student },
    { data: parents },
    { data: assignments },
    { data: allLists },
  ] = await Promise.all([
    supabase.from('students').select('id, display_name, grade_level, parent_id').eq('id', id).single(),
    supabase.from('users').select('id, email').eq('role', 'parent').is('retired_at', null).order('email'),
    supabase.from('assignments').select('id, list_id, input_mode').eq('student_id', id),
    supabase.from('sight_word_lists').select('id, name, grade_level').is('retired_at', null).order('grade_level').order('name'),
  ])

  if (!student) notFound()

  const assignedListIds = (assignments ?? []).map((a) => a.list_id)

  // Enrich assignments with list name/grade for display
  const listMap = Object.fromEntries((allLists ?? []).map((l) => [l.id, l]))
  const enrichedAssignments = (assignments ?? []).map((a) => ({
    id: a.id,
    list_id: a.list_id,
    list_name: listMap[a.list_id]?.name ?? 'Unknown list',
    grade_level: listMap[a.list_id]?.grade_level ?? '—',
    input_mode: a.input_mode,
  }))

  const availableLists = (allLists ?? []).filter((l) => !assignedListIds.includes(l.id))

  return (
    <div className="max-w-2xl space-y-8">
      {parentId && (
        <Link
          href={`/admin/parents/${parentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to parent dashboard
        </Link>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Edit Student</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentEditForm
            student={student}
            parents={parents ?? []}
            backHref={parentId ? `/admin/parents/${parentId}` : '/admin/students'}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Assigned Lists</h2>
        <StudentAssignSection
          studentId={id}
          assignments={enrichedAssignments}
          availableLists={availableLists}
        />
      </div>
    </div>
  )
}
