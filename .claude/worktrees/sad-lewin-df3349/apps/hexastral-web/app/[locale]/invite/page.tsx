import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { StarBackground } from '@/components/StarBackground'
import { InviteCTA } from './InviteCTA'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'invite' })
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
  }
}

export default async function InvitePage({ params, searchParams }: PageProps) {
  const [{ locale }, { ref }] = await Promise.all([params, searchParams])
  const t = await getTranslations({ locale, namespace: 'invite' })

  const referralCode = ref?.trim().toUpperCase() ?? null

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StarBackground density={120} />

      {/* ── Card ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          padding: '2rem 1.5rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          textAlign: 'center',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(196,168,98,0.08)',
            fontSize: '1.6rem',
          }}
        >
          ✦
        </div>

        {/* App name */}
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            letterSpacing: '0.25em',
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
          }}
        >
          HexAstral
        </p>

        {/* Headline */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
              fontWeight: 300,
              color: 'var(--color-ivory)',
              lineHeight: 1.25,
              letterSpacing: '0.04em',
            }}
          >
            {t('headline')}
          </h1>
          <p
            style={{
              margin: '0.75rem 0 0',
              fontSize: '0.9rem',
              color: 'var(--color-ivory-dim)',
              lineHeight: 1.65,
              maxWidth: 340,
            }}
          >
            {t('subline')}
          </p>
        </div>

        {/* Referral code badge */}
        {referralCode && (
          <div
            style={{
              padding: '0.6rem 1.4rem',
              border: '1px solid var(--color-border)',
              borderRadius: 100,
              background: 'rgba(196,168,98,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-ivory-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {t('ref_label')}
            </span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--color-gold)',
                letterSpacing: '0.18em',
              }}
            >
              {referralCode}
            </span>
          </div>
        )}

        {/* Benefits */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'left',
          }}
        >
          {(['benefit_1', 'benefit_2', 'benefit_3'] as const).map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <span
                style={{
                  color: 'var(--color-gold)',
                  fontSize: '0.8rem',
                  marginTop: '0.1em',
                  flexShrink: 0,
                }}
              >
                ◈
              </span>
              <span
                style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)', lineHeight: 1.5 }}
              >
                {t(key)}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <InviteCTA label={t('cta')} referralCode={referralCode} />

        <p
          style={{
            margin: 0,
            fontSize: '0.72rem',
            color: 'var(--color-ivory-muted)',
            lineHeight: 1.5,
          }}
        >
          {t('note')}
        </p>
      </div>
    </main>
  )
}
