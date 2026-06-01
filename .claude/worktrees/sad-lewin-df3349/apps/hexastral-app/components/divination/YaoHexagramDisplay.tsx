/**
 * ☯ YaoHexagramDisplay — 六爻卦象渐进显示 · Ink Brutalism
 *
 * 从初爻（底）到上爻（顶）逐爻显示，每爻落定后从下方弹入。
 *
 * 爻型及含义：
 *   9 老阳(─✕─)  7 少阳(───)  8 少阴(─ ─)  6 老阴(─○─)
 *
 * 传统六爻爻位：初爻(一)→上爻(六)，由下至上读
 */

import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { YaoResult } from '@/lib/ux/useShakeDivination'
import type { TranslationKeys } from '@/locales/zh'

// ── 爻位名称 i18n 键 ─────────────────────────────────────────────────────────
const YAO_NAME_KEYS: [
  TranslationKeys,
  TranslationKeys,
  TranslationKeys,
  TranslationKeys,
  TranslationKeys,
  TranslationKeys,
] = [
  'yiching_yao_name_1',
  'yiching_yao_name_2',
  'yiching_yao_name_3',
  'yiching_yao_name_4',
  'yiching_yao_name_5',
  'yiching_yao_name_6',
]

const LINE_HEIGHT = 5
const LINE_WIDTH = 110

/** 单条爻线 */
interface YaoLineProps {
  result: YaoResult | null
  yaoIndex: 0 | 1 | 2 | 3 | 4 | 5
  isLatest: boolean
}

function YaoLine({ result, yaoIndex, isLatest }: YaoLineProps) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const enterAnim = useRef(new Animated.Value(0)).current
  const prevResult = useRef<YaoResult | null>(null)

  useEffect(() => {
    if (result && !prevResult.current) {
      Animated.spring(enterAnim, {
        toValue: 1,
        tension: 160,
        friction: 10,
        useNativeDriver: true,
      }).start()
    } else if (!result) {
      enterAnim.setValue(0)
    }
    prevResult.current = result
  }, [result, enterAnim.setValue, enterAnim])

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  })

  const lineColor = !result
    ? `${colors.textSecondary}15`
    : result.total === 6 || result.total === 9
      ? colors.accent
      : isLatest
        ? colors.text
        : `${colors.text}60`

  const labelColor = !result
    ? `${colors.textSecondary}30`
    : isLatest
      ? colors.accent
      : `${colors.textSecondary}80`

  if (!result) {
    return (
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}
      >
        <Text
          style={{
            fontSize: 10,
            color: labelColor,
            letterSpacing: 1,
            width: 28,
            textAlign: 'right',
            fontWeight: '300',
          }}
        >
          {t(YAO_NAME_KEYS[yaoIndex])}
        </Text>
        <View style={{ width: LINE_WIDTH, height: LINE_HEIGHT, backgroundColor: lineColor }} />
        <View style={{ width: 14 }} />
      </View>
    )
  }

  const isChanging = result.total === 6 || result.total === 9
  const isYang = result.total === 7 || result.total === 9

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'center',
        opacity: enterAnim,
        transform: [{ translateY }],
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: labelColor,
          letterSpacing: 1,
          width: 28,
          textAlign: 'right',
          fontWeight: isLatest ? '500' : '300',
        }}
      >
        {t(YAO_NAME_KEYS[yaoIndex])}
      </Text>

      <View
        style={{
          width: LINE_WIDTH,
          alignItems: 'center',
          justifyContent: 'center',
          height: LINE_HEIGHT + 14,
        }}
      >
        {isYang ? (
          <View
            style={{
              width: LINE_WIDTH,
              height: LINE_HEIGHT,
              backgroundColor: lineColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {result.total === 9 && (
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '600',
                  color: colors.background,
                  lineHeight: LINE_HEIGHT + 4,
                }}
              >
                ✕
              </Text>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', width: LINE_WIDTH, gap: 0 }}>
            <View style={{ flex: 1, height: LINE_HEIGHT, backgroundColor: lineColor }} />
            <View style={{ width: 18, alignItems: 'center', justifyContent: 'center' }}>
              {result.total === 6 && (
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '600',
                    color: lineColor,
                    lineHeight: LINE_HEIGHT + 4,
                  }}
                >
                  ○
                </Text>
              )}
            </View>
            <View style={{ flex: 1, height: LINE_HEIGHT, backgroundColor: lineColor }} />
          </View>
        )}
      </View>

      <Text
        style={{
          fontSize: 10,
          color: isChanging ? colors.accent : `${colors.textSecondary}50`,
          width: 14,
          textAlign: 'left',
          fontWeight: isChanging ? '600' : '300',
        }}
      >
        {result.total}
      </Text>
    </Animated.View>
  )
}

// ── 主组件 ──────────────────────────────────────────────────────────────────

interface YaoHexagramDisplayProps {
  yaoResults: YaoResult[]
  latestYaoIndex?: number
  /** Compact mode for result phase — no header, tighter spacing */
  compact?: boolean
}

export function YaoHexagramDisplay({
  yaoResults,
  latestYaoIndex = -1,
  compact = false,
}: YaoHexagramDisplayProps) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const displayOrder = [5, 4, 3, 2, 1, 0] as const

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: compact ? 12 : 16,
        paddingHorizontal: 20,
        backgroundColor: colors.inkWash,
        borderWidth: 0.5,
        borderColor: colors.border,
        minWidth: 240,
      }}
    >
      {!compact && (
        <Text
          style={{
            fontSize: 10,
            color: `${colors.textSecondary}60`,
            letterSpacing: 6,
            marginBottom: 14,
            textTransform: 'uppercase',
            fontWeight: '300',
          }}
        >
          {t('yiching_hex_header')}
        </Text>
      )}

      <View style={{ gap: compact ? 6 : 10, width: '100%', alignItems: 'center' }}>
        {displayOrder.map((yaoIndex) => (
          <YaoLine
            key={yaoIndex}
            result={yaoResults[yaoIndex] ?? null}
            yaoIndex={yaoIndex}
            isLatest={yaoIndex === latestYaoIndex}
          />
        ))}
      </View>

      {yaoResults.length === 6 && (
        <Text
          style={{
            fontSize: 10,
            color: `${colors.accent}80`,
            marginTop: 12,
            letterSpacing: 2,
            fontWeight: '300',
          }}
        >
          {yaoResults.filter((r) => r.total === 6 || r.total === 9).length > 0
            ? t('yiching_hex_changing')
            : t('yiching_hex_static')}
        </Text>
      )}
    </View>
  )
}
