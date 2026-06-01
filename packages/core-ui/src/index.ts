/**
 * @zhop/core-ui — shared UI primitives for HexAstral apps.
 *
 * Phase F mandate (per docs/phase-f-plan.md §2): every flagship and satellite
 * consumes these primitives. No parallel `theme.ts` files. No app-local
 * Button / Card / Input definitions.
 *
 * Quick start:
 *
 *   import { CoreUIProvider, Button, Card, useTheme } from '@zhop/core-ui'
 *
 *   <CoreUIProvider brand="feng" mode="dark">
 *     <App />
 *   </CoreUIProvider>
 *
 *   // inside any component:
 *   const { colors, spacing } = useTheme()
 *   <Button variant="primary" onPress={...}>Submit</Button>
 */

export * from './components'
export * from './hooks'
export * from './motion'
export * from './theme'
