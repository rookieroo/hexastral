'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DreamTryCopy } from './page'

interface DreamResponse {
  readingType: string
  output: {
    summary?: string
    interpretation?: string
    advice?: string
    symbols?: string[]
  }
}

export function DreamTryClient({ copy, locale }: { copy: DreamTryCopy; locale: string }) {
  const [dream, setDream] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<DreamResponse | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dream.trim() || busy) return
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: 'dreamoracle',
          input: { dreamText: dream.trim() },
          locale,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setResult((await res.json()) as DreamResponse)
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
        <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.4, marginBottom: 32 }}>
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
              {copy.dreamLabel}
            </label>
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              rows={6}
              placeholder={copy.dreamPlaceholder}
              required
              style={{
                width: '100%',
                fontSize: 16,
                color: '#18181B',
                background: 'transparent',
                border: '0.5px solid rgba(24,24,27,0.32)',
                padding: '12px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {err ? <p style={{ color: '#9B2226', fontSize: 13 }}>{err}</p> : null}

          <button
            type='submit'
            disabled={!dream.trim() || busy}
            style={{
              padding: '16px 0',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              backgroundColor: '#18181B',
              color: '#FAFAFA',
              border: 'none',
              opacity: !dream.trim() || busy ? 0.4 : 1,
              cursor: !dream.trim() || busy ? 'default' : 'pointer',
            }}
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </form>

        {result?.output ? (
          <section style={{ marginTop: 48 }}>
            {result.output.summary ? (
              <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
                {result.output.summary}
              </p>
            ) : null}
            {result.output.interpretation ? (
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'rgba(24,24,27,0.78)',
                  marginBottom: 12,
                }}
              >
                {result.output.interpretation}
              </p>
            ) : null}
            {result.output.advice ? (
              <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>
                {result.output.advice}
              </p>
            ) : null}
          </section>
        ) : null}

        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}dream-oracle`}
            style={{
              fontSize: 12,
              color: 'rgba(24,24,27,0.55)',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            ← {copy.appCta}
          </Link>
        </div>
      </div>
    </main>
  )
}
