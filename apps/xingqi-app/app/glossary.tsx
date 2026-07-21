/**
 * Symbol glossary — chapter↔seal↔ink map (xingqi-canon) + ink mode plates.
 */

import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'
import { Dimensions, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AncientSeal } from '@/components/reading/AncientSeal'
import { InkModePlate } from '@/components/reading/InkCenterpiece'
import { type InkRelation, XINGQI_LOCUS_CANON } from '@/lib/ancient-glyphs'
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
  overview: '象 — 觀象（見系）',
  face: '面 — 目頰象形',
  palms: '又 — 甲骨側掌三指',
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

function SectionLabel({
  children,
  colors,
  cjk,
  top,
}: {
  children: string
  colors: { dim: string }
  cjk: boolean
  top?: number
}) {
  return (
    <Text
      style={{
        fontFamily: 'IBMPlexMono',
        color: colors.dim,
        fontSize: 11,
        letterSpacing: cjk ? 0.8 : 1.4,
        textTransform: 'uppercase',
        marginTop: top ?? 0,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  )
}

export default function XingqiGlossaryScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const cjk = isCjkZh(locale)
  const s = (hans: string, hant: string, en: string) => (cjk ? pickZh(locale, hans, hant) : en)

  const titleSize = cjk ? 26 : 28
  const introSize = cjk ? 14 : 15
  const chapterTitleSize = cjk ? 17 : 16
  const metaSize = cjk ? 12 : 11
  const bodySize = cjk ? 14 : 13
  const bodyLine = cjk ? 22 : 19

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
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: 'CrimsonPro',
            color: colors.text,
            fontSize: titleSize,
            fontWeight: '600',
            marginBottom: spacing.sm,
          }}
        >
          {s('符号说明', '符號說明', 'Symbol glossary')}
        </Text>
        <Text
          style={{
            color: colors.secondary,
            fontSize: introSize,
            lineHeight: cjk ? 22 : 22,
            marginBottom: spacing.xl,
          }}
        >
          {s(
            '报告里有三套视觉语言：① 章节象形印；② 关键点位印（首页星光点开后的 sheet）；③ 墨象四态（聚/对/照/流）。健康轴可借中医脏腑气血之「象」作警示对照——词典层，不是看病。从左边缘右滑返回。',
            '報告裡有三套視覺語言：① 章節象形印；② 關鍵點位印（首頁星光點開後的 sheet）；③ 墨象四態（聚／對／照／流）。健康軸可借中醫臟腑氣血之「象」作警示對照——詞典層，不是看病。從左邊緣右滑返回。',
            'Three visual languages: (1) chapter seals; (2) locus seals in the home star sheet; (3) ink modes. Health may borrow classical TCM imagery as cautionary lexicon — not a clinic visit. Swipe back from the left edge.'
          )}
        </Text>

        <SectionLabel colors={colors} cjk={cjk}>
          {s('① 章节 · 印 · 墨 · 用语', '① 章節 · 印 · 墨 · 用語', '1 · Chapter · seal · ink · vocab')}
        </SectionLabel>
        <Text
          style={{
            color: colors.secondary,
            fontSize: bodySize,
            lineHeight: bodyLine,
            marginBottom: spacing.lg,
          }}
        >
          {s(
            'V1 锁定一派：面=三停·五岳·十二宫·五官；掌=主纹+丘位；命=日主用神通关。每章对应一印、一墨态、一套宜用语。',
            'V1 鎖定一派：面＝三停·五岳·十二宮·五官；掌＝主紋＋丘位；命＝日主用神通關。每章對應一印、一墨態、一套宜用語。',
            'V1 lock: face = three courts / five peaks / twelve palaces; palm = lines + mounts; natal = day master / yongshen. Each chapter maps to one seal, one ink mode, and preferred vocab.'
          )}
        </Text>

        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.separator, marginBottom: spacing.xl }}>
          {XINGQI_CHAPTER_CANON.map((c) => {
            const ink = INK_LABEL[c.ink]
            return (
              <View
                key={c.kind}
                style={{
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'flex-start',
                  paddingVertical: spacing.md,
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.separator,
                }}
              >
                <AncientSeal glyph={c.glyph} size={40} tile={colors.text} ink={colors.bg} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: chapterTitleSize,
                      fontWeight: '600',
                      lineHeight: chapterTitleSize + 4,
                    }}
                  >
                    {chapterTitle(c.kind, locale)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono',
                      fontSize: metaSize,
                      color: colors.dim,
                      lineHeight: metaSize + 4,
                    }}
                  >
                    {s(c.sealBlurbZh, SEAL_BLURB_HANT[c.kind] ?? c.sealBlurbZh, c.sealBlurbEn)}
                    {' · '}
                    {s(ink.zh, ink.zhHant, ink.en)}
                  </Text>
                  <Text
                    style={{
                      color: colors.secondary,
                      fontSize: bodySize,
                      lineHeight: bodyLine,
                      marginTop: 2,
                    }}
                  >
                    {s(c.vocabZh, VOCAB_HANT[c.kind] ?? c.vocabZh, c.vocabEn)}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        <Text
          style={{
            color: colors.secondary,
            fontSize: bodySize,
            lineHeight: bodyLine,
            marginBottom: spacing.xl,
          }}
        >
          {s(
            '健康用语：气色、气机、宜留意、脏腑之象——中医作词典，解释形上可见的节奏；首页星光与报告 health 轴是警示，不是看病。',
            '健康用語：氣色、氣機、宜留意、臟腑之象——中醫作詞典，解釋形上可見的節奏；首頁星光與報告 health 軸是警示，不是看病。',
            'Health lexicon: complexion, qi motion, “worth noting”, organ imagery — TCM as dictionary for form cues; stars and the health axis are caution, not a clinic.'
          )}
        </Text>

        <SectionLabel colors={colors} cjk={cjk} top={spacing.sm}>
          {s('② 关键点位 · 形气印', '② 關鍵點位 · 形氣印', '2 · Locus seals')}
        </SectionLabel>
        <Text
          style={{
            color: colors.secondary,
            fontSize: bodySize,
            lineHeight: bodyLine,
            marginBottom: spacing.lg,
          }}
        >
          {s(
            '首页星光落在可定位的关键点（面 12 · 掌 7）。点开后 sheet 用下方印标该位；照片上仍是统一星点，不叠十九枚小印。',
            '首頁星光落在可定位的關鍵點（面 12 · 掌 7）。點開後 sheet 用下方印標該位；照片上仍是統一星點，不疊十九枚小印。',
            'Home stars land on spatial loci (12 face · 7 palm). The sheet uses these seals; the photo keeps a single sparkle style.'
          )}
        </Text>

        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: metaSize,
            letterSpacing: cjk ? 0.8 : 1.2,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {s('面', '面', 'Face')}
        </Text>
        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.separator, marginBottom: spacing.lg }}>
          {XINGQI_LOCUS_CANON.filter((l) => l.group === 'face').map((l) => (
            <View
              key={l.featureKey}
              style={{
                flexDirection: 'row',
                gap: 14,
                alignItems: 'flex-start',
                paddingVertical: spacing.md,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
              }}
            >
              <AncientSeal glyph={l.glyph} size={40} tile={colors.text} ink={colors.bg} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: chapterTitleSize,
                    fontWeight: '600',
                    lineHeight: chapterTitleSize + 4,
                  }}
                >
                  {s(l.titleZh, l.titleZhHant, l.titleEn)}
                </Text>
                <Text
                  style={{
                    color: colors.secondary,
                    fontSize: bodySize,
                    lineHeight: bodyLine,
                  }}
                >
                  {s(l.blurbZh, l.blurbZhHant, l.blurbEn)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: metaSize,
            letterSpacing: cjk ? 0.8 : 1.2,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {s('掌', '掌', 'Palm')}
        </Text>
        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.separator, marginBottom: spacing.xl }}>
          {XINGQI_LOCUS_CANON.filter((l) => l.group === 'palm').map((l) => (
            <View
              key={l.featureKey}
              style={{
                flexDirection: 'row',
                gap: 14,
                alignItems: 'flex-start',
                paddingVertical: spacing.md,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
              }}
            >
              <AncientSeal glyph={l.glyph} size={40} tile={colors.text} ink={colors.bg} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: chapterTitleSize,
                    fontWeight: '600',
                    lineHeight: chapterTitleSize + 4,
                  }}
                >
                  {s(l.titleZh, l.titleZhHant, l.titleEn)}
                </Text>
                <Text
                  style={{
                    color: colors.secondary,
                    fontSize: bodySize,
                    lineHeight: bodyLine,
                  }}
                >
                  {s(l.blurbZh, l.blurbZhHant, l.blurbEn)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <SectionLabel colors={colors} cjk={cjk} top={spacing.sm}>
          {s('③ 墨象四态', '③ 墨象四態', '3 · Ink modes')}
        </SectionLabel>
        <Text
          style={{
            color: colors.secondary,
            fontSize: bodySize,
            lineHeight: bodyLine,
            marginBottom: spacing.lg,
          }}
        >
          {s(
            '中间满幅宣纸上的墨象（无嵌套椭圆框）。聚/对/照/流是笔触构图。',
            '中間滿幅宣紙上的墨象（無嵌套橢圓框）。聚／對／照／流是筆觸構圖。',
            'Full-bleed xuan paper (no nested oval). Gather / pair / contrast / flow are brush compositions.'
          )}
        </Text>

        {INK_MODES.map((m) => (
          <View key={m.relation} style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
            <Text
              style={{
                fontFamily: 'CrimsonPro',
                color: colors.text,
                fontSize: cjk ? 24 : 22,
                fontWeight: '600',
                lineHeight: cjk ? 32 : 28,
              }}
            >
              {s(m.titleZh, m.titleZhHant, m.titleEn)}
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono',
                fontSize: metaSize,
                color: colors.dim,
                lineHeight: metaSize + 4,
              }}
            >
              {chaptersForInk(m.relation, locale)}
            </Text>
            <Text
              style={{
                color: colors.secondary,
                fontSize: cjk ? 15 : 14,
                lineHeight: cjk ? 24 : 21,
              }}
            >
              {s(m.bodyZh, m.bodyZhHant, m.bodyEn)}
            </Text>
            <View style={{ alignSelf: 'stretch', marginTop: spacing.xs }}>
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
