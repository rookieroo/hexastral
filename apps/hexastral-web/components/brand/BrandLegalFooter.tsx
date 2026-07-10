import {
  BRAND_LEGAL_PATHS,
  type BrandId,
  localePath,
  pickLocale,
  type BrandLocale,
} from './brand-config'

const LABELS: Record<BrandLocale, { privacy: string; terms: string }> = {
  en: { privacy: 'Privacy', terms: 'Terms' },
  zh: { privacy: '隐私政策', terms: '使用条款' },
  tw: { privacy: '隱私政策', terms: '使用條款' },
  ja: { privacy: 'プライバシー', terms: '利用規約' },
}

export function BrandLegalFooter({
  brand,
  locale,
  foot,
  linkColor,
  mutedColor,
  borderColor,
  hostLabel,
}: {
  brand: BrandId
  locale: string
  foot: string
  linkColor: string
  mutedColor: string
  borderColor: string
  hostLabel: string
}) {
  const labels = LABELS[pickLocale(locale)]
  const legal = BRAND_LEGAL_PATHS[brand]
  const linkStyle = { color: linkColor, textDecoration: 'none' as const }

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '22px',
        borderTop: `0.5px solid ${borderColor}`,
        fontSize: 11,
        letterSpacing: 1,
        color: mutedColor,
      }}
    >
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 10 }}>
        <a href={localePath(locale, legal.privacy)} style={linkStyle}>
          {labels.privacy}
        </a>
        <span aria-hidden>·</span>
        <a href={localePath(locale, legal.terms)} style={linkStyle}>
          {labels.terms}
        </a>
      </div>
      {foot} · {hostLabel}
    </footer>
  )
}
