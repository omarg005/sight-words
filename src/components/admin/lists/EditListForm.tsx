'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateList } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

const GRADES = ['K', '1', '2', '3', '4', '5', '6']

interface List { id: string; name: string; grade_level: string }

export default function EditListForm({ list }: { list: List }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await updateList(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('List updated.')
      setOpen(false)
    }
  }, [state])

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit Name / Grade
      </Button>
    )

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="listId" value={list.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gradeLevel">Grade Level</Label>
        <NativeSelect id="gradeLevel" name="gradeLevel" defaultValue={list.grade_level} required className="w-44">
          {GRADES.map((g) => (
            <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">List Name</Label>
        <Input id="name" name="name" defaultValue={list.name} required className="w-64" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
