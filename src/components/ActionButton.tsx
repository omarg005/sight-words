'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Action = (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>

interface Props {
  action: Action
  formData?: Record<string, string>
  label: string
  loadingLabel?: string
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  successMessage?: string
  confirm?: string
  onSuccess?: () => void
}

export default function ActionButton({
  action,
  formData = {},
  label,
  loadingLabel,
  variant = 'default',
  size = 'sm',
  successMessage,
  confirm: confirmMessage,
  onSuccess,
}: Props) {
  const [state, dispatch, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const result = await action(fd)
      return result ?? null
    },
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state && !state.error) {
      if (successMessage) toast.success(successMessage)
      onSuccess?.()
    }
  }, [state, successMessage, onSuccess])

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <form action={dispatch}>
      {Object.entries(formData).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending} onClick={handleClick}>
        {pending ? (loadingLabel ?? label) : label}
      </Button>
    </form>
  )
}
