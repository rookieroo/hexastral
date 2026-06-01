/**
 * /[locale]/yuan — Yuán (緣) product landing page.
 *
 * Three goals:
 *   1. Communicate what Yuán is in ≤ 1 scroll (relationship analysis, not solo)
 *   2. CTA "start a connection" → /[locale]/yuan/start (web flow) OR App Store
 *   3. SEO: capture "synastry", "couples chart", "BaZi compatibility", "Chinese cosmology"
 *
 * Visual: rice-paper light background, cinnabar 緣 hero glyph, ink-gold accents.
 * Mirrors the mobile Yuán aesthetic so the brand feels continuous across web ↔ app.
 *
 * Replaces (with 301 redirects from):
 *   - /[locale]/resonate/[token]  → /[locale]/yuan/invite/[token]
 *   - /hehun/[token]              → /[locale]/yuan/invite/[token]
 *   - /invite/[bondId]            → /[locale]/yuan/invite/[bondId]
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface YuanLandingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: YuanLandingPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Yuán: BaZi Couples Chart',
    zh: '緣 · 八字合盤',
    tw: '緣 · 八字合盤',
    ja: '縁・四柱推命の相性',
  }
  const title = titles[locale] ?? titles.en
  const descriptions: Record<string, string> & { en: string } = {
    en: 'Discover the invisible threads between two people. Ba Zi + Zi Wei synastry, by HexAstral.',
    zh: '两人之间，有看不见的丝线。八字 + 紫微合盘，HexAstral 出品。',
    tw: '兩人之間，有看不見的絲線。八字 + 紫微合盤，HexAstral 出品。',
    ja: '二人の間には、見えない糸がある。四柱推命+紫微斗数による相性鑑定。',
  }
  return {
    title,
    description: descriptions[locale] ?? descriptions.en,
    openGraph: {
      title,
      description: descriptions[locale] ?? descriptions.en,
      siteName: 'HexAstral',
    },
  }
}

export default async function YuanLandingPage({ params }: YuanLandingPageProps) {
  const { locale } = await params
  // Soft-fallback if `yuan` namespace isn't yet in messages — render plain copy.
  let t: ((k: string) => string) | null = null
  try {
    t = await getTranslations({ locale, namespace: 'yuan' })
  } catch {
    t = null
  }

  const get = (k: string, fallback: string) => {
    if (!t) return fallback
    try {
      return t(k)
    } catch {
      return fallback
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        color: '#3C2415',
        paddingTop: '120px',
        paddingBottom: '120px',
        paddingLeft: '28px',
        paddingRight: '28px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        {/* Hero seal */}
        <div
          style={{
            width: 144,
            height: 144,
            borderRadius: '50%',
            backgroundColor: '#9B2226',
            margin: '0 auto 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 72,
              color: '#C4A882',
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            緣
          </span>
        </div>

        {/* Tagline */}
        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: 300,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {get('hero_title', '两人之间')}
        </h1>
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.4,
            fontWeight: 400,
            color: 'rgba(60,36,21,0.65)',
            marginBottom: 56,
          }}
        >
          {get('hero_subtitle', '有看不见的丝线')}
        </p>

        {/* Body — what Yuán is */}
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: '#3C2415',
            marginBottom: 48,
            letterSpacing: 0.2,
            textAlign: 'left',
          }}
        >
          {get(
            'body',
            'Yuán 不限定关系。情侣、家人、朋友、合伙人——只要是两人之间的能量交织，都可以一探究竟。基于八字与紫微的合盘传统，结合 AI 解读，揭示你们之间真实的共鸣与张力。'
          )}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}yuan/start`}
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#C4A882',
              letterSpacing: 0.5,
              borderBottom: '1px solid #C4A882',
              paddingBottom: 12,
              paddingTop: 12,
              textDecoration: 'none',
            }}
          >
            {get('cta_start', '开始一段缘')}
          </Link>
          <a
            href='https://apps.apple.com/app/yuan/id000000000'
            style={{
              fontSize: 13,
              color: 'rgba(60,36,21,0.65)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            {get('cta_app', 'Get Yuán on iOS')}
          </a>
        </div>

        {/* Brand tail */}
        <p
          style={{
            marginTop: 96,
            fontSize: 11,
            color: 'rgba(60,36,21,0.35)',
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
