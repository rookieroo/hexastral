import { Link } from '@/i18n/navigation'

export interface GrowthNavLabels {
  home: string
  tools: string
  blog: string
  methodology: string
  freeReading: string
  /** Reserved for footer / secondary CTAs */
  download: string
}

interface GrowthShellProps {
  nav: GrowthNavLabels
  children: React.ReactNode
}

export function GrowthShell({ nav, children }: GrowthShellProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflowX: 'hidden' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(123,94,167,0.18) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 90% 60%, rgba(196,168,98,0.08) 0%, transparent 45%), var(--color-void)',
        }}
        aria-hidden
      />

      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(5,5,16,0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <Link
          href='/'
          style={{
            fontSize: '0.95rem',
            letterSpacing: '0.12em',
            color: 'var(--color-gold)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          HexAstral
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href='/tools'
            style={{ fontSize: '0.8rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {nav.tools}
          </Link>
          <Link
            href='/blog'
            style={{ fontSize: '0.8rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {nav.blog}
          </Link>
          <Link
            href='/about/methodology'
            style={{ fontSize: '0.8rem', color: 'var(--color-ivory-dim)', textDecoration: 'none' }}
          >
            {nav.methodology}
          </Link>
          <Link
            href='/'
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-ivory-muted)',
              textDecoration: 'none',
            }}
          >
            {nav.home}
          </Link>
          <Link
            href='/onboarding'
            style={{
              padding: '0.4rem 1rem',
              background: 'var(--color-gold)',
              color: 'var(--color-void)',
              borderRadius: 100,
              fontSize: '0.78rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {nav.freeReading}
          </Link>
        </div>
      </nav>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '5.25rem 1.25rem 3rem',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}
