'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateStudent } from '@/app/actions/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

const GRADES = ['K', '1', '2', '3', '4', '5', '6']

interface Parent { id: string; email: string }
interface Student { id: string; display_name: string; grade_level: string | null; parent_id: string }

export default function StudentEditForm({
  student,
  parents,
  backHref = '/admin/students',
}: {
  student: Student
  parents: Parent[]
  backHref?: string
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await updateStudent(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('Student updated.')
      router.push(backHref)
    }
  }, [state, router, backHref])

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={student.id} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Student Name</Label>
        <Input id="displayName" name="displayName" required defaultValue={student.display_name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gradeLevel">Grade Level</Label>
        <NativeSelect id="gradeLevel" name="gradeLevel" defaultValue={student.grade_level ?? ''}>
          <option value="">Select grade (optional)</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="parentId">Parent Account</Label>
        <NativeSelect id="parentId" name="parentId" required defaultValue={student.parent_id}>
          <option value="">Select parent</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.email}</option>
          ))}
        </NativeSelect>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save Changes'}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(backHref)}>Cancel</Button>
      </div>
    </form>
  )
}
