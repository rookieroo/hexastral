type WebMsgLocale = 'en' | 'zh' | 'tw' | 'ja' | 'ko'

/** Map App/user locale to a `messages/*.json` bundle ( `/u/*` is outside `[locale]` routing ). */
export function resolvePublicProfileMessageLocale(
  appLocale: string | null | undefined
): WebMsgLocale {
  const l = (appLocale ?? '').trim().toLowerCase()
  if (l.startsWith('zh-hant') || l === 'zh-tw' || l === 'tw') return 'tw'
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('ko')) return 'ko'
  return 'en'
}

export async function getPublicPlainIntroHeading(
  appLocale: string | null | undefined
): Promise<string> {
  const key = resolvePublicProfileMessageLocale(appLocale)
  const messages = (await import(`../messages/${key}.json`)).default as {
    publicProfile?: { plainIntroHeading?: string }
  }
  return messages.publicProfile?.plainIntroHeading?.trim() || 'HexAstral reading'
}
