import type { Metadata, Viewport } from 'next'
import { getLocale } from 'next-intl/server'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hexastral.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'HexAstral — 星辰知道你是谁',
    template: '%s · HexAstral',
  },
  description: '结合命格四柱、星宫命理与 AI 深度解读，60 秒揭开你的命运格局。',
  applicationName: 'HexAstral',
  keywords: [
    '命格命理',
    '星宫命理',
    '命理',
    '合婚',
    '大运',
    'destiny chart',
    'star palace astrology',
    'fate cycle reading',
    'Eastern astrology AI',
    'cosmic blueprint',
  ],
  openGraph: {
    type: 'website',
    siteName: 'HexAstral',
    title: 'HexAstral — 星辰知道你是谁',
    description: '结合命格四柱与 AI 深度解读，60 秒揭开你的命运格局',
    url: APP_URL,
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HexAstral — 星辰知道你是谁',
    description: '结合命格四柱与 AI 深度解读，60 秒揭开你的命运格局',
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
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
      </head>
      <body>{children}</body>
    </html>
  )
}
