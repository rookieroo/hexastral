/**
 * @zhop/astro-i18n — 紫微斗数 (Zi Wei Dou Shu) term table (data)
 *
 * The synastry (合盘) report is read against TWO systems — 八字 and 紫微斗数 — and
 * the 紫微 layer surfaces palaces (命宫/夫妻宫…), the 14 major stars (紫微/武曲…),
 * and the four transformations (化禄/化权/化科/化忌) directly in the prose. Those
 * tokens need their own glossary entries so a tap can explain them and the
 * Settings table can teach them.
 *
 * Same voice rule as terms-data.ts: translate the EFFECT, not the characters.
 * zh + en authored; ja/ko fall back to en. `zh` matches the iztro engine tokens
 * so in-prose detection lines up.
 */

import type { TermEntry } from './terms'

export const ZIWEI_TERMS: TermEntry[] = [
  // ─── 紫微斗数 concepts + palaces ───
  {
    id: 'ziwei_ziweidoushu',
    zh: '紫微斗数',
    pinyin: 'zǐ wēi dǒu shù',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '以星曜入宫论命的流派',
        long: '紫微斗数：把命盘分作十二宫、以星曜落宫论人生的一套术数，与八字互相印证。',
      },
      en: {
        short: 'a star-and-palace map of fate',
        long: 'Zi Wei Dou Shu: a system that places stars across twelve palaces to read a life — the second lens we cross-check against BaZi.',
      },
    },
  },
  {
    id: 'ziwei_minggong',
    zh: '命宫',
    pinyin: 'mìng gōng',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '本命核心，性格与基调',
        long: '命宫：命盘的核心宫位，定下一个人的性格底色与人生基调。',
      },
      en: {
        short: 'the core self & life tone',
        long: 'Life Palace: the anchor of the chart — the temperament and overall key a life is set in.',
      },
    },
  },
  {
    id: 'ziwei_shengong',
    zh: '身宫',
    pinyin: 'shēn gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '后天用力的方向', long: '身宫：人到中年后逐渐显现、后天最用心着力的方向。' },
      en: {
        short: 'where you invest later',
        long: 'Body Palace: the area a person leans into in the second half of life — earned, not innate.',
      },
    },
  },
  {
    id: 'ziwei_fuqigong',
    zh: '夫妻宫',
    pinyin: 'fū qī gōng',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '婚姻与亲密关系',
        long: '夫妻宫：看婚姻、伴侣与亲密关系的宫位，合盘里尤其关键。',
      },
      en: {
        short: 'marriage & intimacy',
        long: 'Spouse Palace: the house of marriage and partnership — the one a synastry read leans on most.',
      },
    },
  },
  {
    id: 'ziwei_fudegong',
    zh: '福德宫',
    pinyin: 'fú dé gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '精神享受与福分', long: '福德宫：看一个人的精神世界、兴趣享受与内在的安乐。' },
      en: {
        short: 'inner contentment & ease',
        long: 'Fortune Palace: the inner life — what brings a person peace, pleasure, and a sense of enough.',
      },
    },
  },
  {
    id: 'ziwei_caibogong',
    zh: '财帛宫',
    pinyin: 'cái bó gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '金钱与理财', long: '财帛宫：看钱财的来去、赚取方式与理财的态度。' },
      en: {
        short: 'money & means',
        long: 'Wealth Palace: how money comes and goes — earning style and the attitude toward it.',
      },
    },
  },
  {
    id: 'ziwei_guanlugong',
    zh: '官禄宫',
    pinyin: 'guān lù gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '事业与社会成就', long: '官禄宫：看事业、职业方向与在外的成就与地位。' },
      en: {
        short: 'work & standing',
        long: 'Career Palace: the field of work, direction, and the standing one builds in the world.',
      },
    },
  },
  {
    id: 'ziwei_qianyigong',
    zh: '迁移宫',
    pinyin: 'qiān yí gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '外出、机遇与人际', long: '迁移宫：看出门在外的际遇、变动与人际舞台。' },
      en: {
        short: 'the wider world & chances',
        long: 'Travel Palace: life beyond home — opportunities, movement, and how one meets the world.',
      },
    },
  },
  {
    id: 'ziwei_zinugong',
    zh: '子女宫',
    pinyin: 'zǐ nǚ gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '子女与创造力', long: '子女宫：看子女缘分，也看创造力与亲手培育之事。' },
      en: {
        short: 'children & creativity',
        long: 'Children Palace: bonds with children — and creativity, the things one nurtures into being.',
      },
    },
  },
  {
    id: 'ziwei_xiongdigong',
    zh: '兄弟宫',
    pinyin: 'xiōng dì gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '手足与平辈', long: '兄弟宫：看手足之情，也看平辈、合作伙伴的缘分。' },
      en: {
        short: 'siblings & peers',
        long: 'Siblings Palace: brothers and sisters — and peers and partners of the same standing.',
      },
    },
  },
  {
    id: 'ziwei_fumugong',
    zh: '父母宫',
    pinyin: 'fù mǔ gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '父母与长辈', long: '父母宫：看与父母、长辈、上司之间的缘分与支持。' },
      en: {
        short: 'parents & elders',
        long: 'Parents Palace: the bond with parents and elders — the support that comes from above.',
      },
    },
  },
  {
    id: 'ziwei_jiegong',
    zh: '疾厄宫',
    pinyin: 'jí è gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '健康与体质', long: '疾厄宫：看身体的强弱、体质倾向与需要留意的健康面。' },
      en: {
        short: 'body & vitality',
        long: 'Health Palace: the body’s strengths and weak spots — where to tend one’s vitality.',
      },
    },
  },
  {
    id: 'ziwei_tianzhaigong',
    zh: '田宅宫',
    pinyin: 'tián zhái gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '家宅与不动产', long: '田宅宫：看家庭、居所与不动产，也是内心安定的根。' },
      en: {
        short: 'home & holdings',
        long: 'Property Palace: home, dwelling, and real holdings — and the ground one feels settled on.',
      },
    },
  },
  {
    id: 'ziwei_jiaoyougong',
    zh: '交友宫',
    pinyin: 'jiāo yǒu gōng',
    category: 'ziwei',
    meaning: {
      zh: { short: '朋友与下属', long: '交友宫：看朋友、同侪与下属，关系是助力还是消耗。' },
      en: {
        short: 'friends & circle',
        long: 'Friends Palace: friends, colleagues, and those one leads — whether a circle lifts or drains.',
      },
    },
  },
  {
    id: 'ziwei_sanfangsizheng',
    zh: '三方四正',
    pinyin: 'sān fāng sì zhèng',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '一宫四方的呼应',
        long: '三方四正：本宫加上呼应它的三个宫，合看才完整，不能只看一宫。',
      },
      en: {
        short: 'the four palaces that frame one',
        long: 'Four-Corners: a palace plus the three that echo it — read together, never one alone.',
      },
    },
  },
  {
    id: 'ziwei_wuxingju',
    zh: '五行局',
    pinyin: 'wǔ xíng jú',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '起运与节奏的根数',
        long: '五行局：由命盘定出的水二/木三…局数，决定大限起运的年岁与节奏。',
      },
      en: {
        short: 'the class that times your luck',
        long: 'Element-Class: the chart’s root number (Water-2, Wood-3…) that sets when and how fast luck turns.',
      },
    },
  },
  {
    id: 'ziwei_shengniansihua',
    zh: '生年四化',
    pinyin: 'shēng nián sì huà',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '出生年带来的四种转化',
        long: '生年四化：出生那年点亮的化禄/权/科/忌四颗星，是一生的底层牵引。',
      },
      en: {
        short: 'four lifelong transformations',
        long: 'Birth Transformations: the four stars (Lu/Quan/Ke/Ji) lit by one’s birth year — a lifelong undertow.',
      },
    },
  },
  {
    id: 'ziwei_konggong',
    zh: '空宫',
    pinyin: 'kōng gōng',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '宫无主星，借对宫论',
        long: '空宫：某一宫位没有主星坐守，需借对宫的星曜来论断，气质更需后天塑造、可塑性强。',
      },
      en: {
        short: 'an empty palace — read via its opposite',
        long: 'Empty Palace: a house with no major star of its own; it borrows the stars of the palace opposite, so its qualities are more shaped by circumstance — open, malleable.',
      },
    },
  },
  {
    id: 'ziwei_feixing',
    zh: '飞星',
    pinyin: 'fēi xīng',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '四化飞入他宫的牵引',
        long: '飞星：一颗四化星落入另一宫（或对方盘的某宫），把两处牵在一起。',
      },
      en: {
        short: 'a transformation landing elsewhere',
        long: 'Flying Star: a transformed star landing in another palace (or the partner’s chart), tying the two together.',
      },
    },
  },
  {
    id: 'ziwei_hualu',
    zh: '化禄',
    pinyin: 'huà lù',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '顺遂、缘分与收获',
        long: '化禄：带来顺遂、缘分与实在的收获，是四化里最温润的一颗。',
      },
      en: {
        short: 'ease, fortune & flow',
        long: 'Hua Lu: the gentlest transformation — it brings smoothness, affinity, and tangible gain.',
      },
    },
  },
  {
    id: 'ziwei_huaquan',
    zh: '化权',
    pinyin: 'huà quán',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '掌控、能量与推动力',
        long: '化权：放大掌控欲与行动力，推事情往前，也可能用力过猛。',
      },
      en: {
        short: 'drive, power & push',
        long: 'Hua Quan: it amplifies control and momentum — it moves things forward, sometimes too hard.',
      },
    },
  },
  {
    id: 'ziwei_huake',
    zh: '化科',
    pinyin: 'huà kē',
    category: 'ziwei',
    meaning: {
      zh: { short: '声名、贵人与文采', long: '化科：带来名声、贵人相助与斯文体面、有条理的一面。' },
      en: {
        short: 'reputation & helpful names',
        long: 'Hua Ke: it brings good name, timely allies, and a measured, presentable grace.',
      },
    },
  },
  {
    id: 'ziwei_huaji',
    zh: '化忌',
    pinyin: 'huà jì',
    category: 'ziwei',
    meaning: {
      zh: {
        short: '执着、纠结与课题',
        long: '化忌：最深的牵绊——执着、纠结与放不下，往往正是一生的课题所在。',
      },
      en: {
        short: 'attachment, friction, the lesson',
        long: 'Hua Ji: the deepest tie — fixation and unease one can’t put down, and usually the life-lesson itself.',
      },
    },
  },

  // ─── 紫微 14 主星 Major Stars ───
  {
    id: 'ziweistar_ziwei',
    zh: '紫微',
    pinyin: 'zǐ wēi',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '帝星，尊贵与领导',
        long: '紫微星：众星之主，带来尊贵、统御与被仰望的气场，也易孤高。',
      },
      en: {
        short: 'the emperor: dignity & lead',
        long: 'The Emperor star: sovereign and dignified, it carries authority and presence — and a touch of aloofness.',
      },
    },
  },
  {
    id: 'ziweistar_tianji',
    zh: '天机',
    pinyin: 'tiān jī',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '智谋、变动与灵巧',
        long: '天机星：智者之星，善谋多思、应变灵巧，但也容易善变不安。',
      },
      en: {
        short: 'the strategist: wit & change',
        long: 'The Strategist star: quick-minded and adaptive, full of ideas — and restless, prone to shifting.',
      },
    },
  },
  {
    id: 'ziweistar_taiyang',
    zh: '太阳',
    pinyin: 'tài yáng',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '热力、付出与外显',
        long: '太阳星：光热外放、慷慨付出、照顾他人，但也容易耗己、藏不住。',
      },
      en: {
        short: 'the sun: warmth & giving',
        long: 'The Sun star: radiant and generous, it gives and shines outward — and can burn itself out.',
      },
    },
  },
  {
    id: 'ziweistar_wuqu',
    zh: '武曲',
    pinyin: 'wǔ qū',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '刚毅、财与执行',
        long: '武曲星：财星与将星，刚毅果决、重实务能赚钱，但也偏硬、不善软语。',
      },
      en: {
        short: 'the general: grit & money',
        long: 'The General star: resolute and practical, a money-maker who gets things done — and short on softness.',
      },
    },
  },
  {
    id: 'ziweistar_tiantong',
    zh: '天同',
    pinyin: 'tiān tóng',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '温和、享受与福气',
        long: '天同星：福星，性情温和、知足享受、亲和力强，但也易安逸怕事。',
      },
      en: {
        short: 'the child: ease & gentleness',
        long: 'The Child star: mild, contented, and easy to be near — a blessing star that can also drift into comfort.',
      },
    },
  },
  {
    id: 'ziweistar_lianzhen',
    zh: '廉贞',
    pinyin: 'lián zhēn',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '矛盾、魅力与原则',
        long: '廉贞星：囚星也是次桃花，既有原则操守，又有魅力与矛盾的张力。',
      },
      en: {
        short: 'the maverick: passion & principle',
        long: 'The Maverick star: magnetic yet principled, it holds a charged tension between desire and discipline.',
      },
    },
  },
  {
    id: 'ziweistar_tianfu',
    zh: '天府',
    pinyin: 'tiān fǔ',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '稳重、库藏与包容',
        long: '天府星：库藏之星，稳重持守、包容大度、善于积累，但也偏保守。',
      },
      en: {
        short: 'the treasurer: steadiness & store',
        long: 'The Treasurer star: steady and accommodating, it gathers and keeps — secure, if a little conservative.',
      },
    },
  },
  {
    id: 'ziweistar_taiyin',
    zh: '太阴',
    pinyin: 'tài yīn',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '柔和、内敛与情感',
        long: '太阴星：月之星，柔和细腻、内敛念旧、重情感，但也易多愁敏感。',
      },
      en: {
        short: 'the moon: tenderness & depth',
        long: 'The Moon star: gentle and inward, rich in feeling and memory — tender, and easily moved to melancholy.',
      },
    },
  },
  {
    id: 'ziweistar_tanlang',
    zh: '贪狼',
    pinyin: 'tān láng',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '欲望、多才与社交',
        long: '贪狼星：桃花与欲望之星，多才多艺、长袖善舞，但也易贪多浮动。',
      },
      en: {
        short: 'the charmer: desire & talent',
        long: 'The Charmer star: many-talented and socially deft, full of appetite — alluring, and prone to wanting it all.',
      },
    },
  },
  {
    id: 'ziweistar_jumen',
    zh: '巨门',
    pinyin: 'jù mén',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '口舌、思辨与探究',
        long: '巨门星：暗星，善言辞思辨、爱追根究底，但也易招口舌是非与猜疑。',
      },
      en: {
        short: 'the skeptic: words & probing',
        long: 'The Skeptic star: articulate and probing, it digs for the truth — sharp, and quick to suspicion or dispute.',
      },
    },
  },
  {
    id: 'ziweistar_tianxiang',
    zh: '天相',
    pinyin: 'tiān xiàng',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '辅佐、得体与公正',
        long: '天相星：印星，辅佐得力、处事得体、重公正与体面，但也易随和无主。',
      },
      en: {
        short: 'the minister: poise & fairness',
        long: 'The Minister star: supportive and tactful, it values fairness and good form — gracious, if sometimes too yielding.',
      },
    },
  },
  {
    id: 'ziweistar_tianliang',
    zh: '天梁',
    pinyin: 'tiān liáng',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '庇荫、原则与化解',
        long: '天梁星：荫星，稳重有原则、能逢凶化吉、庇护他人，但也易说教固执。',
      },
      en: {
        short: 'the elder: shelter & resolve',
        long: 'The Elder star: principled and protective, it turns trouble aside and shelters others — wise, if prone to lecturing.',
      },
    },
  },
  {
    id: 'ziweistar_qisha',
    zh: '七杀',
    pinyin: 'qī shā',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '决断、开创与锋芒',
        long: '七杀星：将星，决断勇猛、敢闯敢拼、独当一面，但也锋芒外露、起伏大。',
      },
      en: {
        short: 'the warrior: edge & breakthrough',
        long: 'The Warrior star: decisive and bold, it charges and stands alone — formidable, and a life of steep highs and lows.',
      },
    },
  },
  {
    id: 'ziweistar_pojun',
    zh: '破军',
    pinyin: 'pò jūn',
    category: 'ziweistar',
    meaning: {
      zh: {
        short: '破立、变革与冲劲',
        long: '破军星：先破后立、敢于变革、冲劲十足，但也易破耗动荡、难守成。',
      },
      en: {
        short: 'the pioneer: tear-down & renew',
        long: 'The Pioneer star: it breaks before it builds — daring, transformative, full of drive, and hard on what it has.',
      },
    },
  },
]
