import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Ivula Canopy collects, uses and protects your organization’s information.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 20, 2026">
      <p>
        Ivula Canopy (&ldquo;Canopy&rdquo;) is made by Ivula Technologies (&ldquo;we&rdquo;). Churches, nonprofits and
        community groups use Canopy to keep track of their people, volunteers, events and giving. This page explains
        what information Canopy holds, why, and the choices you have. Questions go to{' '}
        <a href="mailto:hello@ivulatechnologies.com">hello@ivulatechnologies.com</a>.
      </p>

      <h2>Your organization owns its data</h2>
      <p>
        The people, volunteer, attendance, donor and donation records your organization enters belong to your
        organization. We store and process them only to run Canopy for you. We do not sell them, rent them, use them
        for advertising, or contact the people in them for our own purposes.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> the name, email address and password of each staff member who signs in.</li>
        <li><strong>Organization details:</strong> your organization&apos;s name, contact details, time zone and plan.</li>
        <li><strong>Records you add:</strong> members, teams, events, attendance, volunteer hours, tasks, announcements, expenses, donors and donations.</li>
        <li><strong>Volunteer sign-ups:</strong> when someone signs up for a shift from a public link, the name, email, phone number and note they enter.</li>
        <li><strong>Billing:</strong> handled by Stripe. We see your plan, payment status and the last digits of your card, never the full card number.</li>
        <li><strong>Basic usage data:</strong> server logs and anonymous page-speed measurements, used to keep Canopy fast and working.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run Canopy: show your records to the staff you have given access, and keep each organization&apos;s data separate from every other organization&apos;s.</li>
        <li>To send the emails Canopy is built to send: sign-up confirmations and shift reminders to volunteers, announcements your staff choose to email, and account and billing emails to your admins.</li>
        <li>To support you when you ask for help, and to fix problems.</li>
      </ul>

      <h2>Who else handles it</h2>
      <p>We use a small number of service providers, each only for the job listed:</p>
      <ul>
        <li><strong>Supabase</strong>: database and sign-in.</li>
        <li><strong>Stripe</strong>: subscription payments.</li>
        <li><strong>Resend</strong>: email delivery.</li>
        <li><strong>Our web hosting provider</strong>: runs the Canopy application servers.</li>
      </ul>
      <p>
        We share information beyond this only if the law requires it, or to protect someone&apos;s safety, and we will
        tell you when we are allowed to.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Canopy is served over encrypted connections (HTTPS). Each organization&apos;s records are walled off from other
        organizations, and your admins decide what each staff role can see and change. No system is perfectly secure,
        so if we ever learn of a breach that affects your data, we will tell you promptly.
      </p>

      <h2>Children and youth ministry</h2>
      <p>
        Canopy is used by organizations, not by children directly. If your organization records information about
        minors (for example, in a youth program), you are responsible for having permission from a parent or guardian
        to do so.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Admins can edit or delete records at any time and export the member list as a spreadsheet.</li>
        <li>Volunteers can cancel a shift from the link in their confirmation email, and can ask the organization (or us) to delete their details.</li>
        <li>
          If you close your account, email us and we will delete your organization&apos;s data within 30 days, except
          for billing records we must keep for tax and legal reasons.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        If we change this policy in a way that matters, we will update the date above and email your organization&apos;s
        admins before the change takes effect.
      </p>
    </LegalPage>
  )
}
