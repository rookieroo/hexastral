/**
 * /[locale]/yuan/report/[shareId]
 *
 * Publicly-shareable single-chapter view. When a user shares a chapter from
 * the app via the cinnabar share button, a `sharedReports` row is created in
 * D1 with a short shareId. The shared URL renders ONE chapter's golden line +
 * body (not the whole report) — viewers see enough to be curious, then a CTA
 * to download Kindred to read the full thing.
 *
 * Backend endpoint: GET /api/share/yuan/:shareId
 * Returns: { chapter, selfName, otherName, expiresAt }
 *
 * SEO + OG strategy: this is where viral traffic lands. The OG image is
 * server-side rendered (svc-poster or similar) using the same
 * ShareableChapterCard layout the mobile share button produces.
 */

import type { SynastryChapter } from '@zhop/scenario-kindred/types'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ locale: string; shareId: string }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface SharedChapterData {
  chapter: SynastryChapter
  selfName: string
  otherName: string
  expiresAt: string | null
}

async function fetchShared(shareId: string): Promise<SharedChapterData | null> {
  try {
    const res = await fetch(`${API_URL}/api/share/yuan/${encodeURIComponent(shareId)}`, {
      next: { revalidate: 600 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: SharedChapterData }
    return json.data
  } catch {
    return null
  }
}

type ChapterTitleRow = Record<SynastryChapter['kind'], string>

const CHAPTER_TITLES_BY_LOCALE: Record<string, ChapterTitleRow> & { en: ChapterTitleRow } = {
  en: {
    first_impression: 'First Impression',
    communication: 'How You Speak',
    conflict: 'Where You Clash',
    complement: 'How You Complete',
    monthly_outlook: 'This Month',
    long_term_advice: 'The Long Arc',
  },
  zh: {
    first_impression: '第一印象',
    communication: '沟通方式',
    conflict: '冲突源头',
    complement: '互补之处',
    monthly_outlook: '本月运势',
    long_term_advice: '长期建议',
  },
  tw: {
    first_impression: '第一印象',
    communication: '溝通方式',
    conflict: '衝突源頭',
    complement: '互補之處',
    monthly_outlook: '本月運勢',
    long_term_advice: '長期建議',
  },
  ja: {
    first_impression: '第一印象',
    communication: '伝え方',
    conflict: 'すれ違い',
    complement: '補い合う',
    monthly_outlook: '今月の流れ',
    long_term_advice: '長い視点',
  },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId, locale } = await params
  const data = await fetchShared(shareId)
  if (!data) return { title: 'Kindred' }

  const titleMap = CHAPTER_TITLES_BY_LOCALE[locale] ?? CHAPTER_TITLES_BY_LOCALE.en
  const chapterTitle = titleMap[data.chapter.kind]

  return {
    title: `${chapterTitle} · ${data.selfName} & ${data.otherName} · Kindred`,
    description: data.chapter.goldenLine,
    openGraph: {
      title: `${chapterTitle} · ${data.selfName} & ${data.otherName}`,
      description: data.chapter.goldenLine,
      siteName: 'Kindred by HexAstral',
      images: [{ url: `${API_URL}/api/share/yuan/${shareId}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${chapterTitle} · Kindred`,
      description: data.chapter.goldenLine,
    },
  }
}

export default async function KindredReportSharePage({ params }: PageProps) {
  const { shareId, locale } = await params
  const data = await fetchShared(shareId)
  if (!data) notFound()

  const isZh = locale === 'zh' || locale === 'tw'
  const titleMap = CHAPTER_TITLES_BY_LOCALE[locale] ?? CHAPTER_TITLES_BY_LOCALE.en
  const chapterTitle = titleMap[data.chapter.kind] ?? data.chapter.title

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
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Seal + chapter marker */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#9B2226',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 40, color: '#C4A882' }}>Kindred</span>
          </div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'rgba(60,36,21,0.65)',
              marginBottom: 8,
            }}
          >
            {chapterTitle}
          </p>
          <p style={{ fontSize: 16, color: 'rgba(60,36,21,0.65)' }}>
            {data.selfName} · {data.otherName}
          </p>
        </div>

        {/* Golden line — the hero */}
        <h1
          style={{
            fontSize: 36,
            lineHeight: 1.4,
            fontWeight: 300,
            letterSpacing: -0.5,
            marginBottom: 56,
            textAlign: 'center',
          }}
        >
          {data.chapter.goldenLine}
        </h1>

        {/* Body — full chapter interpretation */}
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: '#3C2415',
            marginBottom: 80,
            letterSpacing: 0.2,
          }}
        >
          {data.chapter.body}
        </p>

        {/* Download CTA */}
        <div
          style={{
            paddingTop: 48,
            borderTop: '0.5px solid rgba(60,36,21,0.12)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 15,
              color: 'rgba(60,36,21,0.65)',
              marginBottom: 24,
            }}
          >
            {isZh
              ? '你也想看看自己和某个人的Kindred？'
              : 'Curious about your own resonance with someone?'}
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
        </div>
      </div>
    </main>
  )
}
