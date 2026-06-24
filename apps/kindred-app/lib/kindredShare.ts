/**
 * Yuel share funnel — the ONE place the share card's brand + install URL live.
 * (Brand is "Yuel"; the directory/package stays kindred-* by design — see the
 * brand-rename ADR-0024. User-facing strings must read Yuel, never "kindred".)
 *
 * The shareable PNG self-markets even when a social app strips the caption
 * (Android), so the brand text + a scannable QR are baked into the image. Both
 * the 合盘 and the personal 命书 cards read from here.
 *
 * NOTE: brand host is `yuel.hexastral.com` — a subdomain on the existing zone,
 * live once the hexastral-web CF route is deployed (apex yuel.app is parked for
 * launch, then 301s here). These are the FALLBACK + the personal-share URL; the
 * 合盘 share bakes the per-bond /report/<shareId> link (createShareUrl) into the
 * QR so a scan lands on the real Yuel synastry page.
 */

/** Footer text under the card — the human-readable brand domain (no scheme). */
export const KINDRED_BRAND_URL = 'yuel.hexastral.com'

/** Full URL (with scheme) baked into the scannable QR — the image → install path. */
export const KINDRED_INSTALL_URL = 'https://yuel.hexastral.com'

/**
 * Caption carried alongside the image on iOS (Android drops it — the baked-in
 * brand carries the funnel there). The lead line + a soft "see yours" CTA +
 * the install URL.
 */
export function kindredShareCaption(locale: string, lead: string): string {
  const cta = locale.startsWith('zh')
    ? '· 看看你的'
    : locale.startsWith('ja')
      ? '· あなたも'
      : '· see yours'
  return `${lead} ${cta}\n${KINDRED_INSTALL_URL}`
}
