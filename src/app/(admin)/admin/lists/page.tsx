import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ActionButton from '@/components/ActionButton'
import { retireList, reactivateList, deleteList } from '@/app/actions/lists'

type SortKey = 'name' | 'grade' | 'words' | 'students' | 'status'
type SortDir = 'asc' | 'desc'

function gradeOrder(g: string) {
  if (g === 'K') return 0
  return parseInt(g) || 99
}

function SortHeader({
  label,
  col,
  current,
  dir,
}: {
  label: string
  col: SortKey
  current: SortKey
  dir: SortDir
}) {
  const isActive = current === col
  const nextDir = isActive && dir === 'asc' ? 'desc' : 'asc'
  return (
    <Link
      href={`?sort=${col}&dir=${nextDir}`}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <span className="text-xs">
        {isActive ? (dir === 'asc' ? '▲' : '▼') : <span className="opacity-30">▲</span>}
      </span>
    </Link>
  )
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const { sort, dir } = await searchParams
  const sortKey: SortKey = (['name', 'grade', 'words', 'students', 'status'] as SortKey[]).includes(sort as SortKey)
    ? (sort as SortKey)
    : 'grade'
  const sortDir: SortDir = dir === 'desc' ? 'desc' : 'asc'

  const supabase = await createClient()
  const { data: lists } = await supabase
    .from('sight_word_lists')
    .select('id, name, grade_level, retired_at, created_at')

  const listIds = (lists ?? []).map((l) => l.id)

  const [{ data: wordRows }, { data: assignmentRows }] = await Promise.all([
    listIds.length
      ? supabase.from('sight_words').select('list_id').in('list_id', listIds).is('retired_at', null)
      : Promise.resolve({ data: [] }),
    listIds.length
      ? supabase.from('assignments').select('list_id').in('list_id', listIds)
      : Promise.resolve({ data: [] }),
  ])

  const wordCountMap: Record<string, number> = {}
  for (const w of wordRows ?? []) {
    wordCountMap[w.list_id] = (wordCountMap[w.list_id] ?? 0) + 1
  }
  const studentCountMap: Record<string, number> = {}
  for (const a of assignmentRows ?? []) {
    studentCountMap[a.list_id] = (studentCountMap[a.list_id] ?? 0) + 1
  }

  const sorted = [...(lists ?? [])].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name')     cmp = a.name.localeCompare(b.name)
    if (sortKey === 'grade')    cmp = gradeOrder(a.grade_level) - gradeOrder(b.grade_level) || a.name.localeCompare(b.name)
    if (sortKey === 'words')    cmp = (wordCountMap[a.id] ?? 0) - (wordCountMap[b.id] ?? 0)
    if (sortKey === 'students') cmp = (studentCountMap[a.id] ?? 0) - (studentCountMap[b.id] ?? 0)
    if (sortKey === 'status')   cmp = (a.retired_at ? 1 : 0) - (b.retired_at ? 1 : 0)
    return sortDir === 'desc' ? -cmp : cmp
  })

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sight Word Lists</h1>
        <Link href="/admin/lists/new" className={buttonVariants()}>+ New List</Link>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Name"     col="name"     current={sortKey} dir={sortDir} /></TableHead>
              <TableHead><SortHeader label="Grade"    col="grade"    current={sortKey} dir={sortDir} /></TableHead>
              <TableHead className="text-center"><SortHeader label="Words"    col="words"    current={sortKey} dir={sortDir} /></TableHead>
              <TableHead className="text-center"><SortHeader label="Students" col="students" current={sortKey} dir={sortDir} /></TableHead>
              <TableHead><SortHeader label="Status"   col="status"   current={sortKey} dir={sortDir} /></TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sorted.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No lists yet. Click &ldquo;New List&rdquo; to create one.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((l) => {
              const words = wordCountMap[l.id] ?? 0
              const students = studentCountMap[l.id] ?? 0
              return (
                <TableRow key={l.id} className={l.retired_at ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    {l.name}
                    {l.retired_at && <span className="ml-2 text-xs text-muted-foreground">(retired)</span>}
                  </TableCell>
                  <TableCell>{l.grade_level === 'K' ? 'Kindergarten' : `Grade ${l.grade_level}`}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {words > 0 ? words : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {students > 0 ? students : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {l.retired_at
                      ? <Badge variant="secondary">Retired</Badge>
                      : <Badge variant="default">Active</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/lists/${l.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        Edit / Words
                      </Link>
                      {l.retired_at ? (
                        <ActionButton action={reactivateList} formData={{ listId: l.id }} label="Reactivate" variant="outline" successMessage="List reactivated." />
                      ) : (
                        <ActionButton action={retireList} formData={{ listId: l.id }} label="Retire" variant="secondary" successMessage="List retired." />
                      )}
                      <ActionButton action={deleteList} formData={{ listId: l.id }} label="Delete" variant="destructive" successMessage="List deleted." confirm={`Delete "${l.name}"? This cannot be undone.`} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
