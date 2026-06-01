/**
 * useHaptic — thin wrapper around expo-haptics with named presets.
 *
 * Apps shouldn't import expo-haptics directly; this gives us a single place
 * to disable haptics globally (e.g. on web) or swap implementations.
 *
 * For worklet-driven code (Reanimated `runOnJS(...)` callbacks), use the
 * non-hook `triggerHaptic` helper exported below — hooks can't be called
 * from a worklet.
 */

import * as Haptics from 'expo-haptics'
import { useCallback } from 'react'
import { Platform } from 'react-native'

export type HapticPreset =
  | 'light' // routine taps, form-field focus
  | 'medium' // primary CTA press
  | 'heavy' // commits, share, share-out
  | 'success' // success notification
  | 'warning' // soft warning
  | 'error' // error notification
  | 'selection' // wheel-picker, segmented-control change

/**
 * Non-hook haptic trigger. Safe to call from any execution context, including
 * a `runOnJS(...)` callback inside a Reanimated worklet. Use `useHaptic()`
 * inside React components when possible — this is the escape hatch.
 */
export async function triggerHaptic(preset: HapticPreset): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    switch (preset) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        break
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        break
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        break
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        break
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        break
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        break
      case 'selection':
        await Haptics.selectionAsync()
        break
    }
  } catch {
    // Haptics may not be available (e.g. simulator, Expo Go missing native module).
    // Fail silently — this is a polish layer, not critical.
  }
}

export function useHaptic() {
  return useCallback((preset: HapticPreset) => triggerHaptic(preset), [])
}
