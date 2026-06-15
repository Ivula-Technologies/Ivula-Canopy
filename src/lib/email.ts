import { Resend } from 'resend'

// Lazy init — constructing Resend without an API key throws at import time,
// which crashes every route that imports this module
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || 're_missing_key')
  return _resend
}
const FROM = process.env.RESEND_FROM_EMAIL || 'hello@ivulatechnologies.com'

export async function sendWelcomeEmail(to: string, orgName: string, adminName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Welcome to Ivula Canopy — ${orgName} is live!`,
    html: `
      <h2>Welcome, ${adminName}!</h2>
      <p>Your organization <strong>${orgName}</strong> has been set up on Ivula Canopy.</p>
      <p>You have a 14-day free trial. No credit card required to start.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to your dashboard →</a></p>
      <br/>
      <p>— The Ivula Canopy Team</p>
    `,
  })
}

export async function sendMemberInviteEmail(to: string, orgName: string, inviteUrl: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${orgName} on Ivula Canopy`,
    html: `
      <h2>You're invited!</h2>
      <p><strong>${orgName}</strong> has invited you to join their community on Ivula Canopy.</p>
      <p><a href="${inviteUrl}">Accept Invitation →</a></p>
      <br/>
      <p>— The Ivula Canopy Team</p>
    `,
  })
}

export async function sendAnnouncementEmail(
  recipients: string[],
  orgName: string,
  title: string,
  body: string
) {
  if (recipients.length === 0) return { sent: 0 }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <p style="color:#6b7280; font-size:13px; margin-bottom:4px;">${orgName} announcement</p>
      <h2 style="color:#1B2559; margin-top:0;">${title}</h2>
      <div style="color:#374151; font-size:15px; line-height:1.6; white-space:pre-line;">${body}</div>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;"/>
      <p style="color:#9ca3af; font-size:12px;">Sent via Ivula Canopy on behalf of ${orgName}.</p>
    </div>
  `
  // Send individually so each recipient only sees their own address.
  const results = await Promise.allSettled(
    recipients.map((to) =>
      getResend().emails.send({
        from: FROM,
        to,
        subject: `${orgName}: ${title}`,
        html,
      })
    )
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  return { sent, failed: recipients.length - sent }
}

export async function sendEventReminderEmail(
  to: string,
  memberName: string,
  eventTitle: string,
  eventDate: string,
  eventLocation?: string
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Reminder: ${eventTitle} is coming up`,
    html: `
      <h2>Hi ${memberName},</h2>
      <p>This is a reminder about an upcoming event:</p>
      <h3>${eventTitle}</h3>
      <p><strong>When:</strong> ${eventDate}</p>
      ${eventLocation ? `<p><strong>Where:</strong> ${eventLocation}</p>` : ''}
      <br/>
      <p>— The Ivula Canopy Team</p>
    `,
  })
}
