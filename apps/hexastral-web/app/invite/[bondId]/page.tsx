import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { StarBackground } from '@/components/StarBackground'

interface InvitePageProps {
  params: Promise<{ bondId: string }>
}

interface InviteData {
  bondId: string
  inviterName: string
  inviterUsername: string | null
  inviterAvatarUrl: string | null
  relationshipLabel: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

async function fetchInvite(bondId: string): Promise<InviteData | null> {
  try {
    const res = await fetch(`${API_URL}/api/bonds/${encodeURIComponent(bondId)}/invite`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: InviteData }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { bondId } = await params
  const invite = await fetchInvite(bondId)

  if (!invite) return { title: 'Yuel' }

  return {
    title: `${invite.inviterName} invited you · Yuel`,
    description: `${invite.inviterName} wants to explore cosmic compatibility with you on Yuel.`,
    openGraph: {
      title: `${invite.inviterName} invited you · Yuel`,
      description: 'Discover your cosmic compatibility — free on iOS.',
    },
  }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { bondId } = await params
  const invite = await fetchInvite(bondId)

  if (!invite) notFound()

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <StarBackground density={80} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
            }}
          >
            Yuel
          </span>
        </div>

        {/* Invite card */}
        <div
          style={{
            padding: '2rem',
            background:
              'linear-gradient(135deg, rgba(196,168,98,0.06) 0%, rgba(194,84,80,0.06) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            textAlign: 'center',
          }}
        >
          {/* Inviter avatar */}
          {invite.inviterAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invite.inviterAvatarUrl}
              alt={invite.inviterName}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--color-border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(194,84,80,0.12)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                color: 'var(--color-gold)',
                fontWeight: 300,
              }}
            >
              {(invite.inviterName[0] ?? '?').toUpperCase()}
            </div>
          )}

          {/* Inviter name + relationship */}
          <div>
            <h1
              style={{
                fontSize: '1.3rem',
                fontWeight: 300,
                color: 'var(--color-ivory)',
                margin: '0 0 0.5rem',
              }}
            >
              {invite.inviterName}
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-ivory-muted)',
                margin: 0,
              }}
            >
              wants to explore your cosmic bond
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p
            style={{
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--color-ivory)',
              margin: 0,
            }}
          >
            Accept the invitation in Yuel
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-ivory-dim)',
              margin: 0,
              maxWidth: 280,
              lineHeight: 1.6,
            }}
          >
            AI-powered compatibility analysis based on Ba Zi & Purple Star astrology
          </p>
          <DDLRedirectButton
            payload={{
              source: 'bond_invite',
              bondId: invite.bondId,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '0.65rem 1.5rem',
                background: 'linear-gradient(135deg, #c4a862 0%, #c25450 100%)',
                color: '#fff',
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 400,
                letterSpacing: '0.02em',
              }}
            >
              Open in Yuel
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
