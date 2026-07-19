/**
 * Symbol glossary — chapter↔seal↔ink map (xingqi-canon) + ink mode plates.
 */

import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'
import { Dimensions, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AncientSeal } from '@/components/reading/AncientSeal'
import { InkModePlate } from '@/components/reading/InkCenterpiece'
import { type InkRelation } from '@/lib/ancient-glyphs'
import { resolveLocale } from '@/lib/i18n'
import { XINGQI_CHAPTER_CANON } from '@/lib/xingqi-canon'

const INK_MODES: Array<{
  relation: InkRelation
  titleZh: string
  titleEn: string
  bodyZh: string
  bodyEn: string
}> = [
  {
    relation: 'gather',
    titleZh: '聚',
    titleEn: 'Gather',
    bodyZh: '两团湿墨向中心洇开，焦墨叠成核——如一笔合墨。',
    bodyEn: 'Two wet pools bleed into a dark core — ink gathering as one stroke family.',
  },
  {
    relation: 'pair',
    titleZh: '对',
    titleEn: 'Pair',
    bodyZh: '左右两摊墨，中间留一口气——双手并读的对章。',
    bodyEn: 'Two equal washes with a breath of blank between — paired palms.',
  },
  {
    relation: 'contrast',
    titleZh: '照',
    titleEn: 'Contrast',
    bodyZh: '浓淡对峙，中缝飞白——形气与八字隔纸相照。',
    bodyEn: 'Dark against pale across a flying-white seam — form facing BaZi.',
  },
  {
    relation: 'flow',
    titleZh: '流',
    titleEn: 'Flow',
    bodyZh: '长皴顺势斜下，墨点随笔走——时间窗口的走势。',
    bodyEn: 'Long diagonal cun strokes — period motion on the paper.',
  },
]

function chaptersForInk(relation: InkRelation, zh: boolean): string {
  return XINGQI_CHAPTER_CANON.filter((c) => c.ink === relation)
    .map((c) => (zh ? c.titleZh : c.titleEn))
    .join(zh ? ' · ' : ' · ')
}

export default function XingqiGlossaryScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
        directionalLockEnabled
      >
        <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 28 }}>
          {zh ? '符号说明' : 'Symbol glossary'}
        </Text>
        <Text style={{ color: colors.secondary, lineHeight: 22 }}>
          {zh
            ? '报告里有两套视觉语言：① 象形印（甲骨/金文，标章节）；② 墨象四态（聚/对/照/流，中间大图）。印很小，贴在一角。从左边缘右滑返回；中间纵向滚动不会误触返回。'
            : 'Two visual languages: (1) pictograph seals mark the chapter; (2) ink modes are the large plate. Swipe back from the left edge; scrolling in the middle won’t dismiss.'}
        </Text>

        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {zh ? '① 章节 · 印 · 墨 · 用语' : '1 · Chapter · seal · ink · vocab'}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {zh
            ? 'V1 锁定一派：面=三停·五岳·十二宫·五官；掌=主纹+丘位；命=日主用神通关。每章对应一印、一墨态、一套宜用语。'
            : 'V1 lock: face = three courts / five peaks / twelve palaces; palm = lines + mounts; natal = day master / yongshen. Each chapter maps to one seal, one ink mode, and preferred vocab.'}
        </Text>
        {XINGQI_CHAPTER_CANON.map((c) => (
          <View key={c.kind} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <AncientSeal glyph={c.glyph} size={40} tile={colors.text} ink={colors.bg} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>
                {zh ? c.titleZh : c.titleEn}
                <Text style={{ fontFamily: 'IBMPlexMono', fontSize: 11, color: colors.dim }}>
                  {'  '}
                  {zh ? c.sealBlurbZh : c.sealBlurbEn}
                  {' · '}
                  {c.ink === 'gather'
                    ? zh
                      ? '聚'
                      : 'gather'
                    : c.ink === 'pair'
                      ? zh
                        ? '对'
                        : 'pair'
                      : c.ink === 'contrast'
                        ? zh
                          ? '照'
                          : 'contrast'
                        : zh
                          ? '流'
                          : 'flow'}
                </Text>
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                {zh ? c.vocabZh : c.vocabEn}
              </Text>
            </View>
          </View>
        ))}

        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginTop: spacing.md,
          }}
        >
          {zh ? '② 墨象四态' : '2 · Ink modes'}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {zh
            ? '中间满幅宣纸上的墨象（无嵌套椭圆框）。聚/对/照/流是笔触构图。'
            : 'Full-bleed xuan paper (no nested oval). Gather / pair / contrast / flow are brush compositions.'}
        </Text>

        {INK_MODES.map((m) => (
          <View key={m.relation} style={{ gap: 10 }}>
            <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 22 }}>
              {zh ? m.titleZh : m.titleEn}
              <Text style={{ fontFamily: 'IBMPlexMono', fontSize: 12, color: colors.dim }}>
                {'  '}
                {chaptersForInk(m.relation, zh)}
              </Text>
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}>
              {zh ? m.bodyZh : m.bodyEn}
            </Text>
            <View style={{ alignSelf: 'stretch' }}>
              <InkModePlate
                relation={m.relation}
                seed={m.relation.length * 97}
                width={Math.min(320, Dimensions.get('window').width - spacing.xl * 2)}
                height={Math.round(
                  (Math.min(320, Dimensions.get('window').width - spacing.xl * 2) / 560) * 320
                )}
                showSeamGuide={m.relation === 'contrast'}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
