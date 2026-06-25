'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { updateWordImage } from '@/app/actions/lists'

interface Props {
  wordId: string
  listId: string
  hasImage: boolean
}

export default function WordImageUpload({ wordId, listId, hasImage }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await updateWordImage(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('Image updated.')
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="wordId" value={wordId} />
      <input type="hidden" name="listId" value={listId} />
      <label className="cursor-pointer text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800">
        {pending ? 'Uploading…' : hasImage ? 'Replace image' : 'Upload image'}
        <input
          type="file"
          name="image"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              formRef.current?.requestSubmit()
            }
          }}
        />
      </label>
    </form>
  )
}
