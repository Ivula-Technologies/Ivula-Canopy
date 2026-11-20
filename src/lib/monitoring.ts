import { escapeHtml, getResend } from '@/lib/email'
import { durableHit } from '@/lib/durable-rate-limit'

// Error logging and alerts without another service to sign up for.
//
// - Every error is written to the server log as one JSON line (cPanel keeps
//   it in the app's stderr.log), so it can be searched by job or route.
// - If ALERT_EMAIL is set, the error is also emailed there through Resend,
//   which Canopy already uses. The same error is sent at most once an hour,
//   and at most 20 alerts a day, so a bad night can't flood the inbox.
//
// Never pass names, emails or other personal details in `fields`: ids only.

type Fields = Record<string, unknown>
type Level = 'info' | 'warn' | 'error'

const SAME_ERROR_GAP_MS = 60 * 60_000
const DAY_MS = 24 * 60 * 60_000
const MAX_ALERTS_PER_DAY = 20

export function logEvent(level: Level, message: string, fields: Fields = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/** Strips query strings and long ids or tokens out of a request path. */
export function redactPath(path: string): string {
  return path.split('?')[0].replace(/\/[A-Za-z0-9_-]{16,}/g, '/:id')
}

/** The first line of an error, cut to a size that is safe to log and email. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
  return (raw || 'Unknown error').split('\n')[0].slice(0, 300)
}

/** Groups repeats of the same error so each kind is emailed once an hour. */
export function alertSignature(where: string, message: string): string {
  return `${where}|${message.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}|\d+/gi, '#')}`.slice(0, 200)
}

async function allowedToSend(signature: string): Promise<boolean> {
  const sameError = await durableHit(`alert:${signature}`, 1, SAME_ERROR_GAP_MS)
  if (sameError > 0) return false
  return (await durableHit('alert:daily', MAX_ALERTS_PER_DAY, DAY_MS)) === 0
}

export async function reportError(where: string, err: unknown, fields: Fields = {}) {
  const message = errorMessage(err)
  const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 12).join('\n') : undefined
  logEvent('error', where, { error: message, ...fields, ...(stack ? { stack } : {}) })

  const to = process.env.ALERT_EMAIL
  if (!to || !process.env.RESEND_API_KEY) return

  try {
    if (!(await allowedToSend(alertSignature(where, message)))) return
    const from = process.env.RESEND_FROM_EMAIL || 'hello@ivulatechnologies.com'
    const details = Object.entries(fields)
      .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`)
      .join('')
    await getResend().emails.send({
      from: `Canopy alerts <${from.replace(/^.*<|>.*$/g, '')}>`,
      to,
      subject: `Canopy error: ${where}`.slice(0, 120),
      html: `
        <p><strong>${escapeHtml(where)}</strong> failed on ${escapeHtml(new Date().toISOString())}.</p>
        <p>${escapeHtml(message)}</p>
        ${details ? `<ul>${details}</ul>` : ''}
        ${stack ? `<pre style="font-size:12px;white-space:pre-wrap">${escapeHtml(stack)}</pre>` : ''}
        <p style="font-size:12px;color:#666">Build ${escapeHtml(process.env.CANOPY_BUILD || 'unknown')}.
        The same error is emailed at most once an hour, and 20 alerts a day at most.
        Clear ALERT_EMAIL in cPanel to stop these emails.</p>
      `,
    })
  } catch (sendError) {
    logEvent('warn', 'alert email failed', { error: errorMessage(sendError) })
  }
}
