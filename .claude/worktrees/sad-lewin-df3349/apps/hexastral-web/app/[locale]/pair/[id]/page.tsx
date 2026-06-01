import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { StarBackground } from '@/components/StarBackground'
import { DownloadCTA } from '@/components/DownloadCTA'

interface PairInvitePageProps {
  params: Promise<{ locale: string; id: string }>
}

async function fetchInviteData(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'
  try {
    const res = await fetch(`${apiUrl}/api/pair/invite/${id}`, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return res.json() as Promise<{
      inviterName: string
      score: number
      grade: string
      dayMasterA: string
      message?: string
    }>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PairInvitePageProps): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'pair' })
  const invite = await fetchInviteData(id)

  if (!invite) {
    return {
      title: 'HexAstral · Pair Invite',
      description: t('inviteText'),
    }
  }

  const name = invite.inviterName
  return {
    title: `${name} · HexAstral`,
    description: `${name} ${t('inviteText')}`,
    openGraph: {
      title: `「${name}」${t('inviteText')}`,
      description: `${t('scoreLabel')}: ${invite.score} · ${invite.grade}`,
      images: [{ url: `/api/og/pair/${id}`, width: 1200, height: 630 }],
    },
  }
}

export default async function PairInvitePage({ params }: PairInvitePageProps) {
  const { id } = await params
  const t = await getTranslations('pair')
  const invite = await fetchInviteData(id)

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
      <StarBackground density={100} />

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
        </div>

        {/* Card */}
        <div
          style={{
            padding: '2rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          {invite ? (
            <>
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 300,
                  color: 'var(--color-gold)',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                {invite.score}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-ivory-muted)',
                  marginBottom: '1.5rem',
                }}
              >
                {t('scoreLabel')}　·　{invite.grade}
              </p>
              <h1
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 300,
                  color: 'var(--color-ivory)',
                  margin: '0 0 0.75rem',
                }}
              >
                <span style={{ color: 'var(--color-gold)' }}>「{invite.inviterName}」</span>
                <br />
                {t('inviteText')}
              </h1>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-ivory-dim)',
                  lineHeight: 1.7,
                  margin: '0 0 1rem',
                }}
              >
                {invite.message}
              </p>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(196,168,98,0.08)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  marginBottom: '0.5rem',
                }}
              >
                <p style={{ fontSize: '0.78rem', color: 'var(--color-ivory-muted)', margin: 0 }}>
                  {t('dayMasterOfLabel', { name: invite.inviterName })}　
                  <span style={{ color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                    {invite.dayMasterA}
                  </span>
                  　×　<span style={{ color: 'var(--color-ivory-dim)' }}>{t('unlockFull')}</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>☽</div>
              <h1
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 300,
                  color: 'var(--color-ivory)',
                  margin: '0 0 0.75rem',
                }}
              >
                HexAstral
              </h1>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-ivory-dim)',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {t('expiredTitle')}
                <br />
                {t('expiredDesc')}
              </p>
            </>
          )}
        </div>

        <DownloadCTA />

        <div style={{ textAlign: 'center' }}>
          <Link
            href='/onboarding'
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-ivory-muted)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {t('orWeb')}
          </Link>
        </div>
      </div>
    </main>
  )
}
