import type { Metadata } from 'next'
import { GrowthShell } from '@/components/growth/GrowthShell'
import { getMarketingNav } from '@/lib/growth/get-marketing-nav'
import { JsonLd } from '@/lib/json-ld'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Methodology & integrity — HexAstral',
    description:
      'How we blend classical Chinese metaphysics books with Gemini-class models, privacy controls, and multi-app rollout.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/about/methodology'
          : `https://hexastral.com/${locale}/about/methodology`,
    },
  }
}

export default async function MethodologyPage() {
  const nav = await getMarketingNav()

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does HexAstral predict the future?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Outputs are framed as culturally grounded reflection. They may reference timelines (大运, 流年) but always as tendencies, never guarantees.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do you cite Chinese source terms responsibly?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We lead with English metaphors natives already know (Western astrology parallels, personality typing) while keeping pinyin plus Han characters for authenticity and citation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which apps consume the backend?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Flagship apps Yuel (charts + synastry) and Kanyu (feng-shui site analysis) plus funnel apps Yuun (almanac) and Yaul (I Ching study) share astro-core computations and unified account plumbing. DreamOracle, FaceOracle, StarPalace, and EightPillars are not in the current launch wave.',
        },
      },
      {
        '@type': 'Question',
        name: 'What about privacy for face or space photos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each vertical ships its own Privacy Policy appendix. Engineers prioritize ephemeral inference, structured JSON extraction, and user-controlled deletes where Cloudflare stacks allow.',
        },
      },
    ],
  }

  return (
    <GrowthShell nav={nav}>
      <article>
        <JsonLd json={faq} />
        <h1 style={{ fontWeight: 400 }}>HexAstral Methodology · 研究方法</h1>
        <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.75 }}>
          We treat classical texts ( Zhou Yi · 周易, Zi Wei tomes, Ba Zi anthologies ) as annotated
          priors — Gemini-class models narrate within guardrails referencing those priors
          explicitly.
        </p>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--color-gold)', fontWeight: 500 }}>
          Three promises
        </h2>
        <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.7, color: 'var(--color-ivory)' }}>
          <li>Name the lineage — metaphysics nerds deserve receipts.</li>
          <li>
            Show the seams — differentiate deterministic chart math vs. interpretive narration.
          </li>
          <li>Ship narrow apps — Feng Shui and Face Reading deserve separate SKU trust.</li>
        </ol>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginTop: '2rem' }}>
          Operational note: pairing growth UTMs persists for 30 days via <code>growth_utm</code>{' '}
          middleware cookies to align paid social + DDL sessions.
        </p>
      </article>
    </GrowthShell>
  )
}
