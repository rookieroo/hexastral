'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useState, useTransition } from 'react'
import {
  type BasicChartResult,
  type CompatibilityPreviewResult,
  computeBasicChart,
  computeCompatibilityPreview,
} from '@/app/actions/chart'
import { type BirthInfo, BirthInfoForm } from '@/components/BirthInfoForm'
import { DownloadCTA } from '@/components/DownloadCTA'
import { LoadingCeremony } from '@/components/LoadingCeremony'
import { StarBackground } from '@/components/StarBackground'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { Link } from '@/i18n/navigation'

type FlowMode = 'personal' | 'pairing'
type FlowStep = 'motivation' | 'self-birth' | 'partner-birth' | 'loading' | 'result'

const EMPTY_BIRTH: BirthInfo = {
  solarDate: '',
  timeIndex: 12,
  gender: 'male',
  name: '',
  birthCity: '',
}

// ── Pillar display ────────────────────────────────────────────────────────────

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

function FourPillarsDisplay({
  pillars,
}: {
  pillars: {
    year: { stem: string; branch: string }
    month: { stem: string; branch: string }
    day: { stem: string; branch: string }
    hour: { stem: string; branch: string }
  }
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      <PillarCard label='年' stem={pillars.year.stem} branch={pillars.year.branch} />
      <PillarCard label='月' stem={pillars.month.stem} branch={pillars.month.branch} />
      <PillarCard label='日' stem={pillars.day.stem} branch={pillars.day.branch} />
      <PillarCard label='时' stem={pillars.hour.stem} branch={pillars.hour.branch} />
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#c4a862' : score >= 60 ? '#7b5ea7' : 'rgba(196,168,98,0.5)'

  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg width='140' height='140' style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx='70'
          cy='70'
          r={radius}
          fill='none'
          stroke='rgba(255,255,255,0.06)'
          strokeWidth='6'
        />
        <circle
          cx='70'
          cy='70'
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth='6'
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--color-gold)', lineHeight: 1 }}
        >
          {score}
        </span>
        <span
          style={{ fontSize: '0.7rem', color: 'var(--color-ivory-muted)', letterSpacing: '0.05em' }}
        >
          / 100
        </span>
      </div>
    </div>
  )
}

// ── Motivation step ───────────────────────────────────────────────────────────

function StepMotivation({ onSelect }: { onSelect: (mode: FlowMode) => void }) {
  const t = useTranslations('onboarding')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        padding: '1.5rem',
        maxWidth: 400,
        width: '100%',
      }}
    >
      <p
        style={{
          fontSize: '0.72rem',
          letterSpacing: '0.3em',
          color: 'var(--color-gold)',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {t('motivationPrompt')}
      </p>
      <h1
        style={{
          fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
          fontWeight: 300,
          textAlign: 'center',
          margin: 0,
        }}
      >
        {t('motivationTitle1')}
        <br />
        <span style={{ color: 'var(--color-gold)' }}>{t('motivationTitle2')}</span>
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <button
          onClick={() => onSelect('personal')}
          style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-ivory)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⊕</span>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '0.2rem' }}>
                {t('modePersonalTitle')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ivory-dim)' }}>
                {t('modePersonalDesc')}
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('pairing')}
          style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(196,168,98,0.06)',
            border: '1px solid var(--color-gold)',
            borderRadius: 12,
            color: 'var(--color-ivory)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '1rem',
              background: 'var(--color-gold)',
              color: 'var(--color-void)',
              fontSize: '0.62rem',
              fontWeight: 500,
              padding: '0.2rem 0.6rem',
              borderRadius: 100,
              letterSpacing: '0.08em',
            }}
          >
            {t('modePairingBadge')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>☷</span>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '0.2rem', color: 'var(--color-gold)' }}>
                {t('modePairingTitle')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ivory-dim)' }}>
                {t('modePairingDesc')}
              </div>
            </div>
          </div>
        </button>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--color-ivory-muted)', textAlign: 'center' }}>
        {t('noSignupNote')}
      </p>
    </div>
  )
}

// ── Personal result ───────────────────────────────────────────────────────────

function PersonalResult({ result, name }: { result: BasicChartResult; name?: string }) {
  const t = useTranslations('onboarding')
  const displayName = name || t('selfDefault')

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
          {t('personalChartLabel', { name: displayName })}
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 300, margin: 0 }}>
          {t('dayMasterLabel')}　
          <span style={{ color: 'var(--color-gold)', fontSize: '1.8rem' }}>{result.dayMaster}</span>
        </h2>
      </div>

      <FourPillarsDisplay pillars={result.pillars} />

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
          {t('starsSpeakPrefix', { name: displayName })}
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
            月令下，格局呈现强旺之势。十神配置显示你具有极强的主导性，适合走技术或创业路线。流年
            {new Date().getFullYear()}年，走入{result.pillars.year.stem}年运……
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

      <DownloadCTA
        headline={t('personalCTAHeadline', { name: displayName })}
        sub={t('personalCTASub')}
        payload={{ mode: 'personal', dayMaster: result.dayMaster, name: displayName }}
      />
    </div>
  )
}

// ── Pairing result ────────────────────────────────────────────────────────────

function PairingResult({
  result,
  nameA,
  nameB,
}: {
  result: CompatibilityPreviewResult
  nameA?: string
  nameB?: string
}) {
  const t = useTranslations('onboarding')
  const a = nameA || t('selfDefault')
  const b = nameB || t('partnerDefault')
  const gradeColor =
    result.score >= 80
      ? 'var(--color-gold)'
      : result.score >= 60
        ? 'var(--color-purple)'
        : 'var(--color-ivory-dim)'

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
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '0.72rem',
            color: 'var(--color-gold)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          {t('pairingScoreUnit', { a, b })}
        </p>
        <ScoreRing score={result.score} />
        <p
          style={{
            marginTop: '0.75rem',
            fontSize: '1rem',
            color: gradeColor,
            letterSpacing: '0.1em',
          }}
        >
          {result.grade}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          { label: a, master: result.personA.dayMaster, pillars: result.personA.pillars },
          { label: b, master: result.personB.dayMaster, pillars: result.personB.pillars },
        ].map(({ label, master, pillars }) => (
          <div
            key={label}
            style={{
              padding: '1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
            }}
          >
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-gold)',
                marginBottom: '0.5rem',
                letterSpacing: '0.1em',
              }}
            >
              {label}　{t('dayMasterLabel')} {master}
            </p>
            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
              {(['year', 'month', 'day', 'hour'] as const).map((p) => (
                <div
                  key={p}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-ivory)' }}>
                    {pillars[p].stem}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-ivory-dim)' }}>
                    {pillars[p].branch}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {result.highlights.length > 0 && (
        <div
          style={{
            padding: '1.25rem',
            background: 'rgba(196,168,98,0.06)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
          }}
        >
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-gold)',
              letterSpacing: '0.15em',
              marginBottom: '0.75rem',
            }}
          >
            {t('pairingInsightsTitle')}
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {result.highlights.map((h, i) => (
              <li
                key={i}
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-ivory)',
                  lineHeight: 1.6,
                  paddingLeft: '1.25rem',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0, color: 'var(--color-gold)' }}>✦</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          position: 'relative',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <p
          style={{ fontSize: '0.72rem', color: 'var(--color-ivory-muted)', marginBottom: '0.5rem' }}
        >
          {t('pairingFullReportLabel')}
        </p>
        <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-ivory-dim)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {a}的{result.personA.dayMaster}与{b}的{result.personB.dayMaster}在五行关系上呈……月支
            {result.personA.pillars.month.branch}与{result.personB.pillars.month.branch}
            之间的能量张力……
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
            {t('pairingPaywallUnlock')}
          </span>
        </div>
      </div>

      <DownloadCTA
        headline={t('pairingCTAHeadline')}
        sub={t('pairingCTASub')}
        payload={{ mode: 'pairing', score: result.score }}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const [mode, setMode] = useState<FlowMode>('personal')
  const [step, setStep] = useState<FlowStep>('motivation')
  const [selfBirth, setSelfBirth] = useState<BirthInfo>(EMPTY_BIRTH)
  const [partnerBirth, setPartnerBirth] = useState<BirthInfo>({ ...EMPTY_BIRTH, gender: 'female' })
  const [personalResult, setPersonalResult] = useState<BasicChartResult | null>(null)
  const [pairingResult, setPairingResult] = useState<CompatibilityPreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileCount, setTurnstileCount] = useState<number>(0)
  const [isPending, startTransition] = useTransition()

  const handleModeSelect = useCallback((selectedMode: FlowMode) => {
    setMode(selectedMode)
    setStep('self-birth')
  }, [])

  const handleSelfBirthSubmit = useCallback(() => {
    if (mode === 'personal') {
      setStep('loading')
      startTransition(async () => {
        try {
          const result = await computeBasicChart(
            {
              ...selfBirth,
            },
            turnstileToken ?? ''
          )
          setPersonalResult(result)
        } catch {
          setError(t('errorRetry'))
          setTurnstileCount((c) => c + 1)
          setStep('self-birth')
        }
      })
    } else {
      setStep('partner-birth')
    }
  }, [mode, selfBirth, t])

  const handlePartnerBirthSubmit = useCallback(() => {
    setStep('loading')
    startTransition(async () => {
      try {
        const result = await computeCompatibilityPreview(
          { ...selfBirth },
          { ...partnerBirth },
          turnstileToken ?? ''
        )
        setPairingResult(result)
      } catch {
        setError(t('errorRetry'))
        setTurnstileCount((c) => c + 1)
        setStep('partner-birth')
      }
    })
  }, [selfBirth, partnerBirth, t])

  const handleLoadingComplete = useCallback(() => setStep('result'), [])

  const restart = useCallback(() => {
    setStep('motivation')
    setPersonalResult(null)
    setPairingResult(null)
    setError(null)
    setSelfBirth(EMPTY_BIRTH)
    setPartnerBirth({ ...EMPTY_BIRTH, gender: 'female' })
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StarBackground density={80} />

      {step === 'loading' && (
        <LoadingCeremony onComplete={handleLoadingComplete} duration={isPending ? 8000 : 3500} />
      )}

      {/* Nav */}
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
          justifyContent: 'space-between',
          background: 'rgba(5,5,16,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {step === 'motivation' ? (
          <Link
            href='/'
            style={{ fontSize: '0.82rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {t('back')}
          </Link>
        ) : (
          <button
            onClick={restart}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ivory-dim)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            {t('restart')}
          </button>
        )}
        <span style={{ fontSize: '0.82rem', color: 'var(--color-gold)', letterSpacing: '0.15em' }}>
          HexAstral
        </span>
        <div style={{ width: 60 }} />
      </nav>

      {/* Progress bar */}
      {step !== 'motivation' && step !== 'result' && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(255,255,255,0.06)',
            zIndex: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--color-purple), var(--color-gold))',
              width:
                step === 'self-birth'
                  ? mode === 'personal'
                    ? '50%'
                    : '33%'
                  : step === 'partner-birth'
                    ? '66%'
                    : step === 'loading'
                      ? '90%'
                      : '100%',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}

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
          padding: step === 'result' ? '6rem 1.5rem 4rem' : '5rem 1.5rem 2rem',
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

        {step === 'motivation' && <StepMotivation onSelect={handleModeSelect} />}

        {step === 'self-birth' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-gold)',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                {mode === 'pairing' ? t('selfStep1Label') : t('selfBirthLabel')}
              </p>
              <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 300 }}>
                {t('selfStep1Title')}
                <br />
                <span style={{ color: 'var(--color-gold)' }}>{t('selfStep1Accent')}</span>
              </h2>
            </div>
            <BirthInfoForm
              value={selfBirth}
              onChange={setSelfBirth}
              onSubmit={handleSelfBirthSubmit}
              submitLabel={mode === 'pairing' ? t('submitNext') : t('submitPersonal')}
            />
          </div>
        )}

        {step === 'partner-birth' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-gold)',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                {t('partnerStep2Label')}
              </p>
              <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 300 }}>
                {t('partnerStep2Title')}
                <br />
                <span style={{ color: 'var(--color-gold)' }}>{t('partnerStep2Accent')}</span>
              </h2>
            </div>
            <BirthInfoForm
              value={partnerBirth}
              onChange={setPartnerBirth}
              onSubmit={handlePartnerBirthSubmit}
              submitLabel={t('submitPairing')}
              label={t('partnerLabel', { selfName: selfBirth.name || t('selfDefault') })}
            />
          </div>
        )}

        {step === 'result' && personalResult && (
          <PersonalResult result={personalResult} name={selfBirth.name} />
        )}

        {step === 'result' && pairingResult && (
          <PairingResult result={pairingResult} nameA={selfBirth.name} nameB={partnerBirth.name} />
        )}
        <TurnstileWidget key={turnstileCount} onToken={setTurnstileToken} />
      </main>
    </div>
  )
}
