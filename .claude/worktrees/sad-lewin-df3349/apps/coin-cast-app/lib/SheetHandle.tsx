import { View } from 'react-native'

export function SheetHandle() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10 }}>
      <View
        style={{
          width: 42,
          height: 5,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.5)',
        }}
      />
    </View>
  )
}
