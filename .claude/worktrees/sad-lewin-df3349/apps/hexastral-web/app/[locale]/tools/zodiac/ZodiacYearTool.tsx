'use client'

import { useMemo, useState } from 'react'
import { yearZodiac } from '@zhop/astro-core'
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

export function ZodiacYearTool() {
  const [year, setYear] = useState(1990)

  const animalHan = useMemo(() => yearZodiac(year), [year])
  const slug = HAN_TO_SLUG[animalHan]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)' }}>Gregorian birth year</label>
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
          Approximate yearly animal · 生肖
        </p>
        <p style={{ fontSize: '2rem', margin: 0, letterSpacing: '0.1em' }}>{animalHan}</p>
        {slug ? (
          <Link href={`/zodiac/${slug}`} style={{ color: 'var(--color-gold)', fontSize: '0.9rem' }}>
            Read constellation notes →
          </Link>
        ) : null}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--color-ivory-muted)', lineHeight: 1.65 }}>
        This uses a simple Gregorian mapping for the animal rotation. Readers born near Chinese New Year should
        verify with Lunar/Li Chun aware software (HexAstral iOS charts do this professionally).
      </p>
    </div>
  )
}
