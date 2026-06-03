import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { PublicNatalPillars, parsePublicNatalPillars } from '@/components/PublicNatalPillars'
import { StarBackground } from '@/components/StarBackground'
import { StellarGrid } from '@/components/StellarGrid'
import { isEnglishLocale, PUBLIC_PROFILE_EN_CHART_NOTE } from '@/lib/publicProfileEnChartNote'
import {
  extractMingPalaceStars,
  formatFingerprintLine,
  parsePublicNatalFingerprint,
} from '@/lib/publicProfileFingerprint'
import { formatTemplate, getPublicProfileMessages } from '@/lib/publicProfileMessages'
import { dedupePublicSignature } from '@/lib/publicProfileSignature'
import { derivePublicSignature } from '@/lib/publicSignature'

/** 关闭默认缓存：公开性变更后须尽快 404，避免缓存旧公开页 */
export const dynamic = 'force-dynamic'

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
}

/**
 * Mirrors iOS `public_visibility_json` + `chartPublic`（见 `PublicVisibilityPanel` 与 API 注释）。
 *
 * | flag       | Web 行为 |
 * |------------|----------|
 * | chartPublic| false → `fetchPublicUser` 非 OK → notFound |
 * | basic      | 头像、昵称、`@username`、since 年、`totalReadings` 前缀 |
 * | bazi       | `/chart` natal → 四柱展示（API 不返回公历生日/城市） |
 * | ziwei/bazi | `/chart` 由 API 剥 payload；此处仅渲染非 null |
 * | signature  | DB `fateSignature`；否则与 App 一致用日主/强弱/紫微推导（traits 仅 signature 开启时返回） |
 * | plainIntro | HexAstral解读节选（ch1 `plainIntroExcerpt`） |
 *
 * 下载 CTA 在总开关开启时始终展示。
 */
interface PublicVisibility {
  basic: boolean
  signature: boolean
  bazi: boolean
  ziwei: boolean
  plainIntro?: boolean
}

interface PublicUser {
  id: string
  username: string
  /** Present when `visibility.basic` is true. */
  displayName?: string | null
  avatarKey?: string | null
  chartPublic: boolean
  totalReadings?: number | null
  createdAt?: string
  visibility?: PublicVisibility
  fateSignature?: string | null
  fateSignatureExplanation?: string | null
  dayMasterStem?: string | null
  dayMasterStrength?: string | null
  ziweiMingPalaceStar?: string | null
  locale?: string | null
  plainIntroExcerpt?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

async function fetchPublicUser(username: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/user/by-username/${encodeURIComponent(username)}`, {
      headers: { 'x-client-platform': 'web' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: PublicUser }
    return json.data
  } catch {
    return null
  }
}

interface ChartData {
  visibility?: PublicVisibility
  stellar: { palaces: unknown[]; meta: unknown } | null
  natal: unknown | null
}

async function fetchPublicChart(username: string): Promise<ChartData | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/user/by-username/${encodeURIComponent(username)}/chart`,
      {
        headers: { 'x-client-platform': 'web' },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const json = (await res.json()) as { data: ChartData }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const user = await fetchPublicUser(username)

  if (!user) {
    return { title: 'HexAstral' }
  }

  const vis = user.visibility
  const displayName =
    vis?.basic === false ? `@${user.username}` : user.displayName?.trim() || `@${user.username}`
  const derivedSig =
    vis?.signature && !user.fateSignature?.trim()
      ? derivePublicSignature({
          dayMasterStem: user.dayMasterStem,
          dayMasterStrength: user.dayMasterStrength,
          ziweiMingPalaceStar: user.ziweiMingPalaceStar,
          locale: user.locale,
        })
      : null
  const sig =
    vis?.signature && user.fateSignature?.trim()
      ? user.fateSignature.trim()
      : derivedSig?.signature.trim()
        ? derivedSig.signature.trim()
        : null
  const baseDesc = `View ${displayName}'s BaZi (Four Pillars) chart on HexAstral — AI-augmented chart insights.`
  const ogDesc = sig ? `${displayName} · ${sig}` : `${displayName}'s BaZi chart, AI-augmented.`
  return {
    title: `${displayName} · HexAstral`,
    description: sig ? ogDesc : baseDesc,
    openGraph: {
      title: `${displayName} · HexAstral`,
      description: ogDesc,
    },
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params
  const user = await fetchPublicUser(username)

  if (!user) notFound()

  const chart = await fetchPublicChart(username)

  const vis = user.visibility
  const showBirth = vis?.bazi ?? true
  const showBasic = vis?.basic ?? true
  const handleLine = `@${user.username}`
  const displayName = showBasic ? user.displayName?.trim() || handleLine : handleLine
  const showHandleSubline =
    showBasic &&
    displayName.trim().toLowerCase() !== handleLine.toLowerCase() &&
    displayName.replace(/^@/i, '').trim().toLowerCase() !== user.username.toLowerCase()
  const joinYear = showBasic && user.createdAt ? new Date(user.createdAt).getFullYear() : null
  const showSignature = vis?.signature ?? true
  const showPlainIntro = vis?.plainIntro ?? false
  const fateSig = user.fateSignature?.trim() ?? ''
  const fateExpl = user.fateSignatureExplanation?.trim() ?? ''
  const derivedForPage =
    showSignature && !fateSig && !fateExpl
      ? derivePublicSignature({
          dayMasterStem: user.dayMasterStem,
          dayMasterStrength: user.dayMasterStrength,
          ziweiMingPalaceStar: user.ziweiMingPalaceStar,
          locale: user.locale,
        })
      : null
  const rawHeadline = fateSig || derivedForPage?.signature || ''
  const rawSub = fateExpl || derivedForPage?.explanation || ''
  const { headline: signatureHeadline, sub: signatureSub } = dedupePublicSignature(
    rawHeadline,
    rawSub
  )
  const natalPillars = chart?.natal ? parsePublicNatalPillars(chart.natal) : null
  const fingerprint = chart?.natal ? parsePublicNatalFingerprint(chart.natal) : null
  const mingPalaceStars = extractMingPalaceStars(chart?.stellar) || (user.ziweiMingPalaceStar ?? '')
  const fingerprintLine =
    showSignature && fingerprint
      ? formatFingerprintLine(fingerprint, mingPalaceStars, user.locale)
      : ''
  // English viewers see the structural chart collapsed by default — the
  // archetype + fingerprint stay above the fold, and the dense CJK grid lives
  // behind a `<details>` toggle to lower the cognitive cliff.
  const collapseStructuralChart = isEnglishLocale(user.locale)
  const plainIntro =
    showPlainIntro && typeof user.plainIntroExcerpt === 'string'
      ? user.plainIntroExcerpt.trim()
      : ''
  const messages = await getPublicProfileMessages(user.locale)

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <StarBackground density={100} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
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

        {/* Profile card */}
        <div
          style={{
            padding: '2.5rem 2rem 2rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'center',
            marginTop: '36px',
          }}
        >
          {/* Avatar + identity — gated by visibility.basic */}
          {showBasic ? (
            <>
              {user.avatarKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'https://api.hexastral.com'}/api/media/public/${user.avatarKey}`}
                  alt={displayName}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid var(--color-border)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'rgba(196,168,98,0.12)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    color: 'var(--color-gold)',
                    fontWeight: 300,
                  }}
                >
                  {(displayName[0] ?? '✦').toUpperCase()}
                </div>
              )}

              <div>
                <h1
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 300,
                    color: 'var(--color-ivory)',
                    margin: '0 0 0.25rem',
                  }}
                >
                  {displayName}
                </h1>
                {showHandleSubline ? (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-gold)',
                      margin: 0,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {handleLine}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-ivory-muted)',
                margin: 0,
                letterSpacing: '0.08em',
              }}
            >
              @{user.username}
            </p>
          )}

          {/* Join year + readings — gated by visibility.basic */}
          {showBasic && joinYear != null ? (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-ivory-dim)',
                margin: 0,
              }}
            >
              {user.totalReadings
                ? `${formatTemplate(messages.readingsCount, { n: user.totalReadings })} · `
                : ''}
              {formatTemplate(messages.joinedSince, { year: joinYear })}
            </p>
          ) : null}
        </div>

        {/* Fate signature — gated by visibility.signature */}
        {showSignature && (signatureHeadline || signatureSub || fingerprintLine) ? (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(196,168,98,0.06)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {signatureHeadline ? (
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 400,
                  letterSpacing: '0.12em',
                  color: 'var(--color-gold)',
                  margin: '0 0 0.5rem',
                  whiteSpace: 'pre-line',
                }}
              >
                {signatureHeadline}
              </p>
            ) : null}
            {fingerprintLine ? (
              <p
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.06em',
                  color: 'var(--color-ivory-dim)',
                  margin: signatureSub ? '0 0 0.4rem' : 0,
                }}
              >
                {fingerprintLine}
              </p>
            ) : null}
            {signatureSub ? (
              <p
                style={{
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                  color: 'var(--color-ivory-muted)',
                  margin: 0,
                }}
              >
                {signatureSub}
              </p>
            ) : null}
          </div>
        ) : null}

        {plainIntro ? (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              width: '100%',
            }}
          >
            <p
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--color-gold)',
                margin: '0 0 0.75rem',
                textAlign: 'center',
              }}
            >
              {messages.plainIntroHeading}
            </p>
            <p
              style={{
                fontSize: '0.88rem',
                lineHeight: 1.65,
                color: 'var(--color-ivory-muted)',
                margin: 0,
              }}
            >
              {plainIntro}
            </p>
          </div>
        ) : null}

        {isEnglishLocale(user.locale) && showBirth && (natalPillars || chart?.stellar) ? (
          <p
            style={{
              fontSize: '0.78rem',
              lineHeight: 1.55,
              color: 'var(--color-ivory-dim)',
              margin: 0,
              width: '100%',
              textAlign: 'center',
              padding: '0 0.5rem',
            }}
          >
            {PUBLIC_PROFILE_EN_CHART_NOTE}
          </p>
        ) : null}

        {/* Structural chart — Ba Zi pillars + Zi Wei grid. For English viewers
            the section is collapsed behind a `<details>` so the archetype +
            fingerprint stay above the fold; native HTML, no client JS needed. */}
        {(showBirth && natalPillars) || chart?.stellar ? (
          collapseStructuralChart ? (
            <details
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                padding: '0.75rem 1rem',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  fontSize: '0.78rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-gold)',
                  padding: '0.5rem 0',
                  textAlign: 'center',
                }}
              >
                {messages.viewFullChart}
              </summary>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  marginTop: '1rem',
                }}
              >
                {showBirth && natalPillars ? (
                  <PublicNatalPillars
                    pillars={natalPillars}
                    labels={{
                      heading: messages.baziHeading,
                      year: messages.pillarYear,
                      month: messages.pillarMonth,
                      day: messages.pillarDay,
                      hour: messages.pillarHour,
                    }}
                  />
                ) : null}
                {chart?.stellar ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 16,
                    }}
                  >
                    <StellarGrid
                      palaces={
                        chart.stellar.palaces as Parameters<typeof StellarGrid>[0]['palaces']
                      }
                      meta={chart.stellar.meta as Parameters<typeof StellarGrid>[0]['meta']}
                    />
                  </div>
                ) : null}
              </div>
            </details>
          ) : (
            <>
              {showBirth && natalPillars ? (
                <PublicNatalPillars
                  pillars={natalPillars}
                  labels={{
                    heading: messages.baziHeading,
                    year: messages.pillarYear,
                    month: messages.pillarMonth,
                    day: messages.pillarDay,
                    hour: messages.pillarHour,
                  }}
                />
              ) : null}
              {chart?.stellar ? (
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 16,
                  }}
                >
                  <StellarGrid
                    palaces={chart.stellar.palaces as Parameters<typeof StellarGrid>[0]['palaces']}
                    meta={chart.stellar.meta as Parameters<typeof StellarGrid>[0]['meta']}
                  />
                </div>
              ) : null}
            </>
          )
        ) : null}

        {/* Download CTA */}
        <div
          style={{
            padding: '1.5rem',
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
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--color-ivory)',
              margin: 0,
            }}
          >
            {messages.ctaHeadline}
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-ivory-dim)',
              margin: 0,
              maxWidth: 280,
              lineHeight: 1.6,
            }}
          >
            {messages.ctaSub}
          </p>
          <DDLRedirectButton payload={{ source: `profile_${user.username}` }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.65rem 1.5rem',
                background: 'linear-gradient(135deg, #c4a862 0%, #7b5ea7 100%)',
                color: '#fff',
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 400,
                letterSpacing: '0.02em',
              }}
            >
              {messages.ctaButton}
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
