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
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { chapterTitle } from '@/lib/report-chapters'
import { XINGQI_CHAPTER_CANON } from '@/lib/xingqi-canon'

const INK_MODES: Array<{
  relation: InkRelation
  titleZh: string
  titleZhHant: string
  titleEn: string
  bodyZh: string
  bodyZhHant: string
  bodyEn: string
}> = [
  {
    relation: 'gather',
    titleZh: '聚',
    titleZhHant: '聚',
    titleEn: 'Gather',
    bodyZh: '两团湿墨向中心洇开，焦墨叠成核——如一笔合墨。',
    bodyZhHant: '兩團濕墨向中心洇開，焦墨疊成核——如一筆合墨。',
    bodyEn: 'Two wet pools bleed into a dark core — ink gathering as one stroke family.',
  },
  {
    relation: 'pair',
    titleZh: '对',
    titleZhHant: '對',
    titleEn: 'Pair',
    bodyZh: '左右两摊墨，中间留一口气——双手并读的对章。',
    bodyZhHant: '左右兩攤墨，中間留一口氣——雙手並讀的對章。',
    bodyEn: 'Two equal washes with a breath of blank between — paired palms.',
  },
  {
    relation: 'contrast',
    titleZh: '照',
    titleZhHant: '照',
    titleEn: 'Contrast',
    bodyZh: '浓淡对峙，中缝飞白——形气与八字隔纸相照。',
    bodyZhHant: '濃淡對峙，中縫飛白——形氣與八字隔紙相照。',
    bodyEn: 'Dark against pale across a flying-white seam — form facing BaZi.',
  },
  {
    relation: 'flow',
    titleZh: '流',
    titleZhHant: '流',
    titleEn: 'Flow',
    bodyZh: '长皴顺势斜下，墨点随笔走——时间窗口的走势。',
    bodyZhHant: '長皴順勢斜下，墨點隨筆走——時間窗口的走勢。',
    bodyEn: 'Long diagonal cun strokes — period motion on the paper.',
  },
]

const SEAL_BLURB_HANT: Record<string, string> = {
  overview: '象 — 形氣總象',
  face: '面 — 目頰象形',
  palms: '又 — 手掌象形',
  natal: '命 — 稟命對照',
  period: '月 — 時間窗',
  advice: '永 — 長流之宜',
}

const VOCAB_HANT: Record<string, string> = {
  overview: '形氣、氣色、骨相、肉相、氣機',
  face: '三停、五岳、十二宮、五官、天庭、印堂、山根、年壽、準頭、人中、地閣',
  palms: '掌形、生命線、智慧線、感情線、事業線、丘位（金星丘…）、左右對照',
  natal: '日主、用神、通關、相生、相克、比和、五行',
  period: '流年、流月、大運、宜留意、氣機窗口',
  advice: '宜留意、氣機、收束、觀察窗口',
}

const INK_LABEL: Record<InkRelation, { zh: string; zhHant: string; en: string }> = {
  gather: { zh: '聚', zhHant: '聚', en: 'gather' },
  pair: { zh: '对', zhHant: '對', en: 'pair' },
  contrast: { zh: '照', zhHant: '照', en: 'contrast' },
  flow: { zh: '流', zhHant: '流', en: 'flow' },
}

function chaptersForInk(relation: InkRelation, locale: string): string {
  return XINGQI_CHAPTER_CANON.filter((c) => c.ink === relation)
    .map((c) => chapterTitle(c.kind, locale))
    .join(' · ')
}

export default function XingqiGlossaryScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en

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
          {s('符号说明', '符號說明', 'Symbol glossary')}
        </Text>
        <Text style={{ color: colors.secondary, lineHeight: 22 }}>
          {s(
            '报告里有两套视觉语言：① 象形印（甲骨/金文，标章节）；② 墨象四态（聚/对/照/流，中间大图）。印很小，贴在一角。从左边缘右滑返回；中间纵向滚动不会误触返回。',
            '報告裡有兩套視覺語言：① 象形印（甲骨／金文，標章節）；② 墨象四態（聚／對／照／流，中間大圖）。印很小，貼在一角。從左邊緣右滑返回；中間縱向滾動不會誤觸返回。',
            'Two visual languages: (1) pictograph seals mark the chapter; (2) ink modes are the large plate. Swipe back from the left edge; scrolling in the middle won’t dismiss.'
          )}
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
          {s('① 章节 · 印 · 墨 · 用语', '① 章節 · 印 · 墨 · 用語', '1 · Chapter · seal · ink · vocab')}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {s(
            'V1 锁定一派：面=三停·五岳·十二宫·五官；掌=主纹+丘位；命=日主用神通关。每章对应一印、一墨态、一套宜用语。',
            'V1 鎖定一派：面＝三停·五岳·十二宮·五官；掌＝主紋＋丘位；命＝日主用神通關。每章對應一印、一墨態、一套宜用語。',
            'V1 lock: face = three courts / five peaks / twelve palaces; palm = lines + mounts; natal = day master / yongshen. Each chapter maps to one seal, one ink mode, and preferred vocab.'
          )}
        </Text>
        {XINGQI_CHAPTER_CANON.map((c) => {
          const ink = INK_LABEL[c.ink]
          return (
            <View key={c.kind} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <AncientSeal glyph={c.glyph} size={40} tile={colors.text} ink={colors.bg} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>
                  {chapterTitle(c.kind, locale)}
                  <Text style={{ fontFamily: 'IBMPlexMono', fontSize: 11, color: colors.dim }}>
                    {'  '}
                    {s(c.sealBlurbZh, SEAL_BLURB_HANT[c.kind] ?? c.sealBlurbZh, c.sealBlurbEn)}
                    {' · '}
                    {s(ink.zh, ink.zhHant, ink.en)}
                  </Text>
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                  {s(c.vocabZh, VOCAB_HANT[c.kind] ?? c.vocabZh, c.vocabEn)}
                </Text>
              </View>
            </View>
          )
        })}

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
          {s('② 墨象四态', '② 墨象四態', '2 · Ink modes')}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {s(
            '中间满幅宣纸上的墨象（无嵌套椭圆框）。聚/对/照/流是笔触构图。',
            '中間滿幅宣紙上的墨象（無嵌套橢圓框）。聚／對／照／流是筆觸構圖。',
            'Full-bleed xuan paper (no nested oval). Gather / pair / contrast / flow are brush compositions.'
          )}
        </Text>

        {INK_MODES.map((m) => (
          <View key={m.relation} style={{ gap: 10 }}>
            <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 22 }}>
              {s(m.titleZh, m.titleZhHant, m.titleEn)}
              <Text style={{ fontFamily: 'IBMPlexMono', fontSize: 12, color: colors.dim }}>
                {'  '}
                {chaptersForInk(m.relation, locale)}
              </Text>
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}>
              {s(m.bodyZh, m.bodyZhHant, m.bodyEn)}
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
