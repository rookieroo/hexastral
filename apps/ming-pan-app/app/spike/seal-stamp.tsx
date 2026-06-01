/**
 * Seal Stamp Spike — validates @zhop/core-ui/motion SealStamp.
 *
 * Renders a "report" page bottom area with the seal anchored bottom-right
 * (matches HTML POC `.luokuan` position). Tap to play the chop-drop →
 * impression-reveal → halo-bloom → chop-lift sequence.
 *
 * Route: /spike/seal-stamp
 */

import { SealStamp } from '@zhop/core-ui/motion'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const PHONE_W = 320
const PHONE_H = 680
const SEAL_SIZE = 50

const AUTO_HOLD_BEFORE = 1500
const AUTO_HOLD_AFTER = 2500

type SealKind = 'xin' | 'yi'

const SEAL_ASSETS = {
  xin: require('../../assets/seals/xin.png'),
  yi: require('../../assets/seals/yi.png'),
}
const CHOP_ASSET = require('../../assets/seals/lilong.png')

export default function SealStampSpike() {
  const [active, setActive] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [kind, setKind] = useState<SealKind>('xin')

  const reset = useCallback(() => {
    setActive(false)
    setCompleted(false)
  }, [])

  // Auto-loop: idle → stamp → done(hold) → reset → repeat
  useEffect(() => {
    if (!active && !completed) {
      const t = setTimeout(() => setActive(true), AUTO_HOLD_BEFORE)
      return () => clearTimeout(t)
    }
    if (completed) {
      const t = setTimeout(reset, AUTO_HOLD_AFTER)
      return () => clearTimeout(t)
    }
    return
  }, [active, completed, reset])

  const onTrigger = active ? reset : () => setActive(true)

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Seal Stamp · core-ui</Text>
      <Text style={styles.sub}>
        chop drop · impression reveal · halo bloom · chop lift (1200ms)
      </Text>

      <Pressable onPress={onTrigger}>
        <View style={styles.phone}>
          {/* Mock report page bg */}
          <View style={styles.paper}>
            <Text style={styles.gloss}>
              立身之运（32–41）：声望渐起，可执牛耳。地形虽定， 此运宜进取、不宜守成，唯须防躁。
            </Text>
            <Text style={styles.gloss}>戊午大运·火土得令·承位之运。</Text>
            <Text style={styles.glossDim}>(留白处便是钤印的落点：右下方一寸天地)</Text>
          </View>

          {/* Seal — anchored bottom-right matching HTML .luokuan */}
          <SealStamp
            active={active}
            sealImage={SEAL_ASSETS[kind]}
            chopImage={CHOP_ASSET}
            size={SEAL_SIZE}
            onComplete={() => setCompleted(true)}
            style={{
              position: 'absolute',
              right: 24,
              bottom: 99,
            }}
          />
        </View>
      </Pressable>

      <View style={styles.kindRow}>
        {(['xin', 'yi'] as SealKind[]).map((k) => {
          const isActive = k === kind
          return (
            <Pressable
              key={k}
              onPress={() => {
                setKind(k)
                reset()
              }}
              style={({ pressed }) => [
                styles.kindChip,
                isActive && styles.kindChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.kindChipText, isActive && styles.kindChipTextActive]}>
                {k === 'xin' ? '信' : '疑'}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={onTrigger}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed ? 0.7 : 1 },
            active ? styles.btnGhost : styles.btnPrimary,
          ]}
        >
          <Text style={active ? styles.btnText : styles.btnTextPrimary}>
            {active ? '↩  reset' : '▶  stamp'}
          </Text>
        </Pressable>
        <View style={styles.meta}>
          <Text style={styles.metaItem}>
            state ·{' '}
            <Text style={styles.metaVal}>
              {completed ? 'sealed' : active ? 'stamping' : 'idle'}
            </Text>
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
  paper: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#EAE3D2',
    paddingHorizontal: 28,
    paddingTop: 64,
  },
  gloss: {
    color: '#4a4030',
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 14,
  },
  glossDim: {
    color: '#9b8c66',
    fontSize: 11,
    marginTop: 8,
  },

  kindRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kindChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.28)',
    backgroundColor: '#17150f',
  },
  kindChipActive: {
    borderColor: '#C2A878',
    backgroundColor: '#251f15',
  },
  kindChipText: {
    color: '#8A8170',
    fontFamily: 'Songti SC',
    fontSize: 18,
    letterSpacing: 2,
  },
  kindChipTextActive: { color: '#E9E2D2' },

  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
