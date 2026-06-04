/**
 * OG image for /s/timeline/[token] — the iMessage/social preview for a life-
 * timeline snapshot. Renders the source 命 → current 大运 → 流年 chain as a
 * compact vertical mini-graph (echoing the in-app git-graph), plus the 对你而言
 * verdict + advice line, so the recipient sees the actual snapshot.
 */

import { ImageResponse } from 'next/og'
import { AUSPICE_FOOTER_LINK, pickCopy } from '@/lib/auspice-share'

export const runtime = 'nodejs'
export const alt = 'Auspice — Life Timeline'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface TimelinePayload {
  s: string
  d: string
  da: string
  y: number
  yp: string
  f: '吉' | '平' | '凶'
  ad: string
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
      ad: parsed.ad.slice(0, 180),
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

const EN_TAGLINE = 'Your real timeline, branch by branch'
const TAGLINE: Record<string, string> = {
  'zh-Hans': '把你的命局看清——按大运一段一段看',
  'zh-Hant': '把你的命局看清 —— 按大運一段一段看',
  ja: 'あなたの命局を、大運ごとに',
  en: EN_TAGLINE,
}

const FIT_COLOR: Record<'吉' | '平' | '凶', string> = {
  吉: '#2E9E5B',
  平: '#9A6A3A',
  凶: '#C0452E',
}

const ELEMENT = '#7A9E7E'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const tag = TAGLINE[payload?.lc ?? 'en'] ?? EN_TAGLINE
  const copy = pickCopy('timeline', payload?.lc)

  /** A node in the mini-graph: a haloed dot + its label. */
  const Node = ({
    color,
    fill,
    label,
    sub,
    head,
  }: {
    color: string
    fill: boolean
    label: string
    sub: string
    head?: boolean
  }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, height: 84 }}>
      <div style={{ display: 'flex', width: 34, justifyContent: 'center' }}>
        {head ? (
          <div
            style={{
              display: 'flex',
              width: 34,
              height: 34,
              borderRadius: 17,
              background: 'rgba(201,154,91,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{ display: 'flex', width: 18, height: 18, borderRadius: 9, background: color }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              width: 18,
              height: 18,
              borderRadius: 9,
              background: fill ? color : '#FBF7F0',
              border: `3px solid ${color}`,
            }}
          />
        )}
      </div>
      <span style={{ fontSize: 46, fontWeight: 600, color: '#2B2118', display: 'flex' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, color: '#8A7866', display: 'flex' }}>{sub}</span>
    </div>
  )

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        fontFamily: 'sans-serif',
        padding: '60px 72px',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: the mini-graph spine */}
      <div style={{ display: 'flex', flexDirection: 'column', width: 470, position: 'relative' }}>
        <span
          style={{
            fontSize: 26,
            letterSpacing: 7,
            color: '#9A6A3A',
            display: 'flex',
            marginBottom: 18,
          }}
        >
          {copy.eyebrow.replace('AUSPICE · ', '').replace('AUSPICE ', '')}
        </span>
        {payload ? (
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* trunk line */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 42,
                width: 2,
                height: 168,
                background: '#D8C7AC',
                display: 'flex',
              }}
            />
            <Node color={ELEMENT} fill label={`${payload.s} 日`} sub='命' />
            <Node color={FIT_COLOR[payload.f]} fill head label={payload.d} sub={payload.da} />
            <Node color={ELEMENT} fill={false} label={payload.yp} sub={`${payload.y}`} />
          </div>
        ) : (
          <span style={{ fontSize: 32, color: '#8A7866', display: 'flex' }}>
            Link malformed — open Auspice.
          </span>
        )}
      </div>

      {/* Right: brand + verdict + advice */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 500,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 30, letterSpacing: 8, color: '#9A6A3A', display: 'flex' }}>
            {copy.eyebrow}
          </span>
          <span style={{ fontSize: 34, color: '#3A2E22', lineHeight: 1.4, display: 'flex' }}>
            {tag}
          </span>
        </div>
        {payload ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderLeft: `4px solid ${FIT_COLOR[payload.f]}`,
              paddingLeft: 22,
            }}
          >
            <span
              style={{
                fontSize: 24,
                color: FIT_COLOR[payload.f],
                letterSpacing: 2,
                display: 'flex',
              }}
            >
              对你而言 · {payload.f}
            </span>
            <span style={{ fontSize: 27, color: '#3A2E22', lineHeight: 1.5, display: 'flex' }}>
              {payload.ad}
            </span>
          </div>
        ) : null}
        <span style={{ fontSize: 23, color: '#A8906F', letterSpacing: 2, display: 'flex' }}>
          {AUSPICE_FOOTER_LINK} · {copy.footer}
        </span>
      </div>
    </div>,
    { ...size }
  )
}
