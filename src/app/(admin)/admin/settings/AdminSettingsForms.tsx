'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { changeEmail, changePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsForms({ currentEmail }: { currentEmail: string }) {
  const [emailState, emailAction, emailPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await changeEmail(fd),
    null
  )

  const [pwState, pwAction, pwPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) =>
      await changePassword(fd),
    null
  )

  useEffect(() => {
    if (emailState?.error) toast.error(emailState.error)
    if (emailState?.success) toast.success('Confirmation sent to your new email address. Click the link to complete the change.')
  }, [emailState])

  useEffect(() => {
    if (pwState?.error) toast.error(pwState.error)
    if (pwState?.success) toast.success('Password updated successfully.')
  }, [pwState])

  return (
    <div className="space-y-6">
      {/* ── Email ── */}
      <Card>
        <CardHeader>
          <CardTitle>Change Email</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current: <span className="font-semibold text-foreground">{currentEmail}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form action={emailAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                required
                placeholder="new@example.com"
                autoComplete="email"
              />
            </div>

            {emailState?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{emailState.error}</p>
            )}
            {emailState?.success && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Check your new email inbox for a confirmation link.
              </p>
            )}

            <Button type="submit" disabled={emailPending} className="self-start">
              {emailPending ? 'Sending…' : 'Update Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Password ── */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <p className="text-sm text-muted-foreground">Update your admin account password.</p>
        </CardHeader>
        <CardContent>
          <form action={pwAction} className="flex flex-col gap-4">
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

            {pwState?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{pwState.error}</p>
            )}
            {pwState?.success && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Password updated successfully.
              </p>
            )}

            <Button type="submit" disabled={pwPending} className="self-start">
              {pwPending ? 'Saving…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
