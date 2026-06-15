/**
 * /[locale]/yuan/start
 *
 * Web-only A-user entry. Most A users will start in the mobile app (where IAP
 * lives), but this web flow exists for:
 *   - Desktop landing → casual interest → fill form here → email link to self
 *     to continue on mobile (deep link with prefilled data)
 *   - Referrals where A is already in an existing session on web
 *
 * v0: minimalist page that explains the flow + points to the iOS app. The
 * full "fill A's own birth info on web then invite B" UX comes in Phase B
 * once Kindred-app is live and the web → app handoff is wired.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Start a connection · Yuel',
    zh: '开始一段缘 · Yuel',
    tw: '開始一段緣 · Yuel',
    ja: '縁を結ぶ · 縁',
  }
  return { title: titles[locale] ?? titles.en }
}

export default async function KindredStartPage({ params }: PageProps) {
  const { locale } = await params
  const isZh = locale === 'zh' || locale === 'tw'

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        color: '#3C2415',
        paddingTop: 100,
        paddingBottom: 100,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            backgroundColor: '#9B2226',
            margin: '0 auto 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 48, color: '#C4A882' }}>Yuel</span>
        </div>

        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            letterSpacing: -0.5,
            marginBottom: 24,
            lineHeight: 1.3,
          }}
        >
          {isZh ? '在 app 里开始' : 'Begin in the app'}
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: 'rgba(60,36,21,0.65)',
            marginBottom: 64,
          }}
        >
          {isZh
            ? '邀请、合盘、报告、分享——完整体验在 iOS app。免费下载，邀请对方无须付费。'
            : 'Invite, align, read, share — the full experience lives in iOS. Free to download, free to invite.'}
        </p>

        <a
          href='https://apps.apple.com/app/yuan/id000000000'
          style={{
            display: 'inline-block',
            fontSize: 22,
            fontWeight: 500,
            color: '#C4A882',
            letterSpacing: 0.5,
            borderBottom: '1px solid #C4A882',
            paddingBottom: 12,
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          {isZh ? '获取 Yuel →' : 'Get Yuel →'}
        </a>

        <div>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}yuan`}
            style={{
              fontSize: 13,
              color: 'rgba(60,36,21,0.45)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {isZh ? '← 返回 Yuel' : '← Back to Yuel'}
          </Link>
        </div>
      </div>
    </main>
  )
}
