import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface SatelliteBirthSummary {
  birthSolarDate?: string
  birthTimeIndex?: number
  gender?: string
  birthCity?: string
}

export interface SatelliteBirthSummaryCardProps {
  summary: SatelliteBirthSummary | null
  onEdit?: () => void
}

function formatTimeIndex(timeIndex?: number): string {
  if (typeof timeIndex !== 'number') return '-'
  if (timeIndex === 0) return '23:00-01:00'
  if (timeIndex === 12) return '21:00-23:00'
  const start = timeIndex * 2 - 1
  const end = start + 2
  return `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`
}

export function SatelliteBirthSummaryCard(props: SatelliteBirthSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Birth Profile</Text>
      <Text style={styles.line}>Date: {props.summary?.birthSolarDate ?? '-'}</Text>
      <Text style={styles.line}>Time: {formatTimeIndex(props.summary?.birthTimeIndex)}</Text>
      <Text style={styles.line}>Gender: {props.summary?.gender ?? '-'}</Text>
      <Text style={styles.line}>City: {props.summary?.birthCity ?? '-'}</Text>
      {props.onEdit ? (
        <Pressable style={styles.button} onPress={props.onEdit}>
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkTokens.card,
    borderColor: darkTokens.separator,
    borderWidth: 0.5,
    padding: 16,
    gap: 8,
  },
  title: {
    color: darkTokens.text,
    fontSize: 16,
    fontWeight: '600',
  },
  line: {
    color: darkTokens.secondary,
    fontSize: 13,
  },
  button: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: darkTokens.separator,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: darkTokens.text,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
})
