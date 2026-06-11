import type { FestivalContent } from './schema'

/**
 * 清明 — both a 节气 and a festival (the only Chinese day that is both). Literary
 * centerpiece: 杜牧《清明》(「清明时节雨纷纷，路上行人欲断魂」). CJK prints the
 * quatrain literally; en pairs the original sense with explanation (ADR-0020).
 */
export const QINGMING: FestivalContent = {
  id: 'qingming',
  kind: 'festival',
  name: {
    'zh-Hans': '清明',
    'zh-Hant': '清明',
    ja: '清明節',
    en: 'Qingming Festival',
  },
  tagline: {
    'zh-Hans': '仲春暮春之交 · 扫墓追远，踏青向新',
    'zh-Hant': '仲春暮春之交 · 掃墓追遠，踏青向新',
    ja: '仲春と暮春の境 · 墓参と春の野遊び',
    en: 'Mid-spring · sweeping the graves, walking the green',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '清明既是二十四节气之一，也是中国唯一兼具节气与节日双重身份的日子。它融合了上古的「墓祭」古礼、纪念介子推的寒食节、以及踏青游春的上巳节，至唐宋合而为一。寒食禁火冷食的旧俗，相传源于晋文公追悼割股奉君、终不受禄而焚身绵山的介子推。',
      },
      {
        title: '习俗',
        body: '扫墓祭祖是清明的核心——除草培土、供奉酒食、焚香化纸，以寄追远之思。墓祭之外，又有踏青、插柳、放风筝、荡秋千之乐：一面慎终追远，一面拥抱春光，生与死在这一日并行不悖，正是清明独有的旷达。',
      },
      {
        title: '食',
        body: '寒食遗风使清明多冷食。江南有青团——艾草或浆麦草汁和入糯米粉，裹豆沙或咸馅，色碧而清香；北方有子推馍、馓子。一口青团，是春天的味道，也是对寒食古俗的舌尖记忆。',
      },
      {
        title: '诗',
        body: '杜牧《清明》是千古传诵的节令绝唱：「清明时节雨纷纷，路上行人欲断魂。借问酒家何处有？牧童遥指杏花村。」——纷纷细雨、断魂行人，愁绪正浓时，一问一答之间，杏花深处的酒旗忽现，凄迷里透出一线暖意。短短四句，写尽清明的雨、愁与生机。',
      },
      {
        title: '现代庆祝',
        body: '清明是国家法定假日，亿万人返乡扫墓，「清明祭扫」成为一年中最大规模的人口流动之一。近年又兴网络祭扫、代客扫墓、鲜花替纸钱等新风，文明祭祀渐成共识。踏青郊游、亲子放鸢，则让这个节日在追思之外，仍葆有春日的生气。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '清明既是二十四節氣之一，也是中國唯一兼具節氣與節日雙重身分的日子。它融合了上古的「墓祭」古禮、紀念介子推的寒食節、以及踏青遊春的上巳節，至唐宋合而為一。寒食禁火冷食的舊俗，相傳源於晉文公追悼割股奉君、終不受祿而焚身綿山的介子推。',
      },
      {
        title: '習俗',
        body: '掃墓祭祖是清明的核心——除草培土、供奉酒食、焚香化紙，以寄追遠之思。墓祭之外，又有踏青、插柳、放風箏、盪鞦韆之樂：一面慎終追遠，一面擁抱春光，生與死在這一日並行不悖，正是清明獨有的曠達。',
      },
      {
        title: '食',
        body: '寒食遺風使清明多冷食。江南有青團——艾草或漿麥草汁和入糯米粉，裹豆沙或鹹餡，色碧而清香；北方有子推饃、饊子。一口青團，是春天的味道，也是對寒食古俗的舌尖記憶。',
      },
      {
        title: '詩',
        body: '杜牧《清明》是千古傳誦的節令絕唱：「清明時節雨紛紛，路上行人欲斷魂。借問酒家何處有？牧童遙指杏花村。」——紛紛細雨、斷魂行人，愁緒正濃時，一問一答之間，杏花深處的酒旗忽現，淒迷裡透出一線暖意。短短四句，寫盡清明的雨、愁與生機。',
      },
      {
        title: '現代慶祝',
        body: '清明是國家法定假日，億萬人返鄉掃墓，「清明祭掃」成為一年中最大規模的人口流動之一。近年又興網絡祭掃、代客掃墓、鮮花替紙錢等新風，文明祭祀漸成共識。踏青郊遊、親子放鳶，則讓這個節日在追思之外，仍葆有春日的生氣。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '清明は二十四節気の一つであると同時に、中国で唯一、節気と祝日の二つの顔をもつ日である。上古の墓参りの礼、介子推を悼む寒食節、春の野に遊ぶ上巳節が、唐宋の頃に一つに融け合った。火を断ち冷たい物を食べる寒食の旧俗は、股の肉を割いて主君に捧げながら、ついに禄を受けず綿山で焼け死んだ忠臣・介子推の故事に由来すると伝えられる。',
      },
      {
        title: '習俗',
        body: '墓参り（掃墓）が清明の中心である。草を取り土を盛り、酒食を供え、香を焚き紙銭を燃やして、遠き祖先を偲ぶ。墓参のほか、野遊び（踏青）、柳挿し、凧揚げ、鞦韆（ぶらんこ）の楽しみもある。死者を弔いつつ春光を抱く——生と死がこの一日に並び立つところに、清明ならではの大らかさがある。',
      },
      {
        title: '食',
        body: '寒食の名残から、清明には冷たい食が多い。江南には青団——艾（よもぎ）や麦の若草の汁を糯米粉に練り込み、小豆餡や塩餡を包んだ、碧色で清らかに香る団子がある。北方には子推饃や饊子（揚げ菓子）。青団を一口頬張れば、それは春の味であり、寒食の古俗の舌の記憶でもある。',
      },
      {
        title: '詩',
        body: '杜牧「清明」は千古に誦される節令の絶唱：「清明の時節 雨紛紛、路上の行人 魂を断たんと欲す。借問す 酒家は何れの処にか有る、牧童は遥かに指す 杏花の村。」——降りしきる細雨、魂消える旅人。愁いの極まるとき、問いと答えの間に、杏の花咲く奥の酒旗がふと現れ、寂寥のなかに一筋の温もりがにじむ。わずか四句に、清明の雨と愁いと生気が描き尽くされている。',
      },
      {
        title: '現代の祝い方',
        body: '清明は国家の法定祝日であり、数億の人が故郷へ墓参りに帰る。「清明の墓参」は一年で最大級の人の移動の一つである。近年はネット祭祀や代理墓参、紙銭に代わる生花など新しい風も起こり、慎ましい弔いが共通の理解となりつつある。野遊びや親子の凧揚げは、追悼のかたわら、この節句に春の生気を保ち続けている。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'Qingming is both one of the 24 solar terms and the only day in China that is at once a solar term and a festival. It fused three older observances — the ancient rite of tending graves, the Cold Food Festival (寒食) that mourned Jie Zhitui, and the spring outing of the Shangsi Festival — into one by the Tang and Song dynasties. The Cold Food custom of dousing fires and eating cold food is said to honor Jie Zhitui, the loyal retainer who once cut flesh from his own thigh to feed his lord, yet later refused all reward and burned to death rather than leave his hermitage on Mount Mian.',
      },
      {
        title: 'Customs',
        body: "Tomb-sweeping is the heart of Qingming: clearing weeds and mounding earth, offering wine and food, burning incense and paper money to reach those who came before. Beyond the graves come the pleasures of spring — outings in the green, willow-sprigs at the door, kite-flying, swinging. To mourn the dead and embrace the spring light on the same day: this evenhandedness toward life and death is Qingming's own particular breadth of spirit.",
      },
      {
        title: 'Food',
        body: "The Cold Food legacy gives Qingming many cold dishes. The lower Yangtze has 青团 — glutinous rice dough kneaded with mugwort or barley-grass juice, wrapped around red-bean or savory filling, jade-green and fragrant. The north has Zitui buns and 馓子 (fried dough twists). A bite of 青团 is the taste of spring, and a tongue's memory of the ancient Cold Food rite.",
      },
      {
        title: 'Poetry',
        body: 'Du Mu\'s "Qingming" is the most quoted of all seasonal verses: "On Qingming the rain falls thick and fast; / on the road the traveler is ready to lose his soul. / Where, I ask, can a tavern be found? / A herdboy points the way — to Apricot Blossom Village, far off." Drizzling rain, a heartbroken wayfarer; at the very depth of sorrow, a single question and answer conjure a wine-flag deep among the apricot blossoms, and a thread of warmth glimmers through the gloom. Four short lines hold all of Qingming — its rain, its grief, and its returning life.',
      },
      {
        title: 'Modern celebration',
        body: 'Qingming is a statutory national holiday, and hundreds of millions return home to sweep the graves — the "Qingming visitation" is among the largest annual movements of people in the country. Recent years have brought online memorials, proxy grave-tending, and fresh flowers in place of paper money, as gentler mourning becomes common ground. Spring outings and family kite-flying keep the day, for all its remembrance, alive with the vigor of spring.',
      },
    ],
  },
}
