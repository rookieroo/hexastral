/**
 * Store builds ship without IAP until banking / Paid Apps Agreement is ready.
 * Set `EXPO_PUBLIC_IAP_ENABLED=true` to enable RevenueCat purchase UI.
 */
export function isIapEnabled(): boolean {
  return process.env.EXPO_PUBLIC_IAP_ENABLED === 'true'
}
