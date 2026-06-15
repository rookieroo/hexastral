/**
 * /auspice — the Auspice marketing landing page.
 *
 * Auspice (黄历/almanac) is the destination every `/s/*` share OG card points at
 * (footer label `hexastral.com/auspice`), so this page lives OUTSIDE the
 * next-intl `[locale]` tree to keep that URL prefix-free + stable. It
 * self-localizes (see ./copy.ts) from `?lang=` then `Accept-Language`.
 *
 * Visual language: the Auspice ink / 水墨 palette (warm 宣纸 ground + 金石 brown),
 * matching the share cards under `/s/*` — pure inline styles, no design-system
 * CSS vars (those are the dark flagship palette).
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { COPY, resolveLocale } from './copy'

interface Props {
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams
  const acceptLanguage = (await headers()).get('accept-language')
  const copy = COPY[resolveLocale(lang, acceptLanguage)]
  const title = `Yuun — ${copy.hero}`
  return {
    title,
    description: copy.sub,
    openGraph: { title, description: copy.sub, siteName: 'Yuun' },
  }
}

export default async function AuspiceLandingPage({ searchParams }: Props) {
  const { lang } = await searchParams
  const acceptLanguage = (await headers()).get('accept-language')
  const copy = COPY[resolveLocale(lang, acceptLanguage)]

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        color: '#2B2118',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4rem 1.5rem 5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          gap: '3rem',
        }}
      >
        {/* Hero */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <span
            style={{
              letterSpacing: '0.35em',
              color: '#9A6A3A',
              fontSize: '0.8rem',
            }}
          >
            {copy.eyebrow}
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '2.6rem',
              lineHeight: 1.2,
              fontWeight: 600,
              color: '#2B2118',
              letterSpacing: '0.01em',
            }}
          >
            {copy.hero}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '1.15rem',
              lineHeight: 1.6,
              color: '#6B5A47',
              maxWidth: 560,
            }}
          >
            {copy.sub}
          </p>
        </header>

        {/* Intro */}
        <p
          style={{
            margin: 0,
            fontSize: '1.02rem',
            lineHeight: 1.85,
            color: '#3A2E22',
            maxWidth: 620,
          }}
        >
          {copy.intro}
        </p>

        {/* Feature cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.1rem',
          }}
        >
          {copy.features.map((f) => (
            <section
              key={f.title}
              style={{
                background: '#FFFDF8',
                border: '1px solid #E7D9C4',
                borderRadius: 16,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                boxShadow: '0 8px 30px rgba(150,110,60,0.06)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: '#9A6A3A',
                }}
              >
                {f.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  lineHeight: 1.7,
                  color: '#3A2E22',
                }}
              >
                {f.body}
              </p>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            background: '#FFFDF8',
            border: '1px solid #E7D9C4',
            borderRadius: 18,
            padding: '2rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(150,110,60,0.08)',
          }}
        >
          <DDLRedirectButton
            payload={{ source: 'auspice_landing' }}
            targetApp='auspice'
            appStoreUrl={resolveAppStoreUrl('auspice')}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '0.8rem 2.2rem',
                background: 'linear-gradient(135deg, #C99A5B, #9A6A3A)',
                color: '#fff',
                borderRadius: 12,
                fontSize: '1.02rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {copy.cta}
            </span>
          </DDLRedirectButton>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#8A7866',
              maxWidth: 380,
              lineHeight: 1.6,
            }}
          >
            {copy.ctaNote}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '0.78rem',
            color: '#A8906F',
            letterSpacing: '0.15em',
          }}
        >
          {copy.footer}
        </div>
      </div>
    </main>
  )
}
