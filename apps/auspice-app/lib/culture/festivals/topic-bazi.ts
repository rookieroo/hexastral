import type { FestivalContent } from './schema'

/**
 * 四柱八字 — product-mechanics explainer (kind: 'topic'). The engine behind the
 * timeline (大运/流年), 对你而言 (用神/忌神), and make-if (择时). Structure
 * 四柱/日主与十神/大运与流年/用神与忌神. The 大运流年 + 用神忌神 sections are the
 * targets of the contextual "什么是…" links on the timeline + 对你而言 card.
 */
export const TOPIC_BAZI: FestivalContent = {
  id: 'topic-bazi',
  kind: 'topic',
  name: {
    'zh-Hans': '四柱八字',
    'zh-Hant': '四柱八字',
    ja: '四柱推命',
    en: 'Bazi (Four Pillars)',
  },
  tagline: {
    'zh-Hans': '年月日时 · 八字 · 大运流年',
    'zh-Hant': '年月日時 · 八字 · 大運流年',
    ja: '年月日時 · 八字 · 大運流年',
    en: 'Year, month, day, hour · the Eight Characters',
  },
  sections: {
    'zh-Hans': [
      {
        title: '四柱',
        body: '将一个人出生的年、月、日、时，各以一组干支表示，便得「四柱」——年柱、月柱、日柱、时柱。每柱一干一支，共八个字，故称「八字」。四柱如人生的四个坐标：年柱多看祖上与早年、月柱看父母与青年（也是「月令」，最重论旺衰）、日柱看自身与配偶、时柱看子女与晚年。八字是东亚命理推演的起点。',
      },
      {
        title: '日主与十神',
        body: '日柱的天干，称「日主」（或日元），代表命主本人。其余七个字与日主的关系，依五行生克与阴阳，归为「十神」：比肩、劫财、食神、伤官、偏财、正财、七杀、正官、偏印、正印。十神把抽象的五行生克，翻译成具体的人事——财、官、印、食伤各主事业、权位、学识、才华等。本 App「对你而言」的每日宜忌，正由流日干支与日主的十神/五行关系推得。',
      },
      {
        title: '大运与流年',
        body: '「大运」是人生的大段运程，自出生后依月柱顺逆排出，每十年一步，每步一组干支，主宰这十年的整体气场。「流年」则是每一年的干支（如丙午年）。论运，即看大运、流年的干支与本命八字如何生克会合——是助力（用神得力）还是阻力（忌神当值）。本 App 的人生时间轴，正是把你的大运、流年逐段排开，让你看见命势的起伏。',
      },
      {
        title: '用神与忌神',
        body: '八字讲究五行平衡。能扶助日主、补其所缺、令全局趋于中和的五行，称「用神」（喜用）；反之，加剧失衡、损耗日主的，称「忌神」。用神是论命的核心落点：行运逢用神则顺、逢忌神则滞。本 App「对你而言」判断某日吉凶、make-if 衡量某年宜否决策，底层都在问同一件事——这一天/这一年，于你是用神得力，还是忌神当值。',
      },
    ],
    'zh-Hant': [
      {
        title: '四柱',
        body: '將一個人出生的年、月、日、時，各以一組干支表示，便得「四柱」——年柱、月柱、日柱、時柱。每柱一干一支，共八個字，故稱「八字」。四柱如人生的四個座標：年柱多看祖上與早年、月柱看父母與青年（也是「月令」，最重論旺衰）、日柱看自身與配偶、時柱看子女與晚年。八字是東亞命理推演的起點。',
      },
      {
        title: '日主與十神',
        body: '日柱的天干，稱「日主」（或日元），代表命主本人。其餘七個字與日主的關係，依五行生剋與陰陽，歸為「十神」：比肩、劫財、食神、傷官、偏財、正財、七殺、正官、偏印、正印。十神把抽象的五行生剋，翻譯成具體的人事——財、官、印、食傷各主事業、權位、學識、才華等。本 App「對你而言」的每日宜忌，正由流日干支與日主的十神/五行關係推得。',
      },
      {
        title: '大運與流年',
        body: '「大運」是人生的大段運程，自出生後依月柱順逆排出，每十年一步，每步一組干支，主宰這十年的整體氣場。「流年」則是每一年的干支（如丙午年）。論運，即看大運、流年的干支與本命八字如何生剋會合——是助力（用神得力）還是阻力（忌神當值）。本 App 的人生時間軸，正是把你的大運、流年逐段排開，讓你看見命勢的起伏。',
      },
      {
        title: '用神與忌神',
        body: '八字講究五行平衡。能扶助日主、補其所缺、令全局趨於中和的五行，稱「用神」（喜用）；反之，加劇失衡、損耗日主的，稱「忌神」。用神是論命的核心落點：行運逢用神則順、逢忌神則滯。本 App「對你而言」判斷某日吉凶、make-if 衡量某年宜否決策，底層都在問同一件事——這一天/這一年，於你是用神得力，還是忌神當值。',
      },
    ],
    ja: [
      {
        title: '四柱',
        body: '人の生まれた年・月・日・時を、それぞれ一組の干支で表すと「四柱」——年柱・月柱・日柱・時柱が得られる。各柱は干一つ・支一つ、合わせて八字、ゆえに「八字」という。四柱は人生の四つの座標である：年柱は祖先や幼少期、月柱は父母や青年期（「月令」でもあり、旺衰を最も重く見る）、日柱は自身と配偶、時柱は子女と晩年を司る。八字は東アジア命理の出発点である。',
      },
      {
        title: '日主と十神',
        body: '日柱の天干を「日主（日元）」といい、命主その人を表す。残る七字と日主との関係を、五行の生剋と陰陽によって「十神」に分ける：比肩・劫財・食神・傷官・偏財・正財・七殺・正官・偏印・正印。十神は抽象的な五行の生剋を、具体的な人事——財・官・印・食傷がそれぞれ事業・地位・学識・才能など——へと翻訳する。本アプリの「あなたへ」の日々の宜忌は、まさに流日の干支と日主との十神・五行関係から導かれる。',
      },
      {
        title: '大運と流年',
        body: '「大運」は人生の大きな運の段で、生後より月柱に従い順逆に排し、十年ごとに一歩、各歩が一組の干支で、その十年の全体の気を司る。「流年」はその年ごとの干支（丙午年など）である。運を論じるとは、大運・流年の干支が本命の八字とどう生剋し会合するか——助け（用神 力を得る）か、妨げ（忌神 当たる）か——を観ることだ。本アプリの人生の時間軸は、あなたの大運・流年を段ごとに並べ、命勢の起伏を見せるものである。',
      },
      {
        title: '用神と忌神',
        body: '八字は五行の平衡を重んじる。日主を扶け、欠けを補い、全局を中和へ向かわせる五行を「用神（喜用）」といい、逆に失衡を強め日主を損なうものを「忌神」という。用神は命を論じる核心の落としどころ——運に用神を逢えば順、忌神を逢えば滞る。本アプリの「あなたへ」がその日の吉凶を判じ、make-if がその年に決断すべきかを量るとき、底で問うているのは同じこと——この日・この年は、あなたにとって用神が力を得るのか、忌神が当たるのか、である。',
      },
    ],
    en: [
      {
        title: 'The Four Pillars',
        body: 'Expressing a person\'s birth year, month, day, and hour each as one pair of stem-and-branch yields the "Four Pillars" — the year, month, day, and hour pillars. Each pillar is one stem and one branch, eight characters in all, hence "Eight Characters" (八字). The four pillars are like four coordinates of a life: the year pillar speaks to ancestry and early years, the month pillar to parents and youth (it is also the "month command," weighed most heavily for strength), the day pillar to the self and the spouse, and the hour pillar to children and later years. The Eight Characters are the starting point of East Asian fate-reading.',
      },
      {
        title: 'The Day Master & the Ten Gods',
        body: 'The Heavenly Stem of the day pillar is the "Day Master" (日主 / 日元) — the person themselves. The relationship of each of the other seven characters to the Day Master, by elemental generation and control and by yin-yang, sorts into the "Ten Gods" (十神): Companion, Rob-Wealth, Eating-God, Hurting-Officer, Indirect Wealth, Direct Wealth, Seven-Killings, Direct Officer, Indirect Resource, Direct Resource. The Ten Gods translate the abstract interplay of elements into concrete human affairs — wealth, office, resource, and output, governing career, standing, learning, and talent. This app\'s daily "for you" verdict is read precisely from how the day\'s stem-and-branch relates, as Ten Gods and elements, to your Day Master.',
      },
      {
        title: 'Luck Pillars & Annual Years',
        body: 'The "Luck Pillars" (大运) are the great segments of a life\'s fortune, laid out from birth along the month pillar in forward or reverse order — one step per decade, each step a stem-and-branch governing the overall climate of those ten years. The "Annual Year" (流年) is each single year\'s stem-and-branch (the 丙午 year, say). To read fortune is to see how the Luck Pillar and Annual Year meet and interact with your natal chart — as support (the favorable element gaining force) or resistance (the unfavorable element falling due). This app\'s life timeline is exactly your Luck Pillars and Annual Years laid out segment by segment, so you can see the rise and fall of your fortunes.',
      },
      {
        title: 'Favorable & Unfavorable Elements',
        body: 'The Eight Characters turn on elemental balance. The element that aids the Day Master, supplies what is lacking, and brings the whole toward the center is the "favorable element" (用神); the one that worsens the imbalance and drains the Day Master is the "unfavorable element" (忌神). The favorable element is the crux of the whole reading: when fortune meets it, things flow; when it meets the unfavorable, they stall. When this app\'s "for you" judges a day auspicious or cautious, and when make-if weighs whether a year suits a decision, both are asking the same question underneath — on this day, in this year, does your favorable element gain force, or does your unfavorable one fall due?',
      },
    ],
  },
}
