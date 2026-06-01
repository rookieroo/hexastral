import { getTokens } from '@zhop/hexastral-tokens/palette'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { formatPresetSnippet, getDreamPresetTree } from '@/lib/dream-preset-catalog'

export type DreamPresetStepsProps = {
  locale: string
  /** Row hints (i18n). */
  hintL1: string
  hintL2: string
  hintL3: string
  onAppend: (snippet: string) => void
}

export function DreamPresetSteps({
  locale,
  hintL1,
  hintL2,
  hintL3,
  onAppend,
}: DreamPresetStepsProps) {
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  const tree = useMemo(() => getDreamPresetTree(locale), [locale])
  const [l1Id, setL1Id] = useState<string | null>(null)
  const [l2Id, setL2Id] = useState<string | null>(null)

  const l1 = tree.find((n) => n.id === l1Id) ?? null
  const l2Options = l1?.children ?? []
  const l2 = l2Options.find((n) => n.id === l2Id) ?? null
  const l3Options = l2?.children ?? []

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: { gap: 8 },
        hint: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.secondary,
        },
        row: { flexGrow: 0 },
        chip: {
          marginRight: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          backgroundColor: colors.card,
        },
        chipSelected: { borderColor: colors.text, backgroundColor: colors.bg },
        chipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
      }),
    [colors]
  )

  const pickL1 = (id: string) => {
    setL1Id(id)
    setL2Id(null)
  }

  const pickL2 = (id: string) => {
    setL2Id(id)
  }

  const pickL3 = (l1Label: string, l2Label: string, l3Label: string) => {
    const snippet = formatPresetSnippet(locale, l1Label, l2Label, l3Label)
    onAppend(snippet)
    setL1Id(null)
    setL2Id(null)
  }

  return (
    <View style={styles.block}>
      <Text style={styles.hint}>{hintL1}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {tree.map((node) => (
          <Pressable
            key={node.id}
            style={[styles.chip, l1Id === node.id ? styles.chipSelected : null]}
            onPress={() => pickL1(node.id)}
            accessibilityRole='button'
          >
            <Text style={styles.chipText}>{node.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {l1Id ? (
        <>
          <Text style={styles.hint}>{hintL2}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {l2Options.map((node) => (
              <Pressable
                key={node.id}
                style={[styles.chip, l2Id === node.id ? styles.chipSelected : null]}
                onPress={() => pickL2(node.id)}
                accessibilityRole='button'
              >
                <Text style={styles.chipText}>{node.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {l1Id && l2Id ? (
        <>
          <Text style={styles.hint}>{hintL3}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {l3Options.map((leaf) => (
              <Pressable
                key={leaf.id}
                style={styles.chip}
                onPress={() => {
                  if (!l1 || !l2) return
                  pickL3(l1.label, l2.label, leaf.label)
                }}
                accessibilityRole='button'
              >
                <Text style={styles.chipText}>{leaf.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  )
}
