import type { Metadata, Viewport } from 'next'
import { getLocale } from 'next-intl/server'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hexastral.com'

/**
 * Root metadata · anti-spam compliant (docs/anti-spam-positioning.md).
 * Defaults are English-positioned for App Store reviewer visibility;
 * per-locale [locale]/layout.tsx overrides ZH/JA/TW with localized copy.
 * NO trigger words (astrology / horoscope / zodiac / fortune / destiny /
 * cosmic blueprint / star palace / 占星 / 命运 / 运势 / 占い / 運命) anywhere.
 */
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'HexAstral — BaZi · ZiWei · AI',
    template: '%s · HexAstral',
  },
  description:
    'Generate your BaZi (Four Pillars) and ZiWei chart with AI-augmented personality insights, grounded in classical Chinese cosmology. Educational, not predictive.',
  applicationName: 'HexAstral',
  keywords: [
    '八字',
    '四柱',
    '命理',
    '中華命學',
    '紫微斗数',
    '紫微',
    'bazi',
    'four pillars',
    'ziwei dou shu',
    'chinese cosmology',
    'AI personality framework',
    'classical chinese tradition',
  ],
  openGraph: {
    type: 'website',
    siteName: 'HexAstral',
    title: 'HexAstral — BaZi · ZiWei · AI',
    description:
      'Generate your BaZi and ZiWei chart with AI-augmented insights, grounded in classical Chinese cosmology.',
    url: APP_URL,
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HexAstral — BaZi · ZiWei · AI',
    description:
      'Generate your BaZi and ZiWei chart with AI-augmented insights, grounded in classical Chinese cosmology.',
    images: ['/og-default.png'],
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HexAstral',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050510',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel='icon' href='/favicon.ico' sizes='any' />
        {/* apple-touch-icon auto-emitted by Next from app/apple-icon.png.
            Manual link removed because /apple-touch-icon.png file does not
            exist in public/ (was 404ing). SPAM-11 PWA task will add proper
            manifest + 180/192/512 variants. */}
      </head>
      <body>{children}</body>
    </html>
  )
}
