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
      'How we blend classical Chinese metaphysics sources with large language models, privacy controls, and focused apps.',
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
        name: 'Which apps share this backend?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yuel (charts and synastry) and Kanyu (feng-shui site study) are our chart and space apps. Yuun (daily almanac) and Yaul (I Ching Liu Yao) are everyday reference tools. They share core computations and one account. Other titles may launch later.',
        },
      },
      {
        '@type': 'Question',
        name: 'What about privacy for face or space photos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each app has its own Privacy Policy appendix. We prioritize ephemeral inference where possible, structured extraction, and user-controlled deletes.',
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
          We treat classical texts (Zhou Yi · 周易, Zi Wei tomes, Ba Zi anthologies) as annotated
          sources — large language models narrate within guardrails that reference those sources
          explicitly.
        </p>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--color-gold)', fontWeight: 500 }}>
          Three promises
        </h2>
        <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.7, color: 'var(--color-ivory)' }}>
          <li>Name the lineage — classical terms deserve clear citations.</li>
          <li>Show the seams — separate deterministic chart math from interpretive narration.</li>
          <li>
            Keep apps focused — feng-shui and face reading belong in their own products, not one
            omnibus.
          </li>
        </ol>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginTop: '2rem' }}>
          If you arrive from an ad, we may remember campaign parameters for about 30 days to measure
          installs fairly. Details are in the Privacy Policy.
        </p>
      </article>
    </GrowthShell>
  )
}
