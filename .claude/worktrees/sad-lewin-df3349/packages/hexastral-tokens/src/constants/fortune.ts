/** 吉凶等级 */
export type Fortune = 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'

/** 吉凶中文映射 */
export const FORTUNE_LABELS: Record<Fortune, string> = {
  'great-fortune': '大吉',
  fortune: '吉',
  neutral: '中平',
  caution: '小凶',
  misfortune: '凶',
}

/** 吉凶颜色映射（用于 UI） */
export const FORTUNE_COLORS: Record<Fortune, string> = {
  'great-fortune': '#D4AF37',
  fortune: '#22C55E',
  neutral: '#6B7280',
  caution: '#F59E0B',
  misfortune: '#EF4444',
}

/** 格式化 ISO 日期为本地化短格式 M月D日 HH:mm */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}
