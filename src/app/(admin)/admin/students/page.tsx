import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ActionButton from '@/components/ActionButton'
import { retireStudent, reactivateStudent, deleteStudent } from '@/app/actions/students'


export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('students')
    .select('id, display_name, grade_level, retired_at, created_at, parent_id')
    .order('created_at', { ascending: false })

  const parentIds = [...new Set((students ?? []).map((s) => s.parent_id))]
  const { data: parentRows } = parentIds.length
    ? await supabase.from('users').select('id, email').in('id', parentIds)
    : { data: [] }
  const parentMap = Object.fromEntries((parentRows ?? []).map((p) => [p.id, p.email]))

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Link href="/admin/students/new" className={buttonVariants()}>+ Add Student</Link>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!students?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No students yet. Click &ldquo;Add Student&rdquo; to create one.
                </TableCell>
              </TableRow>
            )}
            {students?.map((s) => (
              <TableRow key={s.id} className={s.retired_at ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{s.display_name}</TableCell>
                <TableCell>
                  {s.grade_level ? `Grade ${s.grade_level === 'K' ? 'K' : s.grade_level}` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {parentMap[s.parent_id] ?? '—'}
                </TableCell>
                <TableCell>
                  {s.retired_at ? (
                    <Badge variant="secondary">Retired</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/students/${s.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Edit</Link>
                    {s.retired_at ? (
                      <ActionButton
                        action={reactivateStudent}
                        formData={{ studentId: s.id }}
                        label="Reactivate"
                        variant="outline"
                        successMessage="Student reactivated."
                      />
                    ) : (
                      <ActionButton
                        action={retireStudent}
                        formData={{ studentId: s.id }}
                        label="Retire"
                        variant="secondary"
                        successMessage="Student retired."
                      />
                    )}
                    <ActionButton
                      action={deleteStudent}
                      formData={{ studentId: s.id }}
                      label="Delete"
                      variant="destructive"
                      successMessage="Student deleted."
                      confirm={`Delete ${s.display_name}? This cannot be undone.`}
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
