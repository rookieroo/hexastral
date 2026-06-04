import { Share } from 'react-native'

/**
 * Share an LLM-generated reading as text + an install CTA — the goal is organic
 * acquisition: a friend reads the narrative and taps through to download.
 *
 * TODO(launch): Auspice isn't published yet, and there's no /auspice page on the
 * marketing site (it 404'd), so this points at the working root for now. The real
 * fix is a per-reading SHARE PAGE (hexastral-web) with a server-rendered OG image
 * + "Get the app" CTA — swap this to that URL (then the App Store link at launch).
 */
const INSTALL_URL = 'https://hexastral.com'

/** Localized "shared from" + soft CTA. Body already carries the localized reading. */
const TAGLINE: Record<string, string> = {
  'zh-Hans': '—— 由 Auspice 中华万年历生成 · 看看你的',
  'zh-Hant': '—— 由 Auspice 中華萬年曆生成 · 看看你的',
  ja: '—— Auspice 中華万年暦より · あなたのも見てみる',
  en: '— from Auspice, the Chinese calendar · see yours',
}

/**
 * Present the native share sheet with `body` (a generated reading / narrative)
 * followed by a branded tagline + install link. Silently no-ops on cancel.
 */
export async function shareReading(body: string, locale = 'en'): Promise<void> {
  const tag = TAGLINE[locale] ?? TAGLINE.en
  try {
    await Share.share({ message: `${body.trim()}\n\n${tag}\n${INSTALL_URL}` })
  } catch {
    // user cancelled or share unavailable — no-op
  }
}
