/**
 * Oracle Reading — full-screen stack push from the Oracle (卦) tab.
 *
 * Wraps the YiChing divination screen under a stack presentation so
 * iOS swipe-back (right-edge gesture) naturally returns to the Oracle tab.
 *
 * Route: /oracle-reading?question=<question text>
 */

import { Stack } from 'expo-router'
import YiChingScreen from '../(tabs)/yiching'

export default function OracleReadingScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <YiChingScreen />
    </>
  )
}
