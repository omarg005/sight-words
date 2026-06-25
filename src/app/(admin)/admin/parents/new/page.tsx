'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createParent } from '@/app/actions/parents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewParentPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; userId?: string } | null, fd: FormData) => {
      return await createParent(fd)
    },
    null
  )

  useEffect(() => {
    if (state?.userId) router.push('/admin/parents')
  }, [state, router])

  return (
    <div className="max-w-md space-y-6">
      <a href="/admin/parents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Parents
      </a>
      <Card>
        <CardHeader>
          <CardTitle>New Parent Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share these credentials with the parent out-of-band (text or email).
          </p>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="parent@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Initial Password</Label>
              <Input id="password" name="password" type="text" required placeholder="Min. 6 characters" />
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating…' : 'Create Account'}
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
