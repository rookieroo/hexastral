/**
 * /[locale]/yuan/invite/[token]/teaser
 *
 * Shown to B after they accept on the previous page. Purpose: deliver
 * **just enough** value (3 golden lines, no body text) to make the App Store
 * download CTA irresistible. The full report stays behind the app paywall.
 *
 * Key copy beats:
 *   - "Your charts are aligned." (validation: they finished the form)
 *   - 3 quotable lines pulled from the report (first 3 chapter golden lines)
 *   - "The full story is in the app." (anticipation)
 *   - "Get Kindred on iOS" → DDL handoff to App Store (token claimed on install)
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface TeaserData {
  selfName: string
  otherName: string
  /** The single most striking assertion about the pair — the lead hook. */
  ahaHook?: string
  /** 3 lines max — pulled from first 3 chapters */
  goldenLines: string[]
  /** Compatibility score 0-100, optional */
  score?: number
}

async function fetchTeaser(token: string): Promise<TeaserData | null> {
  try {
    const res = await fetch(`${API_URL}/api/bonds/invite/${encodeURIComponent(token)}/teaser`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: TeaserData }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Your resonance · Kindred',
    zh: '你们的共鸣 · Kindred',
    tw: '你們的共鳴 · Kindred',
    ja: '二人の共鳴 · 縁',
  }
  return { title: titles[locale] ?? titles.en }
}

export default async function KindredInviteTeaserPage({ params }: PageProps) {
  const { token, locale } = await params
  const data = await fetchTeaser(token)
  if (!data) notFound()

  const isZh = locale === 'zh' || locale === 'tw'

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        color: '#3C2415',
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        {/* Brand mark — inline cinnabar phase-moon (SKIN_CINNABAR_INK at
            phase 0.25, same as the in-app KindredMoon). The earlier 緣
            glyph read as outdated branding; the moon is the brand. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg width='96' height='96' viewBox='0 0 100 100' aria-hidden role='img'>
            <defs>
              <radialGradient id='teaser-face' cx='36%' cy='30%' r='68%'>
                <stop offset='0%' stopColor='#f3d8c0' />
                <stop offset='55%' stopColor='#c87454' />
                <stop offset='100%' stopColor='#7a2418' />
              </radialGradient>
              <radialGradient id='teaser-shadow' cx='50%' cy='50%' r='60%'>
                <stop offset='0%' stopColor='#0e0d0c' />
                <stop offset='78%' stopColor='#1a1922' stopOpacity='0.94' />
                <stop offset='100%' stopColor='#1a1922' stopOpacity='0' />
              </radialGradient>
              <clipPath id='teaser-disk'>
                <circle cx='50' cy='50' r='44' />
              </clipPath>
            </defs>
            <g clipPath='url(#teaser-disk)'>
              <circle cx='50' cy='50' r='44' fill='url(#teaser-face)' />
              <circle cx='27' cy='50' r='44' fill='url(#teaser-shadow)' />
            </g>
            <circle
              cx='50'
              cy='50'
              r='44'
              fill='none'
              stroke='rgba(122,36,24,0.18)'
              strokeWidth='0.75'
            />
          </svg>
        </div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(60,36,21,0.55)',
            marginBottom: 32,
          }}
        >
          Kindred
        </p>

        {/* Names + tag */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(60,36,21,0.65)',
            marginBottom: 12,
          }}
        >
          {isZh ? '你们的缘' : 'your resonance'}
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: '#3C2415',
            marginBottom: 48,
            letterSpacing: -0.5,
          }}
        >
          {data.selfName} · {data.otherName}
        </h1>

        {/* Aha hook — the lead pull-quote, the line that makes you want to look. */}
        {data.ahaHook ? (
          <p
            style={{
              fontSize: 26,
              lineHeight: 1.45,
              fontWeight: 400,
              color: '#7a2418',
              letterSpacing: -0.4,
              marginBottom: 48,
            }}
          >
            {data.ahaHook}
          </p>
        ) : null}

        {/* Golden lines */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            marginBottom: 64,
            textAlign: 'left',
          }}
        >
          {data.goldenLines.slice(0, 3).map((line, i) => (
            <div
              key={i}
              style={{
                paddingLeft: 16,
                borderLeft: '2px solid #C4A882',
              }}
            >
              <p
                style={{
                  fontSize: 22,
                  lineHeight: 1.5,
                  color: '#3C2415',
                  fontWeight: 400,
                  letterSpacing: -0.3,
                }}
              >
                {line}
              </p>
            </div>
          ))}
        </div>

        {/* App CTA */}
        <p
          style={{
            fontSize: 18,
            color: 'rgba(60,36,21,0.65)',
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          {isZh ? '完整的故事，在 app 里' : 'The full story is in the app'}
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
          }}
        >
          {isZh ? '在 iOS 上获取 Kindred →' : 'Get Kindred on iOS →'}
        </a>

        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: 'rgba(60,36,21,0.35)',
            letterSpacing: 0.8,
          }}
        >
          {isZh ? '免费下载' : 'Free download'}
        </p>
      </div>
    </main>
  )
}
