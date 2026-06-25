import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import ActionButton from '@/components/ActionButton'
import AddWordForm from '@/components/admin/lists/AddWordForm'
import CsvImport from '@/components/admin/lists/CsvImport'
import WordImageUpload from '@/components/admin/lists/WordImageUpload'
import AssignForm from '@/components/admin/lists/AssignForm'
import EditListForm from '@/components/admin/lists/EditListForm'
import {
  retireWord, reactivateWord, deleteWord,
  deleteAssignment,
} from '@/app/actions/lists'

export default async function ListEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: list } = await supabase
    .from('sight_word_lists')
    .select('*')
    .eq('id', id)
    .single()

  if (!list) notFound()

  const { data: words } = await supabase
    .from('sight_words')
    .select('*')
    .eq('list_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  // Assignments — flat query then join manually
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, input_mode, student_id, required_completions')
    .eq('list_id', id)

  const assignmentStudentIds = [...new Set((assignments ?? []).map((a) => a.student_id))]
  const { data: assignmentStudents } = assignmentStudentIds.length
    ? await supabase.from('students').select('id, display_name, parent_id').in('id', assignmentStudentIds)
    : { data: [] }
  const studentMap = Object.fromEntries((assignmentStudents ?? []).map((s) => [s.id, s]))

  const parentIds = [...new Set((assignmentStudents ?? []).map((s) => s.parent_id))]
  const { data: parentRows } = parentIds.length
    ? await supabase.from('users').select('id, email').in('id', parentIds)
    : { data: [] }
  const parentMap = Object.fromEntries((parentRows ?? []).map((p) => [p.id, p.email]))

  // All active students for the assign form
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, display_name, parent_id')
    .is('retired_at', null)
    .order('display_name')

  const studentParentIds = [...new Set((allStudents ?? []).map((s) => s.parent_id))]
  const { data: studentParentRows } = studentParentIds.length
    ? await supabase.from('users').select('id, email').in('id', studentParentIds)
    : { data: [] }
  const studentParentMap = Object.fromEntries((studentParentRows ?? []).map((p) => [p.id, p.email]))

  const studentsForForm = (allStudents ?? []).map((s) => ({
    id: s.id,
    display_name: s.display_name,
    parent_email: studentParentMap[s.parent_id] ?? '',
  }))

  const assignedStudentIds = (assignments ?? []).map((a) => a.student_id)

  // Generate public image URLs
  const activeWords = (words ?? []).filter((w) => !w.retired_at)
  const retiredWords = (words ?? []).filter((w) => w.retired_at)
  const existingActiveWordStrings = activeWords.map((w) => w.word)

  function getImageUrl(path: string | null) {
    if (!path) return null
    const { data } = admin.storage.from('word-images').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="max-w-4xl space-y-8">
      <a href="/admin/lists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Word Lists
      </a>
      {/* ── List metadata ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">{list.name}</h1>
          <Badge variant={list.retired_at ? 'secondary' : 'default'}>
            {list.retired_at ? 'Retired' : 'Active'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {list.grade_level === 'K' ? 'Kindergarten' : `Grade ${list.grade_level}`}
          </span>
        </div>
        <EditListForm list={list} />
      </div>

      <Separator />

      {/* ── Words: Active ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Words ({activeWords.length})</h2>

        {activeWords.length > 0 && (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 w-8">#</th>
                  <th className="px-4 py-2">Word</th>
                  <th className="px-4 py-2">Image</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeWords.map((w, i) => {
                  const imgUrl = getImageUrl(w.image_url)
                  return (
                    <tr key={w.id} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-lg">{w.word}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          {imgUrl ? (
                            <Image src={imgUrl} alt={w.word} width={48} height={48} className="rounded object-cover h-12 w-12" />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No image</span>
                          )}
                          <WordImageUpload wordId={w.id} listId={id} hasImage={!!imgUrl} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <ActionButton action={retireWord} formData={{ wordId: w.id, listId: id }} label="Retire" variant="secondary" successMessage="Word retired." />
                          <ActionButton action={deleteWord} formData={{ wordId: w.id, listId: id }} label="Delete" variant="destructive" successMessage="Word deleted." confirm={`Delete "${w.word}"? This cannot be undone.`} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Add word manually ── */}
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Add Word Manually</h3>
          <AddWordForm listId={id} />
        </div>

        {/* ── CSV Import ── */}
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Import from CSV</h3>
          <CsvImport listId={id} existingWords={existingActiveWordStrings} />
        </div>
      </section>

      {/* ── Retired words ── */}
      {retiredWords.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Retired Words ({retiredWords.length})
            </h2>
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {retiredWords.map((w) => (
                    <tr key={w.id} className="border-t opacity-60">
                      <td className="px-4 py-2 font-medium line-through">{w.word}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <ActionButton action={reactivateWord} formData={{ wordId: w.id, listId: id }} label="Reactivate" variant="outline" successMessage="Word reactivated." />
                          <ActionButton action={deleteWord} formData={{ wordId: w.id, listId: id }} label="Delete" variant="destructive" successMessage="Word deleted." confirm={`Delete "${w.word}"? This cannot be undone.`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Separator />

      {/* ── Assignments ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Assignments</h2>

        {(assignments ?? []).length > 0 && (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Parent</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Passes</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments?.map((a) => {
                  const student = studentMap[a.student_id]
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{student?.display_name ?? '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {student ? parentMap[student.parent_id] ?? '—' : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="capitalize">{a.input_mode}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{(a.required_completions ?? 1)}×</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end">
                          <ActionButton action={deleteAssignment} formData={{ assignmentId: a.id, listId: id }} label="Remove" variant="destructive" successMessage="Assignment removed." confirm={`Remove ${student?.display_name ?? 'this student'} from this list?`} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Assign to Student</h3>
          <AssignForm listId={id} students={studentsForForm} assignedStudentIds={assignedStudentIds} />
        </div>
      </section>
    </div>
  )
}
