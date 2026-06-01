'use client'

/**
 * Client-side calculator form.
 *
 * Hits `POST /api/numerology/compute` (public — no signin needed) and renders
 * the six numbers below the form. Master numbers (11/22/33) get a small inline
 * tag. The page intentionally avoids per-id persistence — the calculation is
 * cheap and re-runnable, so the URL stays clean for SEO.
 */

import { useState } from 'react'
import type { CalcCopy } from './page'

interface NumerologyResponse {
  ok: true
  reading: {
    fullName: string
    birthDate: string
    lifePath: number
    birthday: number
    expression: number
    soulUrge: number
    personality: number
    personalYear: number
    computedAt: string
  }
  interpretation: string | null
}

const MASTER = new Set([11, 22, 33])

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalculatorClient({ copy }: { copy: CalcCopy }) {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('1990-01-01')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [reading, setReading] = useState<NumerologyResponse['reading'] | null>(null)

  const ready = name.trim().length >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(birth)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setErr(null)
    setReading(null)
    try {
      const res = await fetch('/api/numerology/compute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), birthDate: birth }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = (await res.json()) as NumerologyResponse
      setReading(data.reading)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : copy.err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#18181B',
        padding: '64px 20px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: -0.4,
            marginBottom: 32,
          }}
        >
          {copy.title}
        </h1>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: 'rgba(24,24,27,0.65)',
                marginBottom: 6,
              }}
            >
              {copy.nameLabel}
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCapitalize='words'
              required
              style={{
                width: '100%',
                fontSize: 18,
                color: '#18181B',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.5px solid rgba(24,24,27,0.32)',
                padding: '12px 0',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'rgba(24,24,27,0.55)', marginTop: 6 }}>
              {copy.nameHint}
            </p>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: 'rgba(24,24,27,0.65)',
                marginBottom: 6,
              }}
            >
              {copy.birthLabel}
            </label>
            <input
              type='date'
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              max={todayIso()}
              min='1900-01-01'
              required
              style={{
                width: '100%',
                fontSize: 18,
                color: '#18181B',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.5px solid rgba(24,24,27,0.32)',
                padding: '12px 0',
                outline: 'none',
              }}
            />
          </div>

          {err ? (
            <p style={{ color: 'rgba(24,24,27,0.7)', fontSize: 13 }}>{err}</p>
          ) : null}

          <button
            type='submit'
            disabled={!ready || busy}
            style={{
              padding: '16px 0',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              backgroundColor: '#18181B',
              color: '#FAFAFA',
              border: 'none',
              opacity: !ready || busy ? 0.4 : 1,
              cursor: !ready || busy ? 'default' : 'pointer',
            }}
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </form>

        {reading ? (
          <section style={{ marginTop: 56 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{copy.resultTitle}</h2>
            <p style={{ fontSize: 12, color: 'rgba(24,24,27,0.55)', marginBottom: 24 }}>
              {reading.fullName} · {reading.birthDate}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {copy.rows.map((row) => {
                const n = (reading as unknown as Record<string, number>)[row.key] ?? 0
                const isMaster = MASTER.has(n)
                return (
                  <div
                    key={row.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px',
                      border: '0.5px solid rgba(24,24,27,0.18)',
                    }}
                  >
                    <div style={{ width: 56, textAlign: 'center' }}>
                      <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: 0.4 }}>{n}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            letterSpacing: 1.4,
                            textTransform: 'uppercase',
                          }}
                        >
                          {row.label}
                        </span>
                        {isMaster ? (
                          <span
                            style={{
                              padding: '2px 6px',
                              border: '0.5px solid #18181B',
                              fontSize: 9,
                              letterSpacing: 1.4,
                              textTransform: 'uppercase',
                            }}
                          >
                            {copy.master}
                          </span>
                        ) : null}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(24,24,27,0.6)', marginTop: 4 }}>
                        {row.sub}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
