import type { Metadata } from 'next'

import { Link } from '@/i18n/navigation'
import { SATELLITE_PRIVACY_APPENDICES, SATELLITE_PRIVACY_KEYS } from '@/lib/legal/satellite-privacy-appendices'

export const metadata: Metadata = {
  title: 'Privacy Policy · HexAstral',
  description: 'HexAstral Privacy Policy — how we collect, use, and protect your personal information',
  robots: { index: false },
}

const LAST_UPDATED = 'March 1, 2026'

const SECTIONS = [
  {
    title: '1. Overview',
    content:
      'We take your privacy seriously. This Privacy Policy describes how HexAstral ("we", "us") collects, uses, stores, and protects your personal information.\n\nThis Policy complies with applicable data protection laws, including Apple App Store privacy requirements and relevant international regulations.',
  },
  {
    title: '2. Information We Collect',
    content:
      '2.1 Information you provide\n• Birth information: date, time, gender (used for astrology calculations)\n• Personal name / nickname (optional)\n• Apple ID (when signing in with Apple)\n• Email address (optional, for account recovery)\n\n2.2 Automatically collected information\n• Device identifiers (IDFV only — not IDFA; no ad tracking)\n• App usage logs (feature usage statistics, no sensitive content)\n• Crash reports (via Cloudflare, used for bug fixes)\n• IP address (for regional detection and security; not stored long-term)\n\n2.3 What we do NOT collect\n• We do not request access to your contacts or photo library (except the Face/Palm reading feature, which processes images locally and does not upload them to our servers)\n• We do not collect precise GPS location (city-level only for timezone)\n• We do not perform cross-app advertising tracking',
  },
  {
    title: '3. How We Use Your Information',
    content:
      'Your birth information and related data are used for:\n\n• Core features: Destiny Chart readings, Star Palace calculations, fate cycle analysis, compatibility readings\n• AI reading generation: your birth data is sent to AI model APIs (Cloudflare Workers AI and partner LLM providers) to generate personalized readings\n• Service improvement: aggregated, anonymized analytics to improve calculation accuracy\n• Security: necessary verification to prevent abuse\n\nWe do not sell, rent, or share your personal birth information with third parties for commercial purposes.',
  },
  {
    title: '4. AI Models & Third-Party Services',
    content:
      'To provide AI-powered readings, your birth information (not identity information) is transmitted to the following third-party AI providers:\n\n• Cloudflare Workers AI (United States) — inference tasks\n• Anthropic / Google Gemini (depending on feature) — advanced reading generation\n\nThese providers process data under their own privacy policies. We have signed Data Processing Agreements (DPAs) prohibiting use of your data for model training or other unauthorized purposes.\n\nAnalytics: PostHog (EU data residency configurable), collecting only anonymous behavioral data.',
  },
  {
    title: '5. Data Storage & Security',
    content:
      '• Storage: Cloudflare global edge network (data stored in nearest region, default APAC)\n• Transmission: all data transmitted via TLS 1.3 encryption\n• At rest: database-level encryption (AES-256)\n• Access controls: strict employee permission tiers, principle of least privilege\n• Retention: account data permanently deleted within 30 days of account deletion; anonymized analytics retained up to 24 months',
  },
  {
    title: '6. Your Rights',
    content:
      'Under applicable law, you have the right to:\n\n• Access: view the personal data we hold about you\n• Correction: fix inaccurate personal information\n• Deletion ("right to be forgotten"): request deletion of all account data\n• Data portability: export your chart data in machine-readable format\n• Withdraw consent: revoke consent to data processing at any time\n\nTo exercise these rights, email: privacy@hexastral.com\nWe will respond within 15 business days.',
  },
  {
    title: '7. Face / Palm Reading — Special Notice',
    content:
      'The Face and Palm reading features require you to upload a photo. Regarding this feature:\n\n• Photos are transmitted temporarily to an AI vision model (VLM) only during analysis\n• Photos are immediately deleted from our servers after analysis; we do not store them\n• Text descriptions of analysis results may be saved to your history (deletable at any time)\n• Photos are not used for model training\n\nIf you do not accept these terms, please do not use the Face/Palm reading features.',
  },
  {
    title: '8. Children\'s Privacy',
    content:
      'The Service is not directed to children under the age of 16. We do not knowingly collect personal information from minors. If you believe a minor has used the Service, contact us and we will immediately delete any related data.',
  },
  {
    title: '9. Policy Changes',
    content:
      'For material changes to this Policy, we will notify you via in-app modal or push notification, and update the "Last updated" date on this page. Continued use of the Service constitutes acceptance of the updated Policy.',
  },
  {
    title: '10. Contact Us',
    content: 'For privacy-related questions, contact:\n\nEmail: privacy@hexastral.com\n\nWe are committed to responding to all privacy inquiries within 15 business days.',
  },
  {
    title: '11. Portfolio satellite apps',
    content:
      'HexAstral operates focused satellite apps (Face Oracle, Star Palace, Soul Match, Feng Shui AI, Dream Oracle, Eight Pillars, Coin Cast). Each app shares the same privacy fundamentals described above but may surface different inputs (camera, dreams, compatibility pairs, etc.). Review the appendix that matches the app you installed for concrete collection examples.',
  },
] as const

export default function PrivacyPage() {
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

      <h1 style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginBottom: '3rem' }}>
        Last updated: {LAST_UPDATED} · Applies to the HexAstral iOS app and hexastral.com
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.05rem', fontWeight: 500,
              color: 'var(--color-gold)', marginBottom: '0.75rem',
            }}
          >
            {section.title}
          </h2>
          {section.content.split('\n\n').map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.9rem', color: 'var(--color-ivory-dim)', lineHeight: 1.85,
                margin: i > 0 ? '0.75rem 0 0' : 0, whiteSpace: 'pre-line',
              }}
            >
              {para}
            </p>
          ))}
        </section>
      ))}

      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontSize: '1.05rem',
            fontWeight: 500,
            color: 'var(--color-gold)',
            marginBottom: '0.75rem',
          }}
        >
          Satellite privacy appendices
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SATELLITE_PRIVACY_KEYS.map((key) => (
            <li key={key} style={{ marginBottom: '0.55rem' }}>
              <Link
                href={`/privacy/${key}`}
                style={{ fontSize: '0.88rem', color: 'var(--color-gold)', textDecoration: 'none' }}
              >
                {SATELLITE_PRIVACY_APPENDICES[key].displayName} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)', paddingTop: '2rem',
          display: 'flex', gap: '1.5rem',
        }}
      >
        <Link href="/terms" style={{ fontSize: '0.82rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
          Terms of Service →
        </Link>
        <Link href="/" style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)', textDecoration: 'none' }}>
          Back to Home
        </Link>
      </div>
    </main>
  )
}
