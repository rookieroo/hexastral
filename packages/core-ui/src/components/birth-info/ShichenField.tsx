/**
 * ShichenField — collapsed 十二时辰 entry.
 *
 * The 12-cell grid (`ShichenPicker`) is correct but eats a lot of vertical
 * space on a birth form. This keeps the time field to ONE compact line — a
 * summary row with a wheel affordance, the exact same habit as
 * `BirthDateField` — and only on tap lifts a bottom-sheet scroll-wheel of the
 * twelve 时辰. The wheel leans old-almanac (古朴): a large ink branch glyph
 * with its clock range beneath, so picking a 时辰 feels ceremonial rather than
 * like ticking a grid cell.
 *
 * 时辰 is a required field (it drives the 八字 hour pillar); the host decides
 * how to mark that. Encoding matches `ShichenPicker`: 0 = 子 … 11 = 亥.
 */

import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import type { ShichenIndex } from '../ShichenPicker'

interface Shichen {
  readonly index: ShichenIndex
  readonly branch: string
  readonly range: string
}

const SHICHEN: ReadonlyArray<Shichen> = [
  { index: 0, branch: '子', range: '23:00 – 01:00' },
  { index: 1, branch: '丑', range: '01:00 – 03:00' },
  { index: 2, branch: '寅', range: '03:00 – 05:00' },
  { index: 3, branch: '卯', range: '05:00 – 07:00' },
  { index: 4, branch: '辰', range: '07:00 – 09:00' },
  { index: 5, branch: '巳', range: '09:00 – 11:00' },
  { index: 6, branch: '午', range: '11:00 – 13:00' },
  { index: 7, branch: '未', range: '13:00 – 15:00' },
  { index: 8, branch: '申', range: '15:00 – 17:00' },
  { index: 9, branch: '酉', range: '17:00 – 19:00' },
  { index: 10, branch: '戌', range: '19:00 – 21:00' },
  { index: 11, branch: '亥', range: '21:00 – 23:00' },
]

const ITEM_H = 56
// 5 visible rows — the centred slot plus two neighbours each side. Larger rows
// (vs the 36px date wheels) so the branch glyph reads big and the almanac feel
// lands.
const VISIBLE = 5
const WHEEL_H = ITEM_H * VISIBLE

export interface ShichenFieldLabels {
  /** Summary placeholder when nothing is picked (e.g. '选择时辰'). */
  placeholder: string
  /** Sheet title — the almanac framing (e.g. '十二时辰'). */
  title: string
  /** Confirm CTA (e.g. '完成'). */
  done: string
  /** a11y label for the open-picker affordance. Falls back to `done`. */
  openPicker?: string
}

export interface ShichenFieldProps {
  /** Current selection (0-11) or null for unset. */
  value: ShichenIndex | null
  /** Fires when the user confirms a 时辰. */
  onChange: (index: ShichenIndex) => void
  /** Brand accent for the selection band + confirm CTA. */
  accent: string
  labels: ShichenFieldLabels
}

export function ShichenField({ value, onChange, accent, labels }: ShichenFieldProps) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  // Draft index while the sheet is open — only committed on confirm so a
  // mistaken flick doesn't change the answer behind the user.
  const [draft, setDraft] = useState<ShichenIndex>(value ?? 0)

  const selected = value != null ? SHICHEN[value] : null

  const openSheet = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    setDraft(value ?? 0)
    setOpen(true)
  }

  const confirm = () => {
    setOpen(false)
    onChange(draft)
  }

  return (
    <View>
      {/* Compact summary row — mirrors BirthDateField's input line. */}
      <Pressable
        onPress={openSheet}
        accessibilityRole='button'
        accessibilityLabel={labels.openPicker ?? labels.done}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
          paddingVertical: 10,
        }}
      >
        {selected ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flex: 1, gap: 8 }}>
            <Text style={{ fontSize: 18, color: colors.text, fontWeight: '500' }}>
              {`${selected.branch}时`}
            </Text>
            <Text style={{ fontSize: 13, color: colors.secondary }}>{selected.range}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 16, color: colors.dim, flex: 1 }}>{labels.placeholder}</Text>
        )}
        <ShichenGlyph color={colors.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.scrim }}
          onPress={() => setOpen(false)}
          accessibilityRole='button'
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
          }}
        >
          {/* Sheet header — almanac title left, confirm right. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: colors.secondary, fontSize: 13, letterSpacing: 3 }}>
              {labels.title}
            </Text>
            <Pressable onPress={confirm} hitSlop={12} accessibilityRole='button'>
              <Text style={{ color: accent, fontSize: 15, fontWeight: '600', paddingVertical: 8 }}>
                {labels.done}
              </Text>
            </Pressable>
          </View>

          <ShichenWheel value={draft} onChange={setDraft} accent={accent} />
        </View>
      </Modal>
    </View>
  )
}

/** Single-column 时辰 scroll-wheel — branch glyph (big) + clock range. */
function ShichenWheel({
  value,
  onChange,
  accent,
}: {
  value: ShichenIndex
  onChange: (idx: ShichenIndex) => void
  accent: string
}) {
  const { colors } = useTheme()
  const pad = ITEM_H * Math.floor(VISIBLE / 2)

  return (
    <View style={{ height: WHEEL_H, position: 'relative' }}>
      {/* Centre selection band. */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: pad,
          left: 0,
          right: 0,
          height: ITEM_H,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: accent,
          backgroundColor: `${accent}1A`,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate='fast'
        contentOffset={{ x: 0, y: value * ITEM_H }}
        contentContainerStyle={{ paddingVertical: pad }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
          const clamped = Math.max(0, Math.min(SHICHEN.length - 1, idx)) as ShichenIndex
          if (clamped !== value) {
            void Haptics.selectionAsync().catch(() => undefined)
            onChange(clamped)
          }
        }}
      >
        {SHICHEN.map((s, i) => {
          const distance = Math.abs(i - value)
          const center = distance === 0
          const opacity = center ? 1 : distance === 1 ? 0.55 : 0.28
          return (
            <View
              key={s.index}
              style={{
                height: ITEM_H,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                opacity,
              }}
            >
              <Text
                style={{
                  fontSize: center ? 30 : 26,
                  color: center ? colors.text : colors.secondary,
                  fontWeight: '400',
                }}
              >
                {`${s.branch}时`}
              </Text>
              <Text style={{ fontSize: 13, color: colors.secondary, fontWeight: '300' }}>
                {s.range}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** Tiny 3-row "wheel" glyph — the open affordance (matches BirthDateField). */
function ShichenGlyph({ color }: { color: string }) {
  const edge = { width: 14, height: 1.5, borderRadius: 1, backgroundColor: color, opacity: 0.5 }
  return (
    <View style={{ gap: 2.5, alignItems: 'center', paddingLeft: 8 }}>
      <View style={edge} />
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={edge} />
    </View>
  )
}

/** Per-locale default labels — apps can override any field. */
export function shichenFieldLabelsForLocale(locale: string): ShichenFieldLabels {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') {
    return { placeholder: '選擇時辰', title: '十二時辰', done: '完成', openPicker: '開啟選擇器' }
  }
  if (locale.startsWith('zh')) {
    return { placeholder: '选择时辰', title: '十二时辰', done: '完成', openPicker: '打开选择器' }
  }
  if (locale.startsWith('ja')) {
    return { placeholder: '時辰を選ぶ', title: '十二時辰', done: '完了', openPicker: 'ピッカーを開く' }
  }
  return {
    placeholder: 'Pick a 时辰',
    title: 'Twelve 时辰',
    done: 'Done',
    openPicker: 'Open picker',
  }
}
