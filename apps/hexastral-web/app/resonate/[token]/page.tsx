import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { type Locale, routing } from '@/i18n/routing'

/**
 * Kindred (Yuel) invite landing — what B sees when they tap A's share-sheet link.
 *
 * FIXED, locale-AGNOSTIC URL: `https://hexastral.com/resonate/{token}` (no `/zh/`,
 * `/tw/`, `/ja/` prefix). The page localises by the OPENING device, not the inviter:
 * the language is resolved from `?lc=` (optional explicit override) → `Accept-Language`
 * → default. This is the same non-localized share pattern as /hehun, /s/day, /u — and
 * it fixes the old `/zh/resonate/...` links, which a stale next.config redirect was
 * hijacking to the Yuan invite route (so every non-en invite "wouldn't open").
 *
 * Iteration notes (2026-06):
 *   - Logo is an inline cinnabar phase-moon SVG (an approximation of the in-app
 *     KindredMoon / SKIN_CINNABAR_INK at phase 0.25), not the 緣 glyph — the moon is
 *     the brand.
 *   - All copy goes through next-intl messages so the page localises consistently.
 *   - "Invitation from Someone" copy is gated on `inviterHasName` from the server: an
 *     anonymous inviter drops the "From {someone}" line.
 *   - Deep link is `kindred:///accept/{token}` (expo-router resolves it to
 *     /accept/[token]).
 *
 * Web stays form-LESS by design — the birth form belongs inside the native app.
 */

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lc?: string | string[] }>
}

/** Map one BCP-47-ish tag to a supported web locale (zh|tw|en|ja), or null. */
function tagToLocale(tag: string): Locale | null {
  const t = tag.trim().toLowerCase()
  if (!t) return null
  if (t.startsWith('zh-tw') || t.startsWith('zh-hk') || t.startsWith('zh-hant') || t === 'tw') {
    return 'tw'
  }
  if (t.startsWith('zh')) return 'zh' // zh, zh-CN, zh-Hans, … → Simplified
  if (t.startsWith('ja')) return 'ja'
  if (t.startsWith('en')) return 'en'
  return null
}

/** Pick the best supported locale from an `Accept-Language` header value. */
function negotiate(acceptLanguage: string): Locale {
  const tags = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.split(';q=')
      return { tag: (tag ?? '').trim(), q: q ? Number.parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  for (const { tag } of tags) {
    const l = tagToLocale(tag)
    if (l) return l
  }
  return routing.defaultLocale
}

/** Locale = explicit `?lc=` override → device `Accept-Language` → default. */
async function resolveLocale(searchParams: PageProps['searchParams']): Promise<Locale> {
  const sp = await searchParams
  const raw = Array.isArray(sp.lc) ? sp.lc[0] : sp.lc
  const fromQuery = raw ? tagToLocale(raw) : null
  if (fromQuery) return fromQuery
  const al = (await headers()).get('accept-language') ?? ''
  return negotiate(al)
}

/**
 * Inline cinnabar phase-moon — a faithful SVG port of the in-app KindredMoon
 * (MoonPhaseLoader + SKIN_CINNABAR_INK at phase 0.25). Reproduces the app's three
 * layers (lit face, water-ink shadow disc with turbulence terminator, paper grain)
 * so the landing logo matches the app, not just approximates it. Geometry uses the
 * app's viewBox-100 constants (moon cx50/cy50/r40, shadow r48).
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
        <radialGradient id='kindred-face' gradientUnits='userSpaceOnUse' cx='38.8' cy='34' r='54.4'>
          <stop offset='0' stopColor='#f3d8c0' />
          <stop offset='0.55' stopColor='#c87454' />
          <stop offset='1' stopColor='#7a2418' />
        </radialGradient>
        <radialGradient id='kindred-shadow' gradientUnits='userSpaceOnUse' cx='5' cy='50' r='48'>
          <stop offset='0' stopColor='#0e0d0c' />
          <stop offset='0.5' stopColor='#131218' />
          <stop offset='0.78' stopColor='#1a1922' />
          <stop offset='0.94' stopColor='#1a1922' stopOpacity='0.4' />
          <stop offset='1' stopColor='#1a1922' stopOpacity='0' />
        </radialGradient>
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

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { token } = await params
  const locale = await resolveLocale(searchParams)
  const t = await getTranslations({ locale, namespace: 'resonate' })
  const invite = await fetchInviteData(token)

  const hasName = invite?.inviterHasName ?? false
  const baseTitle =
    invite && hasName ? `${invite.inviterName} ${t('inviteTitle')}` : t('defaultTitle')
  // `title.absolute` bypasses the root layout's "%s · HexAstral" template — this is a
  // Kindred-branded surface; HexAstral is the umbrella, not the page.
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

export default async function ResonatePage({ params, searchParams }: PageProps) {
  const { token } = await params
  const locale = await resolveLocale(searchParams)
  const t = await getTranslations({ locale, namespace: 'resonate' })
  const invite = await fetchInviteData(token)

  const expired = invite ? new Date(invite.expiresAt) < new Date() : false
  // expo-router resolves this path segment to /accept/[token] inside the app.
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

            {/* Primary CTA — open in the app via the kindred:// scheme. */}
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

            {/* Secondary — App Store via a Deferred Deep Link (carries the token
                through a cold install so the viral loop survives the new-user step). */}
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
