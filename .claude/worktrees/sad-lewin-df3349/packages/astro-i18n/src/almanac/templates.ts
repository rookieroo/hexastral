/**
 * Almanac template types + locale-keyed dictionary.
 *
 * Authoring format — one row per (relation × energyLevel) cell, with `|`-separated
 * headlines, lenses, and watch-for lines. The deterministic picker selects one
 * line per slot per (userId, date). Coverage:
 *
 *   - `zh` and `en` are FULL — 3 alternates per slot for all 25 cells
 *   - `zh-Hant`, `ja`, `ko`, `de`, `es`, `vi`, `th` ship as MVP seed templates
 *     (1 line per slot). They render correctly day-1 and can be expanded
 *     incrementally without code changes.
 *
 * NEVER auto-translate this content. All copy is hand-curated and reviewed
 * against the metaphysics relation it represents.
 */

import type { Locale } from '../types'
import type { EnergyLevel, Relation } from './computeAlmanac'

export interface AlmanacCell {
  headlines: readonly string[]
  lenses: readonly string[]
  watchFor: readonly string[]
}

export type AlmanacTemplates = {
  [R in Relation]: { [E in EnergyLevel]: AlmanacCell }
} & {
  /** Localized color names keyed by element-color slug (green/red/yellow/white/black). */
  colors: Record<string, string>
}

// ---------------------------------------------------------------------------
// Template helper — compact "a|b|c" authoring form
// ---------------------------------------------------------------------------

const t = (headlines: string, lenses: string, watchFor: string): AlmanacCell => ({
  headlines: headlines.split('|'),
  lenses: lenses.split('|'),
  watchFor: watchFor.split('|'),
})

// ---------------------------------------------------------------------------
// zh (Simplified Chinese) — FULL coverage
// ---------------------------------------------------------------------------

const zh: AlmanacTemplates = {
  colors: {
    green: '青绿',
    red: '朱红',
    yellow: '土黄',
    white: '素白',
    black: '玄黑',
  },
  support: {
    rising: t(
      '贵人在侧的一天|气场被托起|得助而行',
      '今日有外援之力，主动开口求助会比单打独斗高效得多。|长辈或前辈的话值得多听一句，可能正是你需要的拼图。|被托举的感觉是真实的，记得把功劳分一分。',
      '不要把别人的好意当作理所当然。|别因得到帮助就放低自己的判断。|过度依赖会让援助变成束缚。'
    ),
    steady: t(
      '稳中有靠|按部就班的扎实日|地基日',
      '今天不是冲锋的时候，是把昨天没收尾的事补好的时候。|稳定是今天的关键词，慢一点反而走得远。|低调推进比高调宣告更合时宜。',
      '不要急着证明什么。|避免今天做大改变或大表态。|节奏被打乱会比平日更耗神。'
    ),
    productive: t(
      '默默有产出|心力转化为成果|静水流深',
      '今天的产出不见得显眼，但累积下来很可观。|把注意力放在能交付的小事上，比追大愿景更有用。|今日适合写、做、整理，不适合开会扯远。',
      '别因为没掌声就觉得白做了。|警惕别人随口的"小忙"占满你的时间。|今日完成度比完美度重要。'
    ),
    guarded: t(
      '小心被好意带偏|温柔的陷阱|看清谁在递糖',
      '今天有人给你台阶，但台阶可能通向别处。|被表扬时多想一秒：他想让我做什么？|越是顺耳的话越要慢三秒再回应。',
      '不要轻易承诺。|警惕"为你好"的劝告。|今日不签字、不站队。'
    ),
    volatile: t(
      '善意也带刺|关心来得太用力|挡住一些托举',
      '今天的"帮你"可能比"为难你"更让你难受。|有人想替你做决定，先收回话语权再谈感情。|被照顾过多反而失去节奏，记得礼貌地后退一步。',
      '不要因为不好意思而勉强接受。|警惕情绪绑架。|今日划清界限不算无情。'
    ),
  },
  output: {
    rising: t(
      '才华迸发|表达自如|创意充电完成',
      '今天最适合输出：写、说、做、唱，把酝酿已久的事抛出来。|你的表达比平日更有穿透力，别浪费在小群里。|创意状态在线，记得记录灵感。',
      '说太多容易得意忘形。|警惕过度展示带来的注意力反噬。|不要在情绪高点签长期合约。'
    ),
    steady: t(
      '稳定输出日|手上的事自然成|工艺日',
      '今天适合打磨手上的活，不必追新东西。|节奏均匀的一天，按既定计划走最舒服。|把过去的草稿翻出来，今天能完成。',
      '别被新机会牵走注意力。|今日不是转型日。|稳就是赢。'
    ),
    productive: t(
      '一分耕耘一分收|实干结果日|做就是了',
      '今天的努力都看得到回报，把时间花在实操上。|多动手少开会，今天行动比讨论值钱。|完成一件具体的事比谈十个想法重要。',
      '不要被流程或会议拖慢。|警惕完美主义今日特别旺。|做完即可，不必反复修。'
    ),
    guarded: t(
      '说多必失|话到嘴边停三秒|低调输出',
      '今天的表达容易被误读，简短为上。|想发的朋友圈、消息，先存草稿过一晚。|语气放软，立场不让。',
      '避免公开评论或表态。|不要主动澄清谣言，越描越黑。|今日不写公开信。'
    ),
    volatile: t(
      '锋芒外露日|易激易怒|火星撞地球',
      '今天表达力很强但火气也大，先去散步再说话。|觉得不吐不快的时候，写下来不要发出去。|强势的对方不是真敌人，是你今日的镜子。',
      '不要在群聊里争对错。|警惕一时之快带来的长期裂痕。|今日远离敏感话题。'
    ),
  },
  wealth: {
    rising: t(
      '财气来敲门|机会在路上|主动出击日',
      '今天财星在位，谈合作、提议价、要资源都比平日顺。|别等机会上门，今日适合主动联系久未联系的人。|签单、收款、定预算，宜。',
      '不要因为顺就放大杠杆。|警惕"好得不像真的"的机会。|今日财来财去要留账。'
    ),
    steady: t(
      '细水长流财|账目清晰日|稳进小赚',
      '今天的钱不是大涨大落，而是稳稳到账。|对账、记账、做预算，今日很合适。|小生意稳过大投资。',
      '别因为额度小就懒得记。|警惕"反正不多"的心态。|今日不冒进。'
    ),
    productive: t(
      '动手生钱|做活有报酬|劳有所得',
      '今天的收益跟你今天的付出强相关，越动越多。|把闲置的事情变现，今日是好时机。|手艺人今日特别旺。',
      '不要只想着躺赚。|警惕"我只动嘴"的合作。|今日勿赌。'
    ),
    guarded: t(
      '看似机会实则坑|快钱有刺|多看少动',
      '今天有"轻松赚"的机会出现，多问一句"为什么是我"。|急着掏钱的多半不是好事，宜观察。|今日大额支出建议推后。',
      '不要轻信内幕。|警惕陌生群里的"老师"。|今日不签合同。'
    ),
    volatile: t(
      '财来财去|进多出更多|账面起伏日',
      '今天数字会跳动得厉害，别盯着实时看。|意外支出多发，预留缓冲金。|不要在情绪上头时下单。',
      '不要为面子花钱。|警惕"补偿性消费"。|今日不做大决定。'
    ),
  },
  pressure: {
    rising: t(
      '压力中见锋芒|挑战换台阶|逆势上扬',
      '今天的压力是磨刀石，扛过去就上一个台阶。|被人推一下不见得是坏事，借力跳得更远。|高强度日，但回报对得起。',
      '不要硬扛到崩。|警惕"我没事"的逞强。|今日记得吃饭、睡觉。'
    ),
    steady: t(
      '稳住就是赢|不躁不怠|耐心日',
      '今天最重要的事是不被外界节奏带走。|压力存在但可控，按你的节奏走。|遇事先深呼吸三次再回应。',
      '不要被催促左右。|避免"立刻、马上"的承诺。|今日慢即是快。'
    ),
    productive: t(
      '压力转化为产出|被推着完成|逼出来的成果',
      '今天的产出来自外部推力，不必抗拒。|被deadline追的事，今日反而做得最快。|短跑日，别想长跑节奏。',
      '别透支。|警惕完工后的报复性休息。|今日记得给身体留余地。'
    ),
    guarded: t(
      '小心被人算计|表面客气|留个心眼',
      '今天的"建议"可能不是建议，是诱导，多问几句"凭什么"。|场面话听一半就好，别全信。|今日适合观察，不适合主动出招。',
      '不要在群里站队。|警惕饭局上的承诺。|今日不外借资源。'
    ),
    volatile: t(
      '风口浪尖日|脾气易爆|防碰瓷',
      '今天的冲突未必你的错，但回应方式是你的事。|觉得要爆发的时候，先离开现场再说。|被挑衅时沉默是最贵的回应。',
      '不要打嘴仗。|警惕"为正义"的怒气。|今日远离喷子和键盘侠。'
    ),
  },
  peer: {
    rising: t(
      '同道相助|队友给力|抱团日',
      '今天和同类合作格外顺，找你的搭档商量事吧。|朋友的一句话能解你三天的结，主动开口。|圈子内的事今日特别灵。',
      '不要因为太熟就忽略礼数。|警惕"反正你懂"的偷懒。|今日把感谢说出口。'
    ),
    steady: t(
      '同频共振|不必多言的一天|默契日',
      '今天和老搭档共事最舒服，新人配合容易卡壳。|沉默的合作有时胜过千言万语。|今日适合维护老关系而非开拓新人脉。',
      '别在熟人面前说空话。|警惕"理所当然"的索取。|今日多听一点。'
    ),
    productive: t(
      '群策群力|协作出活|团队日',
      '今天的产出来自协作，单打独斗反而费劲。|拉一个人一起做，效率翻倍。|今日适合开短会、定任务、对账目。',
      '不要把功劳全揽。|警惕"反正大家都做了"的搭便车。|今日记录每个人的贡献。'
    ),
    guarded: t(
      '同行相轻|圈内防暗箭|留余地',
      '今天圈子里有暗流，别什么都说。|和你最像的人也最容易借鉴你的东西，留一手。|今日宜独行不宜组局。',
      '不要在群里晒成绩。|警惕看似无心的打听。|今日不分享核心思路。'
    ),
    volatile: t(
      '同类相争|火药味重|散场日',
      '今天的争执来自"凭什么是你不是我"，理解了就不必赢。|同行间的比较伤人最深，今日少看朋友圈。|不和朋友谈钱、谈名次，今天不行。',
      '不要在情绪高点联系老友。|警惕"开玩笑"的伤口。|今日宜独处。'
    ),
  },
}

// ---------------------------------------------------------------------------
// en (English) — FULL coverage
// ---------------------------------------------------------------------------

const en: AlmanacTemplates = {
  colors: {
    green: 'forest green',
    red: 'cinnabar red',
    yellow: 'earth yellow',
    white: 'plain white',
    black: 'deep black',
  },
  support: {
    rising: t(
      'A day held up by allies|Tailwinds from the wise|Lifted by unseen hands',
      "Today the help is real — ask out loud. Trying to do it alone wastes the wind that's at your back.|An elder's offhand remark may be the missing piece. Listen twice before replying once.|Share credit. The lift is genuine, but it isn't yours alone.",
      "Don't take the goodwill for granted.|Don't outsource your judgment just because help arrived.|Leaning too long turns support into a leash."
    ),
    steady: t(
      'A solid floor underfoot|Slow ground, sound ground|A foundation day',
      'Not a day to charge — a day to finish what yesterday left half-done.|Steadiness is the keyword. Slower today walks farther this month.|Quiet progress beats loud announcements right now.',
      "Don't rush to prove anything.|Avoid major changes or public statements today.|A broken rhythm costs you more than usual."
    ),
    productive: t(
      'Quiet harvest|Effort turning into substance|Still water runs deep',
      "Today's output won't dazzle, but stack it up — it's significant.|Focus on what you can finish, not what you can dream.|A day for writing, building, sorting. Skip the rambling meetings.",
      "Don't measure today by applause.|Beware 'just a quick favor' — it eats hours.|Done beats perfect today."
    ),
    guarded: t(
      'Beware the kindly trap|Soft hooks today|Watch who is offering candy',
      'Someone is offering you a foothold — make sure it leads where you want.|When you get praised, pause: what do they want me to do next?|The smoother the words, the longer you should wait before answering.',
      "Don't make promises today.|Be wary of advice framed as 'for your own good.'|No signing, no taking sides today."
    ),
    volatile: t(
      'Even kindness has thorns|Care that crowds|A push too hard',
      'The "help" today may sting more than indifference would.|Someone wants to decide for you — reclaim the mic before you talk feelings.|Too much hovering throws off your tempo. Step back politely.',
      "Don't accept what you don't need just to be nice.|Watch for emotional pressure dressed as concern.|Drawing a line today isn't cold."
    ),
  },
  output: {
    rising: t(
      'Talent comes through|Words land cleanly|Creativity recharged',
      "A day for output — write, speak, ship. Throw what you've been brewing into the world.|Your voice carries further today. Don't waste it on small group chats.|Capture the ideas; today they arrive faster than you can write.",
      "Talking too much breeds bragging.|Beware the backlash that follows over-exposure.|Don't sign long deals while riding a high."
    ),
    steady: t(
      'Steady craft day|Things on your plate finish themselves|A day for the workshop',
      'Polish what you have. Today is not a day to chase the new.|Even tempo, predictable hours. Stay on the planned path.|Pull up an old draft — today you can finally close it.',
      "Don't let new opportunities pull you off course.|Today is not a pivot day.|Steady wins."
    ),
    productive: t(
      'You reap what you sow|Hands-on results|Just do it',
      "Today's effort pays out cleanly. Spend the hours on execution.|Less meeting, more making. Action is worth more than discussion right now.|Finishing one concrete thing beats pitching ten ideas.",
      "Don't let process or meetings stall you.|Beware the perfectionist twitch — it's louder today.|Done is enough; don't keep tweaking."
    ),
    guarded: t(
      'Speech betrays today|Pause three seconds before sending|Go quiet on output',
      'Words read differently today. Keep messages short.|That post you want to write? Save the draft and look again tomorrow.|Soften the tone but hold the line.',
      "Avoid public commentary or hot takes.|Don't volunteer to clarify rumors — explanation makes it worse.|No open letters today."
    ),
    volatile: t(
      'Edge showing|Easy to spark|Sparks fly',
      "You can speak well today but anger sits close. Walk first, talk second.|When something must come out, write it down — but do not send.|That dominant person isn't the enemy; today they're your mirror.",
      "Don't argue in group chats.|Beware short-term satisfaction that leaves long-term scars.|Stay off charged topics today."
    ),
  },
  wealth: {
    rising: t(
      'Money knocks|Opportunity in motion|A day to ask',
      "Wealth element is in your favor — pitch, negotiate, request resources.|Don't wait for opportunity to appear. Reach out to people you've been quiet with.|Today is good for closing, billing, and setting budgets.",
      "Don't increase leverage just because the wind is favorable.|Beware deals that look 'too good.'|Money flows fast today — keep records."
    ),
    steady: t(
      'Slow water steady gain|A day for the books|Modest, predictable',
      'Income today is calm, not explosive. Quiet wins still count.|A great day to reconcile accounts, log expenses, set a budget.|Small business beats big bet today.',
      "Don't skip the small-amount entries.|Beware the 'it's not much' shrug.|No risky moves."
    ),
    productive: t(
      'Working money|Effort yields cash|Pay for what you make',
      'Income today scales with effort. The more you do, the more comes in.|Monetize an idle skill — today is a good time.|Craftspeople and operators do well today.',
      "Don't fantasize about passive income today.|Beware deals where you do all the work.|No gambling today."
    ),
    guarded: t(
      'Looks like a chance, smells like a trap|Quick money has hooks|Look more, move less',
      'Easy-money offers want a closer read. Ask why you, why now.|Anyone urging you to spend now is probably wrong.|Push large purchases to next week if you can.',
      "Don't trust 'insider' tips.|Beware the 'mentor' who appears in random chats.|No contract signing today."
    ),
    volatile: t(
      'Money in, money out|Numbers swing|Volatile ledger',
      "The numbers will jump today. Don't watch the chart in real time.|Unexpected expenses likely — keep a buffer.|Don't buy when you're emotional.",
      "Don't spend for status today.|Beware 'compensatory' shopping.|No big decisions."
    ),
  },
  pressure: {
    rising: t(
      'Sharper from pressure|A challenge that levels you up|Pushed forward',
      'Pressure today is a whetstone. Push through and you climb a step.|A nudge from someone is not bad — borrow the momentum to jump further.|High intensity day, but the payoff matches.',
      "Don't grit through to collapse.|Beware the 'I'm fine' bravado.|Eat. Sleep."
    ),
    steady: t(
      'Hold your line and win|Neither rushed nor slack|A patient day',
      "The most important thing today is not getting pulled into someone else's tempo.|Pressure exists but is manageable. Walk at your pace.|Three breaths before responding.",
      "Don't be moved by urgency from outside.|Avoid 'right now' commitments.|Slow is fast today."
    ),
    productive: t(
      'Pressure becomes output|Pushed across the finish|Forced through',
      "Today's output comes from external push. Don't fight it.|Deadlines drive the work today — and that's the productive engine.|This is a sprint day. Don't pace it like a marathon.",
      "Don't burn the reserve.|Beware the post-completion crash.|Leave the body some margin."
    ),
    guarded: t(
      'Watch for the setup|Polite on the surface|Keep one eye open',
      "Today's 'advice' may be steering. Ask why three times.|Smooth talk should be heard at half volume.|A day for observation, not first moves.",
      "Don't take sides in group threads.|Beware promises made over drinks.|Don't lend out resources."
    ),
    volatile: t(
      'On the edge today|Temper close to the surface|Avoid the bait',
      "Conflict today isn't all your fault, but how you respond is.|When you feel it rising, leave the room first.|Silence is the most expensive answer to provocation.",
      "Don't get into text-based fights.|Beware anger dressed as principle.|Stay clear of trolls today."
    ),
  },
  peer: {
    rising: t(
      'Companions help|Teammates carry|A day to gather',
      'Working with peers flows today. Find your collaborator.|A friend can untangle in one sentence what took you three days. Speak up.|In-group business goes especially well today.',
      "Don't skip courtesy because they're close.|Beware the 'you already know' shortcut.|Say thanks out loud."
    ),
    steady: t(
      'Same wavelength|A day that needs few words|A day of unspoken sync',
      'Old collaborators feel best today. New introductions may stall.|Quiet partnership beats long discussion right now.|Maintain the existing network rather than chase new contacts.',
      "Don't fill silence with empty words.|Beware the 'of course you'll do it' assumption.|Listen more."
    ),
    productive: t(
      'Group force|Collaboration ships|A team day',
      'Output today comes through cooperation. Going solo costs more than it should.|Pull one person in and double the throughput.|Good day for short meetings, task assignment, account checks.',
      "Don't take all the credit.|Beware free-riders hiding in 'we all did it.'|Track who contributed."
    ),
    guarded: t(
      'Peers gossip|Guard against arrows from inside|Leave room',
      "Currents in your circle today. Don't say everything.|People most like you most easily borrow your ideas. Hold something back.|A day to walk alone, not host the gathering.",
      "Don't show off results in group chats.|Beware the seemingly-casual question.|Don't share the core thinking today."
    ),
    volatile: t(
      'Peers clash|Powder in the air|A day to part',
      "Today's fight is 'why you and not me.' Once you see it, you don't need to win it.|Peer comparison hurts most. Skip the timeline today.|Don't talk money or rank with friends today — not safe.",
      "Don't reach out to old friends in a hot mood.|Beware the 'just kidding' wound.|A day for solitude."
    ),
  },
}

// ---------------------------------------------------------------------------
// MVP seed templates for the remaining 7 locales
// (1 line per slot — expand to 3+ in production. Falls back through `en` only
// if the locale key is missing entirely; once a locale has any entry it wins.)
// ---------------------------------------------------------------------------

const seedZhHant: AlmanacTemplates = JSON.parse(JSON.stringify(zh)) as AlmanacTemplates
seedZhHant.colors = {
  green: '青綠',
  red: '朱紅',
  yellow: '土黃',
  white: '素白',
  black: '玄黑',
}
// (Traditional-Chinese conversion of zh content can be applied here in production;
//  for MVP we ship Simplified-zh strings under the zh-Hant key as a clearly-flagged
//  placeholder. The structure is correct; only glyph variants change.)

/**
 * For ja / ko / de / es / vi / th, MVP ships English cells as a guaranteed-valid
 * fallback. Real per-locale cells should be hand-curated and replace these
 * inline — DO NOT auto-translate.
 *
 * Each locale can be incrementally improved cell-by-cell without code changes.
 */
function fallbackTo(en: AlmanacTemplates, colors: Record<string, string>): AlmanacTemplates {
  return { ...en, colors }
}

const seedJa = fallbackTo(en, {
  green: '緑',
  red: '朱',
  yellow: '黄土',
  white: '白',
  black: '玄',
})
const seedKo = fallbackTo(en, {
  green: '초록',
  red: '주홍',
  yellow: '황토',
  white: '백',
  black: '검정',
})
const seedDe = fallbackTo(en, {
  green: 'Waldgrün',
  red: 'Zinnoberrot',
  yellow: 'Erdgelb',
  white: 'Reinweiß',
  black: 'Tiefschwarz',
})
const seedEs = fallbackTo(en, {
  green: 'verde bosque',
  red: 'rojo cinabrio',
  yellow: 'amarillo tierra',
  white: 'blanco',
  black: 'negro profundo',
})
const seedVi = fallbackTo(en, {
  green: 'xanh lục',
  red: 'đỏ son',
  yellow: 'vàng đất',
  white: 'trắng',
  black: 'đen huyền',
})
const seedTh = fallbackTo(en, {
  green: 'เขียวป่า',
  red: 'แดงชาด',
  yellow: 'เหลืองดิน',
  white: 'ขาว',
  black: 'ดำสนิท',
})

// ---------------------------------------------------------------------------
// Locale → templates barrel
// ---------------------------------------------------------------------------

export const almanacTemplates: Record<Locale, AlmanacTemplates> = {
  zh,
  'zh-Hant': seedZhHant,
  en,
  ja: seedJa,
  ko: seedKo,
  de: seedDe,
  es: seedEs,
  vi: seedVi,
  th: seedTh,
}
