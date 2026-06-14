/**
 * ShichenField — collapsed 十二时辰 entry.
 *
 * The inline 12-cell grid eats a lot of vertical space on a birth form, so this
 * keeps the time field to ONE compact summary line (same habit as
 * `BirthDateField`) and only on tap lifts a bottom-sheet `ShichenPicker` grid of
 * the twelve 时辰. (It used a scroll-wheel here, but RN couldn't match a native
 * UIPickerView — it dropped frames on-device — so the sheet shows the
 * tap-to-pick grid instead: instant, no scroll jank.)
 *
 * 时辰 is a required field (it drives the 八字 hour pillar); the host decides
 * how to mark that. Encoding matches `ShichenPicker`: 0 = 子 … 11 = 亥.
 */

import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { type ShichenIndex, ShichenPicker } from '../ShichenPicker'
import { shichenDisplay, shichenRange } from '../shichen-i18n'
import { SHICHEN } from './ShichenWheel'

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
  /**
   * BCP-47 locale. Latin scripts (e.g. 'en') show 「Rat · 子」+ range instead of
   * the opaque 「子时」; CJK / unset keeps the Chinese label. See shichen-i18n.
   */
  locale?: string
}

export function ShichenField({ value, onChange, accent, labels, locale }: ShichenFieldProps) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  // Draft index while the sheet is open — only committed on confirm so a
  // mistaken flick doesn't change the answer behind the user.
  const [draft, setDraft] = useState<ShichenIndex>(value ?? 0)

  const selected = value != null ? SHICHEN[value] : null
  const selectedDisp = selected ? shichenDisplay(selected.index, selected.branch, locale) : null

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
        {selected && selectedDisp ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flex: 1, gap: 8 }}>
            <Text
              style={{
                fontSize: selectedDisp.cjk ? 18 : 16,
                color: colors.text,
                fontWeight: '500',
              }}
            >
              {selectedDisp.cjk ? selectedDisp.cjkLabel : selectedDisp.latinSub}
            </Text>
            <Text style={{ fontSize: 13, color: colors.secondary }}>
              {shichenRange(selected.range, locale)}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 16, color: colors.dim, flex: 1 }}>{labels.placeholder}</Text>
        )}
        <ShichenGlyph color={colors.secondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType='slide'
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop is transparent — the half-screen above the sheet stays fully
            visible (no grey scrim in either light or dark, 2026-06 feedback). It
            still catches taps to dismiss; the sheet separates by its own shadow +
            grab handle instead of a dimming overlay. */}
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole='button' />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderTopWidth: 0.5,
            borderColor: colors.separator,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 28,
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -6 },
            elevation: 24,
          }}
        >
          {/* Grab handle — native-sheet affordance + visual separation from the
              undimmed content behind. */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.separator,
              marginBottom: 8,
            }}
          />
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

          {/* A 12-cell 时辰 grid — replaced the scroll-wheel, which dropped frames
              on-device (RN can't match a native UIPickerView here). Tapping a cell
              commits immediately + closes; no scroll, no jank. */}
          {open ? (
            <ShichenPicker
              value={draft}
              onChange={(idx) => {
                setDraft(idx)
                onChange(idx)
                setOpen(false)
              }}
              onSelect={() => {
                void Haptics.selectionAsync().catch(() => undefined)
              }}
              accentColor={accent}
              locale={locale}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  )
}

/** Tiny 2×2 grid glyph — the affordance opens a 时辰 GRID (not a wheel), so the
 *  icon now signals a grid rather than a scroll-wheel (2026-06 feedback). */
function ShichenGlyph({ color }: { color: string }) {
  const cell = {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    borderWidth: 1.2,
    borderColor: color,
    opacity: 0.7,
  }
  return (
    <View style={{ gap: 3, paddingLeft: 8 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={cell} />
        <View style={cell} />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={cell} />
        <View style={cell} />
      </View>
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
    return {
      placeholder: '時辰を選ぶ',
      title: '十二時辰',
      done: '完了',
      openPicker: 'ピッカーを開く',
    }
  }
  return {
    placeholder: 'Pick your birth hour',
    title: 'The twelve hours',
    done: 'Done',
    openPicker: 'Open picker',
  }
}
