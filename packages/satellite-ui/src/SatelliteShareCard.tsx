import { darkTokens } from '@zhop/hexastral-tokens/palette'
import * as Haptics from 'expo-haptics'
import * as Sharing from 'expo-sharing'
import type { RefObject } from 'react'
import { Pressable, StyleSheet, Text, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

export interface SatelliteShareCardProps {
  cardRef: RefObject<View | null>
  title: string
}

export function SatelliteShareCard(props: SatelliteShareCardProps) {
  return (
    <Pressable
      style={styles.btn}
      onPress={async () => {
        const uri = await captureRef(props.cardRef, { format: 'png', quality: 0.95 })
        if (!(await Sharing.isAvailableAsync())) return
        await Haptics.selectionAsync()
        await Sharing.shareAsync(uri, { dialogTitle: props.title })
      }}
      accessibilityRole='button'
    >
      <Text style={styles.text}>Share Card</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 0.5,
    borderColor: darkTokens.separator,
    borderRadius: 0,
    backgroundColor: darkTokens.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  text: { color: darkTokens.text, fontSize: 14, fontWeight: '500' },
})
