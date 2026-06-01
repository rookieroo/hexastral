import * as Linking from 'expo-linking'

/** Read `ddl` query param like `scheme://launch?ddl=TOKEN` (with `pt` fallback). */
export function extractDdlTokenFromUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = Linking.parse(url)
    const token = parsed.queryParams?.ddl ?? parsed.queryParams?.pt
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch {
    return null
  }
}
