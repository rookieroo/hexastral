'use client'

/**
 * B-user invitation acceptance client.
 *
 * Three sub-states:
 *   'gate'    — Turnstile + opening message ("A wants to know you")
 *   'form'    — Birth info form (compact, B is here to help A, not study Bazi)
 *   'sending' — submitting POST /api/bonds/invitations/:token/accept
 *   On success → router.push(`/${locale}/yuan/invite/${token}/teaser`)
 *   On error → render inline error with retry
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export interface YuanInviteClientProps {
  token: string
  locale: string
  inviterName: string
  /** Free-text label from backend, already locale-appropriate (e.g. "恋人", "Best Friend") */
  relationshipLabel: string
  /** Target name A entered when creating the invitation */
  targetName: string
  /** Optional opening message A wrote */
  note?: string
}

interface BirthFormData {
  name: string
  solarDate: string
  birthTime: string
  birthCity: string
  unknownTime: boolean
}

/**
 * Convert "HH:mm" local time to a 0–12 timeIndex used by the hexastral-api.
 * 子时 splits at midnight: 00:00–01:00 = 0, 23:00–24:00 = 12.
 */
function localTimeToTimeIndex(hhmm: string): number {
  const [hStr] = hhmm.split(':')
  const h = Number.parseInt(hStr ?? '0', 10)
  if (Number.isNaN(h)) return 0
  if (h === 0) return 0
  if (h === 23) return 12
  return Math.floor((h + 1) / 2)
}

export function YuanInviteClient({
  token,
  locale,
  inviterName,
  relationshipLabel,
  targetName,
  note,
}: YuanInviteClientProps) {
  const router = useRouter()
  const [stage, setStage] = useState<'gate' | 'form' | 'sending'>('gate')
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [form, setForm] = useState<BirthFormData>({
    name: targetName ?? '',
    solarDate: '',
    birthTime: '',
    birthCity: '',
    unknownTime: false,
  })

  const isZh = locale === 'zh' || locale === 'tw'

  async function handleAccept() {
    setStage('sending')
    setError(null)
    try {
      // POST /api/bonds/invite/:token/respond — matches hexastral-api contract
      // (see apps/hexastral-api/src/routes/bonds.ts respondSchema).
      const timeIndex = form.unknownTime ? 6 : localTimeToTimeIndex(form.birthTime)
      const body = {
        action: 'accept' as const,
        birthData: {
          solarDate: form.solarDate,
          timeIndex,
          gender: '男' as const, // TODO: collect gender in form; placeholder until UI added
          city: form.birthCity || undefined,
        },
        language: locale === 'en' ? 'en' : 'zh-CN',
      }
      const res = await fetch(
        `${API_URL}/api/bonds/invite/${encodeURIComponent(token)}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Turnstile-Token': turnstileToken,
          },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error((errJson as { message?: string }).message ?? `Failed (${res.status})`)
      }
      router.push(`/${locale === 'en' ? '' : `${locale}/`}yuan/invite/${token}/teaser`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept')
      setStage('form')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        color: '#3C2415',
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Seal header */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            backgroundColor: '#9B2226',
            margin: '0 auto 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 48, color: '#C4A882', fontWeight: 400 }}>緣</span>
        </div>

        {/* Inviter intro */}
        <p
          style={{
            fontSize: 13,
            color: 'rgba(60,36,21,0.65)',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {isZh ? '邀请来自' : 'invited by'}
        </p>
        <h1
          style={{
            fontSize: 32,
            lineHeight: 1.4,
            fontWeight: 400,
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          {inviterName}
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(60,36,21,0.65)',
            textAlign: 'center',
            marginBottom: note ? 16 : 48,
          }}
        >
          {isZh
            ? `${inviterName} 邀你共看一份 ${relationshipLabel} 的缘报告`
            : `${inviterName} wants to read your ${relationshipLabel} resonance`}
        </p>

        {/* Optional A note */}
        {note && (
          <div
            style={{
              padding: 20,
              backgroundColor: '#EDE6D8',
              borderLeft: '2px solid #C4A882',
              marginBottom: 48,
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            "{note}"
          </div>
        )}

        {/* Stage: gate */}
        {stage === 'gate' && (
          <>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: '#3C2415',
                marginBottom: 32,
              }}
            >
              {isZh
                ? '只需要你的生辰，我们就能合上你们的星盘。约 60 秒。'
                : 'Share your birth info — we will align your charts. About 60 seconds.'}
            </p>
            {TURNSTILE_SITE_KEY && (
              <TurnstileGate
                siteKey={TURNSTILE_SITE_KEY}
                onVerified={(t) => {
                  setTurnstileToken(t)
                  setStage('form')
                }}
              />
            )}
            {!TURNSTILE_SITE_KEY && (
              <button
                type="button"
                onClick={() => setStage('form')}
                style={ctaStyle}
              >
                {isZh ? '开始 →' : 'Begin →'}
              </button>
            )}
          </>
        )}

        {/* Stage: form */}
        {(stage === 'form' || stage === 'sending') && (
          <BirthForm
            value={form}
            onChange={setForm}
            isZh={isZh}
            disabled={stage === 'sending'}
            onSubmit={handleAccept}
            submitting={stage === 'sending'}
          />
        )}

        {error && (
          <p
            style={{
              color: '#9B2226',
              marginTop: 24,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

const ctaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontSize: 22,
  fontWeight: 500,
  color: '#C4A882',
  letterSpacing: 0.5,
  borderBottom: '1px solid #C4A882',
  paddingBottom: 12,
  paddingTop: 12,
  backgroundColor: 'transparent',
  border: 'none',
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: '#C4A882',
  cursor: 'pointer',
  textAlign: 'center' as const,
}

function TurnstileGate({
  siteKey,
  onVerified,
}: {
  siteKey: string
  onVerified: (token: string) => void
}) {
  // The actual Turnstile widget is rendered via the existing
  // components/TurnstileWidget — wired in the parent in a later PR.
  // For v0 we expose a minimal placeholder + escape hatch.
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'rgba(60,36,21,0.65)', marginBottom: 24 }}>
        Verifying you are human…
      </p>
      <button
        type="button"
        onClick={() => onVerified('placeholder-token')}
        style={ctaStyle}
      >
        Begin →
      </button>
    </div>
  )
}

function BirthForm({
  value,
  onChange,
  isZh,
  disabled,
  onSubmit,
  submitting,
}: {
  value: BirthFormData
  onChange: (v: BirthFormData) => void
  isZh: boolean
  disabled: boolean
  onSubmit: () => void
  submitting: boolean
}) {
  const canSubmit =
    value.name.trim().length > 0 &&
    value.solarDate.trim().length > 0 &&
    value.birthCity.trim().length > 0 &&
    (value.unknownTime || value.birthTime.trim().length > 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit && !disabled) onSubmit()
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <Field
        label={isZh ? '名字' : 'Name'}
        value={value.name}
        onChange={(v) => onChange({ ...value, name: v })}
        disabled={disabled}
      />
      <Field
        label={isZh ? '生日' : 'Birth date'}
        type="date"
        value={value.solarDate}
        onChange={(v) => onChange({ ...value, solarDate: v })}
        disabled={disabled}
      />
      <Field
        label={isZh ? '出生时辰' : 'Birth time'}
        type="time"
        value={value.birthTime}
        onChange={(v) => onChange({ ...value, birthTime: v })}
        disabled={disabled || value.unknownTime}
      />
      <label style={{ fontSize: 13, color: 'rgba(60,36,21,0.65)', marginTop: -8 }}>
        <input
          type="checkbox"
          checked={value.unknownTime}
          onChange={(e) => onChange({ ...value, unknownTime: e.target.checked })}
          disabled={disabled}
          style={{ marginRight: 8 }}
        />
        {isZh ? '我不太清楚（用日柱推算）' : "I'm not sure (use day pillar)"}
      </label>
      <Field
        label={isZh ? '出生地点' : 'Birth place'}
        value={value.birthCity}
        onChange={(v) => onChange({ ...value, birthCity: v })}
        disabled={disabled}
      />
      <button type="submit" disabled={!canSubmit || disabled} style={ctaStyle}>
        {submitting
          ? (isZh ? '合盘中…' : 'Aligning…')
          : (isZh ? '合上我们的星盘 →' : 'Align our charts →')}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: 'rgba(60,36,21,0.65)',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          fontSize: 18,
          color: '#3C2415',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '0.5px solid rgba(60,36,21,0.25)',
          paddingBottom: 8,
          outline: 'none',
        }}
      />
    </div>
  )
}
