'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createList } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'

const GRADES = ['K', '1', '2', '3', '4', '5', '6']

export default function NewListPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; listId?: string } | null, fd: FormData) =>
      await createList(fd),
    null
  )

  useEffect(() => {
    if (state?.listId) router.push(`/admin/lists/${state.listId}`)
  }, [state, router])

  return (
    <div className="max-w-md space-y-6">
      <a href="/admin/lists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Word Lists
      </a>
      <Card>
        <CardHeader>
          <CardTitle>New Sight Word List</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <NativeSelect id="gradeLevel" name="gradeLevel" required>
                <option value="">Select grade</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">List Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Dolch Pre-Primer" />
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create & Add Words'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
