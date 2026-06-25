'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { createAssignment, deleteAssignment } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { NativeSelect } from '@/components/ui/native-select'

interface List { id: string; name: string; grade_level: string }
interface Assignment { id: string; list_id: string; list_name: string; grade_level: string; input_mode: string }

interface Props {
  studentId: string
  assignments: Assignment[]
  availableLists: List[]
}

function RemoveButton({ assignmentId, studentId }: { assignmentId: string; studentId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => await deleteAssignment(fd),
    null
  )
  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])
  return (
    <form action={action}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? '…' : 'Remove'}
      </Button>
    </form>
  )
}

export default function StudentAssignSection({ studentId, assignments, availableLists }: Props) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await createAssignment(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) toast.success('List assigned.')
  }, [state])

  return (
    <div className="space-y-4">
      {/* Current assignments */}
      {assignments.length > 0 ? (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">List</th>
                <th className="px-4 py-2">Grade</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{a.list_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.grade_level === 'K' ? 'Kindergarten' : `Grade ${a.grade_level}`}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="capitalize">{a.input_mode}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      <RemoveButton assignmentId={a.id} studentId={studentId} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No lists assigned yet.</p>
      )}

      {/* Add new assignment */}
      {availableLists.length > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Assign a List</h3>
          <form action={action} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="studentId" value={studentId} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listId">List</Label>
              <NativeSelect id="listId" name="listId" required className="w-64">
                <option value="">Select list</option>
                {availableLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.grade_level === 'K' ? 'K' : `Gr. ${l.grade_level}`})
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inputMode">Mode</Label>
              <NativeSelect id="inputMode" name="inputMode" required className="w-36">
                <option value="">Select mode</option>
                <option value="handwrite">Handwrite</option>
                <option value="type">Type</option>
              </NativeSelect>
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? 'Assigning…' : 'Assign'}
            </Button>
          </form>
        </div>
      )}

      {availableLists.length === 0 && assignments.length > 0 && (
        <p className="text-sm text-muted-foreground">All active lists are already assigned to this student.</p>
      )}
    </div>
  )
}
