import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Ivula Canopy.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 20, 2026">
      <p>
        These terms cover your organization&apos;s use of Ivula Canopy (&ldquo;Canopy&rdquo;), made by Ivula Technologies
        (&ldquo;we&rdquo;). By creating an account you agree to them on behalf of your organization. Questions go to{' '}
        <a href="mailto:hello@ivulatechnologies.com">hello@ivulatechnologies.com</a>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>The person who signs up becomes the organization&apos;s first admin and can invite other staff.</li>
        <li>Keep passwords private. You are responsible for what happens under your organization&apos;s accounts.</li>
        <li>Only add people&apos;s information to Canopy if your organization has a right to keep it, and use Canopy&apos;s email features only for people who expect to hear from you.</li>
      </ul>

      <h2>Free trial and plans</h2>
      <ul>
        <li>Every new organization gets a 14-day free trial with all features. No card is needed to start.</li>
        <li>
          After the trial, Canopy costs $29 a month (Starter, up to 150 people), $59 a month (Growth, up to 750 people)
          or $119 a month (Pro, unlimited people). Every plan includes every feature. Current prices are always on our{' '}
          <Link href="/#pricing">pricing section</Link>.
        </li>
        <li>Plans renew monthly and are charged in advance through Stripe. If you subscribe before the trial ends, your first charge is on the day the trial ends.</li>
        <li>If your trial ends without a plan, or a payment fails and isn&apos;t fixed, your records stay safe and readable, but adding or editing is paused until billing is sorted out.</li>
        <li>We will give you at least 30 days&apos; notice by email before changing what you pay.</li>
      </ul>

      <h2>Cancelling</h2>
      <p>
        You can cancel any time from Settings → Billing. Your plan stays active until the end of the month you have paid
        for, and you are not charged again. We don&apos;t refund partial months, but if something went wrong, email us and
        we will make it right.
      </p>

      <h2>Your data</h2>
      <p>
        Everything your organization puts into Canopy stays yours. Our <Link href="/privacy">Privacy Policy</Link>{' '}
        explains how we handle it. You can export your member list at any time, and we will delete your organization&apos;s
        data when you ask us to after closing your account.
      </p>

      <h2>Acceptable use</h2>
      <p>Please don&apos;t use Canopy to break the law, send spam, harass anyone, or try to reach data that belongs to another organization. We may suspend accounts that do.</p>

      <h2>Our service</h2>
      <ul>
        <li>We work hard to keep Canopy available and your data safe, and we keep improving it. Features may change over time; we won&apos;t remove a core feature you rely on without notice.</li>
        <li>Canopy is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability is limited to what your organization paid us in the 12 months before the claim.</li>
      </ul>

      <h2>Changes to these terms</h2>
      <p>If we change these terms in a way that matters, we will update the date above and email your admins before the change takes effect.</p>
    </LegalPage>
  )
}
