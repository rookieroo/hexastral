/**
 * 出生信息本地持久化
 *
 * 保存出生年、性别、时辰等到 AsyncStorage
 * Destiny Tab 和 Feng Shui Tab 自动填充
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'hexastral_birth_info'

export interface BirthInfo {
  /** 出生年份, e.g. "1990" */
  birthYear?: string
  /** 性别: 男|女 */
  gender?: '男' | '女'
  /** 用户名字 / 昵称（onboarding 录入，可跳过；用于 LLM 个性化与 Profile 标题） */
  displayName?: string
  /** 出生时辰 index (0-12) */
  timeIndex?: number
  /** 阳历日期 "YYYY-M-D" */
  solarDate?: string
  /** 用户输入时选择的历法 — solar (阳历) | lunar (农历) */
  calendarType?: 'solar' | 'lunar'
  /** 出生城市名称 (用于真太阳时修正) */
  birthCity?: string
  /** 出生地纬度 */
  latitude?: number
  /** 出生地经度 */
  longitude?: number
  /** IANA 时区（如 Asia/Shanghai）*/
  timezoneId?: string
}

let cached: BirthInfo | null = null

export async function getBirthInfo(): Promise<BirthInfo> {
  if (cached) return cached
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    cached = raw ? (JSON.parse(raw) as BirthInfo) : {}
    return cached
  } catch {
    return {}
  }
}

export async function saveBirthInfo(info: Partial<BirthInfo>): Promise<void> {
  const current = await getBirthInfo()
  const merged = { ...current, ...info }
  cached = merged
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
}

export function clearBirthInfoCache(): void {
  cached = null
}
