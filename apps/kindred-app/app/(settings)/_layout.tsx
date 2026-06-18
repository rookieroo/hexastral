import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

// DO NOT add `unstable_settings = { initialRouteName: 'index' }` here.
// `(settings)/index` resolves to the bare path `/` (group segments are stripped),
// same as app/index.tsx (the onboarding gatekeeper), (reading)/index and
// (timeline)/index. Anchoring this group on its index marks (settings)/index as the
// initial route, which gives it priority in Expo Router's empty-path resolver
// (matchForEmptyPath). On a cold reload, getStateFromPath('/') runs with no previous
// segments, so the anchor wins and the app boots into Settings instead of running
// app/index.tsx → home. (A root anchor pointed at the gatekeeper `index` would also
// fix the boot, but it parks a dormant Redirect beneath every screen — we keep the
// router anchor-free instead.)
//
// Trade-off accepted: glossary / 命理词典 opened from the HOME footer now pops back to
// home, not Settings (there's no Settings index beneath it). Opened from WITHIN
// Settings they still pop back to Settings — the index is already in the stack.

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Shared 宣纸 document layer — same surface as the reading + paywall.
        contentStyle: { backgroundColor: kindredPaper.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
        // Edge-only back-swipe (NOT full-screen): the glossary + settings are long
        // vertical scrolls, and a full-screen back-swipe fired on an up-flick that
        // drifted sideways — and dismissed the whole group to home instead of popping
        // one screen. Edge-only requires a deliberate left-edge horizontal intent;
        // an up-swipe is never mistaken for it.
        //
        // glossary + 命理词典 inherit this edge-only swipe (re-enabled 2026-06; they
        // were briefly button-only). Opened from the HOME footer the left-edge swipe
        // pops straight back to home — there's no settings index beneath them (see the
        // anchor note above). Edge-only is the key: a left-edge start never contends
        // with these long ScrollViews, so swipe-back works AND scrolling stays smooth.
        // The ← button on each screen still exits too.
        fullScreenGestureEnabled: false,
      }}
    />
  )
}
