/**
 * Symbol Glossary — a map-legend for the report's hand-built visual language.
 *
 * The synastry report is set in seals, brush marks and 积画 numerals instead of
 * web widgets (see ChapterCard / the 墨儀 design system). Nothing on the card is
 * labelled inline, so this screen is the one place that decodes every mark:
 * the six chapter 碑拓 seals, the 五行 用神 key, the 暗礁 朱批 severity, the
 * ancient numerals, and the two seal styles (碑拓 filled vs 朱文 outline).
 *
 * Pure presentation — reuses the exact glyph primitives the cards render, on the
 * shared 宣纸 (kindredPaper) document layer, so the legend looks identical to the
 * thing it explains.
 */

import { kindredDark, kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import {
  AncientNumeral,
  AncientSeal,
  CHAPTER_SEAL,
  type GlyphKey,
  kindredFonts,
  RiskMark,
  WUXING_GLYPH,
} from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InkCenterpiece, type Mode } from '@/components/ink/InkCenterpiece'
import { ReadingPrimer } from '@/components/reading/ReadingPrimer'
import { resolveLocale, type TranslationKey, t } from '@/lib/i18n'

// Chapter kinds in narrative order — same sequence the report pages through.
const CHAPTER_KINDS = [
  'first_impression',
  'communication',
  'conflict',
  'complement',
  'monthly_outlook',
  'long_term_advice',
] as const

// 五行 in the canonical 金木水火土 order, paired with the i18n label key.
const WUXING = [
  { el: '金', key: 'metal' },
  { el: '木', key: 'wood' },
  { el: '水', key: 'water' },
  { el: '火', key: 'fire' },
  { el: '土', key: 'earth' },
] as const

const SEVERITIES = ['low', 'mid', 'high'] as const

// The four centerpiece states, paired with their i18n label key. Same sequence
// a report walks: static essence first, the 解法 turn last.
const ESSENCE_MODES: { mode: Mode; key: string }[] = [
  { mode: 'merge', key: 'merge' },
  { mode: 'oppose', key: 'oppose' },
  { mode: 'resonate', key: 'resonate' },
  { mode: 'transition', key: 'transition' },
]

const GESTURE_ACTIONS = ['copy', 'chat', 'highlight', 'makeif'] as const

export default function GlossaryScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const tr = (key: TranslationKey) => t(locale, key)
  const [showPrimer, setShowPrimer] = useState(false)

  // No swipe-back here (2026-06 feedback): the glossary is a long vertical scroll,
  // and any horizontal back-gesture (native or the custom EdgeBackSwipe) competed
  // with the ScrollView and made it feel sticky. The layout sets gestureEnabled:false
  // for this screen, so exit is ONLY the ← button below — scrolling stays smooth.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 22, color: kindredPaper.muted }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 12,
            letterSpacing: 3,
            color: kindredPaper.muted,
            textTransform: 'uppercase',
          }}
        >
          {tr('glossary.title')}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: kindredFonts.serif,
            fontSize: 16,
            lineHeight: 24,
            color: kindredPaper.inkSoft,
            marginBottom: kindredSpacing.md,
          }}
        >
          {tr('glossary.intro')}
        </Text>

        {/* Replay the one-time reading primer (the gentle intro overlay) — the
            re-entry point a first-time reader otherwise loses (2026-06 device QA). */}
        <Pressable
          onPress={() => setShowPrimer(true)}
          hitSlop={8}
          accessibilityRole='button'
          style={{ alignSelf: 'flex-start', marginBottom: kindredSpacing.xl }}
        >
          <Text
            style={{
              fontFamily: kindredFonts.mono,
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: kindredPaper.cinnabar,
            }}
          >
            {tr('primer.replay')}
          </Text>
        </Pressable>

        {/* ── The ink states (意象) — the actual centerpiece each chapter draws ── */}
        <Section title={tr('glossary.essence.section')} caption={tr('glossary.essence.caption')}>
          {ESSENCE_MODES.map(({ mode, key }) => (
            <EssenceRow
              key={mode}
              mode={mode}
              label={tr(`glossary.essence.${key}` as TranslationKey)}
            />
          ))}
        </Section>

        {/* ── Chapter seals (碑拓) ── */}
        <Section title={tr('glossary.seals.section')} caption={tr('glossary.seals.caption')}>
          {CHAPTER_KINDS.map((kind) => (
            <Row
              key={kind}
              symbol={
                <AncientSeal
                  glyph={CHAPTER_SEAL[kind] as GlyphKey}
                  size={46}
                  tile={kindredDark.bg}
                  ink={kindredPaper.bg}
                />
              }
              label={tr(`glossary.seals.${kind}` as TranslationKey)}
            />
          ))}
        </Section>

        {/* ── Bridging element (用神 · 朱文) ── */}
        <Section title={tr('glossary.wuxing.section')} caption={tr('glossary.wuxing.caption')}>
          {WUXING.map(({ el, key }) => (
            <Row
              key={el}
              symbol={
                <AncientSeal
                  glyph={WUXING_GLYPH[el] as GlyphKey}
                  size={46}
                  tile={kindredPaper.cinnabar}
                  ink={kindredPaper.cinnabar}
                  outline
                  inset={0.78}
                  strokeWidth={9}
                />
              }
              label={tr(`glossary.wuxing.${key}` as TranslationKey)}
            />
          ))}
        </Section>

        {/* ── Reef marks (暗礁 · 朱批) ── */}
        <Section title={tr('glossary.severity.section')} caption={tr('glossary.severity.caption')}>
          {SEVERITIES.map((sev) => (
            <Row
              key={sev}
              symbol={
                <View style={{ width: 46, alignItems: 'center' }}>
                  <RiskMark severity={sev} size={34} />
                </View>
              }
              label={tr(`glossary.severity.${sev}` as TranslationKey)}
            />
          ))}
        </Section>

        {/* ── Ancient numerals ── */}
        <Section title={tr('glossary.numerals.section')} caption={tr('glossary.numerals.caption')}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: kindredSpacing.md,
              paddingVertical: kindredSpacing.sm,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <AncientNumeral
                key={n}
                n={n}
                size={26}
                color={kindredPaper.inkSoft}
                strokeWidth={3}
              />
            ))}
          </View>
        </Section>

        {/* ── Two seal styles ── */}
        <Section title={tr('glossary.sealstyle.section')}>
          <Row
            symbol={
              <AncientSeal glyph='合' size={46} tile={kindredDark.bg} ink={kindredPaper.bg} />
            }
            label={tr('glossary.sealstyle.bei.label')}
            sub={tr('glossary.sealstyle.bei.desc')}
          />
          <Row
            symbol={
              <AncientSeal
                glyph='土'
                size={46}
                tile={kindredPaper.cinnabar}
                ink={kindredPaper.cinnabar}
                outline
                inset={0.78}
                strokeWidth={9}
              />
            }
            label={tr('glossary.sealstyle.zhu.label')}
            sub={tr('glossary.sealstyle.zhu.desc')}
          />
        </Section>

        {/* ── 划词 long-press actions ── */}
        <Section title={tr('glossary.gesture.section')} caption={tr('glossary.gesture.caption')}>
          {GESTURE_ACTIONS.map((key) => (
            <Row
              key={key}
              symbol={<GestureDot />}
              label={tr(`glossary.gesture.${key}` as TranslationKey)}
            />
          ))}
        </Section>
      </ScrollView>

      {/* Re-openable primer overlay (the "replay" entry above). */}
      {showPrimer ? (
        <ReadingPrimer
          locale={locale}
          onStart={() => setShowPrimer(false)}
          onOpenGlossary={() => setShowPrimer(false)}
        />
      ) : null}
    </SafeAreaView>
  )
}

function Section({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <View style={{ marginBottom: kindredSpacing.xxl }}>
      <Text
        style={{
          fontFamily: kindredFonts.mono,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: kindredPaper.cinnabar,
          marginBottom: kindredSpacing.xs,
        }}
      >
        {title}
      </Text>
      {caption ? (
        <Text
          style={{
            fontFamily: kindredFonts.serifItalic,
            fontSize: 13,
            lineHeight: 19,
            color: kindredPaper.muted,
            marginBottom: kindredSpacing.md,
          }}
        >
          {caption}
        </Text>
      ) : null}
      <View
        style={{
          borderTopWidth: 0.5,
          borderTopColor: kindredPaper.hair,
        }}
      >
        {children}
      </View>
    </View>
  )
}

function Row({ symbol, label, sub }: { symbol: React.ReactNode; label: string; sub?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: kindredSpacing.md,
        paddingVertical: kindredSpacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: kindredPaper.hair,
      }}
    >
      <View style={{ width: 46, alignItems: 'center' }}>{symbol}</View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: kindredFonts.serif,
            fontSize: 15,
            lineHeight: 21,
            color: kindredPaper.ink,
          }}
        >
          {label}
        </Text>
        {sub ? (
          <Text
            style={{
              fontFamily: kindredFonts.serif,
              fontSize: 13,
              lineHeight: 19,
              color: kindredPaper.muted,
              marginTop: 2,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/** A 意象 row — the real centerpiece thumbnail beside its meaning, so the legend
 *  shows the exact ink the report draws (transition plays its 解法 morph once). */
function EssenceRow({ mode, label }: { mode: Mode; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: kindredSpacing.md,
        paddingVertical: kindredSpacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: kindredPaper.hair,
      }}
    >
      <View style={{ borderRadius: 6, overflow: 'hidden' }}>
        <InkCenterpiece kind={`glossary_${mode}`} mode={mode} width={92} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: kindredFonts.serif,
          fontSize: 15,
          lineHeight: 21,
          color: kindredPaper.ink,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

/** A small cinnabar tick standing in for "an action in the slide-up bar". */
function GestureDot() {
  return (
    <View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: kindredPaper.cinnabar }}
    />
  )
}
