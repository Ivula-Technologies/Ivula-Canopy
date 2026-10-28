'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MAX_MESSAGE, MAX_SUBJECT } from '@/lib/volunteer-message-limits'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: { id: string; title: string }
  /** Each shift with the emails of the people confirmed on it. */
  shifts: { id: string; title: string; emails: string[] }[]
}

const ALL = 'all'

// Emails the volunteers on an event, or on one shift of it. Each person gets
// their own copy, and replies come back to the coordinator.
export function MessageVolunteersDialog({ open, onOpenChange, event, shifts }: Props) {
  const [audience, setAudience] = useState(ALL)
  const [subject, setSubject] = useState(`About ${event.title}`)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<number | null>(null)

  const count = (emails: string[]) => new Set(emails.map((e) => e.toLowerCase())).size
  const everyone = count(shifts.flatMap((s) => s.emails))
  const chosen = audience === ALL ? everyone : count(shifts.find((s) => s.id === audience)?.emails || [])

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) { setSent(null); setError(''); setMessage(''); setAudience(ALL); setSubject(`About ${event.title}`) }
  }

  async function send() {
    setSending(true)
    setError('')
    const res = await fetch(`/api/events/${event.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, shift_id: audience === ALL ? null : audience }),
    })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (res.ok) setSent(data.sent)
    else setError(data.error || 'Could not send your message. Please try again.')
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Email volunteers</DialogTitle></DialogHeader>
        {sent !== null ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg bg-canopy-50 border border-canopy-200 p-4 text-sm text-canopy-900">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-canopy-600" />
              <p>Sent to {sent} volunteer{sent !== 1 ? 's' : ''}. Their replies will come to your email.</p>
            </div>
            <Button className="w-full" onClick={() => close(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger label="Send to"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone on this event ({everyone})</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title} ({count(s.emails)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input label="Subject" value={subject} maxLength={MAX_SUBJECT} onChange={(e) => setSubject(e.target.value)} />
            <Textarea
              label="Message"
              rows={6}
              maxLength={MAX_MESSAGE}
              placeholder="e.g. Parking has moved to the north lot this week. Please arrive 15 minutes early."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-gray-500">Each volunteer gets their own email, so nobody sees the others&apos; addresses. Replies come to you.</p>
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>Cancel</Button>
              <Button className="flex-1" loading={sending} disabled={!subject.trim() || !message.trim() || chosen === 0} onClick={send}>
                Send to {chosen} {chosen === 1 ? 'person' : 'people'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
