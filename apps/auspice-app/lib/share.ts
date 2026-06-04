import { Share } from 'react-native'

/**
 * Share an LLM-generated reading as text + an install CTA — the goal is organic
 * acquisition: a friend reads the narrative and taps through to download.
 *
 * TODO(launch): Auspice isn't published yet, so `INSTALL_URL` points at the
 * marketing site. Swap to the real `https://apps.apple.com/app/id…` (and the
 * Android Play URL) the moment the listing is live — this is the only place to
 * change. The App Store also rewrites this to a smart App Banner on iOS.
 */
const INSTALL_URL = 'https://hexastral.com/auspice'

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
