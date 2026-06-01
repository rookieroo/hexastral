/**
 * 生肖 relationship between two birth dates — deterministic, client-side (no API,
 * no LLM). Drives the Pro 关系 reading. Uses the birth-YEAR 地支 (生肖); the
 * verdict is 合 (六合 / 三合) · 冲 (六冲) · 平 (otherwise).
 */

const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

/** 0=子 … 11=亥, from the birth year (子 anchors on year ≡ 4 mod 12). */
function branchIndex(solarDate: string): number | null {
  const m = /^(\d{4})-/.exec(solarDate)
  if (!m) return null
  const year = Number(m[1])
  if (year < 1900) return null // year unknown (sentinel 0000) → no 生肖
  return (((year - 4) % 12) + 12) % 12
}

/** 六合 partner of each 地支 (子丑 寅亥 卯戌 辰酉 巳申 午未). */
const LIUHE: Record<number, number> = {
  0: 1,
  1: 0,
  2: 11,
  11: 2,
  3: 10,
  10: 3,
  4: 9,
  9: 4,
  5: 8,
  8: 5,
  6: 7,
  7: 6,
}

/** 三合 groups: 申子辰 · 亥卯未 · 寅午戌 · 巳酉丑. */
const SANHE: ReadonlyArray<readonly number[]> = [
  [8, 0, 4],
  [11, 3, 7],
  [2, 6, 10],
  [5, 9, 1],
]

export type RelVerdict = '合' | '冲' | '平'

export interface RelationshipResult {
  selfAnimal: string
  otherAnimal: string
  verdict: RelVerdict
}

/** 生肖 animal char for a birth date, e.g. "马" — or '' if unparseable. */
export function animalOf(solarDate: string): string {
  const b = branchIndex(solarDate)
  return b === null ? '' : (ANIMALS[b] ?? '')
}

export function relationship(selfDate: string, otherDate: string): RelationshipResult | null {
  const a = branchIndex(selfDate)
  const b = branchIndex(otherDate)
  if (a === null || b === null) return null

  let verdict: RelVerdict = '平'
  if ((a - b + 12) % 12 === 6)
    verdict = '冲' // 六冲 — opposite branches
  else if (LIUHE[a] === b) verdict = '合'
  else if (SANHE.some((g) => g.includes(a) && g.includes(b))) verdict = '合'

  return { selfAnimal: ANIMALS[a] ?? '', otherAnimal: ANIMALS[b] ?? '', verdict }
}
