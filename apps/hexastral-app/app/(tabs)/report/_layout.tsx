import { Stack } from 'expo-router'

export default function ReportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        presentation: 'card',
      }}
    />
  )
}
