import type { FestivalContent } from './schema'

/**
 * 立夏 — 节气 (start of summer). Structure 物候(三候)/农事/养生/诗. 诗: 杨万里
 * 《小池》(初夏景, 「小荷才露尖尖角」). CJK literal, en explained (ADR-0020).
 */
export const LIXIA: FestivalContent = {
  id: 'jieqi-lixia',
  kind: 'jieqi',
  name: {
    'zh-Hans': '立夏',
    'zh-Hant': '立夏',
    ja: '立夏',
    en: 'Lixia (Start of Summer)',
  },
  tagline: {
    'zh-Hans': '二十四节气之七 · 夏木初长，万物繁茂',
    'zh-Hant': '二十四節氣之七 · 夏木初長，萬物繁茂',
    ja: '二十四節気の第七 · 夏の始まり',
    en: 'The 7th solar term · summer begins, all things flourish',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '立夏三候——「一候蝼蝈鸣，二候蚯蚓出，三候王瓜生」。蝼蝈（蛙）在田间鸣叫，蚯蚓掘土而出，王瓜藤蔓快速攀长。立夏标志夏季开始，气温显升，万物繁茂生长。',
      },
      {
        title: '农事',
        body: '立夏前后，农事进入夏管夏种。农谚「立夏看夏」，冬小麦扬花灌浆、早稻分蘖，需保水追肥；棉花、大豆、玉米相继出苗定苗。江南「立夏小满，江河渐满」，需防夏旱与病虫，抢抓农时。',
      },
      {
        title: '养生',
        body: '立夏后阳气旺盛，中医主张「养心安神」，因夏气通于心。饮食宜清淡、增酸减苦（适量乌梅、番茄养心生津），多食蔬果补水，忌贪凉饮冷伤脾。起居宜晚睡早起、午间小憩养心。情志宜平静，戒躁怒以免心火亢盛。',
      },
      {
        title: '诗',
        body: '杨万里《小池》写尽初夏清趣：「泉眼无声惜细流，树阴照水爱晴柔。小荷才露尖尖角，早有蜻蜓立上头。」——细流无声、树阴照水，一支初露的小荷尖上，已立着一只蜻蜓。诗人以极轻的笔触，捕捉立夏时节生机初萌、清新可喜的一瞬。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '立夏三候——「一候螻蟈鳴，二候蚯蚓出，三候王瓜生」。螻蟈（蛙）在田間鳴叫，蚯蚓掘土而出，王瓜藤蔓快速攀長。立夏標誌夏季開始，氣溫顯升，萬物繁茂生長。',
      },
      {
        title: '農事',
        body: '立夏前後，農事進入夏管夏種。農諺「立夏看夏」，冬小麥揚花灌漿、早稻分蘗，需保水追肥；棉花、大豆、玉米相繼出苗定苗。江南「立夏小滿，江河漸滿」，需防夏旱與病蟲，搶抓農時。',
      },
      {
        title: '養生',
        body: '立夏後陽氣旺盛，中醫主張「養心安神」，因夏氣通於心。飲食宜清淡、增酸減苦（適量烏梅、番茄養心生津），多食蔬果補水，忌貪涼飲冷傷脾。起居宜晚睡早起、午間小憩養心。情志宜平靜，戒躁怒以免心火亢盛。',
      },
      {
        title: '詩',
        body: '楊萬里《小池》寫盡初夏清趣：「泉眼無聲惜細流，樹陰照水愛晴柔。小荷才露尖尖角，早有蜻蜓立上頭。」——細流無聲、樹陰照水，一支初露的小荷尖上，已立著一隻蜻蜓。詩人以極輕的筆觸，捕捉立夏時節生機初萌、清新可喜的一瞬。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '立夏の三候——「一候 螻蟈（ろうこく）鳴く、二候 蚯蚓（みみず）出づ、三候 王瓜生ず」。螻蟈（蛙）が田で鳴き、蚯蚓が土を掘って出て、王瓜の蔓が勢いよく伸びる。立夏は夏の始まりを告げ、気温は著しく上がり、万物が繁り育つ。',
      },
      {
        title: '農事',
        body: '立夏の前後、農事は夏の管理と種まきに入る。「立夏に夏を看る」と農諺に言い、冬小麦は花を咲かせ実を充たし、早稲は分蘗（ぶんけつ）し、水を保ち肥を追う。綿・大豆・トウモロコシも次々と苗が立つ。江南では「立夏小満、江河漸く満つ」と言い、夏の乾きと病虫を防いで農時を逃さない。',
      },
      {
        title: '養生',
        body: '立夏の後は陽気が盛んになる。漢方では夏の気は心に通じるとして「心を養い神を安んずる」ことを説く。食は淡白に、酸を増し苦を減らし（烏梅やトマトで心を養い津を生じ）、蔬果で水を補い、冷たいものの摂りすぎで脾を損なわぬようにする。遅寝早起き、昼の小憩で心を養う。情を平静に保ち、苛立ちや怒りを戒めて心火の亢ぶりを防ぐ。',
      },
      {
        title: '詩',
        body: '楊万里「小池」は初夏の清らかな趣を写し尽くす：「泉眼 声無くして細流を惜しみ、樹陰 水に照りて晴柔を愛す。小荷 才かに露す 尖尖の角、早に蜻蜓の上頭に立つ有り。」——音もなき細流、水に映る木陰。初めて顔を出した小さな蓮の尖に、もう一匹の蜻蛉がとまっている。詩人は極めて軽やかな筆で、立夏の生気が芽吹く清新で愛らしい一瞬を捉えた。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Start of Summer: "first, the frogs sing (蝼蝈鸣); second, earthworms emerge (蚯蚓出); third, the snake-gourd vine springs up (王瓜生)." Frogs call in the fields, earthworms work up through the soil, and the snake-gourd climbs fast. Lixia announces summer\'s start: the heat rises markedly and all things grow lush.',
      },
      {
        title: 'Farming',
        body: 'Around Lixia, farm work turns to summer tending and sowing. "At Lixia, look to the summer," runs the proverb: winter wheat is flowering and filling, early rice is tillering, and both need water and feeding; cotton, soybean, and corn come up in turn. In the lower Yangtze, "Lixia and Xiaoman, and the rivers slowly fill" — farmers guard against summer drought and pests and seize the season.',
      },
      {
        title: 'Wellness',
        body: 'After Lixia the yang flourishes, and because summer\'s qi connects to the heart, Chinese medicine advises "nourishing the heart and calming the spirit." Keep the diet light, add a little sour and ease off the bitter (dark plum, tomato to nourish the heart and generate fluids), eat fruit and vegetables to replenish water, and avoid the cold drinks that injure the spleen. Sleep late and rise early, with a midday rest to nourish the heart. Keep the mood calm and curb irritation and anger, lest heart-fire blaze.',
      },
      {
        title: 'Poetry',
        body: 'Yang Wanli\'s "Little Pond" distills the freshness of early summer: "The spring\'s mouth makes no sound, sparing its thin trickle; / tree shadows love the water in the soft, clear light. / The young lotus has just shown its sharp green tip — / and already a dragonfly stands on top." A soundless trickle, shade mirrored on water, and on the first sharp tip of a lotus leaf a dragonfly has already alighted. With the lightest of touches the poet catches a single fresh, delightful instant of early summer.',
      },
    ],
  },
}
