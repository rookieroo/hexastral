import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { pickCopy } from '@/lib/auspice-share'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { localizeYijiVerb, resolveShareLc, type ShareLc, yijiLabels } from '@/lib/yiji-i18n'

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

/**
 * Share locale = explicit `?lc=` (the app appends it) → Accept-Language → `en`.
 * The page reads it so 宜忌 (labels + verbs) render in the viewer's language
 * instead of always Chinese — the EN-share-still-Chinese fix.
 */
async function resolveLc(searchParams: Promise<{ lc?: string | string[] }>): Promise<ShareLc> {
  const sp = await searchParams
  const lc = Array.isArray(sp.lc) ? sp.lc[0] : sp.lc
  const al = (await headers()).get('accept-language')
  return resolveShareLc(lc, al)
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>
  searchParams: Promise<{ lc?: string | string[] }>
}): Promise<Metadata> {
  const { date } = await params
  const lc = await resolveLc(searchParams)
  const day = await fetchDay(date)
  const L = yijiLabels(lc)
  const loc = (v: string) => localizeYijiVerb(v, lc)
  const cjk = lc !== 'en'
  const title = day ? `${date} ${day.ganZhi}${cjk ? '日' : ''} · Yuun` : `${date} · Yuun`
  const description = day
    ? `${L.good} ${day.goodFor.slice(0, 3).map(loc).join(' ')} · ${L.avoid} ${day.avoid.slice(0, 3).map(loc).join(' ')}`
    : 'Yuun — the Chinese calendar, for the world.'
  return { title, description, openGraph: { title, description, siteName: 'Yuun' } }
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
  searchParams,
}: {
  params: Promise<{ date: string }>
  searchParams: Promise<{ lc?: string | string[] }>
}) {
  const { date } = await params
  const lc = await resolveLc(searchParams)
  const day = await fetchDay(date)
  const L = yijiLabels(lc)
  const loc = (v: string) => localizeYijiVerb(v, lc)
  const copy = pickCopy('day', lc)
  const cjk = lc !== 'en'
  // The lunar date is Chinese month/day names (正月初一); show it only in CJK
  // locales so the EN card stays English. The Gregorian date carries the identity.
  const lunar = cjk && day?.lunarDate ? `${day.lunarDate.monthName}${day.lunarDate.dayName}` : ''
  // Single-char 宜/忌 vs the wider Good/Avoid — give the label a min-width so both
  // rows' chips start at the same x (the alignment the Chinese-only card avoided).
  const labelWidth = lc === 'en' ? 58 : 28

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
          {copy.eyebrow}
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
            <span style={{ fontSize: '2.2rem', fontWeight: 600 }}>
              {day?.ganZhi ?? '—'}
              {cjk ? '日' : ''}
            </span>
            <span style={{ color: '#8A7866', fontSize: '0.95rem' }}>
              {date} {lunar}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  color: '#2E9E5B',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  minWidth: labelWidth,
                }}
              >
                {L.good}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(day?.goodFor ?? []).slice(0, 6).map((t) => (
                  <Chip key={t} label={loc(t)} color='#2E9E5B' bg='rgba(46,158,91,0.08)' />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  color: '#C0452E',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  minWidth: labelWidth,
                }}
              >
                {L.avoid}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(day?.avoid ?? []).slice(0, 6).map((t) => (
                  <Chip key={t} label={loc(t)} color='#C0452E' bg='rgba(192,69,46,0.08)' />
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
          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{copy.footer}</p>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#8A7866',
              maxWidth: 300,
              lineHeight: 1.6,
            }}
          >
            Yuun — the Chinese calendar, for the world.
          </p>
          <DDLRedirectButton
            payload={{ source: 'auspice_day_share', date }}
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
              Get Yuun
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
