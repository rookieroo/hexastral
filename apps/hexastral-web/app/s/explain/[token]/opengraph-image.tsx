/**
 * OG image for /s/explain/[token] — the iMessage/social preview for a 深度解读.
 * Shows the 宜/忌 field as a colored chip + the 干支日 + a 220-char excerpt of the
 * explanation, so a forwarded link previews the actual reading.
 */

import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Auspice — Deep Reading'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface ExplainPayload {
  dt: string
  gz: string
  fl: string
  yi: boolean
  ex: string
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
      ex: parsed.ex.slice(0, 220),
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

const EN_TAGLINE = 'Why today favors what it favors'
const TAGLINE: Record<string, string> = {
  'zh-Hans': '今天为什么宜这个、忌那个',
  'zh-Hant': '今天為什麼宜這個、忌那個',
  ja: '今日、なぜそれが吉でそれが凶なのか',
  en: EN_TAGLINE,
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const tag = TAGLINE[payload?.lc ?? 'en'] ?? EN_TAGLINE
  const accent = payload?.yi === false ? '#C0452E' : '#2E9E5B'
  const accentBg = payload?.yi === false ? 'rgba(192,69,46,0.12)' : 'rgba(46,158,91,0.12)'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        fontFamily: 'sans-serif',
        padding: '64px 72px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 30, letterSpacing: 8, color: '#9A6A3A', display: 'flex' }}>
          AUSPICE 黄历
        </span>
        <span style={{ fontSize: 26, color: '#B08D6A', display: 'flex' }}>
          {payload ? `${payload.gz}日 · ${payload.dt}` : tag}
        </span>
      </div>

      {payload ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex' }}>
            <span
              style={{
                display: 'flex',
                padding: '14px 32px',
                borderRadius: 16,
                background: accentBg,
                border: `2px solid ${accent}`,
                color: accent,
                fontSize: 54,
                fontWeight: 700,
              }}
            >
              {payload.fl}
            </span>
          </div>
          <span style={{ fontSize: 30, color: '#3A2E22', lineHeight: 1.55, display: 'flex' }}>
            {payload.ex}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 36, color: '#8A7866', display: 'flex' }}>
          A deep reading from Auspice — link malformed.
        </span>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 24,
          color: '#A8906F',
          letterSpacing: 2,
        }}
      >
        <span style={{ display: 'flex' }}>{tag}</span>
        <span style={{ display: 'flex' }}>hexastral.com</span>
      </div>
    </div>,
    { ...size }
  )
}
