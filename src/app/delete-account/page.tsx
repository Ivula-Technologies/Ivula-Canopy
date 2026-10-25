import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your Ivula Canopy account and your organization’s data.',
  alternates: { canonical: '/delete-account' },
}

const REQUEST = `mailto:hello@ivulatechnologies.com?subject=${encodeURIComponent('Delete my Canopy account')}&body=${encodeURIComponent(
  'Please delete my Canopy account.\n\nOrganization name:\nDelete the whole organization too (yes/no):\n',
)}`

// Linked from Settings and from the Google Play listing, which requires a page
// where people can ask for their account to be deleted without the app.
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account" updated="October 25, 2026">
      <p>
        You can ask us to delete your Canopy account at any time. Send the request from the email address you sign in
        with, so we know it&apos;s you:
      </p>
      <p>
        <a href={REQUEST}>Email hello@ivulatechnologies.com to delete my account</a>
      </p>

      <h2>What happens</h2>
      <ul>
        <li>We confirm by email and delete your sign-in and profile within 30 days, usually within 2 working days.</li>
        <li>
          If you are the organization&apos;s only admin and ask for the whole organization to go, we also delete its
          members, volunteers, events, attendance, donors, donations, tasks and files. Export anything you want to keep
          from Members and Reports first.
        </li>
        <li>
          A staff member leaving an organization can also be removed by an admin under Settings, Staff. Their work in
          the organization&apos;s records stays with the organization.
        </li>
        <li>
          We keep billing records (invoices and payments) for as long as tax law requires, and nothing else. Any active
          subscription is cancelled first, so you are not charged again.
        </li>
      </ul>
    </LegalPage>
  )
}
