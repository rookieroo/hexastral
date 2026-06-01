import { Text, View } from 'react-native'
import type { ZiweiScenarioColors } from './types'

interface Props {
  title: string
  content: string
  colors: ZiweiScenarioColors
}

export function InterpretationCard({ title, content, colors }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 0,
        padding: 16,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{content}</Text>
    </View>
  )
}
