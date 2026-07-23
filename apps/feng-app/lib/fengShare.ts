/**
 * Kanyu chat-share funnel — brand host on hexastral.com until an apex is owned.
 */

/** Footer text under the card (no scheme). */
export const FENG_BRAND_URL = 'kanyu.hexastral.com'

/** Full URL baked into share caption / install path. */
export const FENG_INSTALL_URL = 'https://kanyu.hexastral.com'

export function fengShareCaption(locale: string, lead: string): string {
  const cta = locale.startsWith('zh')
    ? '· 看看你的居所'
    : locale.startsWith('ja')
      ? '· あなたも'
      : '· see yours'
  return `${lead} ${cta}\n${FENG_INSTALL_URL}`
}
