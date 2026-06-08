/**
 * Bonds-timeline presentation formatters (pure, locale-aware).
 *
 * The server engine (`astro-core composeBondsTimeline`) emits `summary`/`leadLabel`
 * in zh-Hans only — `GET /api/bonds/timeline` takes no locale. Rather than localize
 * the deterministic engine (and disturb its golden tests), Kindred reconstructs the
 * human strings client-side from the node's STRUCTURED fields (kind / ganZhi /
 * daYunOf / year / bond names), which the privacy-projected DTO already carries.
 *
 * zh-Hans falls through to the server summary verbatim (identical wording); the
 * other three locales get a faithful translation built from the same parts.
 */

import type { BondsTimelineNode, BondsTimelineNodeKind } from '../types'

/** Kindred ships 4 locales (see apps/kindred-app/lib/i18n.ts). */
export type KindredLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Join bond display names with a locale-appropriate separator. */
function joinNames(names: string[], locale: KindredLocale): string {
  const sep = locale === 'en' ? ', ' : '、'
  const filtered = names.filter((n) => n.length > 0)
  if (filtered.length === 0) return locale === 'en' ? 'them' : 'TA'
  return filtered.join(sep)
}

/**
 * Localized one-line summary for a merged timeline node, built from structured
 * fields. Mirrors astro-core `mergedSummary` for zh; translates for the rest.
 */
export function formatNodeSummary(node: BondsTimelineNode, locale: KindredLocale): string {
  // zh-Hans: the server string is already exactly this wording.
  if (locale === 'zh' && node.summary) return node.summary

  const names = joinNames(
    node.bonds.map((b) => b.name),
    locale
  )
  const gz = node.ganZhi

  if (node.kind === '大运') {
    const selfTransition = node.daYunOf === 'A'
    switch (locale) {
      case 'zh':
      case 'zh-Hant':
        return selfTransition
          ? `你進入「${gz}」大運，與 ${names} 的關係節奏將隨之轉換。`
          : `${names} 進入「${gz}」大運，你們的關係節奏將隨之轉換。`
      case 'ja':
        return selfTransition
          ? `あなたが「${gz}」大運に入り、${names} との関係のリズムが変わります。`
          : `${names} が「${gz}」大運に入り、関係のリズムが変わります。`
      default:
        return selfTransition
          ? `You enter your ${gz} luck cycle — the rhythm with ${names} shifts with it.`
          : `${names} enters a ${gz} luck cycle — the rhythm between you shifts with it.`
    }
  }

  // 流月 — the near-term living layer. Calm months carry no bonds.
  if (node.kind === '流月') {
    const calm = node.bonds.length === 0
    const m = node.month ?? 1
    switch (locale) {
      case 'zh':
      case 'zh-Hant':
        return calm
          ? `${node.year}年${m}月 ${gz}，各段關係大致平穩。`
          : `${node.year}年${m}月 ${gz}，與 ${names} 的關係本月流月互動顯著。`
      case 'ja':
        return calm
          ? `${node.year}年${m}月 ${gz}、各関係はおおむね穏やかです。`
          : `${node.year}年${m}月 ${gz}、${names} との関係に今月は動きが目立ちます。`
      default: {
        const mon = `${EN_MONTHS[m - 1] ?? `Month ${m}`} ${node.year}`
        return calm
          ? `${mon} (${gz}): a calm month across your bonds.`
          : `${mon} (${gz}): a notable monthly turn with ${names}.`
      }
    }
  }

  // 流年
  switch (locale) {
    case 'zh':
    case 'zh-Hant':
      return `${node.year}年 ${gz}，與 ${names} 的關係迎來顯著節點。`
    case 'ja':
      return `${node.year}年 ${gz}、${names} との関係に大きな節目が訪れます。`
    default:
      return `In ${node.year} (${gz}), a significant turn arrives in your bond with ${names}.`
  }
}

/** Short kind label for chips/headers. */
export function formatNodeKind(kind: BondsTimelineNodeKind, locale: KindredLocale): string {
  if (kind === '大运') {
    switch (locale) {
      case 'zh':
        return '大运'
      case 'zh-Hant':
        return '大運'
      case 'ja':
        return '大運'
      default:
        return 'Luck cycle'
    }
  }
  if (kind === '流月') {
    switch (locale) {
      case 'zh':
      case 'zh-Hant':
      case 'ja':
        return '流月'
      default:
        return 'Monthly'
    }
  }
  switch (locale) {
    case 'zh':
    case 'zh-Hant':
      return '流年'
    case 'ja':
      return '流年'
    default:
      return 'Annual'
  }
}

/**
 * Locale-aware "how far ahead" label from a lead-days count. Rebuilt client-side
 * (the server `leadLabel` is zh-Hans only). Buckets: ~half-year / ~month / soon.
 */
export function formatLeadLabel(leadDays: number, locale: KindredLocale): string {
  const months = Math.round(leadDays / 30)
  if (months >= 2) {
    switch (locale) {
      case 'zh':
      case 'zh-Hant':
        return `${months}个月后`.replace('个', locale === 'zh-Hant' ? '個' : '个')
      case 'ja':
        return `${months}か月後`
      default:
        return `in ${months} months`
    }
  }
  if (leadDays >= 14) {
    switch (locale) {
      case 'zh':
        return '约一个月后'
      case 'zh-Hant':
        return '約一個月後'
      case 'ja':
        return '約1か月後'
      default:
        return 'in about a month'
    }
  }
  switch (locale) {
    case 'zh':
      return '即将到来'
    case 'zh-Hant':
      return '即將到來'
    case 'ja':
      return 'まもなく'
    default:
      return 'coming up'
  }
}
