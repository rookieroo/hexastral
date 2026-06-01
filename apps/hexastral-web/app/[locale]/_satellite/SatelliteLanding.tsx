/**
 * SatelliteLanding — shared landing template for HexAstral satellite apps
 * (Phase D.4). Each satellite (coin-cast, dream-oracle, face-oracle, numerology)
 * has its own page that calls this component with brand-specific copy and
 * a "try it" route + App Store link.
 *
 * Visual goals:
 *   - Single fold above the scroll: glyph + tagline + CTA cluster
 *   - Pure inline styles (no Tailwind) so satellite landings can be lifted
 *     into a future static-site generator without bringing the design system
 *   - Light-mode by default; matches the HexAstral marketing palette
 */

import Link from 'next/link'

export interface SatelliteLandingProps {
  locale: string
  /** App Store URL — falls back to https://hexastral.com if absent. */
  appStoreUrl?: string | null
  /** "Try it free in browser" route, e.g. `/numerology/calculate`. */
  tryHref: string
  /** Big mark in the hero ring — a short glyph (CJK char, emoji, single number). */
  glyph: string
  /** Hero ring color. Defaults to ink. */
  glyphColor?: string
  copy: {
    title: string
    subtitle: string
    body: string
    tryCta: string
    appCta: string
  }
}

export function SatelliteLanding({
  locale,
  appStoreUrl,
  tryHref,
  glyph,
  glyphColor = '#18181B',
  copy,
}: SatelliteLandingProps) {
  const tryUrl = `/${locale === 'en' ? '' : `${locale}/`}${tryHref.replace(/^\//, '')}`
  const appUrl = appStoreUrl ?? 'https://hexastral.com'

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#18181B',
        paddingTop: '120px',
        paddingBottom: '120px',
        paddingLeft: '28px',
        paddingRight: '28px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            width: 144,
            height: 144,
            borderRadius: '50%',
            border: `0.5px solid ${glyphColor}`,
            margin: '0 auto 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 64,
              color: glyphColor,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            {glyph}
          </span>
        </div>

        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: 300,
            letterSpacing: -0.6,
            marginBottom: 16,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            fontSize: 22,
            lineHeight: 1.4,
            color: 'rgba(24,24,27,0.65)',
            marginBottom: 56,
          }}
        >
          {copy.subtitle}
        </p>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            marginBottom: 48,
            letterSpacing: 0.2,
            textAlign: 'left',
          }}
        >
          {copy.body}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <Link
            href={tryUrl}
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: glyphColor,
              letterSpacing: 0.5,
              borderBottom: `1px solid ${glyphColor}`,
              paddingBottom: 10,
              paddingTop: 10,
              textDecoration: 'none',
            }}
          >
            {copy.tryCta}
          </Link>
          <a
            href={appUrl}
            style={{
              fontSize: 13,
              color: 'rgba(24,24,27,0.65)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {copy.appCta}
          </a>
        </div>

        <p
          style={{
            marginTop: 96,
            fontSize: 11,
            color: 'rgba(24,24,27,0.35)',
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          by HexAstral
        </p>
      </div>
    </main>
  )
}
