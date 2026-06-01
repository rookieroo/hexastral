import type { ReportType } from '@zhop/hexastral-tokens/reports'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { HexastralPlanetLogo } from '@/components/HexastralPlanetLogo'
import { ReportBackground } from '@/components/ReportBackground'
import { StarBackground } from '@/components/StarBackground'

interface SharedReportPageProps {
  params: Promise<{ shareId: string }>
}

interface ReportContent {
  type: 'stellar' | 'natal' | 'yiching' | 'fate' | 'physiognomy'
  titleHint: string | null
  contentJson: string
  viewCount: number
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

const REPORT_TYPE_LABELS: Record<
  ReportContent['type'],
  { en: string; zh: string; icon: string; color: string; tokenType: ReportType }
> = {
  stellar: {
    en: 'Stellar Chart',
    zh: '星宫命理',
    icon: '☆',
    color: '#7b5ea7',
    tokenType: 'chart-card',
  },
  natal: {
    en: 'Natal Chart',
    zh: '命格命理',
    icon: '乾',
    color: '#c4a862',
    tokenType: 'chart-card',
  },
  yiching: {
    en: 'I Ching Hexagram',
    zh: '易经卦学',
    icon: '兑',
    color: '#C4A862',
    tokenType: 'daily-fortune',
  },
  fate: {
    en: 'Full Chart Report',
    zh: '综合命书',
    icon: '命',
    color: '#7b5ea7',
    tokenType: 'decadal',
  },
  physiognomy: {
    en: 'Face Reading',
    zh: '面相解读',
    icon: '相',
    color: '#A0845C',
    tokenType: 'annual',
  },
}

/** Max characters to show in preview before blur */
const PREVIEW_CHAR_LIMIT = 200

async function fetchShare(shareId: string): Promise<ReportContent | null> {
  try {
    const res = await fetch(`${API_URL}/api/share/${shareId}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const json = (await res.json()) as { data: ReportContent }
    return json.data
  } catch {
    return null
  }
}

/** Extract key highlights and full text from contentJson */
function extractContent(contentJson: string): {
  highlights: string[]
  fullText: string
  fateInsights: Array<{ dimension: string; direction: string; summary: string }> | null
} {
  const highlights: string[] = []
  let fullText = ''
  let fateInsights: Array<{ dimension: string; direction: string; summary: string }> | null = null

  try {
    const parsed = JSON.parse(contentJson) as unknown
    if (typeof parsed === 'string') {
      fullText = parsed
    } else if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>

      // Extract highlight data points
      if (typeof obj.score === 'number') highlights.push(`Score: ${obj.score}`)
      if (typeof obj.grade === 'string') highlights.push(obj.grade)
      if (typeof obj.dayMaster === 'string') highlights.push(`Day Master: ${obj.dayMaster}`)
      if (typeof obj.soul === 'string') highlights.push(`Soul Star: ${obj.soul}`)
      if (typeof obj.body === 'string') highlights.push(`Body Star: ${obj.body}`)
      if (typeof obj.soulStar === 'string' && !obj.soul) highlights.push(obj.soulStar)

      // Extract dimensions for hehun/compatibility
      if (typeof obj.dimensions === 'object' && obj.dimensions !== null) {
        const dims = obj.dimensions as Record<string, unknown>
        for (const [k, v] of Object.entries(dims)) {
          if (typeof v === 'number') highlights.push(`${k}: ${v}/100`)
        }
      }

      // Extract fate-specific structured insights
      if (Array.isArray(obj.insights)) {
        const validInsights = (obj.insights as unknown[]).filter(
          (v): v is { dimension: string; direction: string; summary: string } =>
            typeof v === 'object' && v !== null && 'dimension' in v && 'summary' in v
        )
        if (validInsights.length > 0) fateInsights = validInsights
      }

      // Extract the main text
      const textKeys = [
        'fusedConclusion',
        'fullInterpretation',
        'interpretation',
        'analysis',
        'content',
        'text',
        'aiReading',
      ]
      for (const key of textKeys) {
        if (typeof obj[key] === 'string' && (obj[key] as string).length > 0) {
          fullText = obj[key] as string
          break
        }
      }
    }
  } catch {
    // malformed JSON — return empty
  }

  return { highlights: highlights.slice(0, 4), fullText, fateInsights }
}

export async function generateMetadata({ params }: SharedReportPageProps): Promise<Metadata> {
  const { shareId } = await params
  const share = await fetchShare(shareId)

  if (!share) return { title: 'HexAstral' }

  const label = REPORT_TYPE_LABELS[share.type]
  const title = share.titleHint
    ? `${share.titleHint} · ${label.zh} · HexAstral`
    : `${label.zh} · HexAstral`

  const { fullText } = extractContent(share.contentJson)
  const description = fullText
    ? `${fullText.slice(0, 120)}...`
    : `${label.zh} — powered by AI on HexAstral`

  return {
    title,
    description,
    openGraph: {
      title,
      description: `${label.en} report from HexAstral`,
      siteName: 'HexAstral',
    },
  }
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const { shareId } = await params
  const share = await fetchShare(shareId)

  if (!share) notFound()

  const label = REPORT_TYPE_LABELS[share.type]
  const { highlights, fullText, fateInsights } = extractContent(share.contentJson)
  const previewText = fullText.slice(0, PREVIEW_CHAR_LIMIT)
  const hasMore = fullText.length > PREVIEW_CHAR_LIMIT
  const dateStr = new Date(share.createdAt).toLocaleDateString('zh-Hans', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      <StarBackground density={80} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          marginTop: '2rem',
        }}
      >
        {/* ── Brand bar ─────────────────────────────────────── */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <HexastralPlanetLogo size={40} />
          <span
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
            }}
          >
            HexAstral
          </span>
        </div>

        {/* ── Hero card ─────────────────────────────────────── */}
        <ReportBackground type={label.tokenType} width={640} height={220}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            {/* Report type icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `${label.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '1.4rem',
              }}
            >
              {label.icon}
            </div>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '0.72rem',
                letterSpacing: '0.25em',
                color: label.color,
                textTransform: 'uppercase',
              }}
            >
              {label.zh} · {label.en}
            </p>
            {share.titleHint && (
              <h1
                style={{
                  margin: '0 0 10px',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'var(--color-ivory)',
                }}
              >
                {share.titleHint}
              </h1>
            )}
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-ivory-dim)' }}>
              {dateStr} · {share.viewCount} views
            </p>
          </div>
        </ReportBackground>

        {/* ── Key highlights (2-3 data points) ──────────────── */}
        {highlights.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {highlights.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 400,
                  color: 'var(--color-ivory-muted)',
                  letterSpacing: '0.02em',
                }}
              >
                {h}
              </div>
            ))}
          </div>
        )}

        {/* ── Fate dimension insights (structured cards) ──── */}
        {fateInsights && fateInsights.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {fateInsights.map((insight, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${label.color}`,
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: 'var(--color-ivory)',
                    }}
                  >
                    {insight.dimension}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 6,
                      background: `${label.color}18`,
                      color: label.color,
                    }}
                  >
                    {insight.direction}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.82rem',
                    fontWeight: 300,
                    color: 'var(--color-ivory-muted)',
                    lineHeight: 1.7,
                  }}
                >
                  {insight.summary}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Preview text + blur overlay ───────────────────── */}
        {previewText.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                padding: '1.5rem 2rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: 300,
                  color: 'var(--color-ivory-muted)',
                  lineHeight: 1.9,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {previewText}
                {hasMore && '...'}
              </p>
            </div>
            {/* Blur gradient mask over the bottom half */}
            {hasMore && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '60%',
                  background:
                    'linear-gradient(to bottom, transparent 0%, var(--color-void, #0a0a0c) 90%)',
                  borderRadius: '0 0 16px 16px',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '2rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ivory-dim)' }}>
              Open in HexAstral to view the full report
            </p>
          </div>
        )}

        {/* ── Primary CTA: View in App ─────────────────────── */}
        <div
          style={{
            padding: '2rem',
            background:
              'linear-gradient(135deg, rgba(196,168,98,0.08) 0%, rgba(123,94,167,0.08) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 400,
              color: 'var(--color-ivory)',
            }}
          >
            View the full {label.en} in HexAstral
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--color-ivory-dim)',
              maxWidth: 300,
              lineHeight: 1.6,
            }}
          >
            AI-powered Ba Zi, Purple Star & I Ching — free on iOS
          </p>
          <DDLRedirectButton payload={{ source: `report_share_${share.type}`, shareId }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #c4a862 0%, #7b5ea7 100%)',
                color: '#fff',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Open in App
            </span>
          </DDLRedirectButton>
        </div>

        {/* ── Secondary CTA: Get your own reading ──────────── */}
        <div style={{ textAlign: 'center' }}>
          <DDLRedirectButton payload={{ source: 'report_share_cta_own' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.5rem',
                border: '1px solid var(--color-border)',
                color: 'var(--color-ivory-muted)',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 400,
                letterSpacing: '0.02em',
              }}
            >
              Get your own reading free
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
