/**
 * HexagramCard — render the 6-line hexagram with upper/lower trigram labels
 * and the changing-line marker. Yang ━━━━━━ vs Yin ━━ ━━; changing line is
 * highlighted with the accent color.
 *
 * Lines arrive bottom→top (index 0 = 初爻, index 5 = 上爻) per 梅花 convention.
 */

import { useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'
import { useAppTheme } from '@/lib/theme'

const TRIGRAM_NAME: Record<number, string> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
}

const TRIGRAM_SYMBOL: Record<number, string> = {
  1: '☰',
  2: '☱',
  3: '☲',
  4: '☳',
  5: '☴',
  6: '☵',
  7: '☶',
  8: '☷',
}

interface Props {
  lines: number[]
  changingLines: number[]
  upperNumber: number
  lowerNumber: number
  upperLabel: string
  lowerLabel: string
  changingLabel: string
}

export function HexagramCard({
  lines,
  changingLines,
  upperNumber,
  lowerNumber,
  upperLabel,
  lowerLabel,
  changingLabel,
}: Props) {
  const { colors } = useAppTheme()
  const { spacing } = useTheme()
  const changing = new Set(changingLines)
  // Render top→bottom (上爻 first) for visual hexagram convention.
  const visualLines = [...lines].reverse().map((value, idx) => ({
    value,
    changing: changing.has(5 - idx),
  }))

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.separator,
        padding: spacing.xl,
        gap: spacing.md,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TrigramHead
          symbol={TRIGRAM_SYMBOL[upperNumber] ?? '?'}
          name={TRIGRAM_NAME[upperNumber] ?? '?'}
          label={upperLabel}
        />
        <TrigramHead
          symbol={TRIGRAM_SYMBOL[lowerNumber] ?? '?'}
          name={TRIGRAM_NAME[lowerNumber] ?? '?'}
          label={lowerLabel}
        />
      </View>

      <View style={{ gap: 8, paddingVertical: spacing.lg, alignSelf: 'center' }}>
        {visualLines.map((line, idx) => (
          <Line
            key={`${idx}-${line.value}-${line.changing ? 'c' : ''}`}
            yang={line.value === 1}
            changing={line.changing}
            accent={colors.accent}
            text={colors.text}
          />
        ))}
      </View>

      {changingLines.length > 0 && (
        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {changingLabel} · {changingLines.map((i) => i + 1).join(', ')}
        </Text>
      )}
    </View>
  )
}

function TrigramHead({ symbol, name, label }: { symbol: string; name: string; label: string }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36 }}>{symbol}</Text>
      <Text style={{ color: colors.text, fontSize: 14 }}>{name}</Text>
      <Text
        style={{
          color: colors.secondary,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function Line({
  yang,
  changing,
  accent,
  text,
}: {
  yang: boolean
  changing: boolean
  accent: string
  text: string
}) {
  const color = changing ? accent : text
  if (yang) {
    return (
      <View
        style={{
          width: 140,
          height: 6,
          backgroundColor: color,
        }}
      />
    )
  }
  // yin: two segments with gap
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 64, height: 6, backgroundColor: color }} />
      <View style={{ width: 64, height: 6, backgroundColor: color }} />
    </View>
  )
}
