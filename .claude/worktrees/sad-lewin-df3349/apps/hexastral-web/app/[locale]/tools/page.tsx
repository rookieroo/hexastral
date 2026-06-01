import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Free tools — HexAstral',
    description:
      'Ba Zi Day Master preview, I Ching hexagram index, Chinese zodiac year, compatibility teaser, and links to our iOS apps.',
    alternates: { canonical: locale === 'en' ? 'https://hexastral.com/tools' : `https://hexastral.com/${locale}/tools` },
  }
}

const cardStyle: React.CSSProperties = {
  display: 'block',
  padding: '1.25rem',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  textDecoration: 'none',
  color: 'inherit',
  background: 'rgba(255,255,255,0.03)',
}

export default async function ToolsIndexPage() {
  const t = await getTranslations('growth')

  const items: { href: string; title: string; desc: string }[] = [
    {
      href: '/tools/day-master',
      title: 'Day Master calculator (Ba Zi 八字 lite)',
      desc: 'Approximate four pillars and see your Day Master stem on-device — quick educational preview.',
    },
    {
      href: '/tools/hexagram',
      title: '64 hexagram index (I Ching 易经)',
      desc: 'King Wen sequence with classical judgment snippets and deep links per hexagram.',
    },
    {
      href: '/tools/zodiac',
      title: 'Chinese zodiac by year (生肖)',
      desc: 'Map a Gregorian year to the zodiac animal — mind the lunar new year boundary.',
    },
    {
      href: '/tools/compatibility',
      title: 'Compatibility teaser (合盘)',
      desc: 'Elemental preview for two birthdays (Turnstile‑protected). Full synastry lives in SoulMatch / HexAstral.',
    },
    {
      href: '/tools/dream',
      title: 'Dream interpretation (coming)',
      desc: 'Teaser landing for DreamOracle — describe a dream, continue in app for full Zhou Gong style reading.',
    },
    {
      href: '/tools/face-reading',
      title: 'AI face reading teaser',
      desc: 'Privacy‑first physiognomy roadmap — upload flows ship in FaceOracle; web explains the method.',
    },
    {
      href: '/tools/palace-chart',
      title: 'Zi Wei palace primer',
      desc: 'Understand the twelve palaces before opening StarPalace or HexAstral for a live chart.',
    },
  ]

  return (
    <>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-gold)', letterSpacing: '0.16em', margin: '0 0 0.35rem' }}>
        HEXASTRAL
      </p>
      <h1 style={{ fontSize: '1.85rem', fontWeight: 400, margin: '0 0 0.5rem' }}>{t('toolsIndexTitle')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', margin: '0 0 2rem', lineHeight: 1.65 }}>{t('toolsIndexSubtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map((it) => (
          <Link key={it.href} href={it.href} style={cardStyle}>
            <span style={{ fontSize: '1.05rem', color: 'var(--color-ivory)', display: 'block', marginBottom: '0.35rem' }}>
              {it.title}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)', lineHeight: 1.55 }}>{it.desc}</span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)', marginTop: '2rem' }}>{t('disclaimer')}</p>
    </>
  )
}
