'use client'

import { useRef, useState, useTransition } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { bulkAddWords } from '@/app/actions/lists'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Props {
  listId: string
  existingWords: string[]
}

type ParsedRow = {
  word: string
  image_url: string | null
  issues: string[]
}

export default function CsvImport({ listId, existingWords }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const seenInFile = new Set<string>()
        const parsed: ParsedRow[] = result.data.map((row) => {
          const rawWord = (row['word'] ?? '').trim().toLowerCase()
          const imageUrl = (row['image_url'] ?? '').trim() || null
          const issues: string[] = []

          if (!rawWord) issues.push('Empty word')
          if (rawWord && seenInFile.has(rawWord)) issues.push('Duplicate in file')
          if (rawWord && existingWords.includes(rawWord)) issues.push('Already in list')
          if (rawWord) seenInFile.add(rawWord)

          return { word: rawWord, image_url: imageUrl, issues }
        })
        setRows(parsed)
      },
    })
  }

  const validRows = rows?.filter((r) => r.issues.length === 0) ?? []
  const problemRows = rows?.filter((r) => r.issues.length > 0) ?? []

  function handleConfirm() {
    if (!validRows.length) return
    startTransition(async () => {
      const result = await bulkAddWords(listId, validRows)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`${validRows.length} word${validRows.length !== 1 ? 's' : ''} added.`)
        setRows(null)
        if (fileRef.current) fileRef.current.value = ''
      }
    })
  }

  function handleReset() {
    setRows(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:font-medium"
        />
        <a
          href="/api/csv-template"
          className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
        >
          Download template
        </a>
      </div>

      {rows && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="border-b bg-gray-50 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              Preview — {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
              {problemRows.length > 0 && (
                <span className="ml-2 text-amber-600">({problemRows.length} skipped)</span>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={handleReset}>Clear</Button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Word</th>
                  <th className="px-4 py-2">Image URL</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.issues.length ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-1.5 font-medium">{r.word || <em className="text-muted-foreground">empty</em>}</td>
                    <td className="px-4 py-1.5 text-muted-foreground truncate max-w-[200px]">
                      {r.image_url ?? '—'}
                    </td>
                    <td className="px-4 py-1.5">
                      {r.issues.length === 0 ? (
                        <Badge variant="default" className="text-xs">Ready</Badge>
                      ) : (
                        <span className="text-xs text-amber-700">{r.issues.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t px-4 py-3 flex items-center gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isPending || validRows.length === 0}
            >
              {isPending ? 'Saving…' : `Add ${validRows.length} word${validRows.length !== 1 ? 's' : ''}`}
            </Button>
            {validRows.length === 0 && (
              <p className="text-sm text-muted-foreground">No valid rows to import.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
