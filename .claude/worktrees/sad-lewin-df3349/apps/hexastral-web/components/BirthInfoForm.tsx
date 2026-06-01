'use client'

import { useTranslations } from 'next-intl'
import { getLunarMonthDays } from '@zhop/astro-core'
import { CityAutocomplete, type CitySelection } from './CityAutocomplete'

function Switch({ checked, onChange }: { checked?: boolean; onChange: (c: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: checked ? 'var(--color-void)' : '#fff',
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          transition: 'left 0.2s, background 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

export interface BirthInfo {
  solarDate: string // YYYY-MM-DD
  timeIndex: number // 0-12
  isLunar?: boolean
  isLeapMonth?: boolean
  useTrueSolarTime?: boolean
  exactTime?: string // 'HH:mm'
  gender: 'male' | 'female'
  name: string
  birthCity: string
  latitude?: number
  longitude?: number
  timezone?: string
}

interface BirthInfoFormProps {
  label?: string
  value: BirthInfo
  onChange: (info: BirthInfo) => void
  onSubmit: () => void
  submitLabel?: string
  loading?: boolean
  showName?: boolean
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-ivory)',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
}

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.8rem',
  color: 'var(--color-gold)',
  letterSpacing: '0.08em',
  cursor: 'pointer',
}

export function BirthInfoForm({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  loading = false,
  showName = true,
}: BirthInfoFormProps) {
  const t = useTranslations('form')
  const shichenLabels = t.raw('shichen') as string[]
  
  const hasLunarString = value.solarDate.split('-').length === 3
  const [ly, lm, ld] = hasLunarString ? value.solarDate.split('-') : ['1990', '01', '01']

  const isValid = Boolean(
    value.solarDate &&
    value.gender !== undefined &&
    value.birthCity.trim() &&
    (!value.useTrueSolarTime || value.exactTime)
  )

  const years = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - 100 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  
  const currentMaxDays = value.isLunar ? getLunarMonthDays(Number(ly), Number(lm)) : 31
  const days = Array.from({ length: currentMaxDays }, (_, i) => i + 1)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (isValid) onSubmit()
      }}
      style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {label && <p style={{ color: 'var(--color-ivory-dim)', textAlign: 'center', marginBottom: '0.5rem' }}>{label}</p>}

      {showName && (
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-gold)', marginBottom: '0.4rem' }}>{t('nameLabel')}</label>
          <input type='text' placeholder={t('namePlaceholder')} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} maxLength={20} style={fieldStyle} />
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-gold)', marginBottom: '0.4rem' }}>{t('cityLabel')}</label>
        <CityAutocomplete
          value={value.birthCity}
          onChange={(city: string, geo?: CitySelection) => onChange({ ...value, birthCity: city, latitude: geo?.latitude ?? value.latitude, longitude: geo?.longitude ?? value.longitude, timezone: geo?.timezone ?? value.timezone })}
          placeholder={t('cityPlaceholder')}
          style={{ ...fieldStyle, borderColor: value.birthCity.trim() ? 'var(--color-gold)' : 'var(--color-border)' }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>{value.isLunar ? t('dateLabelLunar') : t('dateLabel')}</label>
          <label style={toggleStyle}>
            <Switch checked={value.isLunar} onChange={(c) => onChange({ ...value, isLunar: c })} />
            {t('checkLunar')}
          </label>
        </div>
        
        {value.isLunar ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <select style={fieldStyle} value={ly} onChange={(e) => onChange({ ...value, solarDate: `${e.target.value}-${lm}-${ld}` })}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select style={fieldStyle} value={lm} onChange={(e) => onChange({ ...value, solarDate: `${ly}-${e.target.value.padStart(2, '0')}-${ld}` })}>
              {months.map((m) => <option key={m} value={String(m).padStart(2, '0')}>{m}</option>)}
            </select>
            <select style={fieldStyle} value={ld} onChange={(e) => onChange({ ...value, solarDate: `${ly}-${lm}-${String(e.target.value).padStart(2, '0')}` })}>
              {days.map((d) => <option key={d} value={String(d).padStart(2, '0')}>{d}</option>)}
            </select>
          </div>
        ) : (
          <input type='date' required value={value.solarDate} min='1900-01-01' max={new Date().toISOString().split('T')[0]} onChange={(e) => onChange({ ...value, solarDate: e.target.value })} style={{ ...fieldStyle, colorScheme: 'dark' }} />
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>{t('hourLabel')}</label>
          <label style={toggleStyle}>
            <Switch checked={value.useTrueSolarTime} onChange={(c) => onChange({ ...value, useTrueSolarTime: c })} />
            {t('checkTrueSolar')}
          </label>
        </div>

        {value.useTrueSolarTime ? (
          <input type='time' required value={value.exactTime || ''} onChange={(e) => onChange({ ...value, exactTime: e.target.value })} style={{ ...fieldStyle, colorScheme: 'dark' }} />
        ) : (
          <select value={value.timeIndex} onChange={(e) => onChange({ ...value, timeIndex: Number(e.target.value) })} style={fieldStyle}>
            {shichenLabels.map((label, idx) => <option key={idx} value={idx}>{label}</option>)}
          </select>
        )}
      </div>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
          {(['male', 'female'] as const).map((g) => (
            <button key={g} type='button' onClick={() => onChange({ ...value, gender: g })} style={{ padding: '0.75rem', border: `1px solid ${value.gender === g ? 'var(--color-gold)' : 'var(--color-border)'}`, borderRadius: 8, background: value.gender === g ? 'rgba(196,168,98,0.12)' : 'rgba(255,255,255,0.03)', color: value.gender === g ? 'var(--color-gold)' : 'var(--color-ivory-dim)', fontSize: '0.9rem', cursor: 'pointer' }}>
              {g === 'male' ? t('genderMale') : t('genderFemale')}
            </button>
          ))}
        </div>
      </div>

      <button type='submit' disabled={!isValid || loading} style={{ marginTop: '0.5rem', padding: '0.9rem', background: isValid ? 'var(--color-gold)' : 'rgba(196,168,98,0.3)', color: isValid ? 'var(--color-void)' : 'rgba(5,5,16,0.5)', border: 'none', borderRadius: 100, fontSize: '1rem', fontWeight: 500, cursor: isValid ? 'pointer' : 'not-allowed' }}>{submitLabel}</button>
    </form>
  )
}
