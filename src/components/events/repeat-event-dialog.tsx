'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateIn, formatDayIn } from '@/lib/timezone'
import { MAX_REPEATS, moveByDays, repeatDayOffsets } from '@/lib/repeat'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: { id: string; title: string; starts_at: string }
  timeZone: string
}

const EVERY = [
  { weeks: '1', label: 'Every week' },
  { weeks: '2', label: 'Every 2 weeks' },
  { weeks: '4', label: 'Every 4 weeks' },
]

// Copies the event, and its volunteer shifts, onto later dates at the same
// local time: a season of Sunday services in one step.
export function RepeatEventDialog({ open, onOpenChange, event, timeZone }: Props) {
  const [everyWeeks, setEveryWeeks] = useState('1')
  const [count, setCount] = useState('8')
  const [copyShifts, setCopyShifts] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ created: number; skipped: number; last?: string } | null>(null)

  const dates = repeatDayOffsets(Number(everyWeeks), Number(count))
    .map((days) => moveByDays(event.starts_at, days, timeZone))
    .filter((d): d is string => !!d)
  const preview = dates.length <= 4
    ? dates.map((d) => formatDayIn(d, timeZone)).join(' · ')
    : `${dates.slice(0, 3).map((d) => formatDayIn(d, timeZone)).join(' · ')} … through ${formatDateIn(dates[dates.length - 1], timeZone)}`

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) { setDone(null); setError('') }
  }

  async function submit() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/events/${event.id}/repeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ every_weeks: Number(everyWeeks), count: Number(count), copy_shifts: copyShifts }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const created: { starts_at: string }[] = data.created || []
      setDone({ created: created.length, skipped: data.skipped || 0, last: created[created.length - 1]?.starts_at })
    } else {
      setError(data.error || 'Could not repeat this event. Please try again.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Repeat &ldquo;{event.title}&rdquo;</DialogTitle></DialogHeader>
        {done ? (
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3 rounded-lg bg-canopy-50 border border-canopy-200 p-4 text-canopy-900">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-canopy-600" />
              <p>
                {done.created === 0
                  ? 'Those dates already have this event, so nothing new was added.'
                  : `Added ${done.created} more date${done.created !== 1 ? 's' : ''}${done.last ? `, through ${formatDateIn(done.last, timeZone)}` : ''}.`}
                {done.created > 0 && done.skipped > 0 && ` ${done.skipped} date${done.skipped !== 1 ? 's' : ''} already had it and ${done.skipped !== 1 ? 'were' : 'was'} skipped.`}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>Close</Button>
              <Link href="/events" className="flex-1"><Button className="w-full">See all events</Button></Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Adds the same event at the same time on later dates, so you can plan a whole season at once.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select value={everyWeeks} onValueChange={setEveryWeeks}>
                <SelectTrigger label="How often"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVERY.map((o) => <SelectItem key={o.weeks} value={o.weeks}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger label="More dates"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_REPEATS }, (_, i) => String(i + 1)).map((n) => (
                    <SelectItem key={n} value={n}>{n} more</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={copyShifts} onChange={(e) => setCopyShifts(e.target.checked)} className="mt-0.5 accent-canopy-600" />
              <span>Copy the volunteer shifts too (sign-ups aren&apos;t copied)</span>
            </label>
            {dates.length > 0 && <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">New dates: {preview}</p>}
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={submit}>Add {count} date{count !== '1' ? 's' : ''}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
