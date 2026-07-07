import type { Metadata } from 'next'

import { Link } from '@/i18n/navigation'
import { type Locale, routing } from '@/i18n/routing'
import { getLegalUiStrings } from '@/lib/legal/legal-ui-strings'
import {
  PRIVACY_LAST_UPDATED,
  getPrivacySections,
} from '@/lib/legal/privacy-sections'
import {
  SATELLITE_PRIVACY_APPENDICES,
  SATELLITE_PRIVACY_KEYS,
} from '@/lib/legal/satellite-privacy-appendices'

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

function resolveLocale(raw: string): Locale {
  return (routing.locales as readonly string[]).includes(raw) ? (raw as Locale) : 'en'
}

const META_TITLE: Record<Locale, string> = {
  en: 'Privacy Policy · HexAstral',
  ja: 'プライバシーポリシー · HexAstral',
  zh: '隐私政策 · HexAstral',
  tw: '隱私政策 · HexAstral',
}

const META_DESCRIPTION: Record<Locale, string> = {
  en: 'How UseONE, LLC collects, uses, and protects your personal information across the HexAstral universe of apps, including Yuel, Yuun, Yaul, and Kanyu.',
  ja: 'UseONE, LLC が HexAstral ユニバースのアプリ（Yuel、Yuun、Yaul、Kanyu を含む）において、お客様の個人情報をどのように取得・利用・保護するかについて。',
  zh: 'UseONE, LLC 在 HexAstral 应用宇宙（包括 Yuel、Yuun、Yaul 与 Kanyu）中如何收集、使用并保护您的个人信息。',
  tw: 'UseONE, LLC 在 HexAstral 應用宇宙（包括 Yuel、Yuun、Yaul 與 Kanyu）中如何蒐集、使用並保護您的個人資訊。',
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  return {
    title: META_TITLE[locale],
    description: META_DESCRIPTION[locale],
    robots: { index: false },
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const sections = getPrivacySections(locale)
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
        {ui.privacyPageTitle}
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginBottom: '3rem' }}>
        {ui.lastUpdatedLabel}: {PRIVACY_LAST_UPDATED[locale]} · {ui.privacySubheading}
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

      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontSize: '1.05rem',
            fontWeight: 500,
            color: 'var(--color-gold)',
            marginBottom: '0.75rem',
          }}
        >
          {ui.satelliteAppendicesHeading}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SATELLITE_PRIVACY_KEYS.map((key) => (
            <li key={key} style={{ marginBottom: '0.55rem' }}>
              <Link
                href={`/privacy/${key}`}
                style={{ fontSize: '0.88rem', color: 'var(--color-gold)', textDecoration: 'none' }}
              >
                {SATELLITE_PRIVACY_APPENDICES[key].displayName} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: '2rem',
          display: 'flex',
          gap: '1.5rem',
        }}
      >
        <Link
          href='/terms'
          style={{ fontSize: '0.82rem', color: 'var(--color-gold)', textDecoration: 'none' }}
        >
          {ui.termsLinkLabel}
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
