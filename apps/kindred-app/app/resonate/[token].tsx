/**
 * /resonate/[token] — Universal Link landing path (HTTPS share URL).
 *
 * In-app route tree only has /accept/[token]. Belt-and-suspenders Redirect so
 * AirDrop / Messages UL still works if +native-intent rewrite is skipped.
 */

import { Redirect, useLocalSearchParams } from 'expo-router'

export default function ResonateRedirect() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const t = typeof token === 'string' ? token : Array.isArray(token) ? token[0] : ''
  if (!t) return <Redirect href='/(reading)' />
  return <Redirect href={{ pathname: '/accept/[token]', params: { token: t } }} />
}
