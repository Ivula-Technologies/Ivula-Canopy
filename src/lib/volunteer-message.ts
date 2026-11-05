import { escapeHtml, getResend } from './email'
import { MAX_MESSAGE, MAX_SUBJECT } from './volunteer-message-limits'

// A coordinator's email to the volunteers signed up for an event, or for one
// shift of it: "parking has moved", "bring gloves", "we're starting at 8".

const BATCH_SIZE = 100 // Resend's batch limit

export type VolunteerMessage = { subject: string; message: string; shiftId: string | null }

export function cleanMessage(body: unknown): VolunteerMessage | { error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const subject = typeof b.subject === 'string' ? b.subject.trim().replace(/\s+/g, ' ') : ''
  const message = typeof b.message === 'string' ? b.message.trim() : ''
  if (!subject) return { error: 'Add a subject.' }
  if (subject.length > MAX_SUBJECT) return { error: `Keep the subject under ${MAX_SUBJECT} characters.` }
  if (!message) return { error: 'Write a message.' }
  if (message.length > MAX_MESSAGE) return { error: `Keep the message under ${MAX_MESSAGE} characters.` }
  const shiftId = typeof b.shift_id === 'string' && b.shift_id ? b.shift_id : null
  return { subject, message, shiftId }
}

/** Each address once, however many shifts that person took. */
export function uniqueEmails(rows: { email?: string | null }[]): string[] {
  return [...new Set(rows.map((r) => r.email?.trim().toLowerCase()).filter((e): e is string => !!e))]
}

/** Display names can't contain some characters; keep it to letters and spaces. */
export function senderName(orgName: string) {
  return orgName.replace(/[^\p{L}\p{N} &'.-]/gu, '').trim() || 'Canopy'
}

export function messageHtml({ orgName, eventTitle, message }: { orgName: string; eventTitle: string; message: string }) {
  const e = escapeHtml
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <p style="color:#6b7280; font-size:13px; margin-bottom:4px;">${e(orgName)} · ${e(eventTitle)}</p>
      <div style="color:#374151; font-size:15px; line-height:1.6;">${e(message).replace(/\r?\n/g, '<br/>')}</div>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;"/>
      <p style="color:#9ca3af; font-size:12px;">You're getting this because you signed up to volunteer at ${e(eventTitle)}. Reply to this email to reach ${e(orgName)}.</p>
    </div>
  `
}

/** Sends one email per volunteer (nobody sees the others' addresses), 100 per request. */
export async function sendVolunteerMessage({
  recipients, orgName, subject, html, replyTo,
}: { recipients: string[]; orgName: string; subject: string; html: string; replyTo?: string | null }) {
  let sent = 0
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await getResend().batch.send(chunk.map((to) => ({
        from: `${senderName(orgName)} <no-reply@ivulatechnologies.com>`,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      })))
      if (error) console.error('Volunteer message batch failed:', error.message)
      else sent += chunk.length
    } catch (err) {
      console.error('Volunteer message batch failed:', err instanceof Error ? err.message : err)
    }
  }
  return { sent, failed: recipients.length - sent }
}
