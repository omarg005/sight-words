'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createStudent } from '@/app/actions/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { useParents } from '@/hooks/useParents'

const GRADES = ['K', '1', '2', '3', '4', '5', '6']

export default function NewStudentPage() {
  const router = useRouter()
  const { parents, loading } = useParents()

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) => {
      return await createStudent(fd)
    },
    null
  )

  useEffect(() => {
    if (state?.success) router.push('/admin/students')
  }, [state, router])

  return (
    <div className="max-w-md space-y-6">
      <a href="/admin/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Students
      </a>
      <Card>
        <CardHeader>
          <CardTitle>New Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Student Name</Label>
              <Input id="displayName" name="displayName" required placeholder="e.g. Emma" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <NativeSelect id="gradeLevel" name="gradeLevel">
                <option value="">Select grade (optional)</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parentId">Parent Account</Label>
              <NativeSelect id="parentId" name="parentId" required>
                <option value="">{loading ? 'Loading…' : 'Select parent'}</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.email}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating…' : 'Create Student'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
