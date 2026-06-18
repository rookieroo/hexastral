/**
 * Reading-screen i18n — strings + metaphysics data-atom labels for the solo
 * 八字紫微合参 reading UI. Ported from ming-pan-app/lib/i18n.tsx (the reading
 * subset) per ADR-0021 K1 / ADR-0022.
 *
 * Why a separate file (not lib/i18n.ts): the reading surface adds a large,
 * self-contained string block plus a set of data-atom label helpers (element /
 * strength / day-master / shichen / palace / star archetype / 五行局). Keeping
 * them here keeps lib/i18n.ts (owned by another stream) untouched, and follows
 * the same flat-key `translations`/`t(locale, key)` pattern lib/i18n.ts uses.
 *
 * Locale mapping vs ming-pan: ming-pan's AppLocale `zh-Hans` is kindred's `zh`;
 * the other three (`zh-Hant` / `ja` / `en`) are identical. String VALUES are
 * ported verbatim from ming-pan's messages/{locale}.json.
 *
 * Metaphysics proper nouns (干支 / 格局 / 纳音 / 大运 prose) stay canonical CJK —
 * astro-core has no i18n and iztro's en output is low quality. The one exception
 * is 紫微 major-star names: unreadable in Latin script, so `en` swaps them for
 * established archetype words (see starArchetypeLabel).
 */

import type { GeJuAnalysis, GeJuType, HeavenlyStem, WuXing } from '@zhop/astro-core'

/** The reading's supported locales — the 4 the personal report is authored in
 *  (narrower than astro-i18n's full set, which the label tables don't all cover). */
export type Locale = 'en' | 'zh' | 'zh-Hant' | 'ja'

/* ──────────────────────────────────────────────────────────────────────────
 * UI strings — one flat record per locale (mirrors lib/i18n.ts structure).
 * Keys + values ported from ming-pan messages/{locale}.json (reading subset).
 * ────────────────────────────────────────────────────────────────────────── */

type ReadingTranslations = Record<Locale, Record<string, string>>

export const readingTranslations: ReadingTranslations = {
  en: {
    'reading.title': 'Your Reading',
    'reading.ch1Label': 'Who You Are',
    'reading.ch4Label': 'Current Cycle',
    'reading.ch1Placeholder':
      'Day Master {stem} ({el}), {geju}. {soul}Synthesizing your reading...',
    'reading.ch4Placeholder': '{dayun}{rel}. Generating detailed reading...',
    'reading.dayunActive': '{gz} Decade Cycle (ages {start}–{end})',
    'reading.genAnalysis': 'Analyzing reading...',
    'reading.soulPalaceClause': 'Soul Palace {stars}. ',
    'reading.timeUnknownEst': 'Time unknown · estimated as 子 hour',
    'reading.needBirth': 'Add your birth date, time, and gender to generate your reading.',
    'reading.goSetBirth': 'Set birth info',
    'reading.openFullInYuun': 'Read your full chart in Yuun →',
    'reading.fullInYuunHint': 'Your complete Ba Zi + Zi Wei reading lives in Yuun.',
    'reading.openFull': 'Read your full reading →',
    'reading.openFullInYuel': 'Read your full reading in Yuel →',
    'reading.moreChapters': 'More Chapters',
    'reading.askChapter': 'Ask AI about this chapter →',
    'reading.copy': 'Copy',
    'reading.chat': 'Ask AI',
    'reading.highlight': 'Highlight',
    'reading.askParagraphHint': 'Hold a paragraph to ask about it',
    'reading.unlock': 'Unlock Full Reading',
    'reading.lcCareerLabel': 'Career & Wealth',
    'reading.lcCareerDesc': 'Career direction, timing of wealth, and ideal ways to collaborate.',
    'reading.lcCareerDetail':
      'Threads day master + ten gods + 10-year cycles to map your most-aligned career path and business chemistry. Covers: industries that resonate with your five elements; when wealth surges and recedes across cycles; whether your chart leans toward steady salary (正财) or opportunistic gains (偏财); and which partner archetypes amplify you vs drain you.',
    'reading.lcRelLabel': 'Relationships',
    'reading.lcRelDesc': 'Relationship trends and the hidden patterns in how you relate.',
    'reading.lcRelDetail':
      'Reads relationships through the full lens: ten-gods balance in your Ba Zi, the Spouse / Career / Travel palaces in Zi Wei, and the romantic rhythm across your decade cycles. Covers: the energy you’re drawn to without thinking; the role you unconsciously play (protector / protected / mediator); the dynamics that let you breathe long-term; healthy signals vs subtle drains; and the relational arc for your next three years.',
    'reading.lcHiddenLabel': 'Hidden Tensions',
    'reading.lcHiddenDesc': 'Latent tensions in your chart and how to ease them.',
    'reading.lcHiddenDetail':
      'The patterns in your chart that look harmless but quietly drain you over years. Covers: clash and harm relations behind ‘the same problem keeps coming back’; how an unbalanced climate (调候) shows up in your body and mind; how hidden 偏印 / 七杀 / 劫财 structures consume the self; when decade cycles amplify these tensions; and how to convert them into fuel instead of fighting them.',
    'reading.lcActionLabel': 'Action Plan',
    'reading.lcActionDesc': 'Concrete actions for the next 30 / 90 days.',
    'reading.lcActionDetail':
      'Translates the full reading into actions you can run this week. Covers: prioritized to-dos for the next 30 / 90 / 365 days (sorted by your favorable elements); where to push, where to hold; daily-rhythm moves aligned with your current decade cycle (which day-types favor key conversations, which to avoid for decisions); and concrete behaviors to counter the tensions surfaced in earlier chapters.',
    'ziwei.soulBody': 'Soul Star {soul} · Body Star {body}',
    'ziwei.bodyTag': 'Body',
    'ziwei.empty': 'Empty',
    'appendix.title': 'Chart at a Glance',
    'appendix.bazi': 'BaZi Chart',
    'appendix.ziwei': 'Ziwei Chart',
    'appendix.wuxing': 'Five Elements',
    'appendix.dayun': 'Decade Cycle',
    'appendix.metaLine': 'Day Master {dm} · {geju} · {self}',
    'pillar.year': 'Year',
    'pillar.month': 'Month',
    'pillar.day': 'Day',
    'pillar.hour': 'Hour',
    'label.dayMaster': 'Day Master',
    'label.self': 'Self {s}',
    'label.soulPalaceInline': 'Soul Palace {stars}',
    'home.favorAvoid': 'Favorable {fav} · Avoid {unfav}',
    'birth.timeUnknown': 'Time unknown',
    'common.back': 'Back',
    'common.close': 'Close',
  },

  zh: {
    'reading.title': '合参命书',
    'reading.ch1Label': '你是谁',
    'reading.ch4Label': '当前大运',
    'reading.ch1Placeholder': '日主{stem}（{el}），{geju}。{soul}合参解读生成中...',
    'reading.ch4Placeholder': '{dayun}{rel}。详细解读生成中...',
    'reading.dayunActive': '{gz}大运（{start}–{end}岁）',
    'reading.genAnalysis': '解读分析生成中...',
    'reading.soulPalaceClause': '命宫{stars}。',
    'reading.timeUnknownEst': '时辰未知 · 按子时估算',
    'reading.needBirth': '补全出生日期、时辰与性别，即可生成你的命书。',
    'reading.goSetBirth': '去设置出生信息',
    'reading.openFullInYuun': '在 Yuun 查看完整命书 →',
    'reading.fullInYuunHint': '完整的八字 + 紫微深度解读在 Yuun 里。',
    'reading.openFull': '查看完整命书 →',
    'reading.openFullInYuel': '在 Yuel 深读完整命书 →',
    'reading.moreChapters': '更多章节',
    'reading.askChapter': '就这一章问 AI →',
    'reading.copy': '复制',
    'reading.chat': '问 AI',
    'reading.highlight': '高亮',
    'reading.askParagraphHint': '长按任意段落，可针对它提问',
    'reading.unlock': '解锁完整命书',
    'reading.lcCareerLabel': '事业与财运',
    'reading.lcCareerDesc': '职业方向、财富时机、适合的合作模式。',
    'reading.lcCareerDetail':
      '透过日主、十神、大运三层，分析你最适合的职业路径与商业气场。包括：哪些行业与你的五行匹配；财运在大运里何时高涨、何时收敛；正财（稳）与偏财（机）的比重决定你是受薪、创业还是投资者；以及合伙时哪种气场的人帮你、哪种消耗你。',
    'reading.lcRelLabel': '感情与人际',
    'reading.lcRelDesc': '感情走势、人际关系中的隐藏模式。',
    'reading.lcRelDetail':
      '不只看夫妻宫一处，而是综合八字十神 + 紫微夫官迁三宫 + 大运情感节律，拆解你的吸引模式与冲突模式。包括：你对哪一类气场会上头；在关系里下意识扮演的角色；什么样的相处让你长期舒展；哪些信号是健康、哪些是隐性消耗；以及未来三年感情主轴的方向。',
    'reading.lcHiddenLabel': '暗线与隐患',
    'reading.lcHiddenDesc': '命盘中潜在的张力与化解方向。',
    'reading.lcHiddenDetail':
      '你命盘里看似无害、却长期消耗你的张力点。包括：冲克与刑害带来的"反复同一种麻烦"模式；调候不到位时身心层面的具体表现；隐藏的偏印 / 七杀 / 劫财结构对自我消耗的方式；什么时候这种张力被大运放大；以及一套对治路径——不是消灭它，而是把它转化成你的能量来源。',
    'reading.lcActionLabel': '行动指南',
    'reading.lcActionDesc': '未来 30/90 天具体行动建议。',
    'reading.lcActionDetail':
      '把整本命书的判断翻译成可执行动作。包括：未来 30 天 / 90 天 / 1 年的优先动作清单（按你的五行喜忌排序）；该投入精力的方向、该暂缓的方向；与当下大运合拍的"小日子"操作——例如在哪类日子谈关键事、避开哪类日子做决断；以及如何用具体行为对治前几章指出的张力点。',
    'ziwei.soulBody': '命主 {soul} · 身主 {body}',
    'ziwei.bodyTag': '身',
    'ziwei.empty': '空宫',
    'appendix.title': '命盘速览',
    'appendix.bazi': '八字命盘',
    'appendix.ziwei': '紫微命盘',
    'appendix.wuxing': '五行分布',
    'appendix.dayun': '大运',
    'appendix.metaLine': '日主 {dm} · {geju} · {self}',
    'pillar.year': '年',
    'pillar.month': '月',
    'pillar.day': '日',
    'pillar.hour': '时',
    'label.dayMaster': '日主',
    'label.self': '身{s}',
    'label.soulPalaceInline': '命宫{stars}',
    'home.favorAvoid': '喜{fav} · 忌{unfav}',
    'birth.timeUnknown': '时辰未知',
    'common.back': '返回',
    'common.close': '关闭',
  },

  'zh-Hant': {
    'reading.title': '合參命書',
    'reading.ch1Label': '你是誰',
    'reading.ch4Label': '當前大運',
    'reading.ch1Placeholder': '日主{stem}（{el}），{geju}。{soul}合參解讀生成中...',
    'reading.ch4Placeholder': '{dayun}{rel}。詳細解讀生成中...',
    'reading.dayunActive': '{gz}大運（{start}–{end}歲）',
    'reading.genAnalysis': '解讀分析生成中...',
    'reading.soulPalaceClause': '命宮{stars}。',
    'reading.timeUnknownEst': '時辰未知 · 按子時估算',
    'reading.needBirth': '補全出生日期、時辰與性別，即可生成你的命書。',
    'reading.goSetBirth': '去設定出生資訊',
    'reading.openFullInYuun': '在 Yuun 查看完整命書 →',
    'reading.fullInYuunHint': '完整的八字 + 紫微深度解讀在 Yuun 裡。',
    'reading.openFull': '查看完整命書 →',
    'reading.openFullInYuel': '在 Yuel 深讀完整命書 →',
    'reading.moreChapters': '更多章節',
    'reading.askChapter': '就這一章問 AI →',
    'reading.copy': '複製',
    'reading.chat': '問 AI',
    'reading.highlight': '高亮',
    'reading.askParagraphHint': '長按任意段落，可針對它提問',
    'reading.unlock': '解鎖完整命書',
    'reading.lcCareerLabel': '事業與財運',
    'reading.lcCareerDesc': '職業方向、財富時機、適合的合作模式。',
    'reading.lcCareerDetail':
      '透過日主、十神、大運三層，分析你最適合的職業路徑與商業氣場。包括：哪些產業與你的五行匹配；財運在大運裡何時高漲、何時收斂；正財（穩）與偏財（機）的比重決定你是受薪、創業還是投資者；以及合夥時哪種氣場的人助你、哪種消耗你。',
    'reading.lcRelLabel': '感情與人際',
    'reading.lcRelDesc': '感情走勢、人際關係中的隱藏模式。',
    'reading.lcRelDetail':
      '不只看夫妻宮一處，而是綜合八字十神 + 紫微夫官遷三宮 + 大運情感節律，拆解你的吸引模式與衝突模式。包括：你對哪一類氣場會上頭；在關係裡下意識扮演的角色；什麼樣的相處讓你長期舒展；哪些訊號是健康、哪些是隱性消耗；以及未來三年感情主軸的方向。',
    'reading.lcHiddenLabel': '暗線與隱患',
    'reading.lcHiddenDesc': '命盤中潛在的張力與化解方向。',
    'reading.lcHiddenDetail':
      '你命盤裡看似無害、卻長期消耗你的張力點。包括：沖剋與刑害帶來的"反覆同一種麻煩"模式；調候不到位時身心層面的具體表現；隱藏的偏印 / 七殺 / 劫財結構對自我消耗的方式；什麼時候這種張力被大運放大；以及一套對治路徑——不是消滅它，而是把它轉化成你的能量來源。',
    'reading.lcActionLabel': '行動指南',
    'reading.lcActionDesc': '未來 30/90 天具體行動建議。',
    'reading.lcActionDetail':
      '把整本命書的判斷翻譯成可執行動作。包括：未來 30 天 / 90 天 / 1 年的優先動作清單（按你的五行喜忌排序）；該投入精力的方向、該暫緩的方向；與當下大運合拍的"小日子"操作——例如在哪類日子談關鍵事、避開哪類日子做決斷；以及如何用具體行為對治前幾章指出的張力點。',
    'ziwei.soulBody': '命主 {soul} · 身主 {body}',
    'ziwei.bodyTag': '身',
    'ziwei.empty': '空宮',
    'appendix.title': '命盤速覽',
    'appendix.bazi': '八字命盤',
    'appendix.ziwei': '紫微命盤',
    'appendix.wuxing': '五行分布',
    'appendix.dayun': '大運',
    'appendix.metaLine': '日主 {dm} · {geju} · {self}',
    'pillar.year': '年',
    'pillar.month': '月',
    'pillar.day': '日',
    'pillar.hour': '時',
    'label.dayMaster': '日主',
    'label.self': '身{s}',
    'label.soulPalaceInline': '命宮{stars}',
    'home.favorAvoid': '喜{fav} · 忌{unfav}',
    'birth.timeUnknown': '時辰未知',
    'common.back': '返回',
    'common.close': '關閉',
  },

  ja: {
    'reading.title': '総合鑑定書',
    'reading.ch1Label': 'あなたは誰か',
    'reading.ch4Label': '現在の大運',
    'reading.ch1Placeholder': '日主{stem}（{el}）、{geju}。{soul}総合鑑定を生成中...',
    'reading.ch4Placeholder': '{dayun}{rel}。詳細な解読を生成中...',
    'reading.dayunActive': '{gz}大運（{start}–{end}歳）',
    'reading.genAnalysis': '解読を分析中...',
    'reading.soulPalaceClause': '命宮{stars}。',
    'reading.timeUnknownEst': '時刻不明 · 子の刻で推定',
    'reading.needBirth': '生年月日・時刻・性別を入力すると鑑定書を生成できます。',
    'reading.goSetBirth': '出生情報を設定',
    'reading.openFullInYuun': 'Yuun で完全な命書を読む →',
    'reading.fullInYuunHint': '四柱推命 + 紫微斗数の詳しい鑑定は Yuun に。',
    'reading.openFull': '鑑定書の全文を読む →',
    'reading.openFullInYuel': 'Yuel で完全な命書を読む →',
    'reading.moreChapters': 'その他の章',
    'reading.askChapter': 'この章について AI に聞く →',
    'reading.copy': 'コピー',
    'reading.chat': 'AIに聞く',
    'reading.highlight': 'ハイライト',
    'reading.askParagraphHint': '段落を長押しすると、その部分について質問できます',
    'reading.unlock': '鑑定書を全て解放',
    'reading.lcCareerLabel': '仕事と財運',
    'reading.lcCareerDesc': '職業の方向性、財のタイミング、適した協業の形。',
    'reading.lcCareerDetail':
      '日主・十神・大運の三層から、あなたに最も適した職業の方向と商いのオーラを読み解きます。五行と相性のよい業種、大運の中で財運が高まる時期と引く時期、正財（安定）と偏財（機会）の比重が示すキャリア型（給与・起業・投資）、そして共同の場で支えてくれる人と消耗させる人の見分け方を含みます。',
    'reading.lcRelLabel': '恋愛と人間関係',
    'reading.lcRelDesc': '恋愛の流れ、人間関係に潜むパターン。',
    'reading.lcRelDetail':
      '夫妻宮だけでなく、八字の十神配置・紫微の夫妻 / 官禄 / 遷移三宮・大運の感情リズムを束ねて、あなたの惹かれ方と衝突パターンを読み解きます。無意識に惹かれる気質、関係の中で自然に演じる役割（守る / 守られる / 仲介する）、長く伸びやかでいられる距離感、健全なサインと静かに消耗するサイン、そして今後三年の感情の軸を含みます。',
    'reading.lcHiddenLabel': '潜在リスク',
    'reading.lcHiddenDesc': '命盤に潜む緊張とその解消の方向。',
    'reading.lcHiddenDetail':
      '一見害がなさそうで、長い目で見るとあなたを静かに消耗させている命盤の緊張点を扱います。沖剋と刑害が生む「同じ困りごとの繰り返し」、調候が崩れているときに心身に現れる具体的なサイン、偏印 / 七殺 / 劫財の隠れた構造が自己を削るしくみ、大運がその緊張を増幅するタイミング、そして緊張を消すのではなく自分の燃料に変えていく対処の道筋を含みます。',
    'reading.lcActionLabel': '行動指針',
    'reading.lcActionDesc': '今後 30 / 90 日の具体的な行動提案。',
    'reading.lcActionDetail':
      '本書全体の判断を、今週から動かせる行動に翻訳します。今後 30 / 90 / 365 日の優先タスク（あなたの五行の喜忌で並び替え）、推し進める方向と一旦保留する方向、今の大運に揃った日々の動かし方——どんな日に重要な話を持ち出し、どんな日に決断を避けるか、そして前章で挙げた緊張点に対する具体的な行動指針を含みます。',
    'ziwei.soulBody': '命主 {soul} · 身主 {body}',
    'ziwei.bodyTag': '身',
    'ziwei.empty': '空宮',
    'appendix.title': '命盤の概要',
    'appendix.bazi': '八字命盤',
    'appendix.ziwei': '紫微命盤',
    'appendix.wuxing': '五行の分布',
    'appendix.dayun': '大運',
    'appendix.metaLine': '日主 {dm} · {geju} · {self}',
    'pillar.year': '年',
    'pillar.month': '月',
    'pillar.day': '日',
    'pillar.hour': '時',
    'label.dayMaster': '日主',
    'label.self': '身{s}',
    'label.soulPalaceInline': '命宮{stars}',
    'home.favorAvoid': '喜{fav} · 忌{unfav}',
    'birth.timeUnknown': '時刻不明',
    'common.back': '戻る',
    'common.close': '閉じる',
  },
}

export type ReadingStringKey = keyof typeof readingTranslations.en

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/** Translate + interpolate a reading string. Falls back to en, then the key. */
export function tr(
  locale: Locale,
  key: ReadingStringKey,
  vars?: Record<string, string | number>
): string {
  const raw = readingTranslations[locale][key] ?? readingTranslations.en[key] ?? key
  return interpolate(raw, vars)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Data-atom maps — the BaZi/Ziwei values we DO localise. Re-implemented against
 * kindred's `Locale` (ming-pan keyed these on its own AppLocale with `zh-Hans`;
 * the only delta is that key → kindred's `zh`).
 * ────────────────────────────────────────────────────────────────────────── */

const ELEMENT_EN: Record<WuXing, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}

const STRENGTH: Record<GeJuAnalysis['dayMasterStrength'], Record<Locale, string>> = {
  极强: { zh: '极强', 'zh-Hant': '極強', ja: '極強', en: 'Very Strong' },
  偏强: { zh: '偏强', 'zh-Hant': '偏強', ja: 'やや強', en: 'Strong' },
  中和: { zh: '中和', 'zh-Hant': '中和', ja: '中和', en: 'Balanced' },
  偏弱: { zh: '偏弱', 'zh-Hant': '偏弱', ja: 'やや弱', en: 'Weak' },
  极弱: { zh: '极弱', 'zh-Hant': '極弱', ja: '極弱', en: 'Very Weak' },
}

const GENDER: Record<'男' | '女', Record<Locale, string>> = {
  男: { zh: '男', 'zh-Hant': '男', ja: '男性', en: 'Male' },
  女: { zh: '女', 'zh-Hant': '女', ja: '女性', en: 'Female' },
}

export function elementLabel(e: WuXing, locale: Locale): string {
  return locale === 'en' ? ELEMENT_EN[e] : e
}

export function strengthLabel(s: GeJuAnalysis['dayMasterStrength'], locale: Locale): string {
  return STRENGTH[s][locale]
}

export function genderLabel(g: '男' | '女', locale: Locale): string {
  return GENDER[g][locale]
}

/** Day master as a unit: zh keeps "甲木"; en parenthesises "甲 (Wood)". */
export function dayMasterLabel(stem: HeavenlyStem, element: WuXing, locale: Locale): string {
  return locale === 'en' ? `${stem} (${ELEMENT_EN[element]})` : `${stem}${element}`
}

/**
 * 格局 (chart structure) localisation. The identity line printed `geju.primary`
 * raw — fine for CJK readers, but a bare 月刃格 leaks into English prose. en gets
 * the standard BaZi English name; zh keeps the simplified source; zh-Hant + ja
 * take the traditional/kanji form (Japanese 四柱推命 reads these). An unmapped
 * value falls back to the raw string, so a future GeJuType never breaks the line.
 */
const GEJU: Record<GeJuType, { en: string; hant: string }> = {
  正官格: { en: 'Direct Officer', hant: '正官格' },
  七杀格: { en: 'Seven Killings', hant: '七殺格' },
  正财格: { en: 'Direct Wealth', hant: '正財格' },
  偏财格: { en: 'Indirect Wealth', hant: '偏財格' },
  正印格: { en: 'Direct Resource', hant: '正印格' },
  偏印格: { en: 'Indirect Resource', hant: '偏印格' },
  伤官格: { en: 'Hurting Officer', hant: '傷官格' },
  食神格: { en: 'Eating God', hant: '食神格' },
  从财格: { en: 'Follow Wealth', hant: '從財格' },
  从杀格: { en: 'Follow Killings', hant: '從殺格' },
  从儿格: { en: 'Follow Output', hant: '從兒格' },
  从势格: { en: 'Follow Momentum', hant: '從勢格' },
  曲直格: { en: 'Wood Dominant', hant: '曲直格' },
  炎上格: { en: 'Fire Dominant', hant: '炎上格' },
  稼穑格: { en: 'Earth Dominant', hant: '稼穡格' },
  从革格: { en: 'Metal Dominant', hant: '從革格' },
  润下格: { en: 'Water Dominant', hant: '潤下格' },
  建禄格: { en: 'Established Prosperity', hant: '建祿格' },
  月刃格: { en: 'Month Blade', hant: '月刃格' },
  普通格: { en: 'Ordinary', hant: '普通格' },
}

/** 格局 → localised name. zh = simplified source; en = BaZi term; zh-Hant/ja = traditional. */
export function gejuLabel(geju: string, locale: Locale): string {
  const entry = GEJU[geju as GeJuType]
  if (!entry) return geju
  if (locale === 'en') return entry.en
  if (locale === 'zh') return geju
  return entry.hant
}

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 时辰 index → localised "子时" / "子時" / "子 hour". The branch char stays canonical. */
export function shichenLabel(timeIndex: number, locale: Locale): string {
  const branch = SHICHEN[((timeIndex % 12) + 12) % 12] ?? '子'
  if (locale === 'en') return `${branch} hour`
  if (locale === 'zh') return `${branch}时`
  return `${branch}時`
}

/**
 * 紫微 palace names. Keyed by iztro's zh-CN output (note: only 命宫 carries the
 * 宫 suffix; the rest are bare). palaceLabel falls back to the raw name so an
 * unmapped or variant palace (e.g. 交友 vs 仆役) still renders.
 */
const PALACE: Record<string, Record<Locale, string>> = {
  命宫: { zh: '命宫', 'zh-Hant': '命宮', ja: '命宮', en: 'Soul' },
  兄弟: { zh: '兄弟', 'zh-Hant': '兄弟', ja: '兄弟', en: 'Siblings' },
  夫妻: { zh: '夫妻', 'zh-Hant': '夫妻', ja: '夫妻', en: 'Spouse' },
  子女: { zh: '子女', 'zh-Hant': '子女', ja: '子女', en: 'Children' },
  财帛: { zh: '财帛', 'zh-Hant': '財帛', ja: '財帛', en: 'Wealth' },
  疾厄: { zh: '疾厄', 'zh-Hant': '疾厄', ja: '疾厄', en: 'Health' },
  迁移: { zh: '迁移', 'zh-Hant': '遷移', ja: '遷移', en: 'Travel' },
  仆役: { zh: '仆役', 'zh-Hant': '僕役', ja: '奴僕', en: 'Friends' },
  官禄: { zh: '官禄', 'zh-Hant': '官祿', ja: '官禄', en: 'Career' },
  田宅: { zh: '田宅', 'zh-Hant': '田宅', ja: '田宅', en: 'Property' },
  福德: { zh: '福德', 'zh-Hant': '福徳', ja: '福徳', en: 'Wellbeing' },
  父母: { zh: '父母', 'zh-Hant': '父母', ja: '父母', en: 'Parents' },
}

export function palaceLabel(name: string, locale: Locale): string {
  return PALACE[name]?.[locale] ?? name
}

/**
 * 紫微 major-star archetypes. The 14 主星 names are unreadable in Latin script,
 * so for `en` we substitute a one-word personality archetype (the standard
 * 紫微斗数 reading). zh / zh-Hant / ja keep the canonical name — Japanese 紫微斗数
 * uses the identical kanji, so only the Latin locale needs the swap.
 */
const STAR_ARCHETYPE_EN: Record<string, string> = {
  紫微: 'Sovereign',
  天机: 'Strategist',
  太阳: 'Radiant',
  武曲: 'General',
  天同: 'Harmonizer',
  廉贞: 'Maverick',
  天府: 'Steward',
  太阴: 'Nurturer',
  贪狼: 'Seeker',
  巨门: 'Orator',
  天相: 'Diplomat',
  天梁: 'Guardian',
  七杀: 'Warrior',
  破军: 'Pioneer',
}

/** 五行局 (e.g. 水二局) → compact English label. */
const FIVE_EL_CLASS_EN: Record<string, string> = {
  水二局: 'Water · II',
  木三局: 'Wood · III',
  金四局: 'Metal · IV',
  土五局: 'Earth · V',
  火六局: 'Fire · VI',
}

/**
 * Whether 紫微 surfaces should swap canonical star names for translated
 * archetypes. English only — the other three locales read the CJK names.
 */
export function usesStarArchetype(locale: Locale): boolean {
  return locale === 'en'
}

/** Major-star name → archetype (en) or canonical name (zh/zh-Hant/ja). */
export function starArchetypeLabel(name: string, locale: Locale): string {
  return locale === 'en' ? (STAR_ARCHETYPE_EN[name] ?? name) : name
}

/** 五行局 → compact English label (en) or canonical CJK (zh/zh-Hant/ja). */
export function fiveElementsClassLabel(cls: string, locale: Locale): string {
  return locale === 'en' ? (FIVE_EL_CLASS_EN[cls] ?? cls) : cls
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hook — mirrors lib/i18n's useI18n() shape but bound to the reading strings,
 * exposing the var-aware `t` the reading components need.
 * ────────────────────────────────────────────────────────────────────────── */

export function useReadingI18n(locale: Locale): {
  locale: Locale
  t: (key: ReadingStringKey, vars?: Record<string, string | number>) => string
} {
  // Locale is injected by the app (Yuel resolves its device locale; Yuun its own),
  // so this shared reading-i18n never reaches into a specific app's resolver.
  return {
    locale,
    t: (key, vars) => tr(locale, key, vars),
  }
}
