/**
 * SealNumeral — 碑拓 chapter seal holding the chapter number.
 *
 * Yuel marks each chapter with a carved stone numeral; feng's is a 朱砂 seal
 * (印章) on the 宣纸 ground — a cinnabar rounded square with the number carved in
 * rice-paper white, plus the chapter's 风水 glyph label beneath. Pure View/Text
 * (no Skia). The number uses Chinese numerals to stay in the classical register.
 */

import { Text, View } from 'react-native'
import { FENG_PALETTE } from '@/lib/theme'

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

interface SealNumeralProps {
  n: number
  size?: number
}

export function SealNumeral({ n, size = 44 }: SealNumeralProps) {
  return (
    <View
      accessibilityRole='image'
      accessibilityLabel={`Chapter ${n}`}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: FENG_PALETTE.cinnabar,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text
        style={{
          color: FENG_PALETTE.rice,
          fontSize: size * 0.5,
          fontWeight: '700',
          lineHeight: size * 0.58,
        }}
      >
        {CN_NUM[n] ?? n}
      </Text>
    </View>
  )
}
