/**
 * /s/pair/[token] — server-rendered share landing for an Auspice "你和 X 的好日子"
 * (the Auspice×Kindred bridge's viral card).
 *
 * Token-based, no DB lookup: the share helper in auspice-app base64url-encodes a
 * compact payload ({n, dl, lc}) of the 亲友 name, the good days (date + 干支), and
 * locale. This route decodes it and renders a branded card + install CTA; the
 * companion `opengraph-image.tsx` produces the iMessage/social preview so a
 * forwarded link previews AS the card. Mirrors the make-if share (see
 * s/makeif/[token]/page.tsx) — tokenless, self-contained, zero auth round-trips.
 */

import type { Metadata } from 'next'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface PairDay {
  /** YYYY-MM-DD. */
  d: string
  /** 干支, e.g. "丙午". */
  g: string
}

interface PairPayload {
  /** 亲友 name. */
  n: string
  /** Good days (date + 干支). */
  dl: PairDay[]
  /** Locale (zh-Hans | zh-Hant | ja | en). */
  lc?: string
}

function decodeToken(token: string): PairPayload | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64.padEnd(b64.length + (4 - (b64.length % 4)), '=')
    const json = Buffer.from(pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as Partial<PairPayload>
    if (typeof parsed.n !== 'string' || !Array.isArray(parsed.dl)) return null
    const dl = parsed.dl
      .filter(
        (x): x is PairDay =>
          !!x && typeof (x as PairDay).d === 'string' && typeof (x as PairDay).g === 'string'
      )
      .slice(0, 6)
      .map((x) => ({ d: x.d.slice(0, 10), g: x.g.slice(0, 8) }))
    return {
      n: parsed.n.slice(0, 40),
      dl,
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

interface ShareCopy {
  /** Card title; `{name}` → the 亲友 name. */
  title: string
  tagline: string
  cta: string
  hero: string
  footer: string
  malformed: string
}

const EN_COPY: ShareCopy = {
  title: 'Good days for you & {name}',
  tagline: 'The best days for the two of you, from both charts',
  cta: 'Find yours',
  hero: 'YUUN · GOOD DAYS',
  footer: 'Yuun — the days the two of you are in sync',
  malformed: 'This good-days link is malformed or truncated. Open Yuun to make a new one.',
}

const COPY: Record<string, ShareCopy> = {
  'zh-Hans': {
    title: '你和{name}的好日子',
    tagline: '你和TA同气的好日子，来自两人合盘',
    cta: '看看你俩的',
    hero: 'YUUN 好日子',
    footer: 'Yuun · 两人同气的好日子',
    malformed: '这个「好日子」链接已失效或被截断。打开 Yuun 重新生成一个。',
  },
  'zh-Hant': {
    title: '你和{name}的好日子',
    tagline: '你和TA同氣的好日子，來自兩人合盤',
    cta: '看看你倆的',
    hero: 'YUUN 好日子',
    footer: 'Yuun · 兩人同氣的好日子',
    malformed: '這個「好日子」連結已失效或被截斷。打開 Yuun 重新生成一個。',
  },
  ja: {
    title: 'あなたと{name}の吉日',
    tagline: '二人の命式から導く、相性の良い日',
    cta: 'あなたのも見る',
    hero: 'YUUN 吉日',
    footer: 'Yuun · 二人の相性が良い日',
    malformed: 'この「吉日」リンクは無効か、切り詰められています。Yuun で作り直してください。',
  },
  en: EN_COPY,
}

function copyFor(lc: string | undefined): ShareCopy {
  return COPY[lc ?? 'en'] ?? EN_COPY
}

const LOCALE_TAG: Record<string, string> = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  en: 'en-US',
}

function fmtMonthDay(dateStr: string, lc: string | undefined): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(LOCALE_TAG[lc ?? 'en'] ?? 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const payload = decodeToken(token)
  if (!payload) {
    return { title: 'Yuun — 好日子', description: 'Good days for the two of you, from Yuun.' }
  }
  const copy = copyFor(payload.lc)
  const title = `${copy.title.replace('{name}', payload.n)} — Yuun`
  return {
    title,
    description: copy.tagline,
    openGraph: { title, description: copy.tagline, siteName: 'Yuun' },
  }
}

export default async function PairSharePage({ params }: { params: Promise<{ token: string }> }) {
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
              gap: '1.25rem',
              boxShadow: '0 8px 30px rgba(150,110,60,0.08)',
            }}
          >
            <div style={{ fontSize: '1.55rem', fontWeight: 600, lineHeight: 1.25 }}>
              {copy.title.replace('{name}', payload.n)}
            </div>
            {payload.dl.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {payload.dl.map((day) => (
                  <div
                    key={`${day.d}-${day.g}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #F0E6D6',
                      paddingBottom: '0.55rem',
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2B2118' }}>
                      {fmtMonthDay(day.d, payload.lc)}
                    </span>
                    <span
                      style={{ fontSize: '0.95rem', color: '#9A6A3A', letterSpacing: '0.08em' }}
                    >
                      {day.g}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
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
            {copy.malformed}
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
            payload={{ source: 'auspice_pair_share' }}
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
