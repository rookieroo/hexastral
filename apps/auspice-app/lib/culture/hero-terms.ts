/**
 * 黄历 Hero 专有名词解释层 — 岁次/干支/建除/值神/星宿/冲煞/彭祖百忌/
 * 纳音/五行/生肖/农历，四语（zh-Hans/zh-Hant/ja/en）。
 *
 * 核心诉求：不懂干支五行也能看懂黄历——Hero 每个行话都可点击，
 * 弹出教育优先的白话解释（先说"是什么"，再说"今天怎么用"）。
 */

import type { Locale } from '../i18n'

type HeroTerm = keyof typeof HERO_TERM_MEANINGS

const HERO_TERM_MEANINGS = {
  岁次: {
    'zh-Hans':
      '「岁次」指这一年所在的干支序位：十天干与十二地支两两相配纪年，六十年一轮回。「岁次乙巳年」即今年是「乙巳」年——乙属阴木、巳属蛇，所以今年也叫蛇年。',
    'zh-Hant':
      '「歲次」指這一年所在的干支序位：十天干與十二地支兩兩相配紀年，六十年一輪回。「歲次乙巳年」即今年是「乙巳」年——乙屬陰木、巳屬蛇，所以今年也叫蛇年。',
    ja: '「歳次」はその年の干支の位置です。十干と十二支を組み合わせて年を数え、60年で一巡します。「歳次乙巳年」は今年が「乙巳（きのとみ）」の年、巳は蛇なので蛇年とも呼ばれます。',
    en: '岁次 marks the year’s place in the 60-year stem-branch cycle. “岁次乙巳年” names this year 乙巳: the stem 乙 is yin wood, the branch 巳 is the Snake — hence a Snake year.',
  },
  干支: {
    'zh-Hans':
      '天干（甲乙丙丁戊己庚辛壬癸）与地支（子丑寅卯辰巳午未申酉戌亥）两两相配，组成六十个组合（六十甲子），用来记录年、月、日、时。「癸未日」即今天的干支为癸未。',
    'zh-Hant':
      '天干（甲乙丙丁戊己庚辛壬癸）與地支（子丑寅卯辰巳午未申酉戌亥）兩兩相配，組成六十個組合（六十甲子），用來記錄年、月、日、時。「癸未日」即今天的干支為癸未。',
    ja: '十干（甲乙丙丁戊己庚辛壬癸）と十二支（子丑寅卯辰巳午未申酉戌亥）を組み合わせた六十干支。年・月・日・時を記す基本の記号です。「癸未日」は今日の干支が癸未ということ。',
    en: 'Ten heavenly stems pair with twelve earthly branches to form 60 units (the sexagenary cycle) used to record years, months, days and hours. “癸未日” means today’s unit is 癸未.',
  },
  建除: {
    'zh-Hans':
      '建、除、满、平、定、执、破、危、成、收、开、闭十二字按日轮值，称建除十二神（十二建星）。「闭日」即今天值「闭」——建除是黄历标注每日状态的基础行话。',
    'zh-Hant':
      '建、除、滿、平、定、執、破、危、成、收、開、閉十二字按日輪值，稱建除十二神（十二建星）。「閉日」即今天值「閉」——建除是黃曆標注每日狀態的基礎行話。',
    ja: '建・除・満・平・定・執・破・危・成・収・開・閉の十二字が日ごとに巡る「十二直（建除十二神）」。黄暦がその日の状態を示す基本の用語です。「閉日」は今日が「閉」に当たる日。',
    en: 'Twelve day-officers — 建, 除, 满, 平, 定, 执, 破, 危, 成, 收, 开, 闭 — rotate daily. They are the almanac’s basic daily-state marker; “闭日” means today is a 闭 (Closing) day.',
  },
  值神: {
    'zh-Hans':
      '黄道黑道十二值神（青龙、明堂、天刑、朱雀、金匮、天德、白虎、玉堂、天牢、玄武、司命、勾陈）每日轮值，其中青龙、明堂、金匮、天德、玉堂、司命为黄道吉神，其余为黑道。',
    'zh-Hant':
      '黃道黑道十二值神（青龍、明堂、天刑、朱雀、金匱、天德、白虎、玉堂、天牢、玄武、司命、勾陳）每日輪值，其中青龍、明堂、金匱、天德、玉堂、司命為黃道吉神，其餘為黑道。',
    ja: '黄道・黒道の十二神（青龍・明堂・天刑・朱雀・金匱・天徳・白虎・玉堂・天牢・玄武・司命・勾陳）が日ごとに輪番します。青龍・明堂・金匱・天徳・玉堂・司命が黄道の吉神、他は黒道です。',
    en: 'Twelve day-gods (青龙 Azure Dragon, 明堂 Hall of Light, … through 勾陈) rotate daily. The six “yellow-road” gods — Azure Dragon, 明堂, 金匮, 天德, 玉堂, 司命 — are auspicious; the rest are “black-road”.',
  },
  星宿: {
    'zh-Hans':
      '二十八宿把天空分为二十八个星区，按日轮值；每宿配有七曜与动物（如「亢金龙」＝亢宿属金、形似龙）。「亢金龙宿」即今天值亢宿。',
    'zh-Hant':
      '二十八宿把天空分為二十八個星區，按日輪值；每宿配有七曜與動物（如「亢金龍」＝亢宿屬金、形似龍）。「亢金龍宿」即今天值亢宿。',
    ja: '二十八宿は天空を28の星区に分け、日ごとに輪番します。各宿には七曜と動物が配されます（「亢金龍」＝亢宿は金・龍）。「亢金龍宿」は今日が亢宿の日ということ。',
    en: 'Twenty-eight lunar mansions divide the sky; one rules each day, tagged with a weekday-planet and an animal (亢金龙 = mansion 亢, metal, dragon). Today’s mansion is 亢.',
  },
  冲煞: {
    'zh-Hans':
      '「冲」指今日地支与某地支相冲（十二支两两相对为六冲），对应生肖即为被冲属相；「煞」指当天凶方。黄历以此提醒该属相与煞方行事多留意——属文化参考，非预测。',
    'zh-Hant':
      '「衝」指今日地支與某地支相衝（十二支兩兩相對為六衝），對應生肖即為被衝屬相；「煞」指當天凶方。黃曆以此提醒該屬相與煞方行事多留意——屬文化參考，非預測。',
    ja: '「冲」は今日の地支と相冲する地支（六冲）を指し、対応する生肖が「冲に当たる干支」です。「煞」はその日の凶方。該当する干支の人と凶方には注意、という文化的参考です。',
    en: '冲 = today’s branch clashes with another (six-clash pairs); the matching zodiac sign is “clashed”. 煞 = the day’s unlucky direction. A traditional heads-up, cultural reference only.',
  },
  彭祖百忌: {
    'zh-Hans':
      '按日干支的两句古忌口诀，如「癸不词讼，未不服药」——癸日不宜打官司，未日不宜服药。传说出自彭祖养生之说，黄历作文化参考。',
    'zh-Hant':
      '按日干支的兩句古忌口訣，如「癸不詞訟，未不服藥」——癸日不宜打官司，未日不宜服藥。傳說出自彭祖養生之說，黃曆作文化參考。',
    ja: '日干支に応じた二句の禁忌の口訣。例「癸不詞訟、未不服薬」——癸の日は訴訟を避け、未の日は服薬を避ける、という言い伝え。文化参考です。',
    en: 'Two taboo lines keyed to the day’s stem-branch, e.g. “癸不词讼，未不服药” — on a 癸 day avoid lawsuits, on a 未 day avoid taking medicine. Cultural reference, attributed to Peng Zu.',
  },
  纳音: {
    'zh-Hans':
      '纳音是六十甲子各自对应的五行分类名（如「杨柳木」「炉中火」「海中金」）。黄历常用当日干支的纳音概括这一天五行属性。',
    'zh-Hant':
      '納音是六十甲子各自對應的五行分類名（如「楊柳木」「爐中火」「海中金」）。黃曆常用當日干支的納音概括這一天五行屬性。',
    ja: '納音は六十干支それぞれに配された五行の分類名（「楊柳木」「炉中火」「海中金」など）。黄暦はその日の干支の納音で一日の五行を表します。',
    en: '纳音 names a five-element category for each of the 60 stem-branch pairs (e.g. “willow wood”, “furnace fire”). The almanac uses the day’s 纳音 to summarize its element.',
  },
  五行: {
    'zh-Hans':
      '金、木、水、火、土五种元素及其相生（木生火、火生土、土生金、金生水、水生木）相克关系，是中国传统认识万物的框架。黄历以日干支推每日五行。',
    'zh-Hant':
      '金、木、水、火、土五種元素及其相生（木生火、火生土、土生金、金生水、水生木）相剋關係，是中國傳統認識萬物的框架。黃曆以日干支推每日五行。',
    ja: '金・木・水・火・土の五元素と、相生（木→火→土→金→水→木）・相剋の関係。中国伝統の万物分類の枠組みで、黄暦は日干支からその日の五行を導きます。',
    en: 'Five elements — metal, wood, water, fire, earth — with generating (wood→fire→earth→metal→water) and overcoming cycles, the traditional frame for classifying things. The almanac derives each day’s element from its stem-branch.',
  },
  生肖: {
    'zh-Hans':
      '十二地支对应十二种动物：子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪。「属马」即出生年在午马。',
    'zh-Hant':
      '十二地支對應十二種動物：子鼠、丑牛、寅虎、卯兔、辰龍、巳蛇、午馬、未羊、申猴、酉雞、戌狗、亥豬。「屬馬」即出生年在午馬。',
    ja: '十二支に対応する十二の動物：子鼠・丑牛・寅虎・卯兎・辰龍・巳蛇・午馬・未羊・申猿・酉鶏・戌犬・亥猪。「午年生まれ」が属馬です。',
    en: 'Each earthly branch pairs with an animal: 子 Rat, 丑 Ox, 寅 Tiger, 卯 Rabbit, 辰 Dragon, 巳 Snake, 午 Horse, 未 Goat, 申 Monkey, 酉 Rooster, 戌 Dog, 亥 Pig. “属马” = born in a Horse year.',
  },
  农历: {
    'zh-Hans':
      '农历（阴历/旧历）以月亮圆缺定月——初一为朔、十五为望，并以二十四节气校准四季。「冬月廿一」即农历十一月二十一。',
    'zh-Hant':
      '農曆（陰曆/舊曆）以月亮圓缺定月——初一為朔、十五為望，並以二十四節氣校準四季。「冬月廿一」即農曆十一月二十一。',
    ja: '旧暦（太陰暦）は月の満ち欠けで月を定め、初一が朔・十五が望。二十四節気で季節を補正します。「冬月廿一」は旧暦十一月二十一日。',
    en: 'The lunar calendar sets months by the moon — day 1 is the new moon, day 15 the full — calibrated to the seasons by the 24 solar terms. “冬月廿一” = lunar 11th month, day 21.',
  },
} as const

/** 取 Hero 术语解释（四语）；无词条返回 null。 */
export function heroTermExplanation(term: string, locale: string): string | null {
  const entry = HERO_TERM_MEANINGS[term as HeroTerm]
  if (!entry) return null
  const loc: Locale = locale.startsWith('zh-Hant')
    ? 'zh-Hant'
    : locale.startsWith('ja')
      ? 'ja'
      : locale.startsWith('en')
        ? 'en'
        : 'zh-Hans'
  return entry[loc] ?? null
}

export const HERO_TERM_KEYS = Object.keys(HERO_TERM_MEANINGS) as readonly string[]
