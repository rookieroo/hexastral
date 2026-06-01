'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { type BasicChartResult, computeBasicChart } from '@/app/actions/chart'
import { CityAutocomplete, type CitySelection } from '@/components/CityAutocomplete'
import { DownloadCTA } from '@/components/DownloadCTA'
import { LoadingCeremony } from '@/components/LoadingCeremony'
import { StarBackground } from '@/components/StarBackground'
import { TurnstileWidget } from '@/components/TurnstileWidget'

// ── Types ─────────────────────────────────────────────────────

type Step = 'name' | 'date' | 'time' | 'gender' | 'city' | 'loading' | 'result'

interface UserInput {
  name: string
  solarDate: string
  timeIndex: number
  gender: 'male' | 'female'
  birthCity: string
  latitude?: number
  longitude?: number
  timezone?: string
}

const SHI_CHEN_LABELS = [
  { zh: '子时 (23:00–01:00)', en: '23:00–01:00' },
  { zh: '丑时 (01:00–03:00)', en: '01:00–03:00' },
  { zh: '寅时 (03:00–05:00)', en: '03:00–05:00' },
  { zh: '卯时 (05:00–07:00)', en: '05:00–07:00' },
  { zh: '辰时 (07:00–09:00)', en: '07:00–09:00' },
  { zh: '巳时 (09:00–11:00)', en: '09:00–11:00' },
  { zh: '午时 (11:00–13:00)', en: '11:00–13:00' },
  { zh: '丑时 (13:00–15:00)', en: '13:00–15:00' },
  { zh: '申时 (15:00–17:00)', en: '15:00–17:00' },
  { zh: '酉时 (17:00–19:00)', en: '17:00–19:00' },
  { zh: '戌时 (19:00–21:00)', en: '19:00–21:00' },
  { zh: '亥时 (21:00–23:00)', en: '21:00–23:00' },
  { zh: '不确定', en: 'Not sure' },
]

// ── Animated step wrapper ─────────────────────────────────────

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  )
}

// ── Pillar display ────────────────────────────────────────────

function PillarCard({ label, stem, branch }: { label: string; stem: string; branch: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.75rem 0.5rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        minWidth: 56,
      }}
    >
      <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span style={{ fontSize: '1.2rem', color: 'var(--color-ivory)', fontWeight: 300 }}>
        {stem}
      </span>
      <span style={{ fontSize: '1.2rem', color: 'var(--color-ivory-dim)', fontWeight: 300 }}>
        {branch}
      </span>
    </div>
  )
}

// ── Conversation bubble ───────────────────────────────────────

function AstroBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          maxWidth: 360,
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-gold))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
          }}
        >
          ✦
        </div>
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px 12px 12px 12px',
            fontSize: '0.92rem',
            color: 'var(--color-ivory)',
            lineHeight: 1.6,
          }}
        >
          {text}
        </div>
      </div>
    </FadeIn>
  )
}

// ── Step components ───────────────────────────────────────────

function StepName({
  value,
  onChange,
  onNext,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
}) {
  const t = useTranslations('onboarding')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <AstroBubble text={t('bNameQuestion')} delay={300} />
      <FadeIn delay={700}>
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          placeholder={t('bNamePlaceholder')}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-ivory)',
            fontSize: '1rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </FadeIn>
      <FadeIn delay={900}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-gold))',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: value.trim() ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
          disabled={!value.trim()}
        >
          {t('bContinue')}
        </button>
      </FadeIn>
    </div>
  )
}

function StepDate({
  value,
  onChange,
  onNext,
  name,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  name: string
}) {
  const t = useTranslations('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <AstroBubble text={t('bDateQuestion', { name })} delay={300} />
      <FadeIn delay={700}>
        <input
          type='date'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-ivory)',
            fontSize: '1rem',
            fontFamily: 'inherit',
            outline: 'none',
            colorScheme: 'dark',
          }}
        />
      </FadeIn>
      <FadeIn delay={900}>
        <button
          onClick={onNext}
          disabled={!value}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-gold))',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: value ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
        >
          {t('bContinue')}
        </button>
      </FadeIn>
    </div>
  )
}

function StepTime({
  value,
  onChange,
  onNext,
}: {
  value: number
  onChange: (v: number) => void
  onNext: () => void
}) {
  const t = useTranslations('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <AstroBubble text={t('bTimeQuestion')} delay={300} />
      <FadeIn delay={700}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          {SHI_CHEN_LABELS.map((label, idx) => (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              style={{
                padding: '0.65rem 0.5rem',
                background: value === idx ? 'rgba(196,168,98,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${value === idx ? 'var(--color-gold)' : 'var(--color-border)'}`,
                borderRadius: 8,
                color: value === idx ? 'var(--color-gold)' : 'var(--color-ivory-dim)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {label.en}
            </button>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={900}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-gold))',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('bContinue')}
        </button>
      </FadeIn>
    </div>
  )
}

function StepGender({
  value,
  onChange,
  onNext,
}: {
  value: 'male' | 'female'
  onChange: (v: 'male' | 'female') => void
  onNext: () => void
}) {
  const t = useTranslations('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <AstroBubble text={t('bGenderQuestion')} delay={300} />
      <FadeIn delay={700}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => {
                onChange(g)
                setTimeout(onNext, 200)
              }}
              style={{
                flex: 1,
                padding: '1.25rem',
                background: value === g ? 'rgba(196,168,98,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${value === g ? 'var(--color-gold)' : 'var(--color-border)'}`,
                borderRadius: 12,
                color: value === g ? 'var(--color-gold)' : 'var(--color-ivory)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>{g === 'male' ? '☰' : '☷'}</span>
              <span style={{ fontSize: '0.85rem' }}>
                {g === 'male' ? t('bGenderMale') : t('bGenderFemale')}
              </span>
            </button>
          ))}
        </div>
      </FadeIn>
    </div>
  )
}

function StepCity({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (city: string, geo?: CitySelection) => void
  onSubmit: () => void
}) {
  const t = useTranslations('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <AstroBubble text={t('bCityQuestion')} delay={300} />
      <FadeIn delay={700}>
        <CityAutocomplete
          value={value}
          onChange={onChange}
          placeholder={t('bCityPlaceholder')}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-ivory)',
            fontSize: '1rem',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </FadeIn>
      <FadeIn delay={900}>
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-gold))',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.05em',
            opacity: value.trim() ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
        >
          {t('bRevealChart')}
        </button>
      </FadeIn>
    </div>
  )
}

// ── Result view ───────────────────────────────────────────────

function ResultView({ result, name }: { result: BasicChartResult; name: string }) {
  const t = useTranslations('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: 420,
      }}
    >
      <FadeIn delay={200}>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-gold)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            {t('personalChartLabel', { name })}
          </p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 300, margin: 0 }}>
            {t('dayMasterLabel')}　
            <span style={{ color: 'var(--color-gold)', fontSize: '1.8rem' }}>
              {result.dayMaster}
            </span>
          </h2>
        </div>
      </FadeIn>

      <FadeIn delay={500}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <PillarCard
            label='年'
            stem={result.pillars.year.stem}
            branch={result.pillars.year.branch}
          />
          <PillarCard
            label='月'
            stem={result.pillars.month.stem}
            branch={result.pillars.month.branch}
          />
          <PillarCard
            label='日'
            stem={result.pillars.day.stem}
            branch={result.pillars.day.branch}
          />
          <PillarCard
            label='时'
            stem={result.pillars.hour.stem}
            branch={result.pillars.hour.branch}
          />
        </div>
      </FadeIn>

      <FadeIn delay={800}>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(196,168,98,0.06)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-gold)',
              letterSpacing: '0.15em',
              marginBottom: '0.75rem',
            }}
          >
            {t('starsSpeakPrefix', { name })}
          </p>
          {result.coldReading.split('\n\n').map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-ivory)',
                lineHeight: 1.8,
                margin: i > 0 ? '0.75rem 0 0' : 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={1100}>
        <div
          style={{
            position: 'relative',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 12,
          }}
        >
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-ivory-muted)',
              marginBottom: '0.75rem',
            }}
          >
            {t('fullReadingLabel')}
          </p>
          <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-ivory-dim)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              你的{result.dayMaster}日主在{result.pillars.month.branch}
              月令下，格局呈现强旺之势。十神配置显示你具有极强的主导性，适合走技术或创业路线。
            </p>
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-gold)',
                background: 'rgba(5,5,16,0.9)',
                padding: '0.35rem 0.9rem',
                borderRadius: 100,
                border: '1px solid var(--color-border)',
              }}
            >
              {t('personalPaywallUnlock')}
            </span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={1400}>
        <DownloadCTA
          headline={t('personalCTAHeadline', { name })}
          sub={t('personalCTASub')}
          payload={{ mode: 'personal', dayMaster: result.dayMaster, name }}
        />
      </FadeIn>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────

const STEPS_ORDER: Step[] = ['name', 'date', 'time', 'gender', 'city']

function ProgressDots({ current }: { current: Step }) {
  const idx = STEPS_ORDER.indexOf(current)
  if (idx < 0) return null

  return (
    <div
      style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.5rem' }}
    >
      {STEPS_ORDER.map((_, i) => (
        <div
          key={i}
          style={{
            width: i <= idx ? 24 : 6,
            height: 6,
            borderRadius: 3,
            background:
              i <= idx
                ? 'linear-gradient(90deg, var(--color-purple), var(--color-gold))'
                : 'rgba(255,255,255,0.1)',
            transition: 'all 0.4s ease',
          }}
        />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function OnboardingBPage() {
  const t = useTranslations('onboarding')
  const [step, setStep] = useState<Step>('name')
  const [input, setInput] = useState<UserInput>({
    name: '',
    solarDate: '',
    timeIndex: 12,
    gender: 'male',
    birthCity: '',
  })
  const [result, setResult] = useState<BasicChartResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileCount, setTurnstileCount] = useState<number>(0)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = useCallback(() => {
    setStep('loading')
    startTransition(async () => {
      try {
        const chartResult = await computeBasicChart(
          {
            ...input,
          },
          turnstileToken ?? ''
        )
        setResult(chartResult)
      } catch {
        setError(t('errorRetry'))
        setTurnstileCount((c) => c + 1)
        setStep('city')
      }
    })
  }, [input, t])

  const handleLoadingComplete = useCallback(() => setStep('result'), [])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StarBackground density={100} />

      {step === 'loading' && (
        <LoadingCeremony onComplete={handleLoadingComplete} duration={isPending ? 8000 : 3500} />
      )}

      {/* Header */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5,5,16,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-gold)',
            letterSpacing: '0.15em',
          }}
        >
          HexAstral
        </span>
      </nav>

      {/* Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: step === 'result' ? 'flex-start' : 'center',
          padding: step === 'result' ? '5rem 1.5rem 4rem' : '5rem 1.5rem 2rem',
          minHeight: '100dvh',
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,80,80,0.1)',
              border: '1px solid rgba(255,80,80,0.3)',
              borderRadius: 8,
              fontSize: '0.85rem',
              color: '#ff8080',
            }}
          >
            {error}
          </div>
        )}

        {STEPS_ORDER.includes(step as (typeof STEPS_ORDER)[number]) && (
          <ProgressDots current={step} />
        )}

        {step === 'name' && (
          <StepName
            value={input.name}
            onChange={(name) => setInput((prev) => ({ ...prev, name }))}
            onNext={() => input.name.trim() && setStep('date')}
          />
        )}

        {step === 'date' && (
          <StepDate
            value={input.solarDate}
            onChange={(solarDate) => setInput((prev) => ({ ...prev, solarDate }))}
            onNext={() => input.solarDate && setStep('time')}
            name={input.name}
          />
        )}

        {step === 'time' && (
          <StepTime
            value={input.timeIndex}
            onChange={(timeIndex) => setInput((prev) => ({ ...prev, timeIndex }))}
            onNext={() => setStep('gender')}
          />
        )}

        {step === 'gender' && (
          <StepGender
            value={input.gender}
            onChange={(gender) => setInput((prev) => ({ ...prev, gender }))}
            onNext={() => setStep('city')}
          />
        )}

        {step === 'city' && (
          <StepCity
            value={input.birthCity}
            onChange={(birthCity, geo) =>
              setInput((prev) => ({
                ...prev,
                birthCity,
                latitude: geo?.latitude ?? prev.latitude,
                longitude: geo?.longitude ?? prev.longitude,
                timezone: geo?.timezone ?? prev.timezone,
              }))
            }
            onSubmit={handleSubmit}
          />
        )}

        {step === 'result' && result && (
          <ResultView result={result} name={input.name || t('selfDefault')} />
        )}
        <TurnstileWidget key={turnstileCount} onToken={setTurnstileToken} />
      </main>
    </div>
  )
}
