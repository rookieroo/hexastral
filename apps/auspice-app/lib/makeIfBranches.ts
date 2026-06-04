/**
 * make-if 人生分支 — deterministic alternate-life paths for the life timeline.
 *
 * The natal 八字 fixes the mainline, but every major fork (下海经商 / 读书入仕 /
 * 远行闯荡) sends a life down a different route that may rejoin fate at a
 * different age — or never. Two people can share a终点 yet walk completely
 * different roads to it. That "假如" is the Pro hook.
 *
 * These branches are DELIBERATELY fictional — a subscription teaser — and are a
 * different thing from the deterministic 黄历/宜忌 (which must be real). Even so,
 * generation is fully SEEDED (no Math.random) so a given 八字 always yields the
 * same branches and the payload stays cacheable, matching the timeline's
 * byte-for-byte contract.
 *
 * Phase 1+2 are pure-client + deterministic structure; the per-branch narrative
 * "假如你..." prose (hybrid LLM, cached) is Phase 3.
 */

export type MakeIfFit = '吉' | '平' | '凶'

export interface MakeIfDot {
  age: number
  fit: MakeIfFit
}

export interface MakeIfBranch {
  /** 'biz'|'scholar'|'roam' for presets; a `user-N` id for interactive forks. */
  id: string
  /** Distinct lane color (cinnabar / azurite / jade / …). */
  color: string
  label: string
  /** Terminal flavor — one line; the LLM narrative replaces it when present. */
  outcome: string
  divergeAtAge: number
  /** Age it merges back to the mainline, or null = runs to the end. */
  mergeAtAge: number | null
  dots: MakeIfDot[]
  /** A past "假如当年" reflection — drawn dimmer/dashed (已发生、不可改). */
  isPast?: boolean
}

/** A tappable node on the user's real mainline (interactive sandbox). */
export interface MakeIfMainNode {
  age: number
  label: string
  isPast: boolean
}

export interface MakeIfModel {
  startAge: number
  endAge: number
  /** The user's current age (onboarded), or null for the mock teaser. */
  currentAge: number | null
  /** Tappable mainline nodes — present only in the interactive sandbox. */
  mainNodes?: MakeIfMainNode[]
  branches: MakeIfBranch[]
}

const BRANCH_COLORS = ['#C0452E', '#3F6B86', '#5B8A4E'] as const

// ── Deterministic helpers (no RNG — same seed → same path) ───────────────────

function seededFit(seed: number, age: number): MakeIfFit {
  const h = Math.abs(Math.round(seed * 13 + age * 7)) % 5
  if (h === 0) return '凶'
  if (h === 4 || h === 2) return '吉'
  return '平'
}

function dotsBetween(from: number, to: number, seed: number): MakeIfDot[] {
  const out: MakeIfDot[] = []
  const span = Math.max(1, to - from)
  const n = Math.max(2, Math.min(5, Math.round(span / 8)))
  for (let i = 0; i <= n; i++) {
    const age = Math.round(from + (span * i) / n)
    out.push({ age, fit: seededFit(seed + i, age) })
  }
  return out
}

/** Stable seed from the day pillar so the same 八字 always forks the same way. */
export function makeIfSeedFromPillar(stem: string, branch: string): number {
  const STEMS = '甲乙丙丁戊己庚辛壬癸'
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
  return (STEMS.indexOf(stem) + 1) * 12 + (BRANCHES.indexOf(branch) + 1)
}

// ── Models ───────────────────────────────────────────────────────────────────

/** Mock teaser for un-onboarded users — a generic life with 3 vivid forks. */
export function makeIfTeaser(copy: MakeIfCopy): MakeIfModel {
  const startAge = 18
  const endAge = 84
  const [biz, scholar, roam] = copy.branches
  return {
    startAge,
    endAge,
    currentAge: null,
    branches: [
      branch('biz', BRANCH_COLORS[0], biz, 27, 56, 11),
      branch('scholar', BRANCH_COLORS[1], scholar, 23, null, 23, endAge),
      branch('roam', BRANCH_COLORS[2], roam, 38, 64, 37),
    ],
  }
}

/** Onboarded future — branches fork AFTER the user's current age, seeded by 八字. */
export function makeIfFromBazi(copy: MakeIfCopy, seed: number, currentAge: number): MakeIfModel {
  const startAge = Math.max(0, currentAge - 3)
  const endAge = Math.min(94, currentAge + 46)
  const clampMerge = (a: number) => Math.min(endAge - 2, a)
  const [biz, scholar, roam] = copy.branches
  const d0 = currentAge + 2
  const d1 = currentAge + 5
  const d2 = currentAge + 10
  return {
    startAge,
    endAge,
    currentAge,
    branches: [
      branch('biz', BRANCH_COLORS[0], biz, d0, clampMerge(d0 + 22), seed + 1),
      branch('scholar', BRANCH_COLORS[1], scholar, d1, null, seed + 2, endAge),
      branch('roam', BRANCH_COLORS[2], roam, d2, clampMerge(d2 + 16), seed + 3),
    ],
  }
}

function branch(
  id: MakeIfBranch['id'],
  color: string,
  copy: BranchCopy,
  divergeAtAge: number,
  mergeAtAge: number | null,
  seed: number,
  endAge = 84
): MakeIfBranch {
  return {
    id,
    color,
    label: copy.label,
    outcome: copy.outcome,
    divergeAtAge,
    mergeAtAge,
    dots: dotsBetween(divergeAtAge, mergeAtAge ?? endAge, seed),
  }
}

// ── Interactive sandbox (Phase 4) ─────────────────────────────────────────────

const USER_BRANCH_COLORS = ['#C0452E', '#3F6B86', '#5B8A4E', '#9B7A2F', '#7A5A9B'] as const

function hashString(s: string): number {
  let h = 2_166_136_261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return h >>> 0
}

/** The user's real mainline (大运 nodes) — the spine they fork "假如" branches off. */
export function buildInteractiveModel(
  dayun: ReadonlyArray<{ startAge: number; endAge: number; label: string }>,
  currentAge: number | null
): MakeIfModel {
  const startAge = dayun[0]?.startAge ?? 0
  const last = dayun[dayun.length - 1]
  const endAge = last ? last.endAge : startAge + 80
  const mainNodes: MakeIfMainNode[] = dayun.map((d) => ({
    age: d.startAge,
    label: d.label,
    isPast: currentAge != null && d.endAge <= currentAge,
  }))
  return { startAge, endAge, currentAge, mainNodes, branches: [] }
}

/** A user-authored "假如" fork off a node — structure seeded by the event so it's
 *  deterministic + cacheable; the LLM narrative fills `outcome` afterwards. */
export function buildUserBranch(opts: {
  id: string
  event: string
  divergeAtAge: number
  mergeAtAge: number | null
  endAge: number
  isPast?: boolean
}): MakeIfBranch {
  const seed = hashString(opts.event) + opts.divergeAtAge
  const color =
    USER_BRANCH_COLORS[hashString(opts.id) % USER_BRANCH_COLORS.length] ?? USER_BRANCH_COLORS[0]
  return {
    id: opts.id,
    color,
    label: opts.event,
    outcome: '',
    divergeAtAge: opts.divergeAtAge,
    mergeAtAge: opts.mergeAtAge,
    dots: dotsBetween(opts.divergeAtAge, opts.mergeAtAge ?? opts.endAge, seed),
    isPast: opts.isPast,
  }
}

// ── Localized copy (self-contained, like core-ui's field-label helpers) ───────

interface BranchCopy {
  label: string
  outcome: string
}

export interface MakeIfCopy {
  teaserTitle: string
  teaserBody: string
  sectionTitle: string
  /** Pro unlock CTA on the locked branch section. */
  lockedCta: string
  /** Free-tier hint under the section. */
  proHint: string
  nowLabel: string
  /** make-if explainer sheet (shown when a Free user taps the locked graph). */
  explainTitle: string
  explainRules: readonly string[]
  explainUnlock: string
  /** Fixed 3-tuple, ordered: business / scholarship / roaming. */
  branches: readonly [BranchCopy, BranchCopy, BranchCopy]
}

export function makeIfCopyForLocale(locale: string): MakeIfCopy {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') {
    return {
      teaserTitle: '假如 · 人生的另外幾種可能',
      teaserBody: '每一個重要抉擇，都通向另一種人生。錄入生辰，看你自己的人生線從哪裡分岔。',
      sectionTitle: '假如 · 你的另外幾種人生',
      lockedCta: '解鎖你的另外幾種人生 · make-if',
      proHint: '已過去的人生按八字如實顯示；未來的分岔留待解鎖。',
      nowLabel: '今',
      explainTitle: '關於 make-if · 假如',
      explainRules: [
        '虛線是「假如」的人生分支，實線是你真實的命盤主線。',
        '每個重要抉擇都會讓人生分岔——有的中年回歸本命，有的一路到底；終點也許相同，路途截然不同。',
        '解鎖後，這幾條分支會由你的八字生成，成為只屬於你的「另外幾種人生」。',
      ],
      explainUnlock: '解鎖我的 make-if',
      branches: [
        { label: '下海經商', outcome: '早年大富大貴，中年激進豪賭，早早回到命運終點。' },
        { label: '讀書入仕', outcome: '讀書改命，矜矜業業，晚年壽終正寢。' },
        { label: '遠行闖蕩', outcome: '遠走他鄉，幾度起落，中年歸來復歸本命。' },
      ],
    }
  }
  if (locale.startsWith('zh')) {
    return {
      teaserTitle: '假如 · 人生的另外几种可能',
      teaserBody: '每一个重要抉择，都通向另一种人生。录入生辰，看你自己的人生线从哪里分岔。',
      sectionTitle: '假如 · 你的另外几种人生',
      lockedCta: '解锁你的另外几种人生 · make-if',
      proHint: '已过去的人生按八字如实显示；未来的分岔留待解锁。',
      nowLabel: '今',
      explainTitle: '关于 make-if · 假如',
      explainRules: [
        '虚线是「假如」的人生分支，实线是你真实的命盘主线。',
        '每个重要抉择都会让人生分岔——有的中年回归本命，有的一路到底；终点也许相同，路途截然不同。',
        '解锁后，这几条分支会由你的八字生成，成为只属于你的「另外几种人生」。',
      ],
      explainUnlock: '解锁我的 make-if',
      branches: [
        { label: '下海经商', outcome: '早年大富大贵，中年激进豪赌，早早回到命运终点。' },
        { label: '读书入仕', outcome: '读书改命，矜矜业业，晚年寿终正寝。' },
        { label: '远行闯荡', outcome: '远走他乡，几度起落，中年归来复归本命。' },
      ],
    }
  }
  if (locale.startsWith('ja')) {
    return {
      teaserTitle: 'もしも · もう一つの人生',
      teaserBody:
        '重要な選択のたびに、別の人生へ枝分かれする。生年月日を入れて、あなたの人生線がどこで分岐するか見てみよう。',
      sectionTitle: 'もしも · あなたのもう一つの人生',
      lockedCta: 'もう一つの人生を解錠 · make-if',
      proHint: '過ぎた人生は八字どおりに表示。未来の分岐は解錠でひらく。',
      nowLabel: '今',
      explainTitle: 'make-if とは · もしも',
      explainRules: [
        '点線は「もしも」の人生分岐、実線はあなたの本当の命盤の主線。',
        'どの重要な選択も人生を分岐させる——中年で本命へ戻る道も、最後まで進む道もある。終点は同じでも、道はまるで違う。',
        '解錠すると、これらの分岐があなたの八字から生成され、あなただけの「もう一つの人生」になる。',
      ],
      explainUnlock: '自分の make-if を解錠',
      branches: [
        {
          label: '起業・商売',
          outcome: '若くして巨万の富、中年で無謀な賭けに走り、早々に命運の果てへ。',
        },
        { label: '学問・官途', outcome: '学びで運命を変え、堅実に勤め、晩年は天寿を全うする。' },
        { label: '放浪・遠行', outcome: '遠く旅立ち、浮き沈みを経て、中年で帰郷し本命へ戻る。' },
      ],
    }
  }
  return {
    teaserTitle: 'What if · the other lives you could live',
    teaserBody:
      'Every major choice forks into a different life. Add your birth details to see where your own line branches.',
    sectionTitle: 'What if · your other lives',
    lockedCta: 'Unlock your other lives · make-if',
    proHint: 'Your past is drawn faithfully from your 八字; the future forks stay sealed.',
    nowLabel: 'now',
    explainTitle: 'About make-if · what if',
    explainRules: [
      'Dashed lines are "what-if" forks; the solid line is your real chart.',
      'Every major choice forks a life — some return to fate mid-life, some run to the end. Same destination, completely different road.',
      'Unlock to grow these forks from your own 八字 — the other lives that could be yours.',
    ],
    explainUnlock: 'Unlock my make-if',
    branches: [
      {
        label: 'Build a business',
        outcome: 'Early fortune, then a reckless mid-life gamble that returns you to fate fast.',
      },
      { label: 'Study & serve', outcome: 'Study rewrites fate; steady work; a peaceful old age.' },
      {
        label: 'Wander far',
        outcome: 'Leave home, rise and fall, return mid-life and rejoin your true line.',
      },
    ],
  }
}

// ── Interactive-sandbox copy (Phase 4) ────────────────────────────────────────

export interface MakeIfInteractiveCopy {
  screenTitle: string
  tapHint: string
  /** "假如当年 X 岁…" (past) / "假如在 X 岁…" (present/future). */
  forkTitle: (age: number, isPast: boolean) => string
  eventChips: readonly string[]
  eventPlaceholder: string
  submit: string
  generating: string
  /** Per-fork feedback when the narrative failed / the daily limit was hit. */
  failedRetry: string
  limited: string
  /** Compliance gate shown before the first fork. */
  disclaimerTitle: string
  disclaimerBody: string
  disclaimerAck: string
  /** Persistent footer. */
  footer: string
  /** Free-tier lock. */
  unlockTitle: string
  unlockBody: string
  unlockCta: string
  /** Swipe-to-reveal row actions (replaces the cramped inline icon row). */
  swipeHint: string
  share: string
  delete: string
}

export function makeIfInteractiveCopyForLocale(locale: string): MakeIfInteractiveCopy {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') {
    return {
      screenTitle: '假如人生',
      tapHint: '點主線上任一節點，假設一個選擇，推演另一種人生。',
      forkTitle: (age, isPast) => (isPast ? `假如當年 ${age} 歲…` : `假如在 ${age} 歲…`),
      eventChips: ['創業', '結婚', '移居海外', '轉行', '讀研深造', '辭職遠行'],
      eventPlaceholder: '自訂一個事件…',
      submit: '推演',
      generating: '推演中…',
      failedRetry: '推演失敗 · 點此重試',
      limited: '今日推演次數已用完',
      disclaimerTitle: '開始前請知悉',
      disclaimerBody:
        'make-if 是基於你八字的命理推演與參考，並非預言，也不替你做決定。過去無法改變，所以是「假如」；改變現在或未來的假設僅用於自我探索。現實中的每個選擇與後果，都由你自己獨立判斷、自行承擔。',
      disclaimerAck: '我已理解，繼續',
      footer: '僅供參考與省思，非預測或建議；一切現實決定由你自行承擔。',
      unlockTitle: 'make-if · 假如人生',
      unlockBody: '解鎖後，可在你真實人生線的任一節點假設一個選擇，由你的八字推演出另一種人生。',
      unlockCta: '解鎖假如人生',
      swipeHint: '向左滑動分支以分享或刪除',
      share: '分享',
      delete: '刪除',
    }
  }
  if (locale.startsWith('zh')) {
    return {
      screenTitle: '假如人生',
      tapHint: '点主线上任一节点，假设一个选择，推演另一种人生。',
      forkTitle: (age, isPast) => (isPast ? `假如当年 ${age} 岁…` : `假如在 ${age} 岁…`),
      eventChips: ['创业', '结婚', '移居海外', '转行', '读研深造', '辞职远行'],
      eventPlaceholder: '自定义一个事件…',
      submit: '推演',
      generating: '推演中…',
      failedRetry: '推演失败 · 点此重试',
      limited: '今日推演次数已用完',
      disclaimerTitle: '开始前请知悉',
      disclaimerBody:
        'make-if 是基于你八字的命理推演与参考，并不是预言，也不替你做决定。过去无法改变，所以是「假如」；改变现在或未来的假设只用于自我探索。现实中的每一个选择与后果，都由你自己独立判断、自行承担。',
      disclaimerAck: '我已理解，继续',
      footer: '仅供参考与省思，非预测或建议；一切现实决定由你自行承担。',
      unlockTitle: 'make-if · 假如人生',
      unlockBody: '解锁后，可在你真实人生线的任一节点假设一个选择，由你的八字推演出另一种人生。',
      unlockCta: '解锁假如人生',
      swipeHint: '向左滑动分支以分享或删除',
      share: '分享',
      delete: '删除',
    }
  }
  if (locale.startsWith('ja')) {
    return {
      screenTitle: 'もしもの人生',
      tapHint: '本線の任意の節点をタップし、ある選択を仮定して別の人生を描いてみよう。',
      forkTitle: (age, isPast) => (isPast ? `もし ${age} 歳のあのとき…` : `もし ${age} 歳で…`),
      eventChips: ['起業', '結婚', '海外移住', '転職', '大学院進学', '退職して旅へ'],
      eventPlaceholder: 'イベントを自由に入力…',
      submit: '推演する',
      generating: '推演中…',
      failedRetry: '生成に失敗 · タップで再試行',
      limited: '本日の推演回数の上限に達しました',
      disclaimerTitle: 'はじめる前に',
      disclaimerBody:
        'make-if は八字に基づく推演と参考であり、予言ではなく、あなたの代わりに決定するものでもありません。過去は変えられないため「もしも」です。現在や未来の仮定は自己探索のためのものです。現実のすべての選択と結果は、あなた自身の判断と責任で行われます。',
      disclaimerAck: '理解しました。続ける',
      footer:
        '参考と内省のためのもので、予測や助言ではありません。現実の決定はすべてご自身の責任です。',
      unlockTitle: 'make-if · もしもの人生',
      unlockBody:
        '解錠すると、あなたの本当の人生線の任意の節点で選択を仮定し、八字からもう一つの人生を描けます。',
      unlockCta: 'もしもの人生を解錠',
      swipeHint: '分岐を左にスワイプして共有または削除',
      share: '共有',
      delete: '削除',
    }
  }
  return {
    screenTitle: 'make-if',
    tapHint: 'Tap any node on your line, assume a choice, and explore another life.',
    forkTitle: (age, isPast) => (isPast ? `If, back at ${age}…` : `If, at ${age}…`),
    eventChips: [
      'Start a business',
      'Marry',
      'Move abroad',
      'Switch careers',
      'Grad school',
      'Quit & travel',
    ],
    eventPlaceholder: 'Or type your own event…',
    submit: 'Explore',
    generating: 'Exploring…',
    failedRetry: 'Failed · tap to retry',
    limited: 'Daily limit reached',
    disclaimerTitle: 'Before you begin',
    disclaimerBody:
      'make-if is Ba Zi-based exploration and reflection — not a prediction, and it does not decide for you. The past cannot be changed, so it is a "what-if"; exploring a present or future choice is for self-reflection only. Every real-world choice and consequence is yours alone, at your own judgment and responsibility.',
    disclaimerAck: 'I understand — continue',
    footer: 'For reflection only, not prediction or advice; all real decisions are your own.',
    unlockTitle: 'make-if · what-if lives',
    unlockBody:
      'Unlock to assume a choice at any node of your real life line and let your 八字 explore another life.',
    unlockCta: 'Unlock make-if',
    swipeHint: 'Swipe a branch left to share or delete',
    share: 'Share',
    delete: 'Delete',
  }
}
