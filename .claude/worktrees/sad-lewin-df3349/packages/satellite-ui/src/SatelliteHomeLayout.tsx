import { darkTokens } from '@zhop/hexastral-tokens/palette'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { SatelliteAppleAuth } from './SatelliteAppleAuth'

export interface SatelliteHomeLayoutProps {
  title: string
  subtitle: string
  storagePrefix: string
  targetApp: string
  apiBaseOverride?: string
  featureCta: ReactNode
  children?: ReactNode
}

export function SatelliteHomeLayout(props: SatelliteHomeLayoutProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.subtitle}>{props.subtitle}</Text>
      <View style={styles.cta}>{props.featureCta}</View>
      <SatelliteAppleAuth
        storagePrefix={props.storagePrefix}
        targetApp={props.targetApp}
        apiBaseOverride={props.apiBaseOverride}
      />
      {props.children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: darkTokens.bg,
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: '600', color: darkTokens.text },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: darkTokens.secondary,
    maxWidth: 320,
  },
  cta: { marginTop: 8 },
})
