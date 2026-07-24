import { LandingNav } from '@/components/landing/nav'
import { LandingHero } from '@/components/landing/hero'
import { LandingFeatures } from '@/components/landing/features'
import { LandingHowItWorks } from '@/components/landing/how-it-works'
import { LandingAudience } from '@/components/landing/audience'
import { LandingFooter } from '@/components/landing/footer'
import { LandingFaq } from '@/components/landing/faq'
import { LandingCta } from '@/components/landing/cta'

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Ivula Technologies',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://canopy.ivulatechnologies.com',
      logo: '/ivula.png',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Ivula Canopy',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'A centralized workspace for nonprofits, churches, and community organizations to manage people, volunteers, events, attendance, communications, and reporting.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '14-day free trial. No credit card required.',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Who is Ivula Canopy for?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ivula Canopy is built for growing nonprofits, churches, youth programs, volunteer groups, and community organizations that need one reliable place to manage people and programs.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can we try Canopy before committing?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Start with a 14-day free trial. No credit card is required.',
          },
        },
      ],
    },
  ],
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingAudience />
      <LandingFaq />
      <LandingCta />
      <LandingFooter />
    </div>
  )
}
