/** Remaining ban time for portfolio alerts (aligned with coin-cast wording). */
export function formatBanRemaining(iso: string | null, uiLocale: string): string {
  if (!iso) return '—'
  const end = Date.parse(iso)
  if (!Number.isFinite(end)) return '—'
  const ms = Math.max(0, end - Date.now())
  const minsTotal = Math.max(1, Math.ceil(ms / 60_000))
  const hours = Math.floor(minsTotal / 60)
  const mins = minsTotal % 60
  if (uiLocale === 'ja') {
    return hours > 0 ? `約${hours}時間${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh-Hant') {
    return hours > 0 ? `約${hours}小時${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh') {
    return hours > 0 ? `约${hours}小时${mins}分` : `约${mins}分`
  }
  return hours > 0 ? `~${hours}h ${mins}m` : `~${mins}m`
}
