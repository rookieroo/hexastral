/**
 * Optional user overrides for key rooms' palace (大门 / 灶 / 主卧).
 * Stored per reportId — display + placement join; does not rewrite past synthesis.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = 'feng_room_palace_overrides:'

export const CONFIRMABLE_ROOM_TYPES = ['大门', '主卧', '灶位', '厨房'] as const
export type ConfirmableRoomType = (typeof CONFIRMABLE_ROOM_TYPES)[number]

export type RoomPalaceOverrides = Partial<Record<ConfirmableRoomType, string>>

const PALACES = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾'] as const

export function isConfirmableRoomType(t: string): t is ConfirmableRoomType {
  return (CONFIRMABLE_ROOM_TYPES as readonly string[]).includes(t)
}

export function cyclePalace(current: string): string {
  const idx = PALACES.indexOf(current as (typeof PALACES)[number])
  const next = PALACES[(idx + 1) % PALACES.length]
  return next ?? '坎'
}

export async function loadRoomPalaceOverrides(reportId: string): Promise<RoomPalaceOverrides> {
  if (!reportId) return {}
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + reportId)
    if (!raw) return {}
    return JSON.parse(raw) as RoomPalaceOverrides
  } catch {
    return {}
  }
}

export async function saveRoomPalaceOverrides(
  reportId: string,
  overrides: RoomPalaceOverrides
): Promise<void> {
  if (!reportId) return
  await AsyncStorage.setItem(KEY_PREFIX + reportId, JSON.stringify(overrides))
}

/** Map VLM room type aliases onto confirmable keys. */
export function normalizeConfirmableType(roomType: string): ConfirmableRoomType | null {
  if (roomType === '大门') return '大门'
  if (roomType === '主卧') return '主卧'
  if (roomType === '灶位' || roomType === '厨房') return roomType === '厨房' ? '厨房' : '灶位'
  return null
}
