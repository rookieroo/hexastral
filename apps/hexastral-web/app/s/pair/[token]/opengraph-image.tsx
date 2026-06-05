/**
 * OG image for /s/pair/[token] — the iMessage/social preview a forwarded
 * "你和 X 的好日子" link shows. Renders the card title + the good days (date + 干支)
 * so the recipient sees the actual picks before tapping through.
 */

import { ImageResponse } from 'next/og'
import { AUSPICE_FOOTER_LINK, pickCopy } from '@/lib/auspice-share'

export const runtime = 'nodejs'
export const alt = 'Auspice — 好日子 (Good Days)'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface PairDay {
  d: string
  g: string
}

interface PairPayload {
  n: string
  dl: PairDay[]
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
      .slice(0, 5)
      .map((x) => ({ d: x.d.slice(0, 10), g: x.g.slice(0, 8) }))
    return { n: parsed.n.slice(0, 40), dl, lc: typeof parsed.lc === 'string' ? parsed.lc : 'en' }
  } catch {
    return null
  }
}

const EN_TAGLINE = 'The best days for the two of you'
const TAGLINE: Record<string, string> = {
  'zh-Hans': '你和TA同气的好日子',
  'zh-Hant': '你和TA同氣的好日子',
  ja: '二人の相性が良い日',
  en: EN_TAGLINE,
}

const EN_TITLE = 'Good days for you & {name}'
const TITLE: Record<string, string> = {
  'zh-Hans': '你和{name}的好日子',
  'zh-Hant': '你和{name}的好日子',
  ja: 'あなたと{name}の吉日',
  en: EN_TITLE,
}

const MALFORMED: Record<string, string> = {
  'zh-Hans': 'Auspice 两人好日子 —— 链接无效。',
  'zh-Hant': 'Auspice 兩人好日子 —— 連結無效。',
  ja: 'Auspice 二人の吉日 —— リンクが無効です。',
  en: 'Good days for the two of you — link malformed.',
}

const LOCALE_TAG: Record<string, string> = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  en: 'en-US',
}

function fmtMonthDay(dateStr: string, lc: string): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(LOCALE_TAG[lc] ?? 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const lc = payload?.lc ?? 'en'
  const tag = TAGLINE[lc] ?? EN_TAGLINE
  const title = (TITLE[lc] ?? EN_TITLE).replace('{name}', payload?.n ?? '')
  const copy = pickCopy('pair', payload?.lc)

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span style={{ fontSize: 60, fontWeight: 600, color: '#2B2118', display: 'flex' }}>
            {title}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {payload.dl.map((day) => (
              <div
                key={`${day.d}-${day.g}`}
                style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 34 }}
              >
                <span style={{ color: '#2B2118', fontWeight: 600, display: 'flex', width: 180 }}>
                  {fmtMonthDay(day.d, lc)}
                </span>
                <span style={{ color: '#9A6A3A', letterSpacing: 4, display: 'flex' }}>{day.g}</span>
              </div>
            ))}
          </div>
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
