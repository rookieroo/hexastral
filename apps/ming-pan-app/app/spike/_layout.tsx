import { Stack } from 'expo-router'

/** Spike routes — no satellite-ui imports; safe before native rebuild. */
export default function SpikeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
  )
}
