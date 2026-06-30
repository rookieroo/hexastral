/**
 * 形理整合 (form-li) — 玄空理气 × 峦头形势 correlation.
 *
 * The multiplier layer: it joins the flying-star charts (D1) with the per-palace
 * landform (砂/水/形煞) to produce 山管人丁、水管财 verdicts — the conclusions a
 * 师傅 reaches, not raw data. Deterministic; the synthesis LLM narrates from it.
 *
 * Core doctrine (沈氏玄空 形理兼察):
 *   - 当旺**山星**方 宜见山/实/静 → 见山旺丁；见水/空损丁。
 *   - 当旺**向星**方 宜见水/动/开阔 → 见水旺财；见山逼压破财。
 *   - 失令之向星见水 → 财气反泄（破财）。
 *   - 二黑/五黄 失令方 见水动或形煞 → 引动病符灾煞（动凶）。
 *   - 零正：正神方宜山、零神(合十对宫)方宜水；反则损丁破财。
 *   - 格局救应：上山下水得「后水前山」则救；旺山旺向得「坐山向水」则真旺。
 */

import type { NineChart, StarQuality, YuanYun } from './flying-stars'
import { classifyStar, isProsperous } from './flying-stars'
import type { BaguaPalace } from './twenty-four-mountains'
import { LUOSHU_TO_PALACE } from './twenty-four-mountains'

/** The 8 outer palaces (excludes 中). */
const BAGUA_PALACES: readonly BaguaPalace[] = ['坎', '坤', '震', '巽', '乾', '兑', '艮', '离']

/** Landform present in one palace (from vision 砂/水/形煞, binned by direction). */
export interface PalaceForm {
  /** 砂 / 山 / 实体 / 高地 / 后靠. */
  hasMountain: boolean
  /** 水 / 路 / 明堂 / 开阔低空 (虚水). */
  hasWater: boolean
  /** 形煞 (路冲/反弓/尖角/天斩 …). */
  hasSha: boolean
}

export type FormByPalace = Record<BaguaPalace, PalaceForm>

export type FormLiVerdict = '旺丁' | '旺财' | '损丁' | '破财' | '动凶' | '化煞' | '平'

export interface PalaceFormLi {
  palace: BaguaPalace
  mountainStar: YuanYun
  facingStar: YuanYun
  mountainQuality: StarQuality
  facingQuality: StarQuality
  form: PalaceForm
  findings: { verdict: FormLiVerdict; reason: string }[]
}

export interface ZhengLingShen {
  /** 正神方 (当运卦位) — 宜见山/实. undefined in 5运. */
  zhengShen?: BaguaPalace
  /** 零神方 (合十对宫) — 宜见水. undefined in 5运. */
  lingShen?: BaguaPalace
  findings: { palace: BaguaPalace; auspicious: boolean; reason: string }[]
}

export interface PatternRescue {
  pattern: string
  /** true = 形势配合得用; false = 形势不配/无救. */
  favourable: boolean
  note: string
}

export interface FormLiInput {
  /** Current 元运 (for 旺衰 judgement). */
  yuanYun: YuanYun
  mountainChart: NineChart<YuanYun>
  facingChart: NineChart<YuanYun>
  formByPalace: FormByPalace
  sitPalace?: BaguaPalace
  facePalace?: BaguaPalace
  /** Pattern kinds from `detectPatterns` (only the kind string is needed). */
  patterns?: ReadonlyArray<{ kind: string }>
}

export interface FormLiResult {
  /** Only palaces with at least one finding (focused output). */
  palaces: PalaceFormLi[]
  zhengLing: ZhengLingShen
  patternRescue: PatternRescue[]
}

const isSickStar = (s: YuanYun): boolean => s === 2 || s === 5 // 病符 / 五黄

function correlatePalace(
  palace: BaguaPalace,
  mountainStar: YuanYun,
  facingStar: YuanYun,
  yuanYun: YuanYun,
  form: PalaceForm
): PalaceFormLi {
  const findings: { verdict: FormLiVerdict; reason: string }[] = []
  const mPros = isProsperous(mountainStar, yuanYun)
  const fPros = isProsperous(facingStar, yuanYun)

  // 山管人丁 — 当旺山星宜见山.
  if (mPros) {
    if (form.hasMountain) {
      findings.push({
        verdict: '旺丁',
        reason: `当旺山星${mountainStar}得${palace}方山实，主丁旺、健康`,
      })
    } else if (form.hasWater) {
      findings.push({
        verdict: '损丁',
        reason: `当旺山星${mountainStar}于${palace}方见水，主损丁——宜垫高、置实物屏障`,
      })
    }
  }

  // 水管财 — 当旺向星宜见水.
  if (fPros) {
    if (form.hasWater) {
      findings.push({
        verdict: '旺财',
        reason: `当旺向星${facingStar}得${palace}方水/路，主财气亨通`,
      })
    } else if (form.hasMountain) {
      findings.push({
        verdict: '破财',
        reason: `当旺向星${facingStar}于${palace}方受山逼压，财路受阻——宜开阔、引水`,
      })
    }
  }

  // 失令凶星被引动 / 衰向星见水反泄.
  if (!fPros && form.hasWater) {
    if (isSickStar(facingStar)) {
      findings.push({
        verdict: '动凶',
        reason: `${palace}方失令${facingStar}(病符/五黄)见水动，引动凶星——宜静、忌动土，以金泄之`,
      })
    } else {
      findings.push({ verdict: '破财', reason: `${palace}方衰向星${facingStar}见水，财气反泄` })
    }
  }
  if (!mPros && isSickStar(mountainStar) && form.hasMountain) {
    findings.push({
      verdict: '动凶',
      reason: `${palace}方失令${mountainStar}(病符/五黄)叠实山，病符得力——宜疏空、化以金水`,
    })
  }

  // 形煞 overlay (always actionable).
  if (form.hasSha) {
    findings.push({ verdict: '化煞', reason: `${palace}方有形煞，需对症化解（详见化解章）` })
  }

  return {
    palace,
    mountainStar,
    facingStar,
    mountainQuality: classifyStar(mountainStar, yuanYun),
    facingQuality: classifyStar(facingStar, yuanYun),
    form,
    findings,
  }
}

/** 零正神 form check. */
function zhengLingShen(yuanYun: YuanYun, formByPalace: FormByPalace): ZhengLingShen {
  if (yuanYun === 5) return { findings: [] } // 5运 零正分上下元，从略
  const zhengShen = LUOSHU_TO_PALACE[yuanYun as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9]
  const lingShen = LUOSHU_TO_PALACE[(10 - yuanYun) as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9]
  const findings: ZhengLingShen['findings'] = []
  const zForm = formByPalace[zhengShen]
  const lForm = formByPalace[lingShen]
  if (zForm.hasMountain)
    findings.push({
      palace: zhengShen,
      auspicious: true,
      reason: `正神${zhengShen}方见山实，得位旺丁`,
    })
  if (zForm.hasWater)
    findings.push({
      palace: zhengShen,
      auspicious: false,
      reason: `正神${zhengShen}方见水（正神下水），主损丁`,
    })
  if (lForm.hasWater)
    findings.push({ palace: lingShen, auspicious: true, reason: `零神${lingShen}方见水，得位旺财` })
  if (lForm.hasMountain)
    findings.push({
      palace: lingShen,
      auspicious: false,
      reason: `零神${lingShen}方见山（零神上山），主破财`,
    })
  return { zhengShen, lingShen, findings }
}

/** 格局 × 形势 救应. */
function patternRescue(
  patterns: ReadonlyArray<{ kind: string }>,
  formByPalace: FormByPalace,
  sitPalace?: BaguaPalace,
  facePalace?: BaguaPalace
): PatternRescue[] {
  if (!sitPalace || !facePalace) return []
  const sit = formByPalace[sitPalace]
  const face = formByPalace[facePalace]
  const out: PatternRescue[] = []
  for (const { kind } of patterns) {
    if (kind === '上山下水') {
      const rescued = sit.hasWater && face.hasMountain
      out.push({
        pattern: '上山下水',
        favourable: rescued,
        note: rescued
          ? '上山下水得「坐后有水、向前有山」之形势救应，反凶为用'
          : '上山下水而形势不配（坐宜水、向宜山），损丁破财之患，亟需布局化解',
      })
    } else if (kind === '旺山旺向') {
      const real = sit.hasMountain && face.hasWater
      out.push({
        pattern: '旺山旺向',
        favourable: real,
        note: real
          ? '旺山旺向且坐山见山、向首见水，形理俱合，丁财两旺之真局'
          : '旺山旺向之吉局，惜形势未配合（坐宜山、向宜水），宜补形势以全其旺',
      })
    } else if (kind === '双星会向') {
      out.push({
        pattern: '双星会向',
        favourable: face.hasWater,
        note: face.hasWater
          ? '双星会向且向首见水，旺财得用'
          : '双星会向宜向首见水放光，今缺水，财气待引',
      })
    } else if (kind === '双星会坐') {
      out.push({
        pattern: '双星会坐',
        favourable: sit.hasMountain,
        note: sit.hasMountain
          ? '双星会坐且坐后见山，旺丁得用'
          : '双星会坐宜坐后见山为靠，今缺靠，丁气待实',
      })
    }
  }
  return out
}

/** Top-level 形理整合 — per-palace verdicts + 零正 + 格局救应. */
export function correlateFormAndStars(input: FormLiInput): FormLiResult {
  const { yuanYun, mountainChart, facingChart, formByPalace, sitPalace, facePalace, patterns } =
    input
  const palaces = BAGUA_PALACES.map((p) =>
    correlatePalace(p, mountainChart[p], facingChart[p], yuanYun, formByPalace[p])
  ).filter((pl) => pl.findings.length > 0)
  return {
    palaces,
    zhengLing: zhengLingShen(yuanYun, formByPalace),
    patternRescue: patternRescue(patterns ?? [], formByPalace, sitPalace, facePalace),
  }
}

/** Build an all-false {@link FormByPalace} to fill in. */
export function emptyFormByPalace(): FormByPalace {
  return BAGUA_PALACES.reduce((acc, p) => {
    acc[p] = { hasMountain: false, hasWater: false, hasSha: false }
    return acc
  }, {} as FormByPalace)
}
