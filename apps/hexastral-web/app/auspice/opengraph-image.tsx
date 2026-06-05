/**
 * OG image for /auspice — the social/iMessage preview for the Auspice landing.
 * Ink / 水墨 palette to match the `/s/*` share cards. Locale-agnostic (the
 * landing self-localizes per visitor); this card stays bilingual-brand so it
 * reads cleanly wherever it is pasted.
 */

import { ImageResponse } from 'next/og'
import { AUSPICE_FOOTER_LINK } from '@/lib/auspice-share'

export const runtime = 'nodejs'
export const alt = 'Auspice — the Chinese calendar, for the world'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        fontFamily: 'sans-serif',
        padding: '72px 80px',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 32, letterSpacing: 10, color: '#9A6A3A', display: 'flex' }}>
        AUSPICE 黄历
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span style={{ fontSize: 78, fontWeight: 600, color: '#2B2118', display: 'flex' }}>
          一部，给世界的中华黄历
        </span>
        <span style={{ fontSize: 34, color: '#6B5A47', display: 'flex' }}>
          The Chinese calendar, for the world
        </span>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {['每日黄历', '人生时间线', '假如人生'].map((t) => (
            <span
              key={t}
              style={{
                display: 'flex',
                padding: '12px 26px',
                borderRadius: 12,
                background: 'rgba(201,154,91,0.12)',
                border: '1px solid rgba(154,106,58,0.25)',
                color: '#9A6A3A',
                fontSize: 30,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

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
        <span style={{ display: 'flex' }}>每日干支 · 农历 · 节气 · 宜忌</span>
        <span style={{ display: 'flex' }}>{AUSPICE_FOOTER_LINK}</span>
      </div>
    </div>,
    { ...size }
  )
}
