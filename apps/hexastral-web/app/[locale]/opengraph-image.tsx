import { headers } from 'next/headers'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'HexAstral'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Per-brand default OG — Latin-only (CJK tofus in Satori without a bundled font). */
const BRANDS = {
  yuel: {
    bg: '#0C0A09',
    fg: '#F5F0E8',
    dim: 'rgba(245,240,232,0.6)',
    accent: '#C0392B',
    name: 'Yuel',
    tag: 'Your reading, and the people you’re bound to.',
    kicker: 'BAZI · ZIWEI · SYNASTRY',
  },
  yuun: {
    bg: '#0e0d0c',
    fg: '#F5F0E8',
    dim: 'rgba(245,240,232,0.6)',
    accent: '#A2937E',
    name: 'Yuun',
    tag: 'The Chinese almanac, every day.',
    kicker: 'DAILY ALMANAC · GANZHI · LUNAR CALENDAR',
  },
  yaul: {
    bg: '#09090B',
    fg: '#F5F0E8',
    dim: 'rgba(245,240,232,0.6)',
    accent: '#C4A882',
    name: 'Yaul',
    tag: 'Three coins. Six lines. One question.',
    kicker: 'I CHING · LIU YAO · HEXAGRAM STUDY',
  },
  hexastral: {
    bg: '#050510',
    fg: '#f5f0e8',
    dim: 'rgba(245,240,232,0.6)',
    accent: '#c4a862',
    name: 'HexAstral',
    tag: 'Classical Chinese cosmology, AI-augmented. Educational, not predictive.',
    kicker: 'BAZI · ZIWEI · FIVE ELEMENTS',
  },
} as const

export default async function OpengraphImage() {
  const host = (await headers()).get('host') ?? ''
  const b = host.startsWith('yuel.')
    ? BRANDS.yuel
    : host.startsWith('yuun.')
      ? BRANDS.yuun
      : host.startsWith('yaul.')
        ? BRANDS.yaul
        : BRANDS.hexastral

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: b.bg,
        padding: 80,
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 8, color: b.accent, marginBottom: 36 }}>
        {b.kicker}
      </div>
      <div style={{ fontSize: 96, fontWeight: 600, color: b.fg, letterSpacing: 2 }}>{b.name}</div>
      <div
        style={{
          fontSize: 36,
          color: b.dim,
          marginTop: 28,
          maxWidth: 880,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        {b.tag}
      </div>
      <div style={{ width: 64, height: 3, background: b.accent, marginTop: 44 }} />
    </div>,
    size
  )
}
