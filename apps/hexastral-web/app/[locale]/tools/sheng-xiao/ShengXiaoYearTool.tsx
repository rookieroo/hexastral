'use client'

import { yearZodiac } from '@zhop/astro-core'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'

import type { ZodiacSlug } from '@/lib/growth/seo-data'

const HAN_TO_SLUG: Record<string, ZodiacSlug> = {
  鼠: 'rat',
  牛: 'ox',
  虎: 'tiger',
  兔: 'rabbit',
  龙: 'dragon',
  蛇: 'snake',
  马: 'horse',
  羊: 'goat',
  猴: 'monkey',
  鸡: 'rooster',
  狗: 'dog',
  猪: 'pig',
}

export function ShengXiaoYearTool() {
  const t = useTranslations('tools.shengXiao')
  const [year, setYear] = useState(1990)

  const animalHan = useMemo(() => yearZodiac(year), [year])
  const slug = HAN_TO_SLUG[animalHan]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)' }}>{t('yearLabel')}</label>
      <input
        type='number'
        min={1900}
        max={2100}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        style={{
          padding: '0.75rem 1rem',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--color-ivory)',
          fontFamily: 'inherit',
          maxWidth: 200,
        }}
      />

      <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--color-gold)' }}>
          {t('animalLabel')}
        </p>
        <p style={{ fontSize: '2rem', margin: 0, letterSpacing: '0.1em' }}>{animalHan}</p>
        {slug ? (
          <Link
            href={`/sheng-xiao/${slug}`}
            style={{ color: 'var(--color-gold)', fontSize: '0.9rem' }}
          >
            {t('readLink')}
          </Link>
        ) : null}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--color-ivory-muted)', lineHeight: 1.65 }}>
        {t('disclaimerExtended')}
      </p>
    </div>
  )
}
