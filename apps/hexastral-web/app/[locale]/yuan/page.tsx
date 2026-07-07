/**
 * /[locale]/yuan — Kindred (Kindred) product landing page.
 *
 * Three goals:
 *   1. Communicate what Kindred is in ≤ 1 scroll (relationship analysis, not solo)
 *   2. CTA "start a connection" → /[locale]/yuan/start (web flow) OR App Store
 *   3. SEO: capture "synastry", "couples chart", "BaZi compatibility", "Chinese cosmology"
 *
 * Visual: rice-paper light background, cinnabar Kindred hero glyph, ink-gold accents.
 * Mirrors the mobile Kindred aesthetic so the brand feels continuous across web ↔ app.
 *
 * Replaces (with 301 redirects from):
 *   - /[locale]/resonate/[token]  → /[locale]/yuan/invite/[token]
 *   - /hehun/[token]              → /[locale]/yuan/invite/[token]
 *   - /invite/[bondId]            → /[locale]/yuan/invite/[bondId]
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface KindredLandingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: KindredLandingPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Yuel: BaZi Couples Chart',
    zh: 'Yuel · 八字合盤',
    tw: 'Yuel · 八字合盤',
    ja: '縁・四柱推命の相性',
  }
  const title = titles[locale] ?? titles.en
  const descriptions: Record<string, string> & { en: string } = {
    en: 'Explore interaction patterns between two Ba Zi charts — educational relationship typology, not predictive matchmaking.',
    zh: '探索两人八字命盘的互动模式——关系类型研习，非命运配对。',
    tw: '探索兩人八字命盤的互動模式——關係類型研習，非命運配對。',
    ja: '二人の四柱命盤の相互作用パターンを学ぶ — 関係タイポロジーの学習、運命マッチングではありません。',
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

export default async function KindredLandingPage({ params }: KindredLandingPageProps) {
  const { locale } = await params
  // Soft-fallback if `yuan` namespace isn't yet in messages — render plain copy.
  let t: ((k: string) => string) | null = null
  try {
    t = await getTranslations({ locale, namespace: 'kindred' })
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
            Yuel
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

        {/* Body — what Kindred is */}
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
            'Yuel 不限定关系。情侣、家人、朋友、合伙人——只要是两人之间的能量交织，都可以从八字合盘框架作文化探索。基于古典命理传统与 AI 叙述，呈现互动模式与张力 — 描述性解读，非预测，非心理咨询或专业建议。'
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
            {get('cta_app', 'Get Yuel on iOS')}
          </a>
        </div>

        <p
          style={{
            marginTop: 48,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'rgba(60,36,21,0.55)',
            textAlign: 'center',
          }}
        >
          {locale === 'ja'
            ? '娯楽・文化探索・個人的省察のみ。カウンセリング、治療、専門助言の代替ではありません。'
            : locale === 'tw'
              ? '僅供娛樂、文化探索與個人省思——非心理諮詢、關係治療或專業建議。'
              : locale === 'zh'
                ? '仅供娱乐、文化探索与个人省思——非心理咨询、关系治疗或专业建议。'
                : 'For entertainment, cultural exploration, and personal reflection only — not counseling, therapy, or professional advice.'}
        </p>

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
