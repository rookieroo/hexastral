import type { Metadata } from 'next'
import { CompatibilityTeaser } from '@/app/[locale]/tools/compatibility/CompatibilityTeaser'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Compatibility teaser — HexAstral · Eastern synastry',
    description:
      'Protected dual-birth preview of elemental overlay (合盘). Unlock detailed bond readings in Yuel — cultural study, not a score or prediction.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/compatibility'
          : `https://hexastral.com/${locale}/tools/compatibility`,
    },
  }
}

export default function CompatibilityToolPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>Compatibility teaser</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        <strong>He Pan (合盘)</strong> overlays two Ba Zi / Zi Wei charts. This web flow returns a
        guarded elemental preview (Cloudflare Turnstile) — cultural reference only, not a
        compatibility score. Consent matters: enter data you are allowed to use.
      </p>
      <CompatibilityTeaser />
    </>
  )
}
