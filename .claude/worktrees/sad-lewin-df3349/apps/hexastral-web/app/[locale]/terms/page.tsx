import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service · HexAstral',
  description: 'HexAstral Terms of Service',
  robots: { index: false },
}

const LAST_UPDATED = 'March 1, 2026'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By using HexAstral (the "App" or "Service"), you confirm that you have read, understood, and agree to all terms of this Terms of Service agreement. If you do not agree, please discontinue use immediately. These terms apply to the HexAstral iOS application and related web services (hexastral.com and its subdomains).',
  },
  {
    title: '2. Nature of Service & Disclaimer',
    content:
      'HexAstral provides Destiny Chart readings, Star Palace readings, Feng Shui analysis, and AI-generated astrology readings based on ancient Eastern metaphysical wisdom — for entertainment, cultural exploration, and personal reference only.\n\nNothing in this Service constitutes legal, medical, financial, psychological, or any other professional advice. Reading results do not guarantee accuracy or applicability. Users bear full responsibility for any decisions made based on Service content.\n\nHexAstral expressly disclaims any liability for direct or indirect losses arising from use of or reliance on the Service.',
  },
  {
    title: '3. Account & Birth Information',
    content:
      'When using the Service, you provide birth date, time, gender, and similar data ("Birth Information"). You confirm that information you provide is accurate, or that you have obtained explicit consent from any third party (e.g., a partner in a compatibility reading) before submitting their data.\n\nYour Birth Information is used for astrology calculations and may be used to improve service quality. Please refer to the Privacy Policy for details on data handling.',
  },
  {
    title: '4. Paid Content & Refund Policy',
    content:
      'HexAstral offers both free and paid content. Paid content is processed via Apple In-App Purchase (IAP), including:\n\n• Incense (divination credits) — consumable one-time items used to unlock deep AI readings\n• HexAstral Pro — monthly / annual subscription\n\nAll in-app purchases are governed by Apple App Store Terms of Service. Refund requests for digital content must be submitted through official Apple channels; HexAstral does not process refunds directly. Spent incense credits are non-refundable.',
  },
  {
    title: '5. Prohibited Activities',
    content:
      'You agree not to:\n\n• Use automated tools or bots to bulk-scrape Service content\n• Resell or redistribute AI-generated reports for commercial purposes\n• Attempt to reverse-engineer or circumvent technical restrictions of the Service\n• Submit false birth information to obtain inappropriate content',
  },
  {
    title: '6. Intellectual Property',
    content:
      'All content in the HexAstral application — including but not limited to software code, design, copy, and the arrangement of AI-generated content — is the intellectual property of HexAstral and protected by copyright law.\n\nBirth information and personal data you input remain yours. AI-generated personalized readings are licensed for personal use only and may not be used for commercial purposes.',
  },
  {
    title: '7. Service Changes & Termination',
    content:
      'We reserve the right to modify, suspend, or terminate the Service at any time, including adjustments to paid features. Significant changes will be communicated via in-app notifications or to your registered email address.\n\nWe reserve the right to terminate any account for violations of these Terms, without refund of unused incense credits.',
  },
  {
    title: '8. Governing Law',
    content:
      'These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions. Disputes shall first be resolved through good-faith negotiation; unresolved disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association.',
  },
  {
    title: '9. Contact',
    content: 'For questions about these Terms, contact us at:\n\nEmail: support@hexastral.com',
  },
] as const

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '5rem 1.5rem 4rem',
        color: 'var(--color-ivory)',
      }}
    >
      <Link
        href='/'
        style={{
          fontSize: '0.82rem',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          display: 'block',
          marginBottom: '2rem',
        }}
      >
        ← Back to Home
      </Link>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginBottom: '3rem' }}>
        Last updated: {LAST_UPDATED}
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 500,
              color: 'var(--color-gold)',
              marginBottom: '0.75rem',
            }}
          >
            {section.title}
          </h2>
          {section.content.split('\n\n').map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-ivory-dim)',
                lineHeight: 1.85,
                margin: i > 0 ? '0.75rem 0 0' : 0,
                whiteSpace: 'pre-line',
              }}
            >
              {para}
            </p>
          ))}
        </section>
      ))}

      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: '2rem',
          display: 'flex',
          gap: '1.5rem',
        }}
      >
        <Link
          href='/privacy'
          style={{ fontSize: '0.82rem', color: 'var(--color-gold)', textDecoration: 'none' }}
        >
          Privacy Policy →
        </Link>
        <Link
          href='/'
          style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)', textDecoration: 'none' }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
