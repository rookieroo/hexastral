/**
 * Rich chart facts builder — extracted from `routes/preview.ts`.
 *
 * Produces a single multi-line Chinese block containing every concrete fact
 * the LLM needs to interpret a Ba Zi × Zi Wei dual chart without falling back
 * to placeholder language. Used by `routes/report-chapter.ts` so that prompts
 * like ch3_stellar (which asks for 命宫主星 + 三方四正 + 四化 interpretation)
 * actually receive the underlying chart instead of just the soul-palace star.
 *
 * Pure compute — no network. Safe to call per chapter request.
 */

import { generateNatalChart } from '../services/natal/natal'
import { generateChart } from '../services/stellar/stellar'

export interface BuildRichFactsInput {
  solarDate: string
  timeIndex: number
  gender: '男' | '女'
  longitude?: number
  latitude?: number
  timezoneId?: string
  city?: string
  /** Synthetic id used to satisfy the natal/stellar service signatures. */
  userId: string
  language?: string
}

/**
 * Compute natal + stellar charts and assemble the rich facts block.
 * Returns null on failure so the caller can fall back to thin facts.
 */
export function buildRichFacts(input: BuildRichFactsInput): string | null {
  try {
    const natal = generateNatalChart({
      solarDate: input.solarDate,
      timeIndex: input.timeIndex,
      gender: input.gender,
      longitude: input.longitude,
      latitude: input.latitude,
      timezoneId: input.timezoneId,
      city: input.city,
      userId: input.userId,
      language: input.language,
    })
    const { palaces, meta } = generateChart({
      solarDate: input.solarDate,
      timeIndex: input.timeIndex,
      gender: input.gender,
      longitude: input.longitude,
      city: input.city,
      userId: input.userId,
    })

    const currentYear = new Date().getFullYear()
    const currentDayun = natal.daYun?.steps.find(
      (s) => currentYear >= s.startYear && currentYear <= s.endYear
    )
    const dominantShishen = natal.shishen
      ? [natal.shishen.year?.name, natal.shishen.month?.name, natal.shishen.hour?.name]
          .filter((x): x is NonNullable<typeof x> => !!x)
          .join('、')
      : ''

    const soulPalace = palaces.find((p) => p.name === '命宫')
    const soulMajorStars = soulPalace?.majorStars ?? []
    const soulStarsBlock = soulMajorStars
      .map((s) => {
        const tags = [s.brightness, s.mutagen].filter(Boolean).join('·')
        return tags ? `${s.name}(${tags})` : s.name
      })
      .join('、')

    // Sibling palaces of 命宫 — 三方四正 anchors (财帛/官禄/迁移)
    const tripletNames = ['财帛', '官禄', '迁移']
    const tripletBlock = tripletNames
      .map((name) => {
        const p = palaces.find((q) => q.name === name)
        if (!p) return ''
        const stars = p.majorStars
          .map((s) => {
            const tags = [s.brightness, s.mutagen].filter(Boolean).join('·')
            return tags ? `${s.name}(${tags})` : s.name
          })
          .join('、')
        return stars ? `${name}：${stars}` : ''
      })
      .filter(Boolean)
      .join(' · ')

    // First 化忌 (mutagen='忌') star anywhere — 关键命格警示锚点
    let huajiHint = ''
    for (const p of palaces) {
      const ji = p.majorStars.find((s) => s.mutagen === '忌')
      if (ji) {
        huajiHint = `${ji.name}化忌于${p.name}`
        break
      }
    }

    const lines = [
      `公历：${input.solarDate} 时辰序号${input.timeIndex}（${input.gender === '男' ? '男命' : '女命'}）`,
      `八字：${natal.pillars.year.label} ${natal.pillars.month.label} ${natal.pillars.day.label} ${natal.pillars.hour.label}`,
      `日主：${natal.pillars.day.stem}（${natal.dayMasterWuXing}） · 强弱：${natal.geju.dayMasterStrength}`,
      `格局：${natal.geju.primary} · 喜用：${natal.geju.favorableElement} · 忌神：${natal.geju.unfavorableElement}`,
      natal.tiaohou
        ? `调候用神：${natal.tiaohou.gods.join('、')}（${natal.tiaohouSatisfied ? '已得用' : '未得用'}）`
        : '',
      dominantShishen ? `主要十神：${dominantShishen}` : '',
      `紫微命主：${meta.soul} · 身主：${meta.body} · 五行局：${meta.fiveElementsClass}`,
      soulStarsBlock ? `命宫主星：${soulStarsBlock}` : '命宫：无主星（借对宫）',
      tripletBlock ? `三方四正：${tripletBlock}` : '',
      huajiHint ? `化忌焦点：${huajiHint}` : '',
      currentDayun
        ? `当前大运：${currentDayun.ganZhi.label}（${currentDayun.startAge}-${currentDayun.endAge}岁，${currentDayun.startYear}-${currentDayun.endYear}年）`
        : '',
      `当前流年：${currentYear} 年`,
    ]

    return lines.filter(Boolean).join('\n')
  } catch (err) {
    console.error('[build-rich-facts] failed', err)
    return null
  }
}
