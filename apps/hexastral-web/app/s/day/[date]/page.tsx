import type { Metadata } from 'next'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface DayData {
  ganZhi: string
  goodFor: string[]
  avoid: string[]
  lunarDate?: { monthName: string; dayName: string }
  yearGanZhi?: { stem: string; branch: string; animal: string }
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>
}): Promise<Metadata> {
  const { date } = await params
  const day = await fetchDay(date)
  const title = day ? `${date} ${day.ganZhi}日 · 宜忌 · Auspice` : `${date} · Auspice`
  const description = day
    ? `宜 ${day.goodFor.slice(0, 3).join(' ')} · 忌 ${day.avoid.slice(0, 3).join(' ')}`
    : 'The Chinese calendar — 干支 · 农历 · 节气 · 宜忌.'
  return { title, description, openGraph: { title, description, siteName: 'Auspice' } }
}

const Chip = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '0.4rem 0.9rem',
      borderRadius: 10,
      background: bg,
      color,
      border: `1px solid ${color}33`,
      fontSize: '1rem',
    }}
  >
    {label}
  </span>
)

export default async function AuspiceDaySharePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  const day = await fetchDay(date)
  const lunar = day?.lunarDate ? `${day.lunarDate.monthName}${day.lunarDate.dayName}` : ''

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
          maxWidth: 460,
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
          AUSPICE 黄历
        </div>

        {/* Day card */}
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 600 }}>{day?.ganZhi ?? '—'}日</span>
            <span style={{ color: '#8A7866', fontSize: '0.95rem' }}>
              {date} {lunar}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#2E9E5B', fontWeight: 700, fontSize: '1.1rem' }}>宜</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(day?.goodFor ?? []).slice(0, 6).map((t) => (
                  <Chip key={t} label={t} color='#2E9E5B' bg='rgba(46,158,91,0.08)' />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#C0452E', fontWeight: 700, fontSize: '1.1rem' }}>忌</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(day?.avoid ?? []).slice(0, 6).map((t) => (
                  <Chip key={t} label={t} color='#C0452E' bg='rgba(192,69,46,0.08)' />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
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
          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>
            每天的干支 · 农历 · 节气 · 宜忌
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#8A7866',
              maxWidth: 300,
              lineHeight: 1.6,
            }}
          >
            Auspice — the Chinese calendar, for the world.
          </p>
          <DDLRedirectButton payload={{ source: 'auspice_day_share', date }}>
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
              Get Auspice
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
