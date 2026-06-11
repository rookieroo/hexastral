import type { FestivalContent } from './schema'

/**
 * 谷雨 — 节气 (last of spring). Structure 物候(三候)/农事/养生/诗. 诗: 元稹
 * 《咏廿四气诗·谷雨》(「谷雨春光晓，山川黛色青」). CJK literal, en explained.
 */
export const GUYU: FestivalContent = {
  id: 'jieqi-guyu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '谷雨',
    'zh-Hant': '穀雨',
    ja: '穀雨',
    en: 'Guyu (Grain Rain)',
  },
  tagline: {
    'zh-Hans': '二十四节气之六 · 雨生百谷，春之尾声',
    'zh-Hant': '二十四節氣之六 · 雨生百穀，春之尾聲',
    ja: '二十四節気の第六 · 雨が百穀を育てる',
    en: 'The 6th solar term · the rain that grows the grain',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '谷雨三候——「一候萍始生，二候鸣鸠拂其羽，三候戴胜降于桑」。浮萍始生于水面，布谷（鸣鸠）梳羽催促农时，戴胜鸟飞落桑树。雨生百谷，春之最后一个节气至此，气温与雨量俱增。',
      },
      {
        title: '农事',
        body: '谷雨「雨生百谷」，是春播春种的最后关口，农谚云「谷雨前后，种瓜点豆」。北方播种棉花、春玉米，南方插秧、采制「谷雨茶」（雨前茶为茶中上品）。降水增多正利谷物生长，需抓住墒情抢种保苗。',
      },
      {
        title: '养生',
        body: '谷雨湿热渐显，中医主张健脾祛湿、清肝明目。饮食宜甘平利湿（薏米、赤豆、山药、香椿），少食酸涩，可饮谷雨茶清火。起居宜防潮防湿，适度运动出汗以排湿。情志宜舒畅，慎防「湿困脾」所致的困倦与食欲不振。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·谷雨》以节候入诗：「谷雨春光晓，山川黛色青。叶间鸣戴胜，泽水长浮萍。」——谷雨清晨春光初晓，山川一片青黛。枝叶间戴胜啼鸣，水泽上浮萍渐生，恰应谷雨三候「萍始生」「戴胜降于桑」之象，将节气物候写入诗行。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '穀雨三候——「一候萍始生，二候鳴鳩拂其羽，三候戴勝降於桑」。浮萍始生於水面，布穀（鳴鳩）梳羽催促農時，戴勝鳥飛落桑樹。雨生百穀，春之最後一個節氣至此，氣溫與雨量俱增。',
      },
      {
        title: '農事',
        body: '穀雨「雨生百穀」，是春播春種的最後關口，農諺云「穀雨前後，種瓜點豆」。北方播種棉花、春玉米，南方插秧、採製「穀雨茶」（雨前茶為茶中上品）。降水增多正利穀物生長，需抓住墒情搶種保苗。',
      },
      {
        title: '養生',
        body: '穀雨濕熱漸顯，中醫主張健脾祛濕、清肝明目。飲食宜甘平利濕（薏米、赤豆、山藥、香椿），少食酸澀，可飲穀雨茶清火。起居宜防潮防濕，適度運動出汗以排濕。情志宜舒暢，慎防「濕困脾」所致的困倦與食慾不振。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·穀雨》以節候入詩：「穀雨春光曉，山川黛色青。葉間鳴戴勝，澤水長浮萍。」——穀雨清晨春光初曉，山川一片青黛。枝葉間戴勝啼鳴，水澤上浮萍漸生，恰應穀雨三候「萍始生」「戴勝降於桑」之象，將節氣物候寫入詩行。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '穀雨の三候——「一候 萍（うきくさ）始めて生ず、二候 鳴鳩 其の羽を払う、三候 戴勝 桑に降る」。浮草が水面に生え始め、布穀（鳴鳩）が羽を梳いて農時を促し、戴勝（やつがしら）が桑の木に降りる。雨が百穀を生み、春の最後の節気がここに至り、気温も雨量もともに増す。',
      },
      {
        title: '農事',
        body: '穀雨は「雨 百穀を生ず」、春の種まきの最後の関門で、「穀雨の前後、瓜を種え豆を点ず」と農諺に言う。北方では綿や春トウモロコシを播き、南方では田植えと「穀雨茶」（雨前の茶は上品）の摘採が行われる。降水の増加は穀物の生長を助け、墒（土の湿り）を逃さず種を蒔き苗を守る。',
      },
      {
        title: '養生',
        body: '穀雨は湿熱が次第に現れる。漢方では脾を健やかにし湿を除き、肝を清め目を明らかにすることを説く。食は甘平で利湿のもの（はと麦・小豆・山芋・香椿）を宜とし、酸渋を控え、穀雨茶で火を清めるとよい。起居は湿気を防ぎ、適度に動いて汗で湿を出す。情を伸びやかに保ち、「湿が脾を困らす」だるさや食欲不振を慎む。',
      },
      {
        title: '詩',
        body: '元稹「廿四気を詠ずる詩・穀雨」は節候を詩に詠む：「穀雨 春光暁け、山川 黛色青し。葉間 戴勝鳴き、沢水 浮萍長ず。」——穀雨の朝、春の光が明け初め、山も川も青黛に染まる。葉のあいだに戴勝が鳴き、沢の水に浮草が生い広がる。まさに穀雨の三候「萍始めて生ず」「戴勝 桑に降る」の象にかない、節気の物候を詩行に写し取っている。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Grain Rain: "first, duckweed begins to grow (萍始生); second, the cuckoo preens its feathers (鸣鸠拂其羽); third, the hoopoe alights on the mulberry (戴胜降于桑)." Duckweed spreads on the water, the cuckoo grooms itself as if urging on the farming season, and the hoopoe settles in the mulberry trees. The rain grows the grain; spring\'s last solar term arrives, and both warmth and rainfall rise.',
      },
      {
        title: 'Farming',
        body: 'Grain Rain — "the rain that grows the hundred grains" — is the final gate of spring sowing: "Around Grain Rain, plant the melons and beans," runs the proverb. The north sows cotton and spring corn; the south transplants rice and picks "Grain Rain tea" (pre-rain tea is the finest grade). The rising rain favors the grain, so farmers seize the moisture to sow and protect the seedlings.',
      },
      {
        title: 'Wellness',
        body: 'Heat and damp begin to show at Grain Rain, so Chinese medicine advises strengthening the spleen and dispelling damp, clearing the liver and brightening the eyes. Favor mild-sweet, damp-draining foods (Job\'s tears, red beans, yam, Chinese toon); go easy on the sour and astringent; Grain Rain tea clears heat. Keep the home dry, and sweat lightly through exercise to expel damp. Keep the mood open, and guard against the fatigue and poor appetite of "damp besieging the spleen."',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Grain Rain" sets the season into verse: "At Grain Rain the spring light dawns; / the hills and rivers are a deep blue-green. / Among the leaves the hoopoe calls; / across the marsh waters the duckweed spreads." A Grain Rain morning breaks bright, mountains and rivers washed in blue-green; the hoopoe cries among the leaves and duckweed grows over the water — exactly the term\'s pentads, "duckweed begins to grow" and "the hoopoe alights on the mulberry," written straight into the lines.',
      },
    ],
  },
}
