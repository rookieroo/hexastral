import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DownloadCTA } from '@/components/DownloadCTA'
import { StarBackground } from '@/components/StarBackground'

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

async function fetchInviteData(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'
  try {
    const res = await fetch(`${apiUrl}/api/bonds/invite/${token}/info`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data: {
        invitationId: string
        inviterName: string
        inviterAvatarUrl: string | null
        relationshipLabel: string
        targetName: string
        message: string | null
        expiresAt: string
        archetypeName: string | null
        archetypeTagline: string | null
        archetypeCategory: string | null
      }
    }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'resonate' })
  const invite = await fetchInviteData(token)

  const title = invite ? `${invite.inviterName} ${t('inviteTitle')}` : t('defaultTitle')

  const description = invite?.archetypeName
    ? `${invite.archetypeName}${invite.archetypeTagline ? ` · ${invite.archetypeTagline}` : ''}`
    : t('description')

  return {
    title: `${title} · HexAstral`,
    description,
    openGraph: {
      title,
      description,
    },
  }
}

export default async function ResonatePage({ params }: PageProps) {
  const { token } = await params
  const t = await getTranslations('resonate')
  const invite = await fetchInviteData(token)

  const expired = invite ? new Date(invite.expiresAt) < new Date() : false
  const deepLink = `hexastral://bond-accept?token=${token}`
  const appStoreUrl = 'https://apps.apple.com/app/hexastral/id6745054798'

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
          maxWidth: 420,
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
            HexAstral
          </span>
          <p
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              color: 'var(--color-zinc-500)',
              marginTop: '0.25rem',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {invite && !expired ? (
          <>
            <div
              style={{
                border: '0.5px solid var(--color-zinc-800)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.25em',
                  color: 'var(--color-zinc-500)',
                  textTransform: 'uppercase',
                }}
              >
                {t('inviteFrom')}
              </p>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  letterSpacing: '0.05em',
                  color: 'var(--color-zinc-100)',
                }}
              >
                {invite.inviterName}
              </h1>
              <p
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  color: 'var(--color-gold)',
                }}
              >
                {invite.relationshipLabel}
              </p>
              {invite.message ? (
                <p
                  style={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: 'var(--color-zinc-400)',
                    lineHeight: 1.6,
                    textAlign: 'center',
                    marginTop: '0.5rem',
                  }}
                >
                  &ldquo;{invite.message}&rdquo;
                </p>
              ) : null}
              <p
                style={{ fontSize: '0.65rem', color: 'var(--color-zinc-600)', marginTop: '0.5rem' }}
              >
                {t('expires')}: {new Date(invite.expiresAt).toLocaleDateString()}
              </p>

              {/* CTA: Open app or download */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  width: '100%',
                  marginTop: '1rem',
                }}
              >
                <a
                  href={deepLink}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.875rem',
                    backgroundColor: 'var(--color-zinc-100)',
                    color: 'var(--color-zinc-950)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    letterSpacing: '0.15em',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('openInApp')}
                </a>
                <a
                  href={appStoreUrl}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.875rem',
                    border: '0.5px solid var(--color-zinc-800)',
                    color: 'var(--color-zinc-400)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('downloadApp')}
                </a>
              </div>
            </div>

            {/* ── Curiosity Gap — blurred dimension teaser ── */}
            <div
              style={{
                border: '0.5px solid var(--color-zinc-800)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.25em',
                  color: 'var(--color-zinc-500)',
                  textTransform: 'uppercase',
                }}
              >
                {t('curiosityTitle')}
              </p>

              {/* Archetype teaser (if available) */}
              {invite.archetypeName ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 300,
                      letterSpacing: '0.05em',
                      color: 'var(--color-zinc-100)',
                    }}
                  >
                    {invite.archetypeName}
                  </p>
                  {invite.archetypeTagline ? (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                        color: 'var(--color-gold)',
                      }}
                    >
                      {invite.archetypeTagline}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* 3 blurred dimension slots — no actual scores exposed */}
              {([t('dimAttraction'), t('dimCommunication'), t('dimEmotional')] as string[]).map(
                (label) => (
                  <div
                    key={label}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
                  >
                    <p
                      style={{
                        fontSize: '0.65rem',
                        letterSpacing: '0.2em',
                        color: 'var(--color-zinc-600)',
                        textTransform: 'uppercase',
                        filter: 'blur(4px)',
                        userSelect: 'none',
                      }}
                    >
                      {label}
                    </p>
                    <div
                      style={{
                        height: '2px',
                        backgroundColor: 'var(--color-zinc-800)',
                        position: 'relative',
                        overflow: 'hidden',
                        filter: 'blur(3px)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: '65%',
                          backgroundColor: 'var(--color-gold)',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                )
              )}

              {/* Unlock CTA */}
              <a
                href={appStoreUrl}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.875rem',
                  backgroundColor: 'var(--color-zinc-100)',
                  color: 'var(--color-zinc-950)',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  marginTop: '0.25rem',
                }}
              >
                {t('curiosityUnlockCTA')}
              </a>
            </div>
          </>
        ) : (
          <div
            style={{
              border: '0.5px solid var(--color-zinc-800)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--color-zinc-400)', lineHeight: 1.6 }}>
              {expired ? t('expired') : t('notFound')}
            </p>
          </div>
        )}

        {/* Footer */}
        <DownloadCTA />
      </div>
    </main>
  )
}
