import type { Metadata } from 'next'

import { Link } from '@/i18n/navigation'
import { type Locale, routing } from '@/i18n/routing'
import { getLegalUiStrings } from '@/lib/legal/legal-ui-strings'
import { getTermsSections, TERMS_LAST_UPDATED } from '@/lib/legal/terms-sections'

interface TermsPageProps {
  params: Promise<{ locale: string }>
}

function resolveLocale(raw: string): Locale {
  return (routing.locales as readonly string[]).includes(raw) ? (raw as Locale) : 'en'
}

const META_TITLE: Record<Locale, string> = {
  en: 'Terms of Service · HexAstral',
  ja: '利用規約 · HexAstral',
  zh: '使用条款 · HexAstral',
  tw: '使用條款 · HexAstral',
}

const META_DESCRIPTION: Record<Locale, string> = {
  en: 'HexAstral Terms of Service — covers all apps published by UseONE, LLC.',
  ja: 'HexAstral 利用規約 — UseONE, LLC が提供するすべてのアプリに適用されます。',
  zh: 'HexAstral 使用条款 — 适用于 UseONE, LLC 出品的所有应用。',
  tw: 'HexAstral 使用條款 — 適用於 UseONE, LLC 出品的所有應用。',
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  return {
    title: META_TITLE[locale],
    description: META_DESCRIPTION[locale],
    robots: { index: false },
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const sections = getTermsSections(locale)
  const ui = getLegalUiStrings(locale)

  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '5rem 1.5rem 4rem',
        color: 'var(--color-ivory)',
      }}
    >
      <Link
        href='/'
        style={{
          fontSize: '0.82rem',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          display: 'block',
          marginBottom: '2rem',
        }}
      >
        {ui.backToHome}
      </Link>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>
        {ui.termsPageTitle}
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginBottom: '3rem' }}>
        {ui.lastUpdatedLabel}: {TERMS_LAST_UPDATED[locale]}
      </p>

      {sections.map((section) => (
        <section key={section.title} style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 500,
              color: 'var(--color-gold)',
              marginBottom: '0.75rem',
            }}
          >
            {section.title}
          </h2>
          {section.content.split('\n\n').map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-ivory-dim)',
                lineHeight: 1.85,
                margin: i > 0 ? '0.75rem 0 0' : 0,
                whiteSpace: 'pre-line',
              }}
            >
              {para}
            </p>
          ))}
        </section>
      ))}

      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: '2rem',
          display: 'flex',
          gap: '1.5rem',
        }}
      >
        <Link
          href='/privacy'
          style={{ fontSize: '0.82rem', color: 'var(--color-gold)', textDecoration: 'none' }}
        >
          {ui.privacyLinkLabel}
        </Link>
        <Link
          href='/'
          style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)', textDecoration: 'none' }}
        >
          {ui.backToHome}
        </Link>
      </div>
    </main>
  )
}
