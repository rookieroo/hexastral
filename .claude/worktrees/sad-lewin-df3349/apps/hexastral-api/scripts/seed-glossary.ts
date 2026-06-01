#!/usr/bin/env bun
/**
 * seed-glossary.ts — 命盘术语词库 (chart_glossary) D1 批量导入
 *
 * 用法:
 *   bun run scripts/seed-glossary.ts            # 本地 D1
 *   bun run scripts/seed-glossary.ts --remote   # 生产 D1（需确认）
 *
 * 幂等性: INSERT OR IGNORE — UNIQUE 约束去重，安全重复执行
 *         --replace 旗标改用 INSERT OR REPLACE — 用于更新已有内容
 */

import { randomUUID } from 'node:crypto'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const isRemote = Bun.argv.includes('--remote')
const isReplace = Bun.argv.includes('--replace')
const flag = isRemote ? '--remote' : '--local'
const DB_NAME = 'hexastral-db'
const API_ROOT = join(import.meta.dir, '..')

// ── Types ──────────────────────────────────────────────────────────────────

type GlossaryRow = {
  id: string
  key: string
  category: string
  lang: string
  title: string
  body_md: string
  variant: string
  active: number
  created_at: string
  updated_at: string
}

// ── Seed data ──────────────────────────────────────────────────────────────

type EntryInput = Omit<GlossaryRow, 'id' | 'active' | 'created_at' | 'updated_at' | 'variant'>

const NOW = new Date().toISOString()

const ENTRIES: EntryInput[] = [
  // ── 天干 (Heavenly Stems) ─────────────────────────────────────────────
  {
    key: 'stem:甲',
    category: 'stem',
    lang: 'zh',
    title: '甲木 — 参天大树',
    body_md:
      '甲为十天干之首，属阳木，象征一棵参天大树。\n\n**性格**：正直、进取、有领袖气质，喜欢向上发展、掌控全局。\n\n**优势**：行事果断，目标明确，富有原则。\n\n**注意**：过于刚直时可能显得固执，不善变通，容易在"克"运中折断。\n\n**事业适性**：管理、法律、教育、创业。',
  },
  {
    key: 'stem:甲',
    category: 'stem',
    lang: 'en',
    title: 'Jiǎ Wood — Towering Tree',
    body_md:
      "Jiǎ is the first of the Ten Heavenly Stems, representing Yang Wood — a tall, upright tree.\n\n**Personality**: Principled, ambitious, leadership-oriented; drawn to growth and control.\n\n**Strengths**: Decisive, goal-driven, highly principled.\n\n**Watch out for**: Can be stubborn and inflexible; vulnerable in 'controlling' cycles.\n\n**Best careers**: Management, law, education, entrepreneurship.",
  },
  {
    key: 'stem:壬',
    category: 'stem',
    lang: 'zh',
    title: '壬水 — 江河湖海',
    body_md:
      '壬为阳水，象征宽广奔涌的江河湖海。\n\n**性格**：志向辽阔，思维奔放，善于谋划大局，充满冒险精神。\n\n**优势**：适应能力强，眼界开阔，有号召力。\n\n**注意**：情绪起伏较大，做事虎头蛇尾，需配合土（堤坝）来约束。\n\n**事业适性**：金融、旅游、外贸、传播媒体。',
  },
  {
    key: 'stem:壬',
    category: 'stem',
    lang: 'en',
    title: 'Rén Water — River & Ocean',
    body_md:
      "Rén is Yang Water — vast rivers and oceans.\n\n**Personality**: Ambitious, free-thinking, strategic thinker with an adventurous spirit.\n\n**Strengths**: Highly adaptable, broad-minded, magnetic.\n\n**Watch out for**: Emotional fluctuations; tendency to start strong but not finish. Needs Earth (dam) to channel energy.\n\n**Best careers**: Finance, travel, international trade, media.",
  },

  // ── 十神 (Ten Gods) ──────────────────────────────────────────────────
  {
    key: 'shishen:正官',
    category: 'shishen',
    lang: 'zh',
    title: '正官 — 事业与责任',
    body_md:
      '正官是克日主且与日主阴阳相异的五行，是八字中最重要的神煞之一。\n\n**象征**：职业地位、法律规范、责任担当；对女命而言代表正式伴侣。\n\n**有官星透出**：思维严谨、守规矩、有事业心，适合体制内晋升路线。\n\n**官星过旺（无印护）**：压力过大、容易被管控，需用印星（学历/资历）来化解。\n\n**官星弱或无**：相对随性，需靠自身努力而非等贵人。',
  },
  {
    key: 'shishen:正官',
    category: 'shishen',
    lang: 'en',
    title: 'Direct Officer — Career & Duty',
    body_md:
      "Direct Officer controls the Day Master with opposite yin/yang polarity — one of the most important gods in BaZi.\n\n**Symbolizes**: Career status, rules, responsibility; for women, the primary partner.\n\n**When prominent**: Disciplined, structured, career-focused; thrives in institutional paths.\n\n**When too strong (no Resource buffer)**: Excessive pressure; needs Resource (印) to manage.\n\n**When weak/absent**: More free-spirited; success comes from personal drive rather than patronage.",
  },
  {
    key: 'shishen:七杀',
    category: 'shishen',
    lang: 'zh',
    title: '七杀 — 挑战与行动力',
    body_md:
      '七杀（又称"偏官"）是克日主且与日主阴阳相同的五行。\n\n**象征**：压力、挑战、权威、果决行动。\n\n**七杀有制（食神制杀/印绶化杀）**：化挑战为动力，主将帅之才，事业成就极高。\n\n**七杀无制**：冲动、易惹是非，压力难以化解，需特别注意健康与人际冲突。\n\n**事业适性**：军警、金融交易、竞技体育、外科手术。',
  },
  {
    key: 'shishen:七杀',
    category: 'shishen',
    lang: 'en',
    title: 'Seven Killings — Challenge & Drive',
    body_md:
      "Seven Killings (also called Indirect Officer) controls the Day Master with the **same** yin/yang polarity.\n\n**Symbolizes**: Pressure, challenges, authority, decisive action.\n\n**When controlled (by Output or Resource)**: Transforms pressure into drive — the mark of commanders and high achievers.\n\n**When uncontrolled**: Impulsive, conflict-prone, health risks; pressure cannot be channeled.\n\n**Best careers**: Military, financial trading, competitive sports, surgery.",
  },

  // ── 格局 (Pattern) ─────────────────────────────────────────────────────
  {
    key: 'geju:正官格',
    category: 'geju',
    lang: 'zh',
    title: '正官格 — 仕途稳健',
    body_md:
      '月令官星透干，以正官为用神，是最传统的贵格之一。\n\n**核心优势**：逻辑清晰，守规重法，社会适应能力强，善于在体制内晋升。\n\n**喜用**：印绶（化官护身）、财星（养官生旺）。\n\n**忌讳**：伤官见官（强烈冲克），七杀混官（官格混浊）。\n\n**典型路径**：公务员、律师、企业中高管、学术权威。\n\n**运势提示**：官星旺运（岁运带官印）时往往有晋升、荣誉或婚姻。',
  },
  {
    key: 'geju:正官格',
    category: 'geju',
    lang: 'en',
    title: 'Direct Officer Pattern — Steady Career',
    body_md:
      "The month branch reveals Direct Officer, which becomes the favorable god — one of the most prestigious BaZi patterns.\n\n**Core strength**: Logical, law-abiding, socially adaptable; excels within established institutions.\n\n**Favorable elements**: Resource (印 — shields and empowers the Officer); Wealth (财 — nourishes the Officer).\n\n**Avoid**: Hurting Officer clashing Officer; Seven Killings mixing with Officer (muddies the pattern).\n\n**Typical paths**: Civil service, law, corporate management, academia.\n\n**Timing**: Officer or Resource luck cycles often bring promotions, honors, or marriage.",
  },
  {
    key: 'geju:食神格',
    category: 'geju',
    lang: 'zh',
    title: '食神格 — 才艺与口福',
    body_md:
      '月令食神透干或藏干有力，以食神为用神。\n\n**核心优势**：才华横溢，生活品味高，人缘好，喜美食与艺术。\n\n**喜用**：财星（食神生财，化才为富）；印星（紧急时护身）。\n\n**忌讳**：偏印（枭神夺食，破坏格局）；七杀无制。\n\n**典型路径**：厨师/餐饮、艺术设计、写作、教育、咨询顾问。\n\n**运势提示**：食神旺运时易有才华被赏识、副业收入或饮食口福。',
  },
  {
    key: 'geju:食神格',
    category: 'geju',
    lang: 'en',
    title: 'Eating God Pattern — Talent & Abundance',
    body_md:
      "Month branch shows Eating God with power to spare, making it the favorable god.\n\n**Core strength**: Talented, refined tastes, charismatic; loves food, art, and beautiful things.\n\n**Favorable elements**: Wealth (食神生财 — talent converts to wealth); Resource in emergencies.\n\n**Avoid**: Indirect Resource (the 'Robber Bird' — Eating God's nemesis); uncontrolled Seven Killings.\n\n**Typical paths**: Culinary arts, design, writing, education, consulting.\n\n**Timing**: Eating God luck cycles often bring recognition of talent, side income, or culinary pleasures.",
  },

  // ── 紫薇主星 (Zi Wei Major Stars) ────────────────────────────────────
  {
    key: 'ziweiMajor:紫微',
    category: 'ziweiMajor',
    lang: 'zh',
    title: '紫微星 — 帝王之气',
    body_md:
      '紫微为紫微斗数十四主星之首，帝座之星，斗数命主之星。\n\n**核心特质**：高度自尊，天生领袖气质，追求权威与完美，喜被他人尊重。\n\n**落命宫**：外显气场强，适合独当一面，但需避免自负与孤立。\n\n**落财帛**：对金钱有主控意识，财运稳健但不喜被人管控财务。\n\n**助星加会（左辅右弼/天魁天钺）**：人生格局拔高，贵人网络广阔。\n\n**无助星独守**：自力更生，有孤君之象，需培养合作精神。',
  },
  {
    key: 'ziweiMajor:紫微',
    category: 'ziweiMajor',
    lang: 'en',
    title: 'Zi Wei Star — Imperial Authority',
    body_md:
      "Zi Wei is the lead star of Zi Wei Dou Shu — the Emperor Star, marking the Self Palace anchor.\n\n**Core traits**: High self-regard, natural leadership, pursues authority and perfection, needs respect.\n\n**In Self Palace**: Strong personal aura; suited to independent roles — watch for arrogance or isolation.\n\n**In Wealth Palace**: Needs financial control; steady wealth but dislikes others managing money.\n\n**With assistant stars (Zuo Fu/You Bi, Tian Kui/Tian Yue)**: Life trajectory elevated, broad network of benefactors.\n\n**Alone (no assistants)**: Self-reliant, 'lone emperor'; cultivate collaboration skills.",
  },
  {
    key: 'ziweiMajor:破军',
    category: 'ziweiMajor',
    lang: 'zh',
    title: '破军星 — 开创与变动',
    body_md:
      '破军为紫微斗数中耗损力量最强的星曜，亦是最具开创力的星。\n\n**核心特质**：打破常规，喜欢变革，极强的行动力，不安于现状。\n\n**适合**：自主创业、开拓新市场、艺术创新、任何需要破旧立新的领域。\n\n**落命宫（庙旺）**：魄力十足，一生多变但多能逢凶化吉。\n\n**化权**：行动力加倍，掌控欲增强，适合挑战高难度目标。\n\n**注意**：财务耗散倾向，需配合天府星或化禄来稳定资产。',
  },
  {
    key: 'ziweiMajor:破军',
    category: 'ziweiMajor',
    lang: 'en',
    title: 'Pò Jūn Star — Pioneer & Change',
    body_md:
      "Pò Jūn (Breaker General) is the most destructive yet most pioneering star in Zi Wei Dou Shu.\n\n**Core traits**: Rule-breaker, change-lover, extraordinarily action-oriented, never content with the status quo.\n\n**Best suited for**: Entrepreneurship, opening new markets, artistic innovation, any field requiring disruption.\n\n**In Self Palace (Temple/Prosperous)**: Bold and resilient — life has many changes but crises often resolve.\n\n**With Hua Quan (Power)**: Doubled action force; increased control drive — excellent for ambitious targets.\n\n**Watch out for**: Financial drain tendency; needs Tian Fu or Hua Lu to stabilize assets.",
  },

  // ── 12 宫 (Palaces) ────────────────────────────────────────────────────
  {
    key: 'palace:命宫',
    category: 'palace',
    lang: 'zh',
    title: '命宫 — 人生总格局',
    body_md:
      '命宫是紫微斗数十二宫的核心，代表命主本人的气质、外貌、才能与人生主线。\n\n**看什么**：性格倾向、天赋才能、外在气场、人生总体走向。\n\n**主星组合**：命宫主星决定基础性格底色（如紫微主权威，天同主温和）。\n\n**飞化影响**：命宫化禄=自身能量顺遂；化忌=容易钻牛角尖或自我内耗。\n\n**大运流年**：大运流年进入命宫时，往往是人生的转折点或重要事件年。',
  },
  {
    key: 'palace:命宫',
    category: 'palace',
    lang: 'en',
    title: 'Self Palace — Core Life Pattern',
    body_md:
      "The Self Palace is the heart of the Zi Wei chart — it represents your personality, appearance, talents, and life's main theme.\n\n**What to read**: Personality tendencies, innate gifts, personal aura, overall life direction.\n\n**Major star**: Determines the base character color (e.g. Zi Wei = authority; Tian Tong = gentle).\n\n**Transformation effects**: Hua Lu in Self = smooth personal energy; Hua Ji = tendency to ruminate or self-sabotage.\n\n**Luck cycle**: When the major luck cycle or annual star enters the Self Palace, major life turning points often occur.",
  },
  {
    key: 'palace:官禄',
    category: 'palace',
    lang: 'zh',
    title: '官禄宫 — 事业与地位',
    body_md:
      '官禄宫代表命主的事业方向、职业特性、升迁机遇与社会地位。\n\n**看什么**：适合什么行业、是否适合创业、事业是否顺遂、升迁机遇。\n\n**主星判断**：\n- 紫微/天府在官禄：适合管理、政界、权威职位\n- 武曲在官禄：财经、金融、需行动的职业\n- 天机在官禄：谋划、咨询、变化频繁的行业\n\n**三方四正**：官禄宫三方（命宫/财帛/迁移）同看，格局更完整。',
  },
  {
    key: 'palace:官禄',
    category: 'palace',
    lang: 'en',
    title: 'Career Palace — Work & Status',
    body_md:
      "The Career Palace (Guān Lù Gōng) governs career direction, professional traits, promotion opportunities, and social standing.\n\n**What to read**: Best industries, entrepreneurship potential, career smoothness, promotion timing.\n\n**Key star guidance**:\n- Zi Wei/Tian Fu: Management, politics, authority positions\n- Wu Qu: Finance, action-oriented roles\n- Tian Ji: Strategy, consulting, fast-changing fields\n\n**Three-Way View**: Read Career alongside Self and Wealth palaces for the complete picture.",
  },

  // ── 四化 (Four Transformations) ──────────────────────────────────────
  {
    key: 'mutagen:忌',
    category: 'mutagen',
    lang: 'zh',
    title: '化忌 — 执着与考验',
    body_md:
      '化忌是紫微斗数四化中最受关注的变化，落在哪颗星就使该星的能量变得执着、阻碍或得失心重。\n\n**落命宫**：自我执着，容易钻牛角尖，需要觉察自身的固执模式。\n\n**落财帛**：财务上有得失心，宜保守理财，避免高风险投资。\n\n**落夫妻**：感情上执念较重，需学习放下与包容。\n\n**重要**：化忌并不是"坏事"，而是"必须正视"的功课。许多成功者的命盘中有有力的化忌——关键是如何转化执着为专注。',
  },
  {
    key: 'mutagen:忌',
    category: 'mutagen',
    lang: 'en',
    title: 'Hua Ji — Fixation & Testing',
    body_md:
      "Hua Ji (化忌) is the most discussed of the Four Transformations — wherever it falls, it intensifies that star's energy into obsession, obstacles, or heightened win/loss sensitivity.\n\n**In Self Palace**: Self-fixation and rumination; practice awareness of rigid mental patterns.\n\n**In Wealth Palace**: Financial anxiety; favor conservative approaches, avoid high-risk speculation.\n\n**In Spouse Palace**: Emotional attachment or possessiveness; learn release and acceptance.\n\n**Important**: Hua Ji is not 'bad luck' — it marks a life lesson that must be faced. Many high achievers carry powerful Hua Ji; the key is transforming fixation into focused excellence.",
  },
]

// ── Script ─────────────────────────────────────────────────────────────────

const rows: GlossaryRow[] = ENTRIES.map((e) => ({
  id: randomUUID(),
  key: e.key,
  category: e.category,
  lang: e.lang,
  title: e.title,
  body_md: e.body_md,
  variant: 'A',
  active: 1,
  created_at: NOW,
  updated_at: NOW,
}))

const conflictAction = isReplace ? 'OR REPLACE' : 'OR IGNORE'

const sql = rows
  .map(
    (r) =>
      `INSERT ${conflictAction} INTO chart_glossary (id, key, category, lang, title, body_md, variant, active, created_at, updated_at) VALUES (${[
        r.id,
        r.key,
        r.category,
        r.lang,
        r.title,
        r.body_md,
        r.variant,
        r.active,
        r.created_at,
        r.updated_at,
      ]
        .map((v) => `'${String(v).replace(/'/g, "''")}'`)
        .join(', ')});`
  )
  .join('\n')

const tmpFile = join(tmpdir(), `glossary-seed-${Date.now()}.sql`)
writeFileSync(tmpFile, sql, 'utf8')

console.log(
  `Seeding ${rows.length} glossary rows (${isRemote ? 'REMOTE' : 'LOCAL'}, ${conflictAction})...`
)

try {
  execSync(
    `npx wrangler d1 execute ${DB_NAME} ${flag} --file="${tmpFile}"`,
    { stdio: 'inherit', cwd: API_ROOT }
  )
  console.log('✓ Glossary seed complete')
} finally {
  unlinkSync(tmpFile)
}
