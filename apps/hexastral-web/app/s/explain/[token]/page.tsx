/**
 * /s/explain/[token] — server-rendered share landing for an Auspice 深度解读
 * (the per-宜忌-field deep reading). Replaces the old text-only share that dumped
 * the prose into iMessage with hexastral.com ROOT as the only link — user
 * feedback flagged this as un-shareable (no OG card, wrong destination).
 *
 * Token (base64url, no DB) carries the date, 干支日, the tapped 宜/忌 field, and
 * the explanation. The OG image (opengraph-image.tsx) previews the field + verdict
 * so a forwarded link reads as a specific reading, and the install CTA routes to
 * the App Store via the DDL session (not the marketing root).
 */

import type { Metadata } from 'next'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'

interface ExplainPayload {
  /** ISO date the reading is for, e.g. "2026-06-04". */
  dt: string
  /** 干支日, e.g. "己酉". */
  gz: string
  /** Tapped field, e.g. "宜 嫁娶" / "忌 诉讼" (raw, already localized). */
  fl: string
  /** Whether the field is 宜 (true) or 忌 (false) — drives the accent color. */
  yi: boolean
  /** The explanation prose. */
  ex: string
  /** Locale code. */
  lc?: string
}

function decodeToken(token: string): ExplainPayload | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64.padEnd(b64.length + (4 - (b64.length % 4)), '=')
    const json = Buffer.from(pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as Partial<ExplainPayload>
    if (
      typeof parsed.dt !== 'string' ||
      typeof parsed.gz !== 'string' ||
      typeof parsed.fl !== 'string' ||
      typeof parsed.ex !== 'string'
    )
      return null
    return {
      dt: parsed.dt.slice(0, 12),
      gz: parsed.gz.slice(0, 12),
      fl: parsed.fl.slice(0, 24),
      yi: parsed.yi !== false,
      ex: parsed.ex.slice(0, 1200),
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

interface ShareCopy {
  hero: string
  tagline: string
  cta: string
  footer: string
}

const EN_COPY: ShareCopy = {
  hero: 'AUSPICE · DEEP READING',
  tagline: 'Why today favors what it favors',
  cta: 'See your own',
  footer: 'The Chinese calendar — daily 干支 · 农历 · 宜忌',
}

const COPY: Record<string, ShareCopy> = {
  'zh-Hans': {
    hero: 'AUSPICE · 深度解读',
    tagline: '今天为什么宜这个、忌那个',
    cta: '看看你自己的',
    footer: '每日干支 · 农历 · 节气 · 宜忌',
  },
  'zh-Hant': {
    hero: 'AUSPICE · 深度解讀',
    tagline: '今天為什麼宜這個、忌那個',
    cta: '看看你自己的',
    footer: '每日干支 · 農曆 · 節氣 · 宜忌',
  },
  ja: {
    hero: 'AUSPICE · 詳しい解説',
    tagline: '今日、なぜそれが吉でそれが凶なのか',
    cta: 'あなたのも見てみる',
    footer: '干支 · 旧暦 · 二十四節気 · 宜忌',
  },
  en: EN_COPY,
}

function copyFor(lc: string | undefined): ShareCopy {
  return COPY[lc ?? 'en'] ?? EN_COPY
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const payload = decodeToken(token)
  if (!payload) {
    return { title: 'Auspice — 深度解读', description: 'A deep reading from Auspice.' }
  }
  const copy = copyFor(payload.lc)
  const title = `${payload.fl} · ${payload.gz}日 — Auspice ${copy.hero.replace('AUSPICE · ', '')}`
  return {
    title,
    description: copy.tagline,
    openGraph: { title, description: copy.tagline, siteName: 'Auspice' },
  }
}

export default async function ExplainSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const copy = copyFor(payload?.lc)
  const accent = payload?.yi === false ? '#C0452E' : '#2E9E5B'
  const accentBg = payload?.yi === false ? 'rgba(192,69,46,0.08)' : 'rgba(46,158,91,0.08)'

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        color: '#2B2118',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 1.5rem 4rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            letterSpacing: '0.3em',
            color: '#9A6A3A',
            fontSize: '0.8rem',
          }}
        >
          {copy.hero}
        </div>

        {payload ? (
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #E7D9C4',
              borderRadius: 18,
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              boxShadow: '0 8px 30px rgba(150,110,60,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.45rem 1rem',
                  borderRadius: 12,
                  background: accentBg,
                  border: `1px solid ${accent}33`,
                  color: accent,
                  fontSize: '1.15rem',
                  fontWeight: 600,
                }}
              >
                {payload.fl}
              </span>
              <span style={{ color: '#8A7866', fontSize: '0.95rem' }}>
                {payload.gz}日 · {payload.dt}
              </span>
            </div>

            <div
              style={{
                fontSize: '0.97rem',
                lineHeight: 1.8,
                color: '#3A2E22',
                whiteSpace: 'pre-wrap',
              }}
            >
              {payload.ex}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #E7D9C4',
              borderRadius: 18,
              padding: '2rem 1.5rem',
              textAlign: 'center',
              color: '#8A7866',
              fontSize: '0.95rem',
            }}
          >
            This reading link is malformed or has been truncated. Open Auspice to share again.
          </div>
        )}

        <div
          style={{
            background: '#FFFDF8',
            border: '1px solid #E7D9C4',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>{copy.tagline}</p>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#8A7866',
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            Auspice — {copy.footer}
          </p>
          <DDLRedirectButton payload={{ source: 'auspice_explain_share', date: payload?.dt }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.7rem 1.8rem',
                background: 'linear-gradient(135deg, #C99A5B, #9A6A3A)',
                color: '#fff',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              {copy.cta}
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
