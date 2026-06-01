import { Text, View } from 'react-native'
import type { PalmfaceScenarioPalette } from './types'

export type PalmfaceResultStrings = {
  featuresTitle: string
}

export function PalmfaceFeatureList({
  features,
  strings,
  palette,
}: {
  features: Record<string, string>
  strings: PalmfaceResultStrings
  palette: PalmfaceScenarioPalette
}) {
  const entries = Object.entries(features)
  if (entries.length === 0) return null
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>{strings.featuresTitle}</Text>
      {entries.map(([region, line]) => (
        <View
          key={region}
          style={{
            borderWidth: 0.5,
            borderColor: palette.border,
            padding: 12,
            backgroundColor: palette.card,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: palette.accent, marginBottom: 4 }}>
            {region}
          </Text>
          <Text style={{ fontSize: 14, color: palette.text, lineHeight: 20 }}>{line}</Text>
        </View>
      ))}
    </View>
  )
}
