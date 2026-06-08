/**
 * Font family names for the locked report design (chapter-en).
 *
 * The actual files are bundled by the app (apps/kindred-app) and loaded under
 * these exact family names via expo-font `useFonts`. All free-commercial (SIL
 * OFL). English locales use the Latin set; CJK locales use `cjk` (bundle a
 * subsetted Noto Serif CJK for production — the full variable font is ~25 MB).
 *
 * If a family is not yet loaded, RN falls back to the system font, so the card
 * still renders (degraded) before the fonts are bundled.
 */
export const kindredFonts = {
  /** Chapter title — transitional serif (old-book, not fashion). */
  display: 'LibreBaskerville',
  /** Golden line + body — old-style serif. */
  serif: 'CrimsonPro',
  serifItalic: 'CrimsonPro-Italic',
  /** Labels, kickers, colophons. */
  mono: 'IBMPlexMono',
  /** Chinese / Japanese body + title. */
  cjk: 'NotoSerifSC',
} as const

/** Locales that should render title/body in the CJK serif. */
export function isCjkLocale(locale: string | undefined): boolean {
  if (!locale) return false
  return locale.startsWith('zh') || locale.startsWith('ja') || locale.startsWith('ko')
}
