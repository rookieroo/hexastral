'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { CoinCastTryCopy } from './page'

interface CastResponse {
  readingType: string
  output: {
    hexagram?: { number?: number; name?: string; changingLines?: number[] }
    interpretation?: string
    advice?: string
    summary?: string
    fortune?: string
  }
}

function castYaoValues(): number[] {
  // Three-coin method: each line = 6 + (heads count of 3 coins, where heads=3, tails=2)
  // Returns 6/7/8/9 per line. Six lines, bottom-to-top.
  return Array.from({ length: 6 }, () => {
    let sum = 0
    for (let i = 0; i < 3; i++) sum += Math.random() < 0.5 ? 3 : 2
    return sum
  })
}

export function CoinCastTryClient({ copy, locale }: { copy: CoinCastTryCopy; locale: string }) {
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<CastResponse | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || busy) return
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: 'coincast',
          input: { question: question.trim(), yaoValues: castYaoValues() },
          locale,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setResult((await res.json()) as CastResponse)
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
              {copy.questionLabel}
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder={copy.questionPlaceholder}
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
            disabled={!question.trim() || busy}
            style={{
              padding: '16px 0',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              backgroundColor: '#9B2226',
              color: '#FAFAFA',
              border: 'none',
              opacity: !question.trim() || busy ? 0.4 : 1,
              cursor: !question.trim() || busy ? 'default' : 'pointer',
            }}
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </form>

        {result?.output ? (
          <section style={{ marginTop: 48 }}>
            {result.output.hexagram?.name ? (
              <h2 style={{ fontSize: 22, fontWeight: 500 }}>
                {result.output.hexagram.number} · {result.output.hexagram.name}
              </h2>
            ) : null}
            {result.output.summary ? (
              <p style={{ fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
                {result.output.summary}
              </p>
            ) : null}
            {result.output.interpretation ? (
              <p
                style={{
                  fontSize: 14,
                  marginTop: 16,
                  lineHeight: 1.7,
                  color: 'rgba(24,24,27,0.78)',
                }}
              >
                {result.output.interpretation}
              </p>
            ) : null}
            {result.output.advice ? (
              <p
                style={{
                  fontSize: 14,
                  marginTop: 16,
                  lineHeight: 1.7,
                  color: 'rgba(24,24,27,0.78)',
                  fontStyle: 'italic',
                }}
              >
                {result.output.advice}
              </p>
            ) : null}
          </section>
        ) : null}

        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}coin-cast`}
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
