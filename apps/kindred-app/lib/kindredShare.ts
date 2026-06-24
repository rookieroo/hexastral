/**
 * Yuel share funnel — the ONE place the share card's brand + install URL live.
 * (Brand is "Yuel"; the directory/package stays kindred-* by design — see the
 * brand-rename ADR-0024. User-facing strings must read Yuel, never "kindred".)
 *
 * The shareable PNG self-markets even when a social app strips the caption
 * (Android), so the brand text + a scannable QR are baked into the image. Both
 * the 合盘 and the personal 命书 cards read from here.
 *
 * NOTE: these point at `yuel.app`, the decided consumer domain. The DNS +
 * landing migration (yuun.app/yuel.app, ADR-0024) is NOT live yet, so the QR
 * won't RESOLVE until that ships — but the brand is correct and this is the one
 * line to flip. The per-bond deep link (POST /api/bonds/:id/share) is also off
 * the path until its landing is fixed; the QR carries the install funnel.
 */

/** Footer text under the card — the human-readable brand domain (no scheme). */
export const KINDRED_BRAND_URL = 'yuel.app'

/** Full URL (with scheme) baked into the scannable QR — the image → install path. */
export const KINDRED_INSTALL_URL = 'https://yuel.app'

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
