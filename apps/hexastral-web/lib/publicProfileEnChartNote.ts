/** Short copy for English-locale viewers: classical chart glyphs stay in Chinese by design. */

export const PUBLIC_PROFILE_EN_CHART_NOTE =
  'Structural charts use classical Chinese glyph labels (Ba Zi stems/branches; Zi Wei palace stars). ' +
  'They are kept untranslated as the symbolic layer—paired with HexAstral’s computational chart engine and guided readings in your chosen language inside the app.'

export function isEnglishLocale(locale: string | null | undefined): boolean {
  const L = (locale ?? '').trim().toLowerCase()
  return L === 'en' || L.startsWith('en-')
}
