import { useTheme } from '@zhop/core-ui'
import { View } from 'react-native'

export function SheetHandle() {
  const { colors } = useTheme()

  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10 }}>
      <View
        style={{
          width: 42,
          height: 5,
          borderRadius: 999,
          backgroundColor: colors.separator,
        }}
      />
    </View>
  )
}
