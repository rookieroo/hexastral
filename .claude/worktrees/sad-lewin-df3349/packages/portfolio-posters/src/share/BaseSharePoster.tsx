import { darkTokens } from '@zhop/hexastral-tokens/palette'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import ViewShot from 'react-native-view-shot'

export interface BaseSharePosterProps {
  title: string
  subtitle?: string
  shareUrl: string
  ornament?: ReactNode
  children?: ReactNode
}

export function BaseSharePoster(props: BaseSharePosterProps): ReactElement {
  return (
    <ViewShot
      options={{ format: 'png', quality: 1 }}
      style={{
        width: 360,
        height: 640,
        backgroundColor: darkTokens.bg,
        padding: 24,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: 10 }}>
        <Text style={{ color: darkTokens.secondary, letterSpacing: 2.5, fontSize: 10, fontWeight: '600' }}>
          HEXASTRAL
        </Text>
        <Text style={{ color: darkTokens.text, fontSize: 30, fontWeight: '300', letterSpacing: 1.5 }}>
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text style={{ color: darkTokens.secondary, fontSize: 14, lineHeight: 22 }}>{props.subtitle}</Text>
        ) : null}
        {props.ornament ? <View>{props.ornament}</View> : null}
      </View>

      <View style={{ gap: 12 }}>
        {props.children}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ color: darkTokens.dim, fontSize: 10, letterSpacing: 2 }}>SCAN FOR FULL REPORT</Text>
          <QRCode value={props.shareUrl} size={64} color={darkTokens.text} backgroundColor='transparent' />
        </View>
      </View>
    </ViewShot>
  )
}
