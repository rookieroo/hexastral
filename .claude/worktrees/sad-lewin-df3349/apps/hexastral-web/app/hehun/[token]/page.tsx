import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StarBackground } from '@/components/StarBackground'
import { HexastralPlanetLogo } from '@/components/HexastralPlanetLogo'
import { HehunCollectionClient } from './client'

interface HehunPageProps {
  params: Promise<{ token: string }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

/** Resolve DDL token to get inviter context */
async function resolveToken(token: string): Promise<{
  inviterUserId?: string
  bondId?: string
  inviterName?: string
} | null> {
  try {
    const res = await fetch(`${API_URL}/api/ddl/${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const data = (await res.json()) as {
      session?: { meta?: { payload?: Record<string, unknown> } }
      found?: boolean
    }
    if (!data.found || !data.session?.meta?.payload) return null
    const p = data.session.meta.payload
    return {
      inviterUserId: p.inviterUserId as string | undefined,
      bondId: p.bondId as string | undefined,
      inviterName: p.inviterName as string | undefined,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: HehunPageProps): Promise<Metadata> {
  const { token } = await params
  const ctx = await resolveToken(token)
  const inviterName = ctx?.inviterName

  return {
    title: inviterName
      ? `${inviterName} wants to check your compatibility · HexAstral`
      : 'Compatibility Check · HexAstral',
    description:
      'Enter your birth info to see your compatibility score — powered by Four Pillars analysis.',
    openGraph: {
      title: inviterName
        ? `${inviterName} invited you to a compatibility check`
        : 'Check Your Compatibility · HexAstral',
      description: 'AI-powered Ba Zi compatibility analysis — free instant preview.',
      siteName: 'HexAstral',
    },
  }
}

export default async function HehunPage({ params }: HehunPageProps) {
  const { token } = await params
  const ctx = await resolveToken(token)

  if (!ctx) notFound()

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      <StarBackground density={80} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          marginTop: '2rem',
        }}
      >
        {/* Brand */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <HexastralPlanetLogo size={40} />
          <span
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
            }}
          >
            HexAstral
          </span>
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center' }}>
          {ctx.inviterName ? (
            <h1
              style={{
                fontSize: '1.3rem',
                fontWeight: 300,
                color: 'var(--color-ivory)',
                margin: '0 0 0.5rem',
              }}
            >
              <span style={{ color: 'var(--color-gold)' }}>「{ctx.inviterName}」</span>
              <br />
              invited you to check compatibility
            </h1>
          ) : (
            <h1
              style={{
                fontSize: '1.3rem',
                fontWeight: 300,
                color: 'var(--color-ivory)',
                margin: '0 0 0.5rem',
              }}
            >
              Compatibility Check
            </h1>
          )}
          <p style={{ fontSize: '0.82rem', color: 'var(--color-ivory-dim)', margin: 0 }}>
            Enter your birth info for an instant preview
          </p>
        </div>

        {/* Client form + preview + CTA */}
        <HehunCollectionClient
          token={token}
          bondId={ctx.bondId}
          inviterUserId={ctx.inviterUserId}
        />
      </div>
    </main>
  )
}
