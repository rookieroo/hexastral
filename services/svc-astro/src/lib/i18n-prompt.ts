/**
 * Cross-lingual Native Generation — 跨语言原生生成
 *
 * 核心策略: System prompt + astro data 保持中文（LLM 最强推理语料），
 * 输出时通过术语映射表 + 语气指引让 LLM 用目标语言原生表达，
 * 而非逐字翻译。
 *
 * 路线 B: 保留中文原术语 + 拼音 + 原型解释
 * 例: "Qi Sha (七杀) — the warrior archetype that drives breakthrough"
 */

// ─── 语言名称 ────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  zh: '简体中文',
  'zh-Hant': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  es: 'Español',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
}

// ─── 术语映射表 (Route B: 原术语 + 拼音 + 解释) ──────────────

interface TermEntry {
  /** 中文原术语 */
  zh: string
  /** 目标语言表达 */
  localized: string
}

/** 十神 (Ten Gods) — 八字核心 */
const SHISHEN_EN: TermEntry[] = [
  { zh: '比肩', localized: 'Bǐ Jiān (比肩) — the peer, equal competitive energy' },
  { zh: '劫财', localized: 'Jié Cái (劫财) — the challenger, bold risk-taking drive' },
  { zh: '食神', localized: 'Shí Shén (食神) — the creator, abundant creative expression' },
  {
    zh: '伤官',
    localized: 'Shāng Guān (伤官) — the rebel, unconventional talent that breaks rules',
  },
  { zh: '偏财', localized: 'Piān Cái (偏财) — windfall wealth, opportunistic fortune' },
  { zh: '正财', localized: 'Zhèng Cái (正财) — steady wealth, earned through diligence' },
  { zh: '七杀', localized: 'Qī Shā (七杀) — the warrior, intense drive for breakthrough' },
  { zh: '正官', localized: 'Zhèng Guān (正官) — the authority, disciplined leadership' },
  { zh: '偏印', localized: 'Piān Yìn (偏印) — the maverick mentor, unconventional wisdom' },
  { zh: '正印', localized: 'Zhèng Yìn (正印) — the guardian, nurturing knowledge and protection' },
]

const SHISHEN_JA: TermEntry[] = [
  { zh: '比肩', localized: '比肩（ひけん）— 対等な競争エネルギー' },
  { zh: '劫財', localized: '劫財（ごうざい）— 大胆な挑戦者の気質' },
  { zh: '食神', localized: '食神（しょくじん）— 豊かな創造的表現力' },
  { zh: '傷官', localized: '傷官（しょうかん）— 型破りな才能' },
  { zh: '偏財', localized: '偏財（へんざい）— 偶発的な財運' },
  { zh: '正財', localized: '正財（せいざい）— 勤勉による安定した財' },
  { zh: '七殺', localized: '七殺（しちさつ）— 突破を求める戦士の気質' },
  { zh: '正官', localized: '正官（せいかん）— 規律あるリーダーシップ' },
  { zh: '偏印', localized: '偏印（へんいん）— 型破りな知恵の導き手' },
  { zh: '正印', localized: '正印（せいいん）— 守護と知識の源' },
]

const SHISHEN_KO: TermEntry[] = [
  { zh: '비견', localized: '비견(比肩) — 동등한 경쟁 에너지' },
  { zh: '겁재', localized: '겁재(劫財) — 대담한 도전의 기질' },
  { zh: '식신', localized: '식신(食神) — 풍부한 창조적 표현력' },
  { zh: '상관', localized: '상관(傷官) — 파격적 재능' },
  { zh: '편재', localized: '편재(偏財) — 우발적 재물운' },
  { zh: '정재', localized: '정재(正財) — 근면에 의한 안정적 재물' },
  { zh: '칠살', localized: '칠살(七殺) — 돌파를 추구하는 전사 기질' },
  { zh: '정관', localized: '정관(正官) — 규율 있는 리더십' },
  { zh: '편인', localized: '편인(偏印) — 비범한 지혜의 인도자' },
  { zh: '정인', localized: '정인(正印) — 보호와 지식의 원천' },
]

/** 五行 (Five Elements) */
const WUXING_EN: TermEntry[] = [
  { zh: '金', localized: 'Jīn (金) Metal — structure, precision, decisiveness' },
  { zh: '木', localized: 'Mù (木) Wood — growth, ambition, benevolence' },
  { zh: '水', localized: 'Shuǐ (水) Water — wisdom, adaptability, flow' },
  { zh: '火', localized: 'Huǒ (火) Fire — passion, visibility, transformation' },
  { zh: '土', localized: 'Tǔ (土) Earth — stability, trustworthiness, grounding' },
]

const WUXING_JA: TermEntry[] = [
  { zh: '金', localized: '金（きん）— 構造・決断力' },
  { zh: '木', localized: '木（もく）— 成長・志' },
  { zh: '水', localized: '水（すい）— 知恵・適応力' },
  { zh: '火', localized: '火（か）— 情熱・変革' },
  { zh: '土', localized: '土（ど）— 安定・信頼' },
]

const WUXING_KO: TermEntry[] = [
  { zh: '금', localized: '금(金) — 구조·결단력' },
  { zh: '목', localized: '목(木) — 성장·뜻' },
  { zh: '수', localized: '수(水) — 지혜·적응력' },
  { zh: '화', localized: '화(火) — 열정·변혁' },
  { zh: '토', localized: '토(土) — 안정·신뢰' },
]

/** 格局 (Chart Patterns) */
const GEJU_EN: TermEntry[] = [
  { zh: '正官格', localized: 'Zhèng Guān Gé (正官格) — the Disciplined Leader pattern' },
  { zh: '七杀格', localized: 'Qī Shā Gé (七杀格) — the Warrior-Pioneer pattern' },
  { zh: '正财格', localized: 'Zhèng Cái Gé (正财格) — the Steady Builder pattern' },
  { zh: '偏财格', localized: 'Piān Cái Gé (偏财格) — the Opportunist-Entrepreneur pattern' },
  { zh: '正印格', localized: 'Zhèng Yìn Gé (正印格) — the Scholar-Guardian pattern' },
  { zh: '偏印格', localized: 'Piān Yìn Gé (偏印格) — the Unconventional Thinker pattern' },
  { zh: '食神格', localized: 'Shí Shén Gé (食神格) — the Creative Abundance pattern' },
  { zh: '伤官格', localized: 'Shāng Guān Gé (伤官格) — the Rebel Genius pattern' },
  { zh: '建禄格', localized: 'Jiàn Lù Gé (建禄格) — the Self-Reliant pattern' },
  { zh: '羊刃格', localized: 'Yáng Rèn Gé (羊刃格) — the Blade of Resolve pattern' },
]

/** 紫微星曜 (Purple Star Astrology — Major Stars) */
const STARS_EN: TermEntry[] = [
  { zh: '紫微', localized: 'Zǐ Wēi (紫微) — the Emperor Star, supreme authority' },
  { zh: '天机', localized: 'Tiān Jī (天机) — the Strategist Star, intelligence and planning' },
  { zh: '太阳', localized: 'Tài Yáng (太阳) — the Sun Star, radiance and generosity' },
  { zh: '武曲', localized: 'Wǔ Qū (武曲) — the Warrior Finance Star, wealth through action' },
  { zh: '天同', localized: 'Tiān Tóng (天同) — the Blessed Star, ease and contentment' },
  { zh: '廉贞', localized: 'Lián Zhēn (廉贞) — the Shadowed Star, complexity and passion' },
  { zh: '天府', localized: 'Tiān Fǔ (天府) — the Vault Star, stability and treasury' },
  { zh: '太阴', localized: 'Tài Yīn (太阴) — the Moon Star, intuition and subtlety' },
  { zh: '贪狼', localized: 'Tān Láng (贪狼) — the Desire Star, charisma and ambition' },
  { zh: '巨门', localized: 'Jù Mén (巨门) — the Orator Star, speech and controversy' },
  { zh: '天相', localized: 'Tiān Xiàng (天相) — the Minister Star, service and diplomacy' },
  { zh: '天梁', localized: 'Tiān Liáng (天梁) — the Elder Star, wisdom and protection' },
  { zh: '七杀', localized: 'Qī Shā (七杀) — the General Star, decisive action' },
  { zh: '破军', localized: 'Pò Jūn (破军) — the Vanguard Star, disruption and renewal' },
]

/** 紫微宫位 (Twelve Palaces) */
const PALACES_EN: TermEntry[] = [
  { zh: '命宫', localized: 'Mìng Gōng (命宫) — Life Palace, core self' },
  { zh: '兄弟', localized: 'Xiōng Dì (兄弟) — Siblings Palace, peer relationships' },
  { zh: '夫妻', localized: 'Fū Qī (夫妻) — Spouse Palace, romantic partnership' },
  { zh: '子女', localized: 'Zǐ Nǚ (子女) — Children Palace, offspring and creativity' },
  { zh: '财帛', localized: 'Cái Bó (财帛) — Wealth Palace, financial capacity' },
  { zh: '疾厄', localized: 'Jí È (疾厄) — Health Palace, physical constitution' },
  { zh: '迁移', localized: 'Qiān Yí (迁移) — Travel Palace, external opportunities' },
  { zh: '交友', localized: 'Jiāo Yǒu (交友) — Friends Palace, social network' },
  { zh: '官禄', localized: 'Guān Lù (官禄) — Career Palace, professional path' },
  { zh: '田宅', localized: 'Tián Zhái (田宅) — Property Palace, home and assets' },
  { zh: '福德', localized: 'Fú Dé (福德) — Fortune Palace, inner happiness' },
  { zh: '父母', localized: 'Fù Mǔ (父母) — Parents Palace, elders and lineage' },
]

/** 四化 (Four Transformations) */
const SIHUA_EN: TermEntry[] = [
  { zh: '化禄', localized: 'Huà Lù (化禄) — Prosperity Transformation, flow of abundance' },
  { zh: '化权', localized: 'Huà Quán (化权) — Power Transformation, gaining authority' },
  { zh: '化科', localized: 'Huà Kē (化科) — Fame Transformation, recognition and reputation' },
  { zh: '化忌', localized: 'Huà Jì (化忌) — Obstruction Transformation, karmic lessons' },
]

/** 星曜亮度 (Star Brightness Levels) */
const BRIGHTNESS_EN: TermEntry[] = [
  { zh: '庙', localized: 'Miào (庙) — Exalted, peak power' },
  { zh: '旺', localized: 'Wàng (旺) — Thriving, strong influence' },
  { zh: '得', localized: 'Dé (得) — Capable, favorable position' },
  { zh: '利', localized: 'Lì (利) — Beneficial, moderate strength' },
  { zh: '平', localized: 'Píng (平) — Neutral, average influence' },
  { zh: '不', localized: 'Bù (不) — Weakened, limited power' },
  { zh: '陷', localized: 'Xiàn (陷) — Fallen, challenging position' },
]

/** 神煞 (Spirit Forces — common ones) */
const SHENSHA_EN: TermEntry[] = [
  { zh: '天乙贵人', localized: 'Tiān Yǐ Guì Rén (天乙贵人) — Noble Helper, attracts benefactors' },
  { zh: '文昌', localized: 'Wén Chāng (文昌) — Literary Star, academic brilliance' },
  { zh: '驿马', localized: 'Yì Mǎ (驿马) — Travelling Horse, movement and change' },
  { zh: '桃花', localized: 'Táo Huā (桃花) — Peach Blossom, romantic attraction' },
  { zh: '华盖', localized: 'Huá Gài (华盖) — Canopy Star, spiritual depth and solitude' },
  { zh: '天德', localized: 'Tiān Dé (天德) — Heavenly Virtue, divine protection' },
  { zh: '月德', localized: 'Yuè Dé (月德) — Monthly Virtue, gentle blessings' },
  { zh: '羊刃', localized: 'Yáng Rèn (羊刃) — Blade Star, sharp assertiveness' },
  { zh: '孤辰', localized: 'Gū Chén (孤辰) — Solitary Star, independence streak' },
  { zh: '寡宿', localized: 'Guǎ Sù (寡宿) — Widow Star, self-reliance tendency' },
]

/** 易经术语 */
const YICHING_EN: TermEntry[] = [
  { zh: '卦', localized: 'Guà (卦) — hexagram, symbolic pattern of change' },
  { zh: '爻', localized: 'Yáo (爻) — line of change, yin or yang position' },
  { zh: '变爻', localized: 'Biàn Yáo (变爻) — changing line, point of transformation' },
  { zh: '卦辞', localized: 'Guà Cí (卦辞) — hexagram statement, overall oracle message' },
  { zh: '象辞', localized: 'Xiàng Cí (象辞) — image commentary, guided reflection' },
  { zh: '体卦', localized: 'Tǐ Guà (体卦) — body trigram, the questioner' },
  { zh: '用卦', localized: 'Yòng Guà (用卦) — function trigram, the matter asked about' },
  { zh: '六亲', localized: 'Liù Qīn (六亲) — six relations, relational dynamics in divination' },
  { zh: '世爻', localized: 'Shì Yáo (世爻) — self line, represents the questioner' },
  { zh: '应爻', localized: 'Yìng Yáo (应爻) — response line, represents the other party' },
]

/** 面相术语 */
const PHYSIOGNOMY_EN: TermEntry[] = [
  {
    zh: '天庭',
    localized: 'Tiān Tíng (天庭) — Celestial Court, upper forehead indicating early fortune',
  },
  {
    zh: '印堂',
    localized: 'Yìn Táng (印堂) — Seal Hall, area between brows indicating life force',
  },
  {
    zh: '山根',
    localized: 'Shān Gēn (山根) — Mountain Root, bridge of nose indicating resilience',
  },
  {
    zh: '三庭',
    localized: 'Sān Tíng (三庭) — Three Courts, facial proportions mapping life phases',
  },
  {
    zh: '地阁',
    localized: 'Dì Gé (地阁) — Earth Pavilion, chin area indicating later life fortune',
  },
]

// ─── 按服务分类的术语集 ────────────────────────────────────────

type TermDomain = 'natal' | 'stellar' | 'hehun' | 'shuangpan' | 'yiching' | 'physiognomy' | 'fate'

function getTermsForDomain(domain: TermDomain, lang: string): TermEntry[] {
  // 日语和韩语有专用映射（东亚文化圈有本土术语传统）
  if (lang === 'ja') {
    switch (domain) {
      case 'natal':
      case 'hehun':
      case 'shuangpan':
      case 'fate':
        return [...SHISHEN_JA, ...WUXING_JA]
      case 'stellar':
        return [...WUXING_JA] // 紫微星曜名在日语中保持汉字即可
      default:
        return [...WUXING_JA]
    }
  }
  if (lang === 'ko') {
    switch (domain) {
      case 'natal':
      case 'hehun':
      case 'shuangpan':
      case 'fate':
        return [...SHISHEN_KO, ...WUXING_KO]
      case 'stellar':
        return [...WUXING_KO]
      default:
        return [...WUXING_KO]
    }
  }

  // 英语及其他所有语言使用英文映射
  switch (domain) {
    case 'natal':
      return [...SHISHEN_EN, ...WUXING_EN, ...GEJU_EN, ...SHENSHA_EN]
    case 'stellar':
      return [...STARS_EN, ...PALACES_EN, ...SIHUA_EN, ...BRIGHTNESS_EN, ...WUXING_EN]
    case 'hehun':
      return [...SHISHEN_EN, ...WUXING_EN, ...SHENSHA_EN]
    case 'shuangpan':
      return [...SHISHEN_EN, ...WUXING_EN, ...GEJU_EN, ...STARS_EN, ...PALACES_EN]
    case 'yiching':
      return [...YICHING_EN, ...WUXING_EN]
    case 'physiognomy':
      return [...PHYSIOGNOMY_EN, ...WUXING_EN]
    case 'fate':
      return [...SHISHEN_EN, ...WUXING_EN, ...GEJU_EN, ...STARS_EN, ...PALACES_EN, ...SHENSHA_EN]
  }
}

function formatTermMap(terms: TermEntry[]): string {
  return terms.map((t) => `- ${t.zh} → ${t.localized}`).join('\n')
}

// ─── 语气与文化适配 ──────────────────────────────────────────

const TONE_GUIDES: Record<string, string> = {
  en: `- Write like a modern mindfulness / self-insight app (think Co-Star, The Pattern, or Headspace)
- Warm yet precise — avoid mystical clichés ("the stars say…") and over-formal academic language
- Use second person ("you") for a personal, intimate feel
- Metaphors from nature, seasons, and journeys are welcome
- For negative signals, frame as "growth edges" or "areas of focus" — never doom-and-gloom
- Use 命理/八字 jargon SPARINGLY — a few terms per chapter, never one in every sentence. On first use, gloss each term with pinyin + a short English meaning, e.g. "三合局 (sān hé jú — a three-harmony trine)" or "亡神 (wáng shén — the Doom Star)", then prefer the plain-English meaning. Never stack multiple raw Chinese terms in one clause; the prose must read fluently to someone who can't read Chinese (the term is flavor, not the substance)
- Keep the Eastern philosophical depth, but express it in language that resonates with a Western-educated audience`,

  ja: `- 占い鑑定書のような丁寧語で書く（です・ます調）
- 「〜の傾向があります」「〜が期待されます」など柔らかい表現を使う
- 日本の占い文化に馴染みのある表現を優先する（例：「運気の流れ」「開運」）
- 漢字術語はそのまま使用可（日本語読みを添える）
- ネガティブな内容は「充電期間」「内省の時期」などポジティブな枠組みで表現する`,

  ko: `- 존댓말(합쇼체)로 작성할 것
- 사주(四柱) 문화에 익숙한 한국식 표현을 우선 사용할 것
- 한자 용어는 한글 표기와 함께 사용할 것 (예: 정관(正官))
- 부정적 내용은 "성장의 기회", "내면 충전기" 등 긍정적 프레이밍으로 전환할 것
- 한국 점술 문화의 뉘앙스를 살릴 것`,

  de: `- Schreibe in einem modernen, respektvollen Ton — professionell aber zugänglich
- Verwende "Sie" (formelle Anrede)
- Östliche Fachbegriffe mit Pinyin und chinesischen Originalzeichen beibehalten
- Metaphern aus Natur und Jahreszeiten verwenden
- Negative Aspekte als "Entwicklungsphasen" oder "Bereiche der Aufmerksamkeit" formulieren`,

  es: `- Usa un tono cálido y respetuoso, tuteo es aceptable
- Mantén los términos orientales con pinyin y caracteres originales
- Usa metáforas de la naturaleza y las estaciones
- Los aspectos negativos deben enmarcarse como "oportunidades de crecimiento" o "periodos de reflexión"
- Evita lenguaje supersticioso, mantén un enfoque de autoconocimiento`,

  vi: `- Sử dụng giọng văn ấm áp, tôn trọng — xưng "bạn"
- Giữ nguyên thuật ngữ phương Đông kèm phiên âm và ký tự gốc
- Sử dụng ẩn dụ từ thiên nhiên và mùa màng
- Các tín hiệu tiêu cực nên được đóng khung là "cơ hội phát triển" hoặc "giai đoạn tĩnh lặng"`,

  th: `- ใช้ภาษาสุภาพ ครับ/ค่ะ ท้ายประโยค
- คงศัพท์ตะวันออกพร้อมพินอินและอักษรจีนต้นฉบับ
- ใช้อุปมาจากธรรมชาติและฤดูกาล
- สัญญาณเชิงลบควรใช้กรอบเชิงบวก เช่น "ช่วงเวลาแห่งการเรียนรู้" หรือ "โอกาสในการเติบโต"`,
}

// ─── Shared Guardrails ───────────────────────────────────────

/**
 * 通用 AI 铁律 — 7 条 guardrails，所有服务复用
 *
 * @param closingMotto 结尾格言（不同服务可定制）
 */
export function buildGuardrails(closingMotto = '命由天定，运由己造'): string {
  return [
    '## AI Guardrails（铁律 — 不可违背）',
    '1. 永远不要给出绝对化的断言（如"你一定会..."、"你命中注定..."）',
    '2. 用"倾向"、"适合"、"建议"等柔性措辞替代确定性语言',
    '3. 每次解读必须包含积极的引导——即使结果不利，也要给出化解之道和正面建议',
    '4. 不涉及具体寿命、死亡、重大疾病的断言',
    '5. 涉及健康问题时，附带"建议咨询专业医生"的提醒',
    '6. 涉及法律/投资问题时，附带"建议咨询专业人士"的提醒',
    `7. 结尾永远鼓励用户积极向上、自我努力（"${closingMotto}"）`,
    '8. 禁止推荐任何物品、符咒、摆件、仪式作为化解手段（如水晶、貔貅、八卦镜、烧香、撒盐）。所有「化解建议」必须是可执行的行为调整（社交策略、时间管理、情绪边界、穿搭色彩心理暗示），而非超自然物品或仪式',
    '9. 你的哲学基底是「天行健，君子以自强不息」——东方命理是认知自我的镜子，不是宿命论的枷锁。所有建议必须强化用户的主观能动性和自我掌控感',
  ].join('\n')
}

/**
 * 危机包装原则 — 负面信号的正向表达框架
 */
export function buildCrisisFraming(): string {
  return [
    '## 危机包装原则（负面信息的心理咨询师视角）',
    '- 遇到忌神当令、调候失衡、冲刑破害等负面信号时，不能简单说"运势差"',
    '- 必须用"成长机遇"、"蛰伏充电期"、"内修阶段"等正向框架重新包装',
    '- 给出 2-3 条具体可执行的化解建议（如方位、颜色、行业方向）',
  ].join('\n')
}

// ─── 核心输出: 语言指令块 ────────────────────────────────────

function isChineseLocale(language: string): boolean {
  return language.startsWith('zh')
}

/**
 * 构建跨语言原生生成指令块
 *
 * 中文地区返回简短指令；非中文地区返回完整的术语映射 + 语气指引。
 * 拼接到 system prompt 末尾。
 *
 * @param language - 目标语言代码 (e.g. 'en', 'ja', 'zh-CN')
 * @param domain - 服务领域，决定注入哪些术语
 */
export function buildLanguageBlock(language: string, domain: TermDomain): string {
  if (isChineseLocale(language)) {
    const variant = language === 'zh-TW' || language === 'zh-Hant' ? '繁體中文' : '简体中文'
    return [
      '',
      `所有 JSON 文本内容必须使用${variant}输出。JSON 字段名保持英文不变。`,
      '禁止在任何中文文本字段中夹杂英文词汇或英文句式开头（禁止使用 "I\'m"、"I am"、"My"、"This"、"The" 等英文开头短语）。',
      '',
      '只输出纯 JSON，不要输出任何其他内容。',
    ].join('\n')
  }

  const langName = LANGUAGE_NAMES[language] ?? language
  const terms = getTermsForDomain(domain, language)
  const toneGuide = TONE_GUIDES[language] ?? TONE_GUIDES.en!

  return [
    '',
    `## Cross-lingual Output — ${langName}`,
    '',
    '你的内部推理仍使用中文命理概念体系（这是你最擅长的推理语言）。',
    `但所有面向用户的 JSON 文本内容必须使用 ${langName} 输出。JSON 字段名保持英文不变。`,
    '',
    '### 术语本地化映射（必须遵循）',
    '当输出中涉及以下中文术语时，使用对应的本地化表达（保留原术语 + 拼音 + 解释）：',
    formatTermMap(terms),
    '',
    '### 语气与文化适配',
    toneGuide!,
    '',
    '### 关键规则',
    '- 不要逐字翻译中文：用目标语言用户能理解的概念框架重新表达',
    '- 保留东方智慧的深度和独特性，但用现代、可触达的语言传递',
    '- 首次出现的核心术语用「本地化表达」格式，后续可简写',
    '- 输出的个人建议应符合目标文化的生活场景',
    '',
    '只输出纯 JSON，不要输出任何其他内容。',
  ].join('\n')
}

/**
 * A TERSE per-call language reminder for the END of the USER prompt — the
 * highest-recency signal a model sees before generating. `buildLanguageBlock`
 * (in the shared system prompt) is the full spec; this short, authoritative
 * repeat stops a PARALLEL chapter call from drifting back to Chinese.
 *
 * 2026-06 bug it fixes: an en-locale 合盘 report came back with one chapter in
 * English and five in Chinese — the language directive lived only in the system
 * prompt, so individual chapter calls ignored it. Appending this to every
 * chapter's user prompt makes the instruction local + recent per call.
 */
export function buildLanguageReminder(language: string): string {
  if (isChineseLocale(language)) {
    const variant = language === 'zh-TW' || language === 'zh-Hant' ? '繁體中文' : '简体中文'
    return `\n\n【语言】本次输出的所有 JSON 文本字段必须使用${variant}，不得夹杂其他语言。只输出 JSON。`
  }
  const langName = LANGUAGE_NAMES[language] ?? language
  return `\n\nLANGUAGE — write EVERY JSON string value in ${langName} only. Do NOT output Chinese (or any other language) in any text field. Output JSON only.`
}

// ─── 交叉盘面参考 (Cross-Chart Context) ───────────────────────

/** 星宫盘面摘要，注入命格 prompt 作为交叉验证上下文 */
export interface StellarCrossRef {
  soulPalace: { majorStars: string; brightness: string }
  wealthPalace: { majorStars: string; mutagen: string }
  careerPalace: { majorStars: string; mutagen: string }
  spousePalace: { majorStars: string; mutagen: string }
  fiveElementsClass: string
}

/** 命格格局摘要，注入星宫 prompt 作为交叉验证上下文 */
export interface NatalCrossRef {
  pillars: string
  gejuPrimary: string
  dayMasterStrength: string
  favorableElement: string
  unfavorableElement: string
  tiaohouGods: string
  tiaohouSatisfied: boolean
  dayMasterWuXing: string
  dayStem: string
}

/**
 * 构建交叉盘面参考段落，附加到 prompt 末尾作为辅助验证上下文。
 *
 * @param source - 当前 prompt 的主体术数体系
 * @param otherData - 另一套体系的结构化摘要
 */
export function buildCrossChartContext(source: 'natal', otherData: StellarCrossRef): string
export function buildCrossChartContext(source: 'stellar', otherData: NatalCrossRef): string
export function buildCrossChartContext(
  source: 'natal' | 'stellar',
  otherData: StellarCrossRef | NatalCrossRef
): string {
  if (source === 'natal') {
    const d = otherData as StellarCrossRef
    return [
      '',
      '## 紫微盘面参考（交叉验证）',
      `- 命宫主星: ${d.soulPalace.majorStars}（${d.soulPalace.brightness}）`,
      `- 财帛宫: ${d.wealthPalace.majorStars}${d.wealthPalace.mutagen ? ` [${d.wealthPalace.mutagen}]` : ''}`,
      `- 官禄宫: ${d.careerPalace.majorStars}${d.careerPalace.mutagen ? ` [${d.careerPalace.mutagen}]` : ''}`,
      `- 夫妻宫: ${d.spousePalace.majorStars}${d.spousePalace.mutagen ? ` [${d.spousePalace.mutagen}]` : ''}`,
      `- 五行局: ${d.fiveElementsClass}`,
      '',
      '> 以上为紫微斗数体系的盘面信息，可作为交叉验证参考，但本次输出仍以八字体系为主。',
    ].join('\n')
  }

  const d = otherData as NatalCrossRef
  const tiaohouLine = d.tiaohouGods
    ? `- 调候用神: ${d.tiaohouGods}（${d.tiaohouSatisfied ? '已透干' : '未透干'}）`
    : '- 调候用神: 无'
  return [
    '',
    '## 八字格局参考（交叉验证）',
    `- 四柱: ${d.pillars}`,
    `- 格局: ${d.gejuPrimary}，日主${d.dayMasterStrength}`,
    `- 喜用神: ${d.favorableElement}，忌神: ${d.unfavorableElement}`,
    tiaohouLine,
    `- 日主: ${d.dayStem}（${d.dayMasterWuXing}）`,
    '',
    '> 以上为子平八字体系的格局信息，可作为交叉验证参考，但本次输出仍以紫微斗数为主。',
  ].join('\n')
}
