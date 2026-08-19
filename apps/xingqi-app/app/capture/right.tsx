import { Redirect, useLocalSearchParams } from 'expo-router'

export default function CaptureRightRedirect() {
  const params = useLocalSearchParams<{ mode?: string }>()
  return (
    <Redirect
      href={{
        pathname: '/capture',
        params: { part: 'palm_r', ...(params.mode ? { mode: params.mode } : {}) },
      }}
    />
  )
}
