import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import {
  isSatellitePrivacyKey,
  SATELLITE_PRIVACY_APPENDICES,
  SATELLITE_PRIVACY_KEYS,
} from '@/lib/legal/satellite-privacy-appendices'
import { locales, type Locale } from '@/i18n/routing'

interface Props {
  params: Promise<{ locale: Locale; appKey: string }>
}

export function generateStaticParams(): { locale: Locale; appKey: string }[] {
  return locales.flatMap((locale) =>
    SATELLITE_PRIVACY_KEYS.map((appKey) => ({ locale, appKey }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appKey } = await params
  if (!isSatellitePrivacyKey(appKey)) {
    return { title: 'Privacy appendix' }
  }
  const appendix = SATELLITE_PRIVACY_APPENDICES[appKey]
  return {
    title: `${appendix.displayName} · Privacy appendix · HexAstral`,
    description: appendix.summary,
    robots: { index: false },
  }
}

export default async function SatellitePrivacyAppendixPage({ params }: Props) {
  const { appKey } = await params
  if (!isSatellitePrivacyKey(appKey)) {
    notFound()
  }
  const appendix = SATELLITE_PRIVACY_APPENDICES[appKey]

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
        href='/privacy'
        style={{
          fontSize: '0.82rem',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          display: 'block',
          marginBottom: '2rem',
        }}
      >
        ← Umbrella Privacy Policy
      </Link>

      <p style={{ fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--color-gold)', marginBottom: '0.75rem' }}>
        SATELLITE APP APPENDIX
      </p>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.75rem' }}>{appendix.displayName}</h1>
      <p style={{ fontSize: '0.92rem', color: 'var(--color-ivory-dim)', lineHeight: 1.75, marginBottom: '2rem' }}>
        {appendix.summary}
      </p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--color-gold)', marginBottom: '0.75rem' }}>
        App-specific data flows
      </h2>
      <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
        {appendix.bullets.map((line) => (
          <li
            key={line}
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-ivory-dim)',
              lineHeight: 1.75,
              marginBottom: '0.65rem',
            }}
          >
            {line}
          </li>
        ))}
      </ul>

      <div style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: '2.5rem', paddingTop: '1.5rem' }}>
        <Link href='/privacy' style={{ fontSize: '0.82rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
          Full HexAstral Privacy Policy →
        </Link>
      </div>
    </main>
  )
}
