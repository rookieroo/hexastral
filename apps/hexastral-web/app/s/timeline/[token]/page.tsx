/**
 * /s/timeline/[token] — server-rendered share landing for an Auspice life-timeline
 * snapshot. Scoped to the user's CURRENT 大运 (10-year cycle) + this year's 流年,
 * per feedback that "share by 大运 unit, not by year" (the full timeline is too
 * long to convey in one frame).
 *
 * Tokenless URL (same approach as /s/makeif): the mobile app base64url-encodes a
 * compact payload — source 命局 + current 大运 + current 流年 + fit verdict + a
 * short advice line. No DB, no auth, the recipient sees the actual snapshot
 * (not a generic landing) in iMessage preview via opengraph-image.
 */

import type { Metadata } from 'next'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface TimelinePayload {
  /** Source 命局 — natal day pillar, e.g. "乙卯". */
  s: string
  /** Current 大运 pillar, e.g. "丙午". */
  d: string
  /** Current 大运 age range, e.g. "38–47". */
  da: string
  /** Current 流年 year, e.g. 2026. */
  y: number
  /** Current 流年 pillar, e.g. "丙午". */
  yp: string
  /** Fit verdict for now — 吉 / 平 / 凶 (raw CJK). */
  f: '吉' | '平' | '凶'
  /** Short advice line (1-2 sentences). */
  ad: string
  /** Locale code. */
  lc?: string
}

function decodeToken(token: string): TimelinePayload | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64.padEnd(b64.length + (4 - (b64.length % 4)), '=')
    const json = Buffer.from(pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as Partial<TimelinePayload>
    if (
      typeof parsed.s !== 'string' ||
      typeof parsed.d !== 'string' ||
      typeof parsed.da !== 'string' ||
      typeof parsed.yp !== 'string' ||
      typeof parsed.ad !== 'string' ||
      typeof parsed.y !== 'number'
    )
      return null
    const fit = parsed.f
    return {
      s: parsed.s.slice(0, 12),
      d: parsed.d.slice(0, 12),
      da: parsed.da.slice(0, 16),
      y: parsed.y,
      yp: parsed.yp.slice(0, 12),
      f: fit === '吉' || fit === '平' || fit === '凶' ? fit : '平',
      ad: parsed.ad.slice(0, 320),
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
  source: string
  dayun: string
  liunian: string
  verdict: string
  fitOf: (fit: '吉' | '平' | '凶') => string
}

const EN_COPY: ShareCopy = {
  hero: 'YUUN · LIFE TIMELINE',
  tagline: 'See your real timeline branch by branch',
  cta: 'See your own',
  footer: 'Yuun — your life as a branching timeline · 大运 · 流年 · 流月',
  source: 'Source 命',
  dayun: 'Current cycle',
  liunian: 'This year',
  verdict: 'For you',
  fitOf: (fit) => (fit === '吉' ? 'Favorable' : fit === '凶' ? 'Watch' : 'Neutral'),
}

const COPY: Record<string, ShareCopy> = {
  'zh-Hans': {
    hero: 'YUUN · 人生时间线',
    tagline: '把你的命局看清——按大运一段一段看',
    cta: '看看你自己的',
    footer: 'Yuun · 大运 · 流年 · 流月 —— 把一生看成一条分叉的时间线',
    source: '命 · 日主',
    dayun: '当前大运',
    liunian: '当年流年',
    verdict: '对你而言',
    fitOf: (fit) => fit,
  },
  'zh-Hant': {
    hero: 'YUUN · 人生時間線',
    tagline: '把你的命局看清 —— 按大運一段一段看',
    cta: '看看你自己的',
    footer: 'Yuun · 大運 · 流年 · 流月 —— 把一生看成一條分叉的時間線',
    source: '命 · 日主',
    dayun: '當前大運',
    liunian: '當年流年',
    verdict: '對你而言',
    fitOf: (fit) => fit,
  },
  ja: {
    hero: 'YUUN · 人生タイムライン',
    tagline: 'あなたの命局を、大運ごとに見つめる',
    cta: 'あなたのも見てみる',
    footer: 'Yuun · 大運 · 流年 · 流月 —— 人生を枝分かれする時間軸として',
    source: '命 · 日主',
    dayun: '今の大運',
    liunian: 'この一年',
    verdict: 'あなたにとって',
    fitOf: (fit) => (fit === '吉' ? '吉' : fit === '凶' ? '凶' : '平'),
  },
  en: EN_COPY,
}

function copyFor(lc: string | undefined): ShareCopy {
  return COPY[lc ?? 'en'] ?? EN_COPY
}

const FIT_COLOR: Record<'吉' | '平' | '凶', string> = {
  吉: '#2E9E5B',
  平: '#9A6A3A',
  凶: '#C0452E',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const payload = decodeToken(token)
  if (!payload) {
    return { title: 'Yuun — 人生时间线', description: 'A life-timeline snapshot.' }
  }
  const copy = copyFor(payload.lc)
  const title = `${payload.d} · ${payload.da} — Yuun ${copy.hero.replace('YUUN · ', '')}`
  return {
    title,
    description: copy.tagline,
    openGraph: { title, description: copy.tagline, siteName: 'Yuun' },
  }
}

export default async function TimelineSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const payload = decodeToken(token)
  const copy = copyFor(payload?.lc)

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
              gap: '1.4rem',
              boxShadow: '0 8px 30px rgba(150,110,60,0.08)',
            }}
          >
            <Row label={copy.source} value={`${payload.s} 日`} muted />
            <Row label={copy.dayun} value={`${payload.d}  ${payload.da}`} strong />
            <Row label={copy.liunian} value={`${payload.y} · ${payload.yp}`} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                paddingTop: '0.4rem',
                borderTop: '1px solid #EFE2CB',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  background: FIT_COLOR[payload.f],
                }}
              />
              <span style={{ fontSize: '0.78rem', letterSpacing: '0.2em', color: '#9A6A3A' }}>
                {copy.verdict}
              </span>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: FIT_COLOR[payload.f],
                  marginLeft: 'auto',
                }}
              >
                {copy.fitOf(payload.f)}
              </span>
            </div>
            <div
              style={{
                fontSize: '0.97rem',
                lineHeight: 1.75,
                color: '#3A2E22',
              }}
            >
              {payload.ad}
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
            This timeline link is malformed or has been truncated. Open Yuun to share again.
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
            {copy.footer}
          </p>
          <DDLRedirectButton
            payload={{ source: 'auspice_timeline_share' }}
            targetApp='auspice'
            appStoreUrl={resolveAppStoreUrl('auspice')}
          >
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

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.9rem' }}>
      <span
        style={{
          fontSize: '0.72rem',
          letterSpacing: '0.22em',
          color: '#9A6A3A',
          minWidth: 86,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: strong ? '1.6rem' : muted ? '1.05rem' : '1.2rem',
          fontWeight: strong ? 600 : muted ? 400 : 500,
          color: muted ? '#8A7866' : '#2B2118',
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
