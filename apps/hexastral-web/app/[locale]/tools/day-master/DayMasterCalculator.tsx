'use client'

import { getFourPillars, HEAVENLY_STEMS } from '@zhop/astro-core'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

import type { DayMasterSlug } from '@/lib/growth/seo-data'

const STEM_SLUGS: DayMasterSlug[] = [
  'jia-wood',
  'yi-wood',
  'bing-fire',
  'ding-fire',
  'wu-earth',
  'ji-earth',
  'geng-metal',
  'xin-metal',
  'ren-water',
  'gui-water',
]

function stemToSlug(stem: string): DayMasterSlug {
  const idx = HEAVENLY_STEMS.findIndex((s) => s === stem)
  return STEM_SLUGS[idx] ?? 'jia-wood'
}

export function DayMasterCalculator() {
  const t = useTranslations('tools.dayMaster')
  const [date, setDate] = useState('1990-01-15')
  const [hour, setHour] = useState(12)

  const pillars = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d) return null
    return getFourPillars({ year: y, month: m, day: d, hour })
  }, [date, hour])

  const dayStem = pillars?.day.stem ?? ''
  const slug = dayStem ? stemToSlug(dayStem) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)' }}>
          {t('solarDateLabel')}
        </label>
        <input
          type='date'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--color-ivory)',
            fontFamily: 'inherit',
          }}
        />
        <label style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)' }}>
          {t('hourLabel')}
        </label>
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--color-ivory)',
            fontFamily: 'inherit',
          }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00
            </option>
          ))}
        </select>
      </div>

      {pillars ? (
        <div
          style={{
            padding: '1rem',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            background: 'rgba(196,168,98,0.06)',
          }}
        >
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gold)', marginTop: 0 }}>
            {t('approxPillars')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.35rem',
              fontSize: '0.95rem',
              textAlign: 'center',
            }}
          >
            {[pillars.year, pillars.month, pillars.day, pillars.hour].map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key -- static 4 pillars
              <div
                key={i}
                style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}
              >
                <div>{p.stem}</div>
                <div style={{ opacity: 0.75 }}>{p.branch}</div>
              </div>
            ))}
          </div>
          <p style={{ marginBottom: 0, fontSize: '1rem', lineHeight: 1.65 }}>
            <strong>{t('dayMasterLabel')}</strong>: {pillars.day.stem}
            {' · '}
            <Link href={`/day-master/${slug}`} style={{ color: 'var(--color-gold)' }}>
              {t('archetypeLink')}
            </Link>
          </p>
          <p
            style={{ fontSize: '0.78rem', color: 'var(--color-ivory-muted)', marginTop: '0.75rem' }}
          >
            {t('disclaimer')}
          </p>
        </div>
      ) : null}

      <DownloadCTA
        headline={t('ctaHeadline')}
        sub={t('ctaSub')}
        appStoreUrl={resolveAppStoreUrl('soulmatch')}
        targetApp='soulmatch'
      />
    </div>
  )
}
