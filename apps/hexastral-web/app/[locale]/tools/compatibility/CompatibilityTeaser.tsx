'use client'

import { useTranslations } from 'next-intl'
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
  const t = useTranslations('tools.compatibility')
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
      setError(t('turnstileWait'))
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await computeCompatibilityPreview(a, b, turnstileToken)
        setResult(res)
      } catch {
        setError(t('error'))
        setTsKey((k) => k + 1)
        setTurnstileToken(null)
      }
    })
  }, [a, b, turnstileToken, t])

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
            {t('previewLabel')}
          </p>
          <p style={{ fontSize: '1.35rem', fontWeight: 400, margin: '0 0 0.5rem', letterSpacing: '0.04em' }}>
            {result.grade}
          </p>
          <p style={{ color: 'var(--color-ivory-dim)', marginBottom: 0, fontSize: '0.9rem' }}>
            {t('dayMasters')} {result.personA.dayMaster} · {result.personB.dayMaster}
          </p>
          <p style={{ color: 'var(--color-ivory-dim)', marginTop: '0.75rem', fontSize: '0.75rem', lineHeight: 1.5 }}>
            {t('disclaimer')}
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
          headline={t('ctaHeadline')}
          sub={t('ctaSub')}
          appStoreUrl={resolveAppStoreUrl('soulmatch')}
          targetApp='soulmatch'
          compact
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
          {t('startOver')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
      {step === 'a' ? (
        <BirthInfoForm
          label={t('turnstileHint')}
          value={a}
          onChange={setA}
          onSubmit={() => setStep('b')}
          submitLabel={t('continueB')}
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
            {t('editA')}
          </button>
          <BirthInfoForm
            label={t('personB')}
            value={b}
            onChange={setB}
            onSubmit={runPreview}
            submitLabel={pending ? t('computing') : t('compute')}
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
