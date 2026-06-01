/**
 * TodayHexagram — pure deterministic hexagram of the day.
 *
 * Derived from hash(date + chartHash) % 64. No LLM, no network. The 64
 * canonical I-Ching hexagrams have unicode glyphs U+4DC0 .. U+4DFF.
 * Display: glyph + Chinese name + a short plain-language gloss so the user
 * does not need to know the I-Ching to read it.
 *
 * Gloss is currently zh / zh-Hant only — for other locales we render the
 * romanised name (label) instead of a translated gloss to avoid shipping
 * 64 × 7 hand-translated strings before they're audited.
 */

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface Props {
  /** Stable per-user identifier — chartHash, userId, or any persistent string. */
  seed: string | null | undefined
  /** Date in YYYY-MM-DD form (defaults to today in local TZ). */
  date?: string
}

const HEXAGRAM_NAMES = [
  '乾',
  '坤',
  '屯',
  '蒙',
  '需',
  '讼',
  '师',
  '比',
  '小畜',
  '履',
  '泰',
  '否',
  '同人',
  '大有',
  '谦',
  '豫',
  '随',
  '蛊',
  '临',
  '观',
  '噬嗑',
  '贲',
  '剥',
  '复',
  '无妄',
  '大畜',
  '颐',
  '大过',
  '坎',
  '离',
  '咸',
  '恒',
  '遁',
  '大壮',
  '晋',
  '明夷',
  '家人',
  '睽',
  '蹇',
  '解',
  '损',
  '益',
  '夬',
  '姤',
  '萃',
  '升',
  '困',
  '井',
  '革',
  '鼎',
  '震',
  '艮',
  '渐',
  '归妹',
  '丰',
  '旅',
  '巽',
  '兑',
  '涣',
  '节',
  '中孚',
  '小过',
  '既济',
  '未济',
] as const

/**
 * Plain-language one-liner per gua. Keep ≤ 12 chars each so it fits one row
 * on small phones. The vibe is "modern friend explaining" — not classical.
 */
const HEXAGRAM_GLOSS_ZH: Record<(typeof HEXAGRAM_NAMES)[number], string> = {
  乾: '自强不息，宜进取',
  坤: '厚德包容，宜承担',
  屯: '草创艰难，蓄力待发',
  蒙: '虚心求教，启蒙开窍',
  需: '耐心等待，沉住气',
  讼: '少争为妙，退一步',
  师: '团队作战，纪律为先',
  比: '亲近合作，找同路人',
  小畜: '小有积蓄，厚积少发',
  履: '谨慎前行，守礼而进',
  泰: '通达顺利，阴阳调和',
  否: '暂时闭塞，宜守静',
  同人: '志同道合，共谋大事',
  大有: '收成丰盛，大方分享',
  谦: '谦虚低调，受益无穷',
  豫: '顺势而为，乐而不淫',
  随: '顺应变化，灵活应对',
  蛊: '整顿积弊，主动修补',
  临: '居高临下，督导有方',
  观: '静观其变，多看少动',
  噬嗑: '果断处理，除弊立威',
  贲: '修饰外表，文质相宜',
  剥: '处于消耗期，守住根基',
  复: '回归本心，重新出发',
  无妄: '守正避祸，不存妄想',
  大畜: '大有积累，厚积厚发',
  颐: '修养身心，言慎食节',
  大过: '事态超常，关键时刻',
  坎: '险阻重重，心诚则通',
  离: '光明依附，灵动有光',
  咸: '互相感应，心心相印',
  恒: '持之以恒，长久之道',
  遁: '暂避锋芒，退而藏锋',
  大壮: '力量充沛，戒骄戒躁',
  晋: '步步晋升，光明在前',
  明夷: '韬光养晦，暗中蓄力',
  家人: '家庭和睦，内政为重',
  睽: '意见相左，求同存异',
  蹇: '行路艰难，反求诸己',
  解: '解开困局，把握时机',
  损: '减损取舍，以损为益',
  益: '利人利己，慷慨厚予',
  夬: '决断行动，排除阻碍',
  姤: '不期而遇，慎择交往',
  萃: '聚集汇合，团聚有方',
  升: '步步上升，顺势而进',
  困: '处境困顿，安守本心',
  井: '滋养他人，取用不竭',
  革: '革故鼎新，时机已至',
  鼎: '稳重承载，大业在握',
  震: '震动警醒，冷静应对',
  艮: '适时停止，知止不殆',
  渐: '循序渐进，不可冒进',
  归妹: '名分待定，谨慎选择',
  丰: '丰盛巅峰，居安思危',
  旅: '旅途奔波，谨慎随和',
  巽: '顺势而行，谦逊渗透',
  兑: '喜悦交流，真诚沟通',
  涣: '人心涣散，重新凝聚',
  节: '适度节制，量入为出',
  中孚: '内心诚信，言行一致',
  小过: '小心谨慎，略过为宜',
  既济: '大功告成，防止松懈',
  未济: '尚未完成，继续努力',
}

// Hexagram unicode glyph block: U+4DC0 .. U+4DFF (64 codepoints)
const HEXAGRAM_GLYPH_BASE = 0x4dc0

function hash(input: string): number {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
  }
  return Math.abs(h)
}

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TodayHexagram({ seed, date }: Props) {
  const { t, locale } = useI18n()
  const { colors, isDark } = useTheme()
  const day = date ?? todayLocal()

  const idx = useMemo(() => {
    const s = `${day}|${seed ?? 'anon'}`
    return hash(s) % 64
  }, [day, seed])

  const glyph = String.fromCodePoint(HEXAGRAM_GLYPH_BASE + idx)
  const name = HEXAGRAM_NAMES[idx]
  const accent = isDark ? '#C4A882' : '#3C2415'
  const showGloss = locale === 'zh' || locale === 'zh-Hant'
  const gloss = showGloss && name ? HEXAGRAM_GLOSS_ZH[name] : null

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: colors.card,
        borderRadius: 0,
        borderWidth: 0.5,
        borderColor: colors.border,
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Text style={{ color: accent, fontSize: 48, lineHeight: 56, letterSpacing: 0 }}>{glyph}</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {t('today_hexagram_label')}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: '500',
            letterSpacing: 1,
          }}
        >
          {name}
        </Text>
        {gloss ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontWeight: '300',
              marginTop: 6,
              lineHeight: 18,
              letterSpacing: 0.3,
            }}
          >
            {gloss}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
