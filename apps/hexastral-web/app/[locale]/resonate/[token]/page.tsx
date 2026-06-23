import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'

/**
 * Kindred invite landing — what B sees when they tap A's share-sheet link.
 *
 * Iteration notes (2026-06):
 *   - Logo is now an inline cinnabar phase-moon SVG (an approximation of the
 *     in-app KindredMoon / SKIN_CINNABAR_INK at phase 0.25), not the 緣 glyph.
 *     User feedback: 緣 read as "outdated" branding; the moon is the brand.
 *   - All copy goes through next-intl messages so the page actually localises
 *     by route (previously had inline isZh checks for headlines while other
 *     strings came from getTranslations — inconsistent).
 *   - "Invitation from Someone" copy is gated on `inviterHasName` from the
 *     server: when the inviter is anonymous (no Apple link, no profile name)
 *     we drop the "From {someone}" line — B reached this page through a link
 *     A explicitly shared, so identifying the sender by name only matters
 *     when there IS a real name.
 *   - Deep link is `kindred:///accept/{token}` (no triple-slash variant
 *     needed; expo-router resolves the path segment to /accept/[token]).
 *
 * Web stays form-LESS by design — the birth form belongs inside the native
 * app, not in a one-shot landing page. The deep-link carries the token, so
 * the app resumes the invite the moment B opens it and the form runs there.
 */

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

// The relationship label is intentionally NOT shown on this public landing: it
// would leak the inviter's intent (many inviters don't want B to know what 合盘
// relation they picked). B is told WHO invited them, never the relationship.

/**
 * Inline cinnabar phase-moon — a faithful SVG port of the in-app KindredMoon
 * (MoonPhaseLoader + SKIN_CINNABAR_INK at phase 0.25). The earlier web version
 * was a smooth gradient sphere — the exact "表面光滑 vs 水墨阴影不搭" the app's
 * own skin comment warns against. This reproduces the app's three layers so the
 * landing logo matches the app, not just approximates it:
 *
 *   - Lit face: radial per SKIN_CINNABAR_INK faceStops/center/radius (moon.ts).
 *   - Water-ink shadow disc: DEFAULT_SHADOW_STOPS, centred at the phase-0.25
 *     disc position (phaseToCx(0.25) = cx 5, r 48 → the ~46% crescent the app
 *     shows), with `inkTerm` turbulence DISPLACING the terminator into organic
 *     ink tongues (port of the Skia 3-frequency displacement chain).
 *   - Paper grain: fractalNoise overlay-blended at ~0.26 (skin.surface paper
 *     0.28) so the lit face reads as MATTE ink-on-paper, not a plastic sphere.
 *
 * Geometry uses the app's viewBox-100 constants (moon cx50/cy50/r40, shadow
 * r48) so the phase + proportions are identical, not eyeballed.
 */
function CinnabarMoon({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 100 100'
      aria-hidden
      role='img'
      style={{ display: 'block', filter: 'drop-shadow(0 0 12px rgba(232,224,205,0.05))' }}
    >
      <defs>
        {/* Lit face — SKIN_CINNABAR_INK faceCenter (0.36,0.30)·faceRadius 0.68 in
            the moon bbox (10,10)-(90,90) → centre (38.8,34) r 54.4. */}
        <radialGradient id='kindred-face' gradientUnits='userSpaceOnUse' cx='38.8' cy='34' r='54.4'>
          <stop offset='0' stopColor='#f3d8c0' />
          <stop offset='0.55' stopColor='#c87454' />
          <stop offset='1' stopColor='#7a2418' />
        </radialGradient>
        {/* Water-ink shadow disc — DEFAULT_SHADOW_STOPS, at phaseToCx(0.25)=5. */}
        <radialGradient id='kindred-shadow' gradientUnits='userSpaceOnUse' cx='5' cy='50' r='48'>
          <stop offset='0' stopColor='#0e0d0c' />
          <stop offset='0.5' stopColor='#131218' />
          <stop offset='0.78' stopColor='#1a1922' />
          <stop offset='0.94' stopColor='#1a1922' stopOpacity='0.4' />
          <stop offset='1' stopColor='#1a1922' stopOpacity='0' />
        </radialGradient>
        {/* inkTerm — organic terminator (feTurbulence + feDisplacementMap port of
            the Skia 3-freq displacement chain). */}
        <filter
          id='kindred-ink'
          x='-35%'
          y='-35%'
          width='170%'
          height='170%'
          colorInterpolationFilters='sRGB'
        >
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.026'
            numOctaves={3}
            seed={7}
            result='n'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='n'
            scale={13}
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
        {/* Paper grain — matte ink-on-paper surface (skin.surface paper). */}
        <filter id='kindred-grain' colorInterpolationFilters='sRGB'>
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.9'
            numOctaves={2}
            seed={11}
            result='n'
          />
          <feColorMatrix in='n' type='matrix' values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1' />
        </filter>
        <clipPath id='kindred-disk'>
          <circle cx='50' cy='50' r='40' />
        </clipPath>
      </defs>
      <g clipPath='url(#kindred-disk)'>
        <circle cx='50' cy='50' r='40' fill='url(#kindred-face)' />
        <g filter='url(#kindred-ink)'>
          <circle cx='5' cy='50' r='48' fill='url(#kindred-shadow)' />
        </g>
        <rect
          x='10'
          y='10'
          width='80'
          height='80'
          filter='url(#kindred-grain)'
          opacity={0.26}
          style={{ mixBlendMode: 'overlay' }}
        />
      </g>
    </svg>
  )
}

async function fetchInviteData(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'
  try {
    const res = await fetch(`${apiUrl}/api/bonds/invite/${token}/info`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data: {
        invitationId: string
        inviterName: string
        inviterHasName?: boolean
        inviterAvatarUrl: string | null
        relationshipLabel: string
        targetName: string
        message: string | null
        expiresAt: string
      }
    }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'resonate' })
  const invite = await fetchInviteData(token)

  const hasName = invite?.inviterHasName ?? false
  const baseTitle =
    invite && hasName ? `${invite.inviterName} ${t('inviteTitle')}` : t('defaultTitle')
  // `title.absolute` bypasses the root layout's "%s · HexAstral" template so
  // the Kindred invite landing doesn't render as "... · Kindred · HexAstral".
  // This is a Kindred-branded surface; HexAstral is the umbrella, not the page.
  const fullTitle = `${baseTitle} · Yuel`

  return {
    title: { absolute: fullTitle },
    description: t('description'),
    openGraph: {
      title: fullTitle,
      description: t('description'),
    },
  }
}

export default async function ResonatePage({ params }: PageProps) {
  const { locale, token } = await params
  const t = await getTranslations('resonate')
  const invite = await fetchInviteData(token)

  const expired = invite ? new Date(invite.expiresAt) < new Date() : false
  // expo-router resolves this path segment to /accept/[token] inside the app
  // (apps/kindred-app/app/accept/[token].tsx). The earlier `kindred://bond-accept?token=`
  // didn't match any route and silently failed to open the app.
  const deepLink = `kindred:///accept/${token}`
  const appStoreUrl = 'https://apps.apple.com/app/kindred/id6745054798'

  // Locale fallback for tw-locale dates (Hant uses zh-TW formatting).
  const dateLocale = locale === 'tw' ? 'zh-TW' : locale === 'zh' ? 'zh-CN' : locale
  const expiresLabel = invite ? new Date(invite.expiresAt).toLocaleDateString(dateLocale) : ''

  const inviterHasName = invite?.inviterHasName ?? false

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0B0B0C',
        color: '#F5F0E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.75rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* Brand mark — same cinnabar phase-moon as the in-app KindredMoon. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <CinnabarMoon size={96} />
        </div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.5)',
            marginBottom: 36,
          }}
        >
          Yuel
        </p>

        {invite && !expired ? (
          <>
            {inviterHasName ? (
              <>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.5)',
                    marginBottom: 14,
                  }}
                >
                  {t('inviteFrom')}
                </p>
                <h1
                  style={{
                    fontSize: 30,
                    fontWeight: 400,
                    color: '#F5F0E8',
                    letterSpacing: -0.4,
                    marginBottom: 36,
                  }}
                >
                  {invite.inviterName}
                </h1>
              </>
            ) : (
              // Anonymous inviter — no Apple link, no profile name. The "From
              // Someone" line would lie about identity; surface a generic lead
              // instead. (B reached this page through a link A shared in person /
              // by SMS / email, so A's identity is known out-of-band.)
              <>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 400,
                    color: '#F5F0E8',
                    letterSpacing: -0.4,
                    marginBottom: 36,
                  }}
                >
                  {t('anonymousLead')}
                </h1>
              </>
            )}

            {invite.message ? (
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  color: 'rgba(245,240,232,0.78)',
                  marginBottom: 36,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderLeft: '2px solid #C4A882',
                  textAlign: 'left',
                }}
              >
                &ldquo;{invite.message}&rdquo;
              </p>
            ) : null}

            {/* Primary CTA — open in the app via the kindred:// scheme. The
                deep link routes to /accept/[token] (see
                apps/kindred-app/app/accept/[token].tsx). When the app isn't
                installed the scheme fails silently and the App Store fallback
                below picks it up. */}
            {/* Block wrapper so the pill sits on its OWN line — the DDL button
                below is display:inline-flex and was colliding onto the same row. */}
            <div style={{ marginBottom: 20 }}>
              <a
                href={deepLink}
                style={{
                  display: 'inline-block',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#0B0B0C',
                  background: '#C4A882',
                  letterSpacing: 0.5,
                  padding: '15px 36px',
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                {t('openInApp')} →
              </a>
            </div>

            {/* Secondary — App Store via a Deferred Deep Link. Registers a DDL
                session keyed by this device's fingerprint carrying the invite
                token, THEN redirects to the App Store. After B installs and
                opens the app cold (no URL), the app recovers this token via the
                DDL fingerprint match and resumes the invite at /accept/[token]
                (apps/kindred-app/lib/ddl.ts). Without this, a cold install
                loses the token and the viral loop breaks at the new-user step. */}
            <DDLRedirectButton
              payload={{ kind: 'kindred-accept', token }}
              targetApp='kindred'
              appStoreUrl={appStoreUrl}
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                fontSize: 13,
                letterSpacing: 2,
                color: 'rgba(245,240,232,0.5)',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
                marginBottom: 28,
              }}
            >
              {t('downloadApp')}
            </DDLRedirectButton>

            <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: 0.8 }}>
              {t('expires')}: {expiresLabel}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(245,240,232,0.6)' }}>
            {expired ? t('expired') : t('notFound')}
          </p>
        )}
      </div>
    </main>
  )
}
