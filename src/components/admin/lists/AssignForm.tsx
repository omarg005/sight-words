'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { createAssignment } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

interface Student { id: string; display_name: string; parent_email: string }

interface Props {
  listId: string
  students: Student[]
  assignedStudentIds: string[]
}

export default function AssignForm({ listId, students, assignedStudentIds }: Props) {
  const available = students.filter((s) => !assignedStudentIds.includes(s.id))

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await createAssignment(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) toast.success('List assigned.')
  }, [state])

  if (available.length === 0)
    return <p className="text-sm text-muted-foreground">All active students are already assigned to this list.</p>

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="listId" value={listId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="studentId">Student</Label>
        <NativeSelect id="studentId" name="studentId" required className="w-56">
          <option value="">Select student</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name} ({s.parent_email})
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inputMode">Input Mode</Label>
        <NativeSelect id="inputMode" name="inputMode" required className="w-36">
          <option value="">Select mode</option>
          <option value="handwrite">Handwrite</option>
          <option value="type">Type</option>
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requiredCompletions">Passes Required</Label>
        <input
          id="requiredCompletions"
          name="requiredCompletions"
          type="number"
          min={1}
          defaultValue={1}
          className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Assigning…' : 'Assign'}
      </Button>
    </form>
  )
}
