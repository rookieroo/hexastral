'use client'

import { useState } from 'react'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { TurnstileWidget } from '@/components/TurnstileWidget'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface HehunCollectionClientProps {
  token: string
  bondId?: string
  inviterUserId?: string
}

interface PreviewResult {
  score: number
  grade: string
  gradeLabel: string
  dimensions: { name: string; score: number; maxScore: number }[]
  summary: string
  highlights: string[]
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
  boxSizing: 'border-box',
}

const SHICHEN_LABELS = [
  '子时 Rat　       23:00–01:00',
  '丑时 Ox　        01:00–03:00',
  '寅时 Tiger　     03:00–05:00',
  '卯时 Rabbit　    05:00–07:00',
  '辰时 Dragon　    07:00–09:00',
  '巳时 Snake　     09:00–11:00',
  '午时 Horse　     11:00–13:00',
  '未时 Goat　      13:00–15:00',
  '申时 Monkey　    15:00–17:00',
  '酉时 Rooster　   17:00–19:00',
  '戌时 Dog　       19:00–21:00',
  '亥时 Pig　       21:00–23:00',
  '子时 Rat (late)　23:00–01:00',
]

export function HehunCollectionClient({
  token,
  bondId,
  inviterUserId,
}: HehunCollectionClientProps) {
  const [solarDate, setSolarDate] = useState('')
  const [timeIndex, setTimeIndex] = useState(0)
  const [gender, setGender] = useState<'男' | '女' | ''>('')
  const [name, setName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isValid = solarDate && gender && turnstileToken

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/hehun-preview/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
          'X-Turnstile-Token': turnstileToken ?? '',
        },
        body: JSON.stringify({
          personA: {
            // Inviter's data will be looked up server-side in the full flow.
            // For preview, we use the partner's data for both sides as placeholder.
            solarDate,
            timeIndex,
            gender,
            name,
          },
          personB: {
            solarDate,
            timeIndex,
            gender,
            name,
          },
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        setError(err.error ?? 'Something went wrong')
        return
      }

      const data = (await res.json()) as PreviewResult
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Preview result view ──────────────────────────────────────
  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Score card */}
        <div
          style={{
            padding: '2rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 300,
              color: 'var(--color-gold)',
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}
          >
            {result.score}
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--color-ivory-muted)' }}>
            Compatibility Score · {result.gradeLabel}
          </p>

          {/* Dimension bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.dimensions.map((d) => (
              <div key={d.name} style={{ textAlign: 'left' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--color-ivory-dim)',
                    marginBottom: '0.3rem',
                  }}
                >
                  <span>{d.name}</span>
                  <span>
                    {d.score}/{d.maxScore}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(d.score / d.maxScore) * 100}%`,
                      background: 'var(--color-gold)',
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--color-ivory-muted)',
              lineHeight: 1.7,
            }}
          >
            {result.summary}
          </p>
        </div>

        {/* Blur teaser for full report */}
        <div
          style={{
            position: 'relative',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.82rem',
              color: 'var(--color-ivory-dim)',
              lineHeight: 1.6,
              filter: 'blur(4px)',
              userSelect: 'none',
            }}
          >
            Full AI analysis with friction-point breakdown, communication style matching, best
            compatibility modes, and personalized advice for deepening your connection...
          </p>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 500 }}>
              Unlock Full Report in App
            </span>
          </div>
        </div>

        {/* CTA */}
        <DDLRedirectButton
          payload={{
            mode: 'pairing',
            bondId,
            inviterUserId,
            partnerSolarDate: solarDate,
            partnerTimeIndex: timeIndex,
            partnerGender: gender,
            partnerName: name,
            previewScore: result.score,
            source: 'hehun_collection',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #c4a862 0%, #7b5ea7 100%)',
              color: '#fff',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Get the Full Compatibility Report
          </span>
        </DDLRedirectButton>
      </div>
    )
  }

  // ── Birth info form ──────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Name */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--color-gold)',
            marginBottom: '0.4rem',
            letterSpacing: '0.08em',
          }}
        >
          Name (optional)
        </label>
        <input
          type='text'
          placeholder='Your name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          style={fieldStyle}
        />
      </div>

      {/* Birth date */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--color-gold)',
            marginBottom: '0.4rem',
            letterSpacing: '0.08em',
          }}
        >
          Birth Date *
        </label>
        <input
          type='date'
          required
          value={solarDate}
          min='1920-01-01'
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSolarDate(e.target.value)}
          style={{ ...fieldStyle, colorScheme: 'dark' }}
        />
      </div>

      {/* Birth hour / shichen */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--color-gold)',
            marginBottom: '0.4rem',
            letterSpacing: '0.08em',
          }}
        >
          Birth Hour
        </label>
        <select
          value={timeIndex}
          onChange={(e) => setTimeIndex(Number(e.target.value))}
          style={{
            ...fieldStyle,
            cursor: 'pointer',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c4a862' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            paddingRight: '2.5rem',
          }}
        >
          {SHICHEN_LABELS.map((label, idx) => (
            <option key={idx} value={idx} style={{ background: '#0a0a1a' }}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Gender */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--color-gold)',
            marginBottom: '0.4rem',
            letterSpacing: '0.08em',
          }}
        >
          Gender *
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {(['男', '女'] as const).map((g) => (
            <button
              key={g}
              type='button'
              onClick={() => setGender(g)}
              style={{
                padding: '0.75rem',
                border: `1px solid ${gender === g ? 'var(--color-gold)' : 'var(--color-border)'}`,
                borderRadius: 8,
                background: gender === g ? 'rgba(196,168,98,0.12)' : 'rgba(255,255,255,0.03)',
                color: gender === g ? 'var(--color-gold)' : 'var(--color-ivory-dim)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              {g === '男' ? 'Male 男' : 'Female 女'}
            </button>
          ))}
        </div>
      </div>

      {/* Turnstile */}
      <TurnstileWidget onToken={setTurnstileToken} />

      {error && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#e54d4d', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type='submit'
        disabled={!isValid || loading}
        style={{
          marginTop: '0.5rem',
          padding: '0.9rem',
          background: isValid ? 'var(--color-gold)' : 'rgba(196,168,98,0.3)',
          color: isValid ? 'var(--color-void)' : 'rgba(5,5,16,0.5)',
          border: 'none',
          borderRadius: 100,
          fontSize: '1rem',
          fontWeight: 500,
          cursor: isValid ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Calculating...' : 'See Compatibility Preview'}
      </button>
    </form>
  )
}
