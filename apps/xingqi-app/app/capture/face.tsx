import { Redirect, useLocalSearchParams } from 'expo-router'

export default function CaptureFaceRedirect() {
  const params = useLocalSearchParams<{ mode?: string }>()
  return (
    <Redirect
      href={{
        pathname: '/capture',
        params: { part: 'face', ...(params.mode ? { mode: params.mode } : {}) },
      }}
    />
  )
}
