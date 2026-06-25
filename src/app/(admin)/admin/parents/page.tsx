import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ActionButton from '@/components/ActionButton'
import { retireParent, reactivateParent, deleteParent } from '@/app/actions/parents'

export default async function ParentsPage() {
  const supabase = await createClient()
  const { data: parents } = await supabase
    .from('users')
    .select('id, email, retired_at, created_at')
    .eq('role', 'parent')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parent Accounts</h1>
        <Link href="/admin/parents/new" className={buttonVariants()}>+ Add Parent</Link>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!parents?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No parent accounts yet. Click &ldquo;Add Parent&rdquo; to create one.
                </TableCell>
              </TableRow>
            )}
            {parents?.map((p) => (
              <TableRow key={p.id} className={p.retired_at ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{p.email}</TableCell>
                <TableCell>
                  {p.retired_at ? (
                    <Badge variant="secondary">Retired</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/parents/${p.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Edit</Link>
                    {p.retired_at ? (
                      <ActionButton
                        action={reactivateParent}
                        formData={{ userId: p.id }}
                        label="Reactivate"
                        variant="outline"
                        successMessage="Parent reactivated."
                      />
                    ) : (
                      <ActionButton
                        action={retireParent}
                        formData={{ userId: p.id }}
                        label="Retire"
                        variant="secondary"
                        successMessage="Parent retired."
                      />
                    )}
                    <ActionButton
                      action={deleteParent}
                      formData={{ userId: p.id }}
                      label="Delete"
                      variant="destructive"
                      successMessage="Parent deleted."
                      confirm={`Delete ${p.email}? This cannot be undone.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
