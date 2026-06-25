'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { changePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await changePassword(fd),
    null
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    if (state?.success) {
      toast.success('Password updated successfully.')
      router.push('/admin')
    }
  }, [state, router])

  return (
    <div className="max-w-md space-y-6">
      <a href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </a>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <p className="text-sm text-muted-foreground">Update your admin account password.</p>
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

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Update Password'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
