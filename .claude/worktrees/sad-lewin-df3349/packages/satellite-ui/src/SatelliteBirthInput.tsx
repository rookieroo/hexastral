import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export interface SatelliteBirthInputValue {
  solarDate: string
  timeIndex: number
  city?: string
}

export interface SatelliteBirthInputProps {
  value: SatelliteBirthInputValue
  onChange: (value: SatelliteBirthInputValue) => void
  showCity?: boolean
}

export function SatelliteBirthInput(props: SatelliteBirthInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Solar Date</Text>
      <TextInput
        placeholder='YYYY-MM-DD'
        placeholderTextColor={darkTokens.dim}
        value={props.value.solarDate}
        onChangeText={(solarDate) => props.onChange({ ...props.value, solarDate })}
        style={styles.input}
      />
      <Text style={styles.label}>Time Index (0-12)</Text>
      <TextInput
        placeholder='0'
        placeholderTextColor={darkTokens.dim}
        value={String(props.value.timeIndex)}
        onChangeText={(raw) => {
          const parsed = Number.parseInt(raw, 10)
          const next = Number.isFinite(parsed) ? Math.max(0, Math.min(12, parsed)) : 0
          props.onChange({ ...props.value, timeIndex: next })
        }}
        keyboardType='number-pad'
        style={styles.input}
      />
      {props.showCity ? (
        <>
          <Text style={styles.label}>Birth City</Text>
          <TextInput
            placeholder='City'
            placeholderTextColor={darkTokens.dim}
            value={props.value.city ?? ''}
            onChangeText={(city) => props.onChange({ ...props.value, city })}
            style={styles.input}
          />
        </>
      ) : null}
      <Pressable style={styles.tip}>
        <Text style={styles.tipText}>Use local civil time. DST auto-adjust is handled server-side.</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 8 },
  label: { color: darkTokens.secondary, fontSize: 12 },
  input: {
    borderWidth: 0.5,
    borderColor: darkTokens.separator,
    borderRadius: 0,
    color: darkTokens.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tip: {
    borderLeftWidth: 2,
    borderLeftColor: darkTokens.accent,
    paddingLeft: 10,
    marginTop: 4,
  },
  tipText: { color: darkTokens.dim, fontSize: 12, lineHeight: 18 },
})
