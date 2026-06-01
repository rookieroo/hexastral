/**
 * Entry — Cycle is anonymous-first (ADR-0010 Tier 3): no sign-in gate, no
 * onboarding wall. Boot straight into Today.
 */

import { Redirect } from 'expo-router'

export default function EntryScreen() {
  return <Redirect href='/(tabs)' />
}
