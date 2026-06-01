/** Runtime probe for WebGL via expo-gl (dev client / bare workflow). */

export function canUseExpoGl(): boolean {
  try {
    // Metro resolves optional native module at bundle time.
    require('expo-gl')
    return true
  } catch {
    return false
  }
}
