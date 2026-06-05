import { ImageResponse } from 'next/og'
import { AUSPICE_FOOTER_LINK } from '@/lib/auspice-share'

export const runtime = 'nodejs'
export const alt = 'Auspice — Chinese Calendar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface DayData {
  ganZhi: string
  goodFor: string[]
  avoid: string[]
  lunarDate?: { monthName: string; dayName: string }
}

async function fetchDay(date: string): Promise<DayData | null> {
  try {
    const res = await fetch(`${API_URL}/api/auspice/day?date=${encodeURIComponent(date)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { day?: DayData } }
    return json.data?.day ?? null
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const day = await fetchDay(date)
  const good = (day?.goodFor ?? []).slice(0, 4)
  const avoid = (day?.avoid ?? []).slice(0, 4)
  const lunar = day?.lunarDate ? `${day.lunarDate.monthName}${day.lunarDate.dayName}` : ''

  const Pills = ({ items, color, bg }: { items: string[]; color: string; bg: string }) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {items.map((t) => (
        <div
          key={t}
          style={{
            display: 'flex',
            padding: '10px 22px',
            borderRadius: 12,
            background: bg,
            color,
            fontSize: 34,
            border: `1px solid ${color}40`,
          }}
        >
          {t}
        </div>
      ))}
    </div>
  )

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
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 30, letterSpacing: 8, color: '#9A6A3A', display: 'flex' }}>
          AUSPICE 黄历
        </span>
        <span style={{ fontSize: 26, color: '#B08D6A', display: 'flex' }}>{date}</span>
      </div>

      {/* Day identity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{ fontSize: 92, fontWeight: 600, color: '#2B2118', display: 'flex' }}>
            {day?.ganZhi ?? ''}日
          </span>
          {lunar ? (
            <span style={{ fontSize: 38, color: '#8A7866', display: 'flex' }}>{lunar}</span>
          ) : null}
        </div>
      </div>

      {/* 宜 / 忌 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: '#2E9E5B', display: 'flex' }}>
            宜
          </span>
          <Pills items={good} color='#2E9E5B' bg='rgba(46,158,91,0.10)' />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: '#C0452E', display: 'flex' }}>
            忌
          </span>
          <Pills items={avoid} color='#C0452E' bg='rgba(192,69,46,0.10)' />
        </div>
      </div>

      {/* Footer */}
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
