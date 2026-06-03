import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

/**
 * Kindred invite landing — what B sees when they tap A's share-sheet link.
 *
 * Design (2026-06 simplification, per device feedback):
 *   - Kindred branding throughout (not "HexAstral"). The share link is a
 *     Kindred-app artefact; the recipient sees Kindred's seal + palette.
 *   - TWO CTAs: deep-link (open the app if installed) + App Store fallback.
 *     The earlier layout stacked four (open / download / unlock / footer DDL);
 *     the curiosity-gap blur was misleading because B has not yet shared
 *     birth info, so no reading actually exists.
 *   - Web stays form-LESS by design — the birth form (8 fields incl. lunar
 *     toggle, city picker, gender) belongs inside the native app, not in a
 *     one-shot landing page. The deep-link carries the token, so the app
 *     resumes the invite the moment B opens it and the form runs there.
 *   - Warm paper palette (#F5F0E8 ground / #9B2226 seal / #C4A882 gold)
 *     matches /yuan/invite/[token]/teaser so the two halves of the flow
 *     feel like one Kindred surface.
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

  const title = invite ? `${invite.inviterName} ${t('inviteTitle')}` : t('defaultTitle')

  return {
    title: `${title} · Kindred`,
    description: t('description'),
    openGraph: {
      title: `${title} · Kindred`,
      description: t('description'),
    },
  }
}

export default async function ResonatePage({ params }: PageProps) {
  const { locale, token } = await params
  const t = await getTranslations('resonate')
  const invite = await fetchInviteData(token)

  const expired = invite ? new Date(invite.expiresAt) < new Date() : false
  // Kindred-specific deep link — the app's URL scheme catches this and resumes
  // the invite flow with the token so B lands on the in-app birth form.
  const deepLink = `kindred://bond-accept?token=${token}`
  const appStoreUrl = 'https://apps.apple.com/app/kindred/id6745054798'
  const isZh = locale === 'zh' || locale === 'tw' || locale === 'zh-Hant'

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
        {/* Cinnabar seal — the Kindred mark.
            Uses the 緣 seal glyph (same as native KindredSeal in
            packages/scenario-kindred). The literal word "Kindred" didn't fit
            inside the disc and clipped to "Kind"; one CJK glyph reads as a
            seal/stamp at any size and stays brand-consistent. */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            backgroundColor: '#9B2226',
            margin: '0 auto 2.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 46,
              lineHeight: 1,
              color: '#C4A882',
              fontWeight: 400,
            }}
          >
            緣
          </span>
        </div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(60,36,21,0.55)',
            marginTop: -16,
            marginBottom: 36,
          }}
        >
          Kindred
        </p>

        {invite && !expired ? (
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
                marginBottom: 10,
              }}
            >
              {invite.inviterName}
            </h1>
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

            {/* Primary CTA — open in app (deep link). On a fresh iOS install
                the scheme fails silently, so the App Store fallback below
                still works. */}
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
              {isZh ? '在 Kindred 中打开 →' : 'Open in Kindred →'}
            </a>

            {/* Secondary — App Store. Reads as a footer link, not a button,
                so it doesn't compete with the primary deep-link. */}
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
              {isZh ? '在 iOS 上获取 Kindred' : 'Get Kindred on iOS'}
            </a>

            <p style={{ fontSize: 11, color: 'rgba(60,36,21,0.35)', letterSpacing: 0.8 }}>
              {t('expires')}: {new Date(invite.expiresAt).toLocaleDateString()}
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
