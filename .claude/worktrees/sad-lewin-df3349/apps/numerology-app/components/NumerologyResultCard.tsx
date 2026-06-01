/**
 * NumerologyResultCard — single-number display row used on /result.
 *
 * Hairline-bordered, large numeral on the left, label/sub on the right.
 * Master numbers (11, 22, 33) get a small inline tag so users notice them.
 */

import { Text, View } from 'react-native'
import { useAppTheme } from '@/lib/theme'

const MASTER = new Set([11, 22, 33])

interface Props {
  label: string
  sub: string
  n: number
  masterLabel: string
}

export function NumerologyResultCard({ label, sub, n, masterLabel }: Props) {
  const { colors } = useAppTheme()
  const isMaster = MASTER.has(n)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 0.5,
        borderColor: colors.separator,
      }}
    >
      <View style={{ width: 56, alignItems: 'center' }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 36,
            fontWeight: '500',
            letterSpacing: 0.4,
          }}
        >
          {n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
          {isMaster ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 0.5,
                borderColor: colors.text,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 9, letterSpacing: 1.4 }}>
                {masterLabel.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>{sub}</Text>
      </View>
    </View>
  )
}
