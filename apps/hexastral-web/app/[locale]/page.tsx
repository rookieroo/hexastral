import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DownloadCTA } from '@/components/DownloadCTA'
import { StarBackground } from '@/components/StarBackground'
import { Link } from '@/i18n/navigation'

interface PageProps {
  params: Promise<{ locale: string }>
}

interface FeatureItem {
  title: string
  desc: string
  tag: string
}
interface TestimonialItem {
  text: string
  name: string
  tag: string
}

const FEATURE_ICONS = ['⊕', '☽', '☰', '☷'] as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LandingPage() {
  const t = await getTranslations('landing')
  const nt = await getTranslations('nav')
  const features = t.raw('features') as FeatureItem[]
  const testimonials = t.raw('testimonials') as TestimonialItem[]

  return (
    <main style={{ position: 'relative', minHeight: '100dvh', overflowX: 'hidden' }}>
      <StarBackground density={150} />

      {/* ── Navbar ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(5,5,16,0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: '1rem',
            letterSpacing: '0.15em',
            color: 'var(--color-gold)',
            fontWeight: 500,
          }}
        >
          HexAstral
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href='/tools'
            style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {nt('tools')}
          </Link>
          <Link
            href='/onboarding'
            style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {nt('freeReading')}
          </Link>
          <Link
            href='/onboarding'
            style={{
              padding: '0.45rem 1.1rem',
              background: 'var(--color-gold)',
              color: 'var(--color-void)',
              borderRadius: 100,
              fontSize: '0.82rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {nt('download')}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '7rem 1.5rem 4rem',
        }}
      >
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.35rem 1rem',
            border: '1px solid var(--color-border)',
            borderRadius: 100,
            fontSize: '0.72rem',
            letterSpacing: '0.25em',
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
          }}
        >
          {t('heroBadge')}
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 7vw, 4rem)',
            fontWeight: 300,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--color-ivory)',
            maxWidth: '14ch',
            margin: '0 auto 1.5rem',
          }}
        >
          {t('heroLine1')}
          <br />
          <span style={{ color: 'var(--color-gold)' }}>{t('heroLine2')}</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
            color: 'var(--color-ivory-dim)',
            maxWidth: '34ch',
            margin: '0 auto 2.5rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
          }}
        >
          {t('heroSub')}
        </p>

        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
        >
          <Link
            href='/onboarding'
            style={{
              padding: '1rem 2.5rem',
              background: 'var(--color-gold)',
              color: 'var(--color-void)',
              borderRadius: 100,
              fontSize: '1.05rem',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.03em',
            }}
          >
            {t('heroCTA')}
          </Link>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-ivory-muted)' }}>
            {t('heroNote')}
          </span>
        </div>

        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-ivory-muted)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
          }}
        >
          <div
            style={{
              width: 1,
              height: 40,
              background: 'linear-gradient(to bottom, var(--color-gold-dim), transparent)',
              animation: 'pulse-gold 2s ease-in-out infinite',
            }}
          />
          SCROLL
        </div>
      </section>

      {/* ── Features ── */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '5rem 1.5rem',
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}
          >
            {t('featuresSectionLabel')}
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 300,
              color: 'var(--color-ivory)',
            }}
          >
            {t('featuresSectionTitle')}
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
              }}
            >
              <div
                style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: 'var(--color-gold)' }}
              >
                {FEATURE_ICONS[i]}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 500, margin: '0 0 0.5rem' }}>
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-ivory-dim)',
                  margin: '0 0 0.5rem',
                  lineHeight: 1.6,
                }}
              >
                {f.desc}
              </p>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: 'rgba(196,168,98,0.5)',
                  letterSpacing: '0.05em',
                }}
              >
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Conversion section ── */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '3rem 1.5rem',
          maxWidth: 560,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
            margin: '0 auto 2rem',
          }}
        />
        <h2
          style={{
            fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
            fontWeight: 300,
            color: 'var(--color-ivory)',
            marginBottom: '1rem',
          }}
        >
          {t('convTitle')}
        </h2>
        <p
          style={{
            color: 'var(--color-ivory-dim)',
            lineHeight: 1.8,
            marginBottom: '2rem',
            whiteSpace: 'pre-line',
          }}
        >
          {t('convBody')}
        </p>
        <Link
          href='/onboarding'
          style={{
            display: 'inline-block',
            padding: '0.9rem 2.2rem',
            background: 'transparent',
            border: '1px solid var(--color-gold)',
            color: 'var(--color-gold)',
            borderRadius: 100,
            textDecoration: 'none',
            fontSize: '0.95rem',
            letterSpacing: '0.05em',
          }}
        >
          {t('convCTA')}
        </Link>
      </section>

      {/* ── Testimonials ── */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '4rem 1.5rem',
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            letterSpacing: '0.3em',
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
            marginBottom: '2rem',
          }}
        >
          {t('testimonialsSectionLabel')}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {testimonials.map((item, i) => (
            <blockquote
              key={i}
              style={{
                margin: 0,
                padding: '1.25rem',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 12,
              }}
            >
              <p
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-ivory)',
                  lineHeight: 1.7,
                  margin: '0 0 0.75rem',
                }}
              >
                「{item.text}」
              </p>
              <footer style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)' }}>
                <strong style={{ color: 'var(--color-gold)', fontWeight: 400 }}>{item.name}</strong>
                　{item.tag}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '4rem 1.5rem 6rem',
          maxWidth: 440,
          margin: '0 auto',
        }}
      >
        <DownloadCTA headline={t('ctaHeadline')} sub={t('ctaSub')} />
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          borderTop: '1px solid var(--color-border-subtle)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)', margin: '0 0 0.75rem' }}
        >
          © 2026 HexAstral. All rights reserved.
        </p>
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {(
            [
              [t('footerPrivacy'), '/privacy'],
              [t('footerTerms'), '/terms'],
              [t('footerStart'), '/onboarding'],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-ivory-muted)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  )
}
