'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadCsv, parseCsv } from '@/lib/csv'
import { detectColumns, hasNameColumns, rowsToMembers, type ImportedMember } from '@/lib/member-import'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (imported: number, skipped: number) => void
}

const CHUNK = 500

export function ImportMembersDialog({ open, onOpenChange, onImported }: Props) {
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<{ members: ImportedMember[]; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  function reset() {
    setFileName('')
    setParsed(null)
    setError('')
    setProgress(0)
  }

  async function handleFile(file: File | undefined) {
    reset()
    if (!file) return
    setFileName(file.name)
    if (!/\.csv$/i.test(file.name)) {
      setError('Please choose a .csv file. In Excel or Google Sheets, use File → Download / Save As → CSV.')
      return
    }
    const rows = parseCsv(await file.text())
    if (rows.length < 2) {
      setError('That file has no rows under the header.')
      return
    }
    const cols = detectColumns(rows[0])
    if (!hasNameColumns(cols)) {
      setError('We couldn’t find a name column. Name the columns “First name” and “Last name” (or a single “Name”), then try again.')
      return
    }
    const result = rowsToMembers(rows.slice(1), cols)
    if (result.members.length === 0) {
      setError('No rows with a name were found.')
      return
    }
    setParsed(result)
  }

  async function runImport() {
    if (!parsed) return
    setImporting(true)
    setError('')
    let imported = 0
    let skipped = parsed.skipped
    for (let i = 0; i < parsed.members.length; i += CHUNK) {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: parsed.members.slice(i, i + CHUNK) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          (imported > 0 ? `${imported} people were imported, then it stopped: ` : '') +
          (data.error || 'Import failed. Please try again.')
        )
        setImporting(false)
        if (imported > 0) onImported(imported, skipped)
        return
      }
      imported += data.imported
      skipped += data.skipped
      setProgress(Math.min(i + CHUNK, parsed.members.length))
    }
    setImporting(false)
    onImported(imported, skipped)
    onOpenChange(false)
    reset()
  }

  function downloadTemplate() {
    downloadCsv('canopy-people-template.csv', [
      ['First name', 'Last name', 'Email', 'Phone', 'Address', 'Status', 'Notes'],
      ['Sarah', 'Johnson', 'sarah@example.com', '(555) 201-3344', '12 Oak St, Dallas, TX', 'Active', 'Greeter team'],
    ])
  }

  const withEmail = parsed?.members.filter((m) => m.email).length ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!importing) { onOpenChange(o); if (!o) reset() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import people from a spreadsheet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">
            Export your list from Excel, Google Sheets or your current church software as a CSV file. We match columns
            named <strong>First name</strong>, <strong>Last name</strong> (or one <strong>Name</strong> column),{' '}
            <strong>Email</strong>, <strong>Phone</strong>, <strong>Address</strong>, <strong>Status</strong> and{' '}
            <strong>Notes</strong>. Other columns are ignored.
          </p>
          <button type="button" onClick={downloadTemplate} className="text-canopy-700 font-medium hover:underline">
            Download a template
          </button>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-center hover:border-canopy-600">
            {fileName ? <FileSpreadsheet className="h-8 w-8 text-canopy-600" /> : <Upload className="h-8 w-8 text-gray-400" />}
            <span className="font-medium text-gray-900">{fileName || 'Choose a CSV file'}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          {parsed && (
            <div className="rounded-lg bg-canopy-50 border border-canopy-200 px-4 py-3 text-canopy-900">
              <p className="font-medium">
                Ready to import {parsed.members.length} {parsed.members.length === 1 ? 'person' : 'people'}
                {withEmail < parsed.members.length ? ` (${withEmail} with an email address)` : ''}.
              </p>
              <p className="mt-1 text-xs text-canopy-800">
                First rows: {parsed.members.slice(0, 3).map((m) => `${m.first_name} ${m.last_name}`.trim()).join(', ')}
                {parsed.skipped ? `. ${parsed.skipped} rows without a name will be skipped.` : '.'} Anyone whose email is
                already in Canopy is skipped too.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={importing} onClick={() => { onOpenChange(false); reset() }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!parsed} loading={importing} onClick={runImport}>
              {importing && parsed && parsed.members.length > CHUNK
                ? `Importing ${progress} of ${parsed.members.length}`
                : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
