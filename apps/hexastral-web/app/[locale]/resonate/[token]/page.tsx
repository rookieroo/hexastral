import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

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

/**
 * Relationship label reverse-localize.
 *
 * The Kindred app stores the relationship as a FROZEN localized string (the
 * label A picked in A's locale, e.g. '恋人' if A was in zh). When B opens the
 * invite link, the server returns that frozen label — so a zh-locale A's bond
 * displays '恋人' even to an en-locale B. We reverse-look it up here against
 * the same label table the app uses (kindred-app/lib/inviteSubmit.ts) and
 * re-localize it for the recipient's locale. Falls back to the original
 * string if A typed a custom label that doesn't match any preset.
 */
const RELATIONSHIP_LABELS: Record<string, Record<string, string>> = {
  romantic: { en: 'Partner', zh: '恋人', tw: '戀人', ja: '恋人' },
  friend: { en: 'Friend', zh: '朋友', tw: '朋友', ja: '友人' },
  family: { en: 'Family', zh: '家人', tw: '家人', ja: '家族' },
  partner: { en: 'Business partner', zh: '合伙人', tw: '合夥人', ja: 'パートナー' },
  colleague: { en: 'Colleague', zh: '同事', tw: '同事', ja: '同僚' },
  other: { en: 'Other', zh: '其他', tw: '其他', ja: 'その他' },
}
function localizeRelationship(rawLabel: string, locale: string): string {
  const want = locale === 'zh-Hant' ? 'tw' : locale === 'zh-CN' ? 'zh' : locale
  for (const labels of Object.values(RELATIONSHIP_LABELS)) {
    if (Object.values(labels).includes(rawLabel)) {
      return labels[want] ?? labels.en ?? rawLabel
    }
  }
  return rawLabel
}

/**
 * Inline cinnabar phase-moon — a still SVG approximation of the in-app
 * KindredMoon (SKIN_CINNABAR_INK at phase 0.25, right-lit crescent).
 *
 * The native moon is rendered with Skia + shaders (rich noise + paper grain);
 * on the web we approximate with:
 *   - a base disk filled with a radial gradient (cinnabar lit face)
 *   - a darker disk offset to the LEFT to mask the shadow side
 *   - both inside a circular clip path so the crescent reads cleanly
 *
 * Same color stops as SKIN_CINNABAR_INK (packages/hexastral-tokens/src/moon.ts:
 * faceStops #f3d8c0 / #c87454 / #7a2418, shadow #0e0d0c).
 */
function CinnabarMoon({ size = 88 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 100 100'
      aria-hidden
      role='img'
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id='kindred-face' cx='36%' cy='30%' r='68%'>
          <stop offset='0%' stopColor='#f3d8c0' />
          <stop offset='55%' stopColor='#c87454' />
          <stop offset='100%' stopColor='#7a2418' />
        </radialGradient>
        <radialGradient id='kindred-shadow' cx='50%' cy='50%' r='60%'>
          <stop offset='0%' stopColor='#0e0d0c' />
          <stop offset='78%' stopColor='#1a1922' stopOpacity='0.94' />
          <stop offset='100%' stopColor='#1a1922' stopOpacity='0' />
        </radialGradient>
        <clipPath id='kindred-disk'>
          <circle cx='50' cy='50' r='44' />
        </clipPath>
      </defs>
      {/* Lit face — cinnabar */}
      <g clipPath='url(#kindred-disk)'>
        <circle cx='50' cy='50' r='44' fill='url(#kindred-face)' />
        {/* Shadow side — a darker disk shifted LEFT so the crescent sits on
            the right (phase 0.25). cx shifted by ~30% of the radius. */}
        <circle cx='27' cy='50' r='44' fill='url(#kindred-shadow)' />
      </g>
      {/* Rim — a thin warm outline so the moon doesn't melt into the paper. */}
      <circle
        cx='50'
        cy='50'
        r='44'
        fill='none'
        stroke='rgba(122,36,24,0.18)'
        strokeWidth='0.75'
      />
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
  const fullTitle = `${baseTitle} · Kindred`

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
  const expiresLabel = invite
    ? new Date(invite.expiresAt).toLocaleDateString(dateLocale)
    : ''

  const inviterHasName = invite?.inviterHasName ?? false
  const showRelationshipPrefix = inviterHasName && !!invite?.relationshipLabel

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#F5F0E8',
        color: '#3C2415',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.75rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* Brand mark — same cinnabar phase-moon as the in-app KindredMoon. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <CinnabarMoon size={88} />
        </div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(60,36,21,0.55)',
            marginBottom: 36,
          }}
        >
          Kindred
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
                    color: 'rgba(60,36,21,0.55)',
                    marginBottom: 14,
                  }}
                >
                  {t('inviteFrom')}
                </p>
                <h1
                  style={{
                    fontSize: 30,
                    fontWeight: 400,
                    color: '#3C2415',
                    letterSpacing: -0.4,
                    marginBottom: showRelationshipPrefix ? 10 : 36,
                  }}
                >
                  {invite.inviterName}
                </h1>
                {showRelationshipPrefix ? (
                  <p
                    style={{
                      fontSize: 13,
                      letterSpacing: 2,
                      color: '#9B2226',
                      marginBottom: invite.message ? 24 : 36,
                    }}
                  >
                    {t('relationshipPrefix')}{' '}
                    {localizeRelationship(invite.relationshipLabel, locale)}
                  </p>
                ) : null}
              </>
            ) : (
              // Anonymous inviter — no Apple link, no profile name. The "From
              // Someone" line would lie about identity; surface a generic lead
              // instead. The relationship label still appears (it's real data
              // A picked) so B knows what the bond is.
              <>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 400,
                    color: '#3C2415',
                    letterSpacing: -0.4,
                    marginBottom: invite.relationshipLabel ? 10 : 36,
                  }}
                >
                  {t('anonymousLead')}
                </h1>
                {invite.relationshipLabel ? (
                  <p
                    style={{
                      fontSize: 13,
                      letterSpacing: 2,
                      color: '#9B2226',
                      marginBottom: invite.message ? 24 : 36,
                    }}
                  >
                    {localizeRelationship(invite.relationshipLabel, locale)}
                  </p>
                ) : null}
              </>
            )}

            {invite.message ? (
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  color: 'rgba(60,36,21,0.75)',
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
            <a
              href={deepLink}
              style={{
                display: 'block',
                fontSize: 18,
                fontWeight: 500,
                color: '#C4A882',
                letterSpacing: 0.5,
                borderBottom: '1px solid #C4A882',
                paddingBottom: 12,
                paddingTop: 12,
                textDecoration: 'none',
                marginBottom: 24,
              }}
            >
              {t('openInApp')} →
            </a>

            {/* Secondary — App Store. Reads as a footer link, not a button. */}
            <a
              href={appStoreUrl}
              style={{
                display: 'inline-block',
                fontSize: 13,
                letterSpacing: 2,
                color: 'rgba(60,36,21,0.55)',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
                marginBottom: 28,
              }}
            >
              {t('downloadApp')}
            </a>

            <p style={{ fontSize: 11, color: 'rgba(60,36,21,0.35)', letterSpacing: 0.8 }}>
              {t('expires')}: {expiresLabel}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(60,36,21,0.65)' }}>
            {expired ? t('expired') : t('notFound')}
          </p>
        )}
      </div>
    </main>
  )
}
