'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { toast } from 'sonner'
import { updateParentPassword } from '@/app/actions/parents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ResetParentPasswordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await updateParentPassword(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('Password updated.')
      router.push(`/admin/parents/${id}`)
    }
  }, [state, router, id])

  return (
    <div className="max-w-md space-y-4">
      <Link href={`/admin/parents/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to parent
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Reset Parent Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a new password for this parent account and share it with them out-of-band.
          </p>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="text" required placeholder="Min. 6 characters" />
            </div>
            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Update Password'}
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
