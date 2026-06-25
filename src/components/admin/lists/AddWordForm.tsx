'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { addWord } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AddWordForm({ listId }: { listId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await addWord(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('Word added.')
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="listId" value={listId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="word">Word</Label>
        <Input id="word" name="word" placeholder="e.g. the" className="w-40" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="image">Image (optional)</Label>
        <Input id="image" name="image" type="file" accept="image/*" className="w-48 text-sm" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add Word'}
      </Button>
    </form>
  )
}
