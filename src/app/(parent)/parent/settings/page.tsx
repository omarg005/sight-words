'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { changePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ParentSettingsPage() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await changePassword(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) toast.success('Password updated successfully.')
  }, [state])

  return (
    <div className="mx-auto max-w-md space-y-6">
      <a href="/parent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </a>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <p className="text-sm text-muted-foreground">Update your account password.</p>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            {state?.success && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Password updated successfully.
              </p>
            )}

            <Button type="submit" disabled={pending} className="self-start">
              {pending ? 'Saving…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
