/**
 * Short culture summaries — 1-2 sentences per festival / 节气, in 4 locales.
 *
 * This is the "今日文化" inline blurb on the home card: most days there is no
 * long-form authored entry (only a handful have full `sections`), so the home
 * shows this summary instead and hides "Read more" unless a full entry exists.
 *
 * Keyed by the same route id the home/glossary resolve to:
 *   - 24 节气 → `jieqi-{pinyin}` (清明 / 冬至 also have festival-flavoured
 *     entries under `qingming` / `dongzhi`, used when reached as a festival).
 *   - 8 festivals → their `AuspiceFestival.id`.
 */

import type { Locale } from '../i18n'
import type { LocalizedText } from './types'

export const CULTURE_SUMMARIES: Record<string, LocalizedText> = {
  // ── 24 节气 ────────────────────────────────────────────────────────────────
  'jieqi-lichun': {
    'zh-Hans': '二十四节气之首，春之始。万物复苏，民间有咬春、迎春之俗，农事由此展开。',
    'zh-Hant': '二十四節氣之首，春之始。萬物復甦，民間有咬春、迎春之俗，農事由此展開。',
    ja: '二十四節気の最初で、春の始まり。万物が動き出し、農作業が始まる目安とされる。',
    en: 'The first solar term and the start of spring — life stirs again and the farming year begins.',
  },
  'jieqi-yushui': {
    'zh-Hans': '降水渐增、气温回升，冰雪消融。正是早春养护与农耕备播的时节。',
    'zh-Hant': '降水漸增、氣溫回升，冰雪消融。正是早春養護與農耕備播的時節。',
    ja: '雨が増えて気温が上がり、雪解けが進む。早春の備えと種まきの準備の頃。',
    en: 'Rain increases and temperatures climb as snow melts — time to prepare for early-spring planting.',
  },
  'jieqi-jingzhe': {
    'zh-Hans': '春雷始鸣，惊醒蛰伏的昆虫。标志仲春到来，春耕正式开始。',
    'zh-Hant': '春雷始鳴，驚醒蟄伏的昆蟲。標誌仲春到來，春耕正式開始。',
    ja: '春の雷が鳴り、冬眠の虫が目を覚ます。仲春の訪れと本格的な農耕の始まり。',
    en: 'Spring thunder wakes hibernating insects — mid-spring arrives and plowing begins in earnest.',
  },
  'jieqi-chunfen': {
    'zh-Hans': '昼夜均分、寒暑平衡。自此北半球白昼渐长，气候转暖，草木萌发。',
    'zh-Hant': '晝夜均分、寒暑平衡。自此北半球白晝漸長，氣候轉暖，草木萌發。',
    ja: '昼と夜がほぼ等しくなる日。これより昼が長くなり、暖かさが増していく。',
    en: 'Day and night are equal; from here days lengthen, warmth grows, and new shoots appear.',
  },
  'jieqi-qingming': {
    'zh-Hans': '气清景明、万物洁齐，正是春耕春种的好时节，亦有扫墓踏青之俗。',
    'zh-Hant': '氣清景明、萬物潔齊，正是春耕春種的好時節，亦有掃墓踏青之俗。',
    ja: '空気が澄み万物が清らかになる頃。春の農作業に適し、墓参りや野遊びの習わしも。',
    en: 'Clear and bright, when all is fresh — prime time for spring planting, graves, and green outings.',
  },
  'jieqi-guyu': {
    'zh-Hans': '雨生百谷，春季最后一个节气。雨水充沛，正是播种移苗的关键时节。',
    'zh-Hant': '雨生百穀，春季最後一個節氣。雨水充沛，正是播種移苗的關鍵時節。',
    ja: '「雨が百穀を潤す」春最後の節気。雨が多く、種まきや苗の移植に適する。',
    en: '"Rain for the grain" — spring’s last term, when ample rain makes it prime to sow and transplant.',
  },
  'jieqi-lixia': {
    'zh-Hans': '夏之始，万物繁茂。气温明显升高，农作物进入旺盛生长期。',
    'zh-Hant': '夏之始，萬物繁茂。氣溫明顯升高，農作物進入旺盛生長期。',
    ja: '夏の始まり。気温が上がり、作物が勢いよく育つ季節に入る。',
    en: 'The start of summer — growth accelerates as temperatures rise and crops enter their vigorous phase.',
  },
  'jieqi-xiaoman': {
    'zh-Hans': '麦类等夏熟作物籽粒渐满，但未成熟。江南自此进入多雨时节。',
    'zh-Hant': '麥類等夏熟作物籽粒漸滿，但未成熟。江南自此進入多雨時節。',
    ja: '麦など夏作物の実が膨らみ始めるが、まだ熟さない頃。江南では雨が増える。',
    en: 'Summer grains begin to fill out but aren’t yet ripe; the rainy season sets in across the south.',
  },
  'jieqi-mangzhong': {
    'zh-Hans': '有芒作物成熟、抢收抢种。是一年中最繁忙的农事时节。',
    'zh-Hant': '有芒作物成熟、搶收搶種。是一年中最繁忙的農事時節。',
    ja: '芒のある作物を刈り取り、田植えに忙しい、一年で最も慌ただしい農繁期。',
    en: 'Awned grains ripen for harvest while rice is planted — the busiest stretch of the farming year.',
  },
  'jieqi-xiazhi': {
    'zh-Hans': '白昼最长、阳气至盛。自此进入炎夏，白昼日渐缩短。',
    'zh-Hant': '白晝最長、陽氣至盛。自此進入炎夏，白晝日漸縮短。',
    ja: '一年で昼が最も長い日。陽の気が極まり、これより暑い夏へ向かう。',
    en: 'The longest day, when yang energy peaks — high summer begins and daylight slowly shortens.',
  },
  'jieqi-xiaoshu': {
    'zh-Hans': '暑气渐盛但未至极，多雷雨闷热。宜防暑降温、静心养神。',
    'zh-Hant': '暑氣漸盛但未至極，多雷雨悶熱。宜防暑降溫、靜心養神。',
    ja: '暑さが増すがまだ極まらない頃。雷雨と蒸し暑さに注意し、養生を心がける。',
    en: 'Heat builds but hasn’t peaked, with thunderstorms and humidity — a time to stay cool and calm.',
  },
  'jieqi-dashu': {
    'zh-Hans': '一年中最炎热的时节，湿热交蒸。民间有饮伏茶、晒伏等习俗。',
    'zh-Hant': '一年中最炎熱的時節，濕熱交蒸。民間有飲伏茶、曬伏等習俗。',
    ja: '一年で最も暑い時期。蒸し暑さが極まり、暑気払いの風習が見られる。',
    en: 'The hottest term of the year, hot and humid — marked by customs to beat the peak summer heat.',
  },
  'jieqi-liqiu': {
    'zh-Hans': '秋之始，暑去凉来。民间有贴秋膘、啃秋等习俗，暑热仍未尽消。',
    'zh-Hant': '秋之始，暑去涼來。民間有貼秋膘、啃秋等習俗，暑熱仍未盡消。',
    ja: '秋の始まり。暑さが和らぎ始めるが残暑は続き、季節の食の風習がある。',
    en: 'The start of autumn — heat begins to ease (though it lingers), marked by seasonal eating customs.',
  },
  'jieqi-chushu': {
    'zh-Hans': '暑气至此而止，炎热渐退、早晚转凉，进入秋高气爽的时节。',
    'zh-Hant': '暑氣至此而止，炎熱漸退、早晚轉涼，進入秋高氣爽的時節。',
    ja: '暑さが収まる頃。朝晩が涼しくなり、秋らしい爽やかさが訪れる。',
    en: 'Heat retreats at last; mornings and evenings cool and the crisp days of autumn arrive.',
  },
  'jieqi-bailu': {
    'zh-Hans': '昼夜温差加大，清晨草木凝结露珠。是典型的秋季节气。',
    'zh-Hant': '晝夜溫差加大，清晨草木凝結露珠。是典型的秋季節氣。',
    ja: '昼夜の寒暖差が大きくなり、朝には草木に露がおりる、秋らしい節気。',
    en: 'Day-night temperature gaps widen and dew beads on the grass at dawn — autumn in full.',
  },
  'jieqi-qiufen': {
    'zh-Hans': '昼夜再次均分，自此昼短夜长、气候渐凉。正值秋收秋种。',
    'zh-Hant': '晝夜再次均分，自此晝短夜長、氣候漸涼。正值秋收秋種。',
    ja: '再び昼夜が等しくなる日。これより夜が長くなり、秋の収穫と種まきの頃。',
    en: 'Day and night equalize again; nights lengthen and cool as the autumn harvest and sowing peak.',
  },
  'jieqi-hanlu': {
    'zh-Hans': '露水更凉、将凝为霜，气温明显下降。北方进入深秋。',
    'zh-Hant': '露水更涼、將凝為霜，氣溫明顯下降。北方進入深秋。',
    ja: '露が冷たくなり霜に近づく頃。気温が下がり、北方は晩秋に入る。',
    en: 'Dew turns cold and near to frost as temperatures drop — the north slips into late autumn.',
  },
  'jieqi-shuangjiang': {
    'zh-Hans': '秋季最后一个节气，开始有霜。万物收敛，宜进补御寒。',
    'zh-Hant': '秋季最後一個節氣，開始有霜。萬物收斂，宜進補禦寒。',
    ja: '秋最後の節気で、霜が降り始める。万物が収まり、寒さに備える頃。',
    en: 'Autumn’s last term, when frost first appears — nature draws in and one eats to guard against cold.',
  },
  'jieqi-lidong': {
    'zh-Hans': '冬之始，万物收藏。民间有补冬、吃饺子等习俗，准备过冬。',
    'zh-Hant': '冬之始，萬物收藏。民間有補冬、吃餃子等習俗，準備過冬。',
    ja: '冬の始まり。万物が静まり、滋養を取り冬支度をする風習がある。',
    en: 'The start of winter — nature stores itself away, and people eat heartily to prepare for the cold.',
  },
  'jieqi-xiaoxue': {
    'zh-Hans': '气温降至冰点附近，北方开始降雪。进入腌腊、储冬的时节。',
    'zh-Hant': '氣溫降至冰點附近，北方開始降雪。進入醃臘、儲冬的時節。',
    ja: '気温が氷点近くまで下がり、北方では雪が降り始める。冬の保存食の頃。',
    en: 'Temperatures near freezing and snow begins in the north — the season to cure and store winter food.',
  },
  'jieqi-daxue': {
    'zh-Hans': '降雪增多、地面可积雪，天寒地冻。宜温补、养藏阳气。',
    'zh-Hant': '降雪增多、地面可積雪，天寒地凍。宜溫補、養藏陽氣。',
    ja: '雪が増えて積もり、厳しい寒さとなる。体を温め養生に努める頃。',
    en: 'Snow thickens and settles as the cold deepens — a time for warming foods and conserving energy.',
  },
  'jieqi-dongzhi': {
    'zh-Hans': '白昼最短、阴极阳生，自此白昼渐长。古有「冬至大如年」之说。',
    'zh-Hant': '白晝最短、陰極陽生，自此白晝漸長。古有「冬至大如年」之說。',
    ja: '昼が最も短く、陰が極まり陽が生じる転換点。これより昼が延びていく。',
    en: 'The shortest day, when yin peaks and yang is reborn — daylight lengthens from here onward.',
  },
  'jieqi-xiaohan': {
    'zh-Hans': '进入一年中最冷的时段，民间有「冷在三九」之说。宜防寒保暖。',
    'zh-Hant': '進入一年中最冷的時段，民間有「冷在三九」之說。宜防寒保暖。',
    ja: '一年で最も寒い時期に入る頃。「寒の入り」とも言われ、防寒が肝心。',
    en: 'The coldest stretch of the year begins — a time to bundle up against the deep midwinter chill.',
  },
  'jieqi-dahan': {
    'zh-Hans': '一年最后一个节气，天气酷寒。岁末将尽，开始准备迎接新春。',
    'zh-Hant': '一年最後一個節氣，天氣酷寒。歲末將盡，開始準備迎接新春。',
    ja: '一年最後の節気で、寒さが厳しい。年の瀬を迎え、新春の準備が始まる。',
    en: 'The final solar term, bitterly cold — the year closes and preparations for spring begin.',
  },

  // ── 8 festivals ─────────────────────────────────────────────────────────────
  chunjie: {
    'zh-Hans': '农历正月初一，辞旧迎新、阖家团圆，是华人最重要的传统节日。',
    'zh-Hant': '農曆正月初一，辭舊迎新、闔家團圓，是華人最重要的傳統節日。',
    ja: '旧暦の元日。新年を迎え一家が団欒する、中華圏で最も重要な伝統行事。',
    en: 'Lunar New Year’s Day — out with the old and in with the new, with family; the year’s biggest festival.',
  },
  yuanxiao: {
    'zh-Hans': '正月十五，赏花灯、吃元宵、猜灯谜，为春节画上圆满句点。',
    'zh-Hant': '正月十五，賞花燈、吃元宵、猜燈謎，為春節畫上圓滿句點。',
    ja: '正月十五日。灯籠を愛で、白玉団子を食べ、なぞなぞを楽しむ、春節の締めくくり。',
    en: 'The 15th of the first lunar month — lanterns, sweet rice balls, and riddles close the New Year season.',
  },
  qingming: {
    'zh-Hans': '仲春扫墓祭祖、缅怀先人，亦踏青郊游、亲近自然，是慎终追远的节日。',
    'zh-Hant': '仲春掃墓祭祖、緬懷先人，亦踏青郊遊、親近自然，是慎終追遠的節日。',
    ja: '先祖の墓参りをして偲び、野山に出かけて春を楽しむ、祖先を敬う節日。',
    en: 'A spring day to tend ancestral graves and remember the departed, and to walk the greening countryside.',
  },
  duanwu: {
    'zh-Hans': '五月初五，赛龙舟、吃粽子、挂艾草，纪念屈原并驱邪避疫。',
    'zh-Hant': '五月初五，賽龍舟、吃粽子、掛艾草，紀念屈原並驅邪避疫。',
    ja: '旧暦五月五日。竜舟競漕や粽（ちまき）で屈原を偲び、邪気を払う。',
    en: 'The 5th of the 5th lunar month — dragon-boat races and rice dumplings honor Qu Kindred and ward off ill.',
  },
  qixi: {
    'zh-Hans': '七月初七，源于牛郎织女的传说，是中国传统的「情人节」，又称乞巧节。',
    'zh-Hant': '七月初七，源於牛郎織女的傳說，是中國傳統的「情人節」，又稱乞巧節。',
    ja: '旧暦七月七日。牽牛と織女の伝説に由来する、中国の「七夕（恋人の日）」。',
    en: 'The 7th of the 7th lunar month — the Cowherd and Weaver legend makes this China’s lovers’ day.',
  },
  zhongqiu: {
    'zh-Hans': '八月十五，赏月、吃月饼、寄相思，象征团圆美满。',
    'zh-Hant': '八月十五，賞月、吃月餅、寄相思，象徵團圓美滿。',
    ja: '旧暦八月十五日。月を愛で、月餅を食べ、家族の団欒を願う中秋の名月。',
    en: 'The 15th of the 8th lunar month — moon-gazing and mooncakes celebrate reunion and togetherness.',
  },
  chongyang: {
    'zh-Hans': '九月初九，登高、赏菊、敬老，又称老人节，寓意长寿安康。',
    'zh-Hant': '九月初九，登高、賞菊、敬老，又稱老人節，寓意長壽安康。',
    ja: '旧暦九月九日。高きに登り菊を愛で、長寿を願う、敬老の節日。',
    en: 'The 9th of the 9th lunar month — climbing heights and chrysanthemums; a day honoring elders and long life.',
  },
  dongzhi: {
    'zh-Hans': '数九寒天之始，北方吃饺子、南方吃汤圆，有「冬至大如年」之俗。',
    'zh-Hant': '數九寒天之始，北方吃餃子、南方吃湯圓，有「冬至大如年」之俗。',
    ja: '寒さの底へ向かう起点。北は餃子、南は白玉を食べ、「冬至は正月に並ぶ」とされる。',
    en: 'The start of the deep-cold "counting nines" — dumplings north, rice balls south; "as big as New Year."',
  },
}

/** 1-2 sentence summary for a festival / 节气 route id, or null if none authored. */
export function cultureSummary(targetId: string, locale: Locale): string | null {
  return CULTURE_SUMMARIES[targetId]?.[locale] ?? null
}
