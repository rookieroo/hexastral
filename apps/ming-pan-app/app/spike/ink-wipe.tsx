/**
 * Ink Wipe Reveal Spike — validates @zhop/core-ui/motion InkWipeReveal.
 *
 * Stage: a "report" (paper bg + content) sits beneath; an overlay covers it
 * with the dark "home" colour. On trigger, the ink hole grows from the CTA
 * position and reveals the report. Matches HTML POC goWipe().
 *
 * Route: /spike/ink-wipe
 */

import { InkWipeReveal } from '@zhop/core-ui/motion'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const PHONE_W = 320
const PHONE_H = 680
// HTML POC origin (160, 606) is roughly the CTA at the bottom of home.
const ORIGIN = { x: PHONE_W / 2, y: PHONE_H - 74 }
const MAX_R = 820 // HTML POC

const AUTO_HOLD = 1600
const AUTO_AFTER_REVEAL = 2500

export default function InkWipeSpike() {
  const [active, setActive] = useState(false)
  const [completed, setCompleted] = useState(false)

  const reset = useCallback(() => {
    setActive(false)
    setCompleted(false)
  }, [])

  // Auto-loop: idle → reveal → wait → reset → repeat
  useEffect(() => {
    if (!active && !completed) {
      const t = setTimeout(() => setActive(true), AUTO_HOLD)
      return () => clearTimeout(t)
    }
    if (completed) {
      const t = setTimeout(reset, AUTO_AFTER_REVEAL)
      return () => clearTimeout(t)
    }
    return
  }, [active, completed, reset])

  const onTap = active ? reset : () => setActive(true)

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ink Wipe Reveal · core-ui</Text>
      <Text style={styles.sub}>revealMask + iwedge · 2.4s · origin (160, 606)</Text>

      <Pressable onPress={onTap}>
        <View style={styles.phone}>
          {/* ── REPORT (beneath) — paper bg with chart-like rows ── */}
          <View style={[styles.absFill, styles.reportBg]}>
            <View style={styles.rnav}>
              <Text style={styles.rnavBack}>◁</Text>
              <Text style={styles.rnavTitle}>命书 · 现运</Text>
              <Text style={styles.rnavBack}> </Text>
            </View>
            <View style={styles.rsect}>
              <Text style={styles.rlabel}>本命盘 · 命 · 不变</Text>
              <View style={styles.chartPlaceholder} />
            </View>
            <View style={styles.rsect}>
              <Text style={styles.rlabel}>五行旺衰 · 日主木 · 宜补金</Text>
              <View style={styles.barPlaceholder} />
              <View style={styles.barPlaceholder} />
              <View style={styles.barPlaceholder} />
            </View>
            <View style={styles.rsect}>
              <Text style={styles.rlabel}>大运 · 运 · 在变</Text>
              <View style={styles.barPlaceholder} />
            </View>
            <View style={styles.rsect}>
              <Text style={styles.rlabel}>现运 · 此章</Text>
              <Text style={styles.now}>火土得令 · 承位</Text>
              <Text style={styles.gloss}>
                立身之运（32–41）：声望渐起，可执牛耳。此运宜进取、不宜守成。
              </Text>
            </View>
          </View>

          {/* ── INK WIPE OVERLAY ── */}
          <InkWipeReveal
            active={active}
            origin={ORIGIN}
            maxRadius={MAX_R}
            width={PHONE_W}
            height={PHONE_H}
            overlayColor='#0C0B0A'
            onComplete={() => setCompleted(true)}
          />
        </View>
      </Pressable>

      <View style={styles.controls}>
        <Pressable
          onPress={onTap}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed ? 0.7 : 1 },
            active ? styles.btnGhost : styles.btnPrimary,
          ]}
        >
          <Text style={active ? styles.btnText : styles.btnTextPrimary}>
            {active ? '↩  reset' : '▶  wipe'}
          </Text>
        </Pressable>
        <View style={styles.meta}>
          <Text style={styles.metaItem}>
            state ·{' '}
            <Text style={styles.metaVal}>{completed ? 'done' : active ? 'wiping' : 'idle'}</Text>
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070605',
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  title: {
    color: '#C2A878',
    fontSize: 11,
    letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sub: {
    color: '#8A8170',
    fontSize: 11,
    marginBottom: 14,
    textAlign: 'center',
  },
  phone: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233,226,210,0.1)',
    backgroundColor: '#0C0B0A',
  },
  absFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },

  // Report mock
  reportBg: { backgroundColor: '#EAE3D2' },
  rnav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 17,
    paddingBottom: 4,
  },
  rnavBack: { color: '#6b5f48', fontSize: 18 },
  rnavTitle: { color: '#2a241a', fontSize: 14, letterSpacing: 3 },
  rsect: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,110,86,0.16)',
  },
  rlabel: {
    color: '#9b7d3e',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chartPlaceholder: {
    height: 110,
    backgroundColor: 'rgba(120,110,86,0.08)',
    borderRadius: 8,
  },
  barPlaceholder: {
    height: 8,
    backgroundColor: 'rgba(120,110,86,0.18)',
    borderRadius: 4,
    marginTop: 8,
  },
  now: {
    color: '#2a241a',
    fontSize: 18,
    letterSpacing: 1,
    marginTop: 6,
  },
  gloss: {
    color: '#4a4030',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 7,
  },

  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  btn: {
    paddingHorizontal: 22,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#9B2226' },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.4)',
    backgroundColor: '#17150f',
  },
  btnTextPrimary: { color: '#f4ecdc', fontSize: 13, letterSpacing: 3 },
  btnText: { color: '#E9E2D2', fontSize: 12, letterSpacing: 2 },

  meta: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.3)',
    justifyContent: 'center',
  },
  metaItem: { color: '#8A8170', fontFamily: 'Menlo', fontSize: 11 },
  metaVal: { color: '#E9E2D2' },
})
