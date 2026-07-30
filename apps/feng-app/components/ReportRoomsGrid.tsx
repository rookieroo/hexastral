/**
 * Report-side 九宫 + roomFindings; optional palace confirm for 大门/灶/主卧.
 */

import type { FengComputeJson } from '@zhop/scenario-feng'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { Strings } from '@/lib/i18n'
import {
  cyclePalace,
  isConfirmableRoomType,
  loadRoomPalaceOverrides,
  normalizeConfirmableType,
  type RoomPalaceOverrides,
  saveRoomPalaceOverrides,
} from '@/lib/room-palace-overrides'
import { FENG_PAPER, spacing } from '@/lib/theme'

const GRID: Array<Array<string | null>> = [
  ['巽', '离', '坤'],
  ['震', null, '兑'],
  ['艮', '坎', '乾'],
]

function placementLine(
  roomType: string,
  palace: string,
  compute: FengComputeJson,
  t: Strings
): string | null {
  const placement = compute.baZhai?.placement
  if (!placement) return null
  if (roomType === '大门') {
    return t.report_room_join_door
      .replace('{palace}', palace)
      .replace('{fav}', placement.door?.palace ?? '—')
  }
  if (roomType === '主卧') {
    return t.report_room_join_bed
      .replace('{palace}', palace)
      .replace('{fav}', placement.bedHead?.palace ?? '—')
  }
  if (roomType === '灶位' || roomType === '厨房') {
    return t.report_room_join_stove
      .replace('{palace}', palace)
      .replace('{fav}', placement.stove.mouthToward.palace ?? placement.stove.sitAt.palace ?? '—')
  }
  return null
}

export function ReportRoomsGrid({
  compute,
  reportId,
  t,
}: {
  compute: FengComputeJson
  reportId: string
  t: Strings
}) {
  const rooms = compute.roomFindings ?? []
  const que = new Set((compute.interiorQueJiao ?? []).map((q) => q.palace))
  const [overrides, setOverrides] = useState<RoomPalaceOverrides>({})

  useEffect(() => {
    if (!reportId) return
    void loadRoomPalaceOverrides(reportId).then(setOverrides)
  }, [reportId])

  const setOverride = useCallback(
    (roomType: string, palace: string) => {
      const key = normalizeConfirmableType(roomType)
      if (!key) return
      setOverrides((prev) => {
        const next = { ...prev, [key]: palace }
        void saveRoomPalaceOverrides(reportId, next)
        return next
      })
    },
    [reportId]
  )

  const effectiveRooms = useMemo(() => {
    return rooms.map((r) => {
      const key = r.roomType ? normalizeConfirmableType(r.roomType) : null
      const over = key ? overrides[key] : undefined
      return over
        ? { ...r, palace: over, _overridden: true as const }
        : { ...r, _overridden: false as const }
    })
  }, [rooms, overrides])

  const confirmable = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ roomType: string; palace: string }> = []
    for (const r of effectiveRooms) {
      if (!r.roomType || !r.palace) continue
      if (!isConfirmableRoomType(r.roomType) && r.roomType !== '厨房') continue
      const key = normalizeConfirmableType(r.roomType) ?? r.roomType
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ roomType: r.roomType, palace: r.palace })
    }
    return list
  }, [effectiveRooms])

  if (rooms.length === 0 && que.size === 0) return null

  const byPalace = new Map<string, string[]>()
  for (const r of effectiveRooms) {
    if (!r.palace) continue
    const label = [r.roomType, r.readingPublic || r.name].filter(Boolean).join(' · ')
    const list = byPalace.get(r.palace) ?? []
    list.push(label || r.palace)
    byPalace.set(r.palace, list)
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 11, letterSpacing: 1 }}>
        {t.report_rooms_heading}
      </Text>
      <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 11, lineHeight: 16 }}>
        {t.report_room_confirm_hint}
      </Text>

      {confirmable.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {confirmable.map((row) => {
            const join = placementLine(row.roomType, row.palace, compute, t)
            return (
              <View key={row.roomType} style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ color: FENG_PAPER.ink, fontSize: 12, flex: 1 }}>
                    {row.roomType}
                  </Text>
                  <Pressable
                    onPress={() => setOverride(row.roomType, cyclePalace(row.palace))}
                    accessibilityRole='button'
                    accessibilityLabel={`${row.roomType} ${row.palace}`}
                    style={{
                      borderWidth: 0.5,
                      borderColor: FENG_PAPER.hair,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: FENG_PAPER.bronze, fontSize: 12, fontWeight: '700' }}>
                      {row.palace} →
                    </Text>
                  </Pressable>
                </View>
                {join ? (
                  <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 11, lineHeight: 16 }}>
                    {join}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        {GRID.map((row, ri) => (
          <View key={`r-${ri}`} style={{ flexDirection: 'row', gap: 4 }}>
            {row.map((palace, ci) => {
              if (!palace) {
                return (
                  <View
                    key={`c-${ri}-${ci}`}
                    style={{
                      flex: 1,
                      minHeight: 56,
                      borderWidth: 0.5,
                      borderColor: FENG_PAPER.hair,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 10 }}>中</Text>
                  </View>
                )
              }
              const lines = byPalace.get(palace) ?? []
              const missing = que.has(palace)
              return (
                <View
                  key={palace}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderWidth: 0.5,
                    borderColor: FENG_PAPER.hair,
                    padding: 4,
                    opacity: missing ? 0.45 : 1,
                  }}
                >
                  <Text style={{ color: FENG_PAPER.bronze, fontSize: 11, fontWeight: '700' }}>
                    {palace}
                    {missing ? ' ·缺' : ''}
                  </Text>
                  {lines.slice(0, 2).map((line) => (
                    <Text
                      key={line}
                      style={{ color: FENG_PAPER.ink, fontSize: 10, lineHeight: 14 }}
                      numberOfLines={2}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}
