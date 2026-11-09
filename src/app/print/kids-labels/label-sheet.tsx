'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ChildLabel = {
  id: string
  firstName: string
  lastName: string
  room: string | null
  age: string
  allergies: string | null
  hasMedical: boolean
  code: string
  when: string
  eventTitle: string | null
}

export type ParentTag = {
  code: string
  names: string[]
  when: string
}

type Paper = 'label' | 'sheet'
const PAPER_KEY = 'canopy:kids-label-paper'

function readPaper(): Paper {
  try {
    return window.localStorage.getItem(PAPER_KEY) === 'sheet' ? 'sheet' : 'label'
  } catch {
    return 'label'
  }
}

// Label printers (Dymo, Brother, Zebra) take one 4 × 2 inch label per page.
// Plain paper puts the labels on letter sheets with cut lines.
const PAGE_CSS: Record<Paper, string> = {
  label: `
    @page { size: 4in 2in; margin: 0; }
    @media print {
      .kids-sheet { display: block !important; gap: 0 !important; padding: 0 !important; }
      .kids-label { border: 0 !important; border-radius: 0 !important; margin: 0 !important; break-after: page; page-break-after: always; }
      .kids-label:last-child { break-after: auto; page-break-after: auto; }
    }`,
  sheet: `
    @page { size: letter; margin: 0.25in; }
    @media print {
      .kids-sheet { gap: 0 !important; padding: 0 !important; max-width: none !important; justify-content: flex-start !important; }
      .kids-label { border: 1px dashed #9ca3af !important; border-radius: 0 !important; break-inside: avoid; page-break-inside: avoid; }
    }`,
}

export function LabelSheet({
  orgName,
  labels,
  tags,
  includeParentTags,
}: {
  orgName: string
  labels: ChildLabel[]
  tags: ParentTag[]
  includeParentTags: boolean
}) {
  const [paper, setPaper] = useState<Paper>('label')
  const [withTags, setWithTags] = useState(includeParentTags)
  const printed = useRef(false)

  useEffect(() => {
    setPaper(readPaper())
  }, [])

  // Open the print dialog once, as soon as the labels are on screen.
  useEffect(() => {
    if (printed.current) return
    printed.current = true
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [])

  function choosePaper(next: Paper) {
    setPaper(next)
    try {
      window.localStorage.setItem(PAPER_KEY, next)
    } catch {}
  }

  const count = labels.length + (withTags ? tags.length : 0)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{PAGE_CSS[paper]}</style>

      <div className="print:hidden mx-auto max-w-3xl px-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/kids" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-canopy-700">
            <ArrowLeft className="h-4 w-4" /> Back to check-in
          </Link>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print {count} {count === 1 ? 'label' : 'labels'}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="sr-only">Paper</legend>
            <span className="font-medium text-gray-700">Printing on</span>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="paper" checked={paper === 'label'} onChange={() => choosePaper('label')} />
              Label printer (4 × 2 in)
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="paper" checked={paper === 'sheet'} onChange={() => choosePaper('sheet')} />
              Plain paper
            </label>
          </fieldset>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={withTags} onChange={(e) => setWithTags(e.target.checked)} />
            Parent pickup {tags.length === 1 ? 'tag' : 'tags'}
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Put the name label on the child and give the pickup tag to the parent. They show the same code, and the
          child goes home only with someone holding the matching tag.
        </p>
      </div>

      <div className="kids-sheet mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-4 py-6">
        {labels.map((label) => (
          <article key={label.id} className="kids-label flex h-[2in] w-[4in] flex-col justify-between overflow-hidden rounded-md border border-gray-300 bg-white px-[0.18in] py-[0.12in] text-black">
            <div className="flex items-start justify-between gap-2 text-[9pt] leading-tight">
              <span className="truncate font-semibold">{orgName}</span>
              <span className="shrink-0">{label.when}</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[26pt] font-bold leading-none">{label.firstName}</p>
                <p className="mt-1 truncate text-[12pt] leading-tight">{label.lastName}</p>
              </div>
              <div className="shrink-0 rounded border-2 border-black px-2 py-0.5 text-center">
                <p className="text-[7pt] font-semibold uppercase tracking-wide">Pickup</p>
                <p className="font-mono text-[18pt] font-bold leading-none tracking-widest">{label.code}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="truncate text-[10pt] leading-tight">
                {[label.room, label.age, label.eventTitle].filter(Boolean).join(' · ')}
              </p>
              {(label.allergies || label.hasMedical) && (
                <p className="truncate bg-black px-1.5 py-0.5 text-[10pt] font-bold leading-tight text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                  {label.allergies ? `ALLERGY: ${label.allergies}` : 'MEDICAL NOTE: ask the check-in desk'}
                  {label.allergies && label.hasMedical ? ' · see medical note' : ''}
                </p>
              )}
            </div>
          </article>
        ))}

        {withTags &&
          tags.map((tag) => (
            <article key={`tag-${tag.code}`} className="kids-label flex h-[2in] w-[4in] flex-col justify-between overflow-hidden rounded-md border border-gray-300 bg-white px-[0.18in] py-[0.12in] text-black">
              <div className="flex items-start justify-between gap-2 text-[9pt] leading-tight">
                <span className="truncate font-semibold">{orgName}</span>
                <span className="shrink-0">{tag.when}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10pt] font-semibold uppercase tracking-wide">Parent pickup tag</p>
                  <p className="mt-1 line-clamp-2 text-[12pt] leading-tight">{tag.names.join(', ')}</p>
                </div>
                <p className="shrink-0 font-mono text-[34pt] font-bold leading-none tracking-widest">{tag.code}</p>
              </div>
              <p className="text-[9pt] leading-tight">Keep this tag. Show it to pick up your {tag.names.length === 1 ? 'child' : 'children'}.</p>
            </article>
          ))}
      </div>
    </div>
  )
}
