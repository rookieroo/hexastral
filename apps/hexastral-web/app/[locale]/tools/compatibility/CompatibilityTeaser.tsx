'use client'

import { useCallback, useState, useTransition } from 'react'
import { type CompatibilityPreviewResult, computeCompatibilityPreview } from '@/app/actions/chart'
import { type BirthInfo, BirthInfoForm } from '@/components/BirthInfoForm'
import { DownloadCTA } from '@/components/DownloadCTA'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

const EMPTY: BirthInfo = {
  solarDate: '',
  timeIndex: 12,
  gender: 'male',
  name: '',
  birthCity: '',
}

export function CompatibilityTeaser() {
  const [step, setStep] = useState<'a' | 'b'>('a')
  const [a, setA] = useState<BirthInfo>(EMPTY)
  const [b, setB] = useState<BirthInfo>({ ...EMPTY, gender: 'female' })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [tsKey, setTsKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompatibilityPreviewResult | null>(null)
  const [pending, startTransition] = useTransition()

  const runPreview = useCallback(() => {
    if (!turnstileToken) {
      setError('Please wait for the security check to finish, then try again.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await computeCompatibilityPreview(a, b, turnstileToken)
        setResult(res)
      } catch {
        setError('Could not compute preview. Check network or try again later.')
        setTsKey((k) => k + 1)
        setTurnstileToken(null)
      }
    })
  }, [a, b, turnstileToken])

  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            textAlign: 'center',
            background: 'rgba(196,168,98,0.08)',
          }}
        >
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-gold)',
              margin: '0 0 0.35rem',
              letterSpacing: '0.12em',
            }}
          >
            ELEMENTAL PREVIEW · 合盘
          </p>
          <p style={{ fontSize: '2.75rem', fontWeight: 300, margin: 0 }}>{result.score}%</p>
          <p style={{ color: 'var(--color-ivory-dim)', marginBottom: 0 }}>
            Day masters {result.personA.dayMaster} · {result.personB.dayMaster} —{' '}
            <em>{result.grade}</em>
          </p>
        </div>
        <ul
          style={{
            paddingLeft: '1.1rem',
            margin: 0,
            color: 'var(--color-ivory-dim)',
            lineHeight: 1.7,
          }}
        >
          {result.highlights.slice(0, 5).map((h, i) => (
            <li key={`${i}-${h.slice(0, 24)}`}>{h}</li>
          ))}
        </ul>
        <DownloadCTA
          headline='Full synastry in SoulMatch (roadmap)'
          sub='Dimensional Bond readings, gifting, resonance invites — meanwhile HexAstral ships deep pair reports today.'
          appStoreUrl={resolveAppStoreUrl('soulmatch')}
          targetApp='soulmatch'
          compact
        />
        <DownloadCTA
          headline='Or unlock everything inside HexAstral flagship'
          sub='Zi Wei + Ba Zi dual chart bond flows already live.'
          compact
          targetApp='hexastral'
        />
        <button
          type='button'
          onClick={() => {
            setResult(null)
            setStep('a')
            setA(EMPTY)
            setB({ ...EMPTY, gender: 'female' })
            setTurnstileToken(null)
            setTsKey((k) => k + 1)
          }}
          style={{
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-ivory-dim)',
            padding: '0.65rem',
            borderRadius: 999,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Start over
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
      {step === 'a' ? (
        <BirthInfoForm
          label='Person A — Turnstile runs when you reach Person B'
          value={a}
          onChange={setA}
          onSubmit={() => setStep('b')}
          submitLabel='Continue to Person B →'
          showName={false}
        />
      ) : (
        <>
          <button
            type='button'
            onClick={() => setStep('a')}
            style={{
              alignSelf: 'stretch',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-gold)',
              cursor: 'pointer',
              padding: '0.25rem',
              fontFamily: 'inherit',
            }}
          >
            ← Edit Person A
          </button>
          <BirthInfoForm
            label='Person B'
            value={b}
            onChange={setB}
            onSubmit={runPreview}
            submitLabel={pending ? 'Consulting oracle…' : 'Reveal compatibility teaser'}
            showName={false}
            loading={pending}
          />
          <div style={{ alignSelf: 'stretch' }}>
            <TurnstileWidget
              key={`compat-${tsKey}`}
              action='growth-compat-teaser'
              onToken={setTurnstileToken}
            />
          </div>
          {error ? (
            <p style={{ margin: 0, color: 'salmon', fontSize: '0.85rem' }}>{error}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
