import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

type NativeEventSource = 'ios' | 'android'

interface FreshEventEnvelope {
  event_id: string
  occurred_at_ms: number
  source: NativeEventSource
  anonymous_id?: string
  target_app?: string
  surface?: string
}

/** Build base fields shared by outbound satellite funnel events */
export function freshEventEnvelope(options: {
  anonymousId?: string | null
  targetApp?: string | null
  surface?: string | null
}): FreshEventEnvelope {
  const source = Platform.OS === 'android' ? 'android' : 'ios'
  return {
    event_id: Crypto.randomUUID().replace(/-/g, ''),
    occurred_at_ms: Date.now(),
    source,
    anonymous_id: options.anonymousId ?? undefined,
    target_app: options.targetApp ?? undefined,
    surface: options.surface ?? undefined,
  }
}
