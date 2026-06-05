/**
 * OG image for /s/makeif/[token] — the iMessage/social preview a forwarded link
 * shows. Renders the fork title + branch label + a 280-char excerpt of the
 * narrative, so the recipient sees an image of the actual reading (not a
 * generic landing) before deciding to tap through.
 */

import { ImageResponse } from 'next/og'
import { AUSPICE_FOOTER_LINK, pickCopy } from '@/lib/auspice-share'

export const runtime = 'nodejs'
export const alt = 'Auspice — 假如 (Make If)'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface MakeifPayload {
  t: string
  l: string
  o: string
  /** Optional 1-line 概要 / at-a-glance summary — render prominently when present. */
  sm?: string
  lc?: string
}

function decodeToken(token: string): MakeifPayload | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64.padEnd(b64.length + (4 - (b64.length % 4)), '=')
    const json = Buffer.from(pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as Partial<MakeifPayload>
    if (
      typeof parsed.t !== 'string' ||
      typeof parsed.l !== 'string' ||
      typeof parsed.o !== 'string'
    )
      return null
    return {
      t: parsed.t.slice(0, 80),
      l: parsed.l.slice(0, 80),
      o: parsed.o.slice(0, 280),
      sm: typeof parsed.sm === 'string' ? parsed.sm.slice(0, 160) : undefined,
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

const EN_TAGLINE = 'A "what if" branch from a bāzì life'

const TAGLINE: Record<string, string> = {
  'zh-Hans': '一个「假如」的命运分支',
  'zh-Hant': '一個「假如」的命運分支',
  ja: '「もしも」のもう一つの人生',
  en: EN_TAGLINE,
}

/** Localized fallback shown when the token is malformed (no English leak in zh/ja). */
const MALFORMED: Record<string, string> = {
  'zh-Hans': 'Auspice「假如」的命运分支 —— 链接无效。',
  'zh-Hant': 'Auspice「假如」的命運分支 —— 連結無效。',
  ja: 'Auspice「假如」のもう一つの人生 —— リンクが無効です。',
  en: 'A "what if" branch from Auspice — link malformed.',
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const lc = payload?.lc ?? 'en'
  const tag = TAGLINE[lc] ?? EN_TAGLINE
  const copy = pickCopy('makeif', payload?.lc)

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
          {copy.eyebrow}
        </span>
        <span style={{ fontSize: 26, color: '#B08D6A', display: 'flex' }}>{tag}</span>
      </div>

      {payload ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 64, fontWeight: 600, color: '#2B2118', display: 'flex' }}>
            {payload.t}
          </span>
          <span style={{ fontSize: 32, color: '#9A6A3A', letterSpacing: 2, display: 'flex' }}>
            {payload.l}
          </span>
          {payload.sm ? (
            <span
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: '#2B2118',
                lineHeight: 1.4,
                display: 'flex',
                borderLeft: '4px solid #C99A5B',
                paddingLeft: 22,
                marginTop: 8,
              }}
            >
              {payload.sm}
            </span>
          ) : null}
          <span
            style={{
              fontSize: 26,
              color: '#3A2E22',
              lineHeight: 1.55,
              display: 'flex',
              marginTop: 8,
            }}
          >
            {payload.o}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 36, color: '#8A7866', display: 'flex' }}>
          {MALFORMED[lc] ?? MALFORMED.en}
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
        <span style={{ display: 'flex' }}>{copy.footer}</span>
        <span style={{ display: 'flex' }}>{AUSPICE_FOOTER_LINK}</span>
      </div>
    </div>,
    { ...size }
  )
}
