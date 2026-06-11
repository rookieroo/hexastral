import type { FestivalContent } from './schema'

/**
 * 大暑 — 节气 (hottest term). Structure 物候(三候)/农事/养生/诗. 诗: 曾几《大暑》
 * (「赤日几时过，清风无处寻」). CJK literal, en explained (ADR-0020).
 */
export const DASHU: FestivalContent = {
  id: 'jieqi-dashu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '大暑',
    'zh-Hant': '大暑',
    ja: '大暑',
    en: 'Dashu (Greater Heat)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十二 · 一年最热，湿热交蒸',
    'zh-Hant': '二十四節氣之十二 · 一年最熱，濕熱交蒸',
    ja: '二十四節気の第十二 · 一年で最も暑い頃',
    en: 'The 12th solar term · the hottest time of the year',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '大暑三候——「一候腐草为萤，二候土润溽暑，三候大雨时行」。萤火虫产卵于枯草，古人见其飞出，遂有「腐草为萤」之说；土壤湿润、暑气熏蒸；时有大雨倾盆。大暑是一年中最炎热的节气，「湿热交蒸」达于顶点。',
      },
      {
        title: '农事',
        body: '大暑高温酷热，对农作物既是生长旺季也是考验。农谚「大暑不暑，五谷不鼓」。南方「双抢」（抢收早稻、抢插晚稻）正酣，需抗旱防涝；棉花、玉米需水量大，灌溉与排涝并重。高温也利棉花结铃、水稻灌浆，但需防「高温逼熟」减产。',
      },
      {
        title: '养生',
        body: '大暑酷热，中医主张「清热解暑、益气生津」，并重「防疰夏」。饮食宜清淡、多食消暑利湿之物（绿豆、冬瓜、苦瓜、荷叶），可适量「以热制热」（伏天喝热茶、姜茶）以发汗排湿。起居避烈日、多休息，午睡养心。情志宁静，戒躁。老人小孩尤需防中暑。',
      },
      {
        title: '诗',
        body: '曾几《大暑》写苦热中的清趣：「赤日几时过，清风无处寻。经书聊枕籍，瓜李漫浮沉。」——烈日何时才落，清风遍寻不得；唯以经书作枕、将瓜果浸于凉水浮沉解暑。诗人于酷暑难耐中，以读书、浸果觅得一分闲适，苦中见雅。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '大暑三候——「一候腐草為螢，二候土潤溽暑，三候大雨時行」。螢火蟲產卵於枯草，古人見其飛出，遂有「腐草為螢」之說；土壤濕潤、暑氣熏蒸；時有大雨傾盆。大暑是一年中最炎熱的節氣，「濕熱交蒸」達於頂點。',
      },
      {
        title: '農事',
        body: '大暑高溫酷熱，對農作物既是生長旺季也是考驗。農諺「大暑不暑，五穀不鼓」。南方「雙搶」（搶收早稻、搶插晚稻）正酣，需抗旱防澇；棉花、玉米需水量大，灌溉與排澇並重。高溫也利棉花結鈴、水稻灌漿，但需防「高溫逼熟」減產。',
      },
      {
        title: '養生',
        body: '大暑酷熱，中醫主張「清熱解暑、益氣生津」，並重「防疰夏」。飲食宜清淡、多食消暑利濕之物（綠豆、冬瓜、苦瓜、荷葉），可適量「以熱制熱」（伏天喝熱茶、薑茶）以發汗排濕。起居避烈日、多休息，午睡養心。情志寧靜，戒躁。老人小孩尤需防中暑。',
      },
      {
        title: '詩',
        body: '曾幾《大暑》寫苦熱中的清趣：「赤日幾時過，清風無處尋。經書聊枕籍，瓜李漫浮沉。」——烈日何時才落，清風遍尋不得；唯以經書作枕、將瓜果浸於涼水浮沉解暑。詩人於酷暑難耐中，以讀書、浸果覓得一分閒適，苦中見雅。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '大暑の三候——「一候 腐草 螢と為る、二候 土潤いて溽暑（じょくしょ）たり、三候 大雨 時に行る」。蛍は枯れ草に卵を産み、古人はその飛び立つを見て「腐草 螢と為る」と説いた。土は湿り、暑気が蒸し、時に大雨が盆を覆すごとく降る。大暑は一年で最も暑い節気で、「湿熱の蒸し」が頂点に達する。',
      },
      {
        title: '農事',
        body: '大暑の高温酷暑は、作物にとって生長の盛期であると同時に試練でもある。「大暑に暑からずば、五穀実らず」と農諺に言う。南方では「双搶」（早稲の刈り取りと晩稲の植え付け）が酣（たけなわ）で、旱を防ぎ澇を防ぐ。綿やトウモロコシは水を多く要し、灌漑と排水が並び立つ。高温は綿の結実や稲の登熟を助けるが、「高温による熟れ急ぎ」の減収を防ぐ必要がある。',
      },
      {
        title: '養生',
        body: '大暑の酷暑には、漢方は「熱を清め暑を解き、気を益し津を生ず」ことを説き、「疰夏（夏負け）の予防」を重んじる。食は淡白に、暑を消し湿を利するもの（緑豆・冬瓜・苦瓜・蓮の葉）を多くとり、適度に「熱を以て熱を制す」（伏の日に熱い茶・生姜茶を飲む）て汗を出し湿を排す。烈日を避けてよく休み、昼寝で心を養う。情を静め、苛立ちを戒める。老人と子どもはとりわけ中暑を防ぐ。',
      },
      {
        title: '詩',
        body: '曾幾「大暑」は苦しい暑さの中の清らかな趣を詠む：「赤日 幾時か過ぎん、清風 尋ぬる処無し。経書 聊（いささ）か枕籍とし、瓜李 漫（そぞ）ろに浮沈す。」——灼ける日はいつ沈むのか、涼風はどこを探しても見つからない。ただ経書を枕にし、瓜や李を冷たい水に浮き沈みさせて暑を解く。詩人は耐えがたい酷暑の中、読書と果物に一分の閑適を見いだし、苦の中に雅を見せる。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Greater Heat: "first, rotting grass becomes fireflies (腐草为萤); second, the soil is damp and the air sweltering (土润溽暑); third, great rains come in their season (大雨时行)." Fireflies lay their eggs in withered grass, and the ancients, seeing them rise, said the rotting grass turned to fireflies; the soil is moist, the heat steams, and downpours come in torrents. Greater Heat is the hottest term of the year, when the "steaming of damp and heat" reaches its peak.',
      },
      {
        title: 'Farming',
        body: 'The fierce heat of Greater Heat is both a peak growing season and a trial for the crops. "If Greater Heat brings no heat, the grain won\'t fill," runs the proverb. In the south the "double rush" — reaping early rice, transplanting late — is in full swing, resisting drought and flood alike; cotton and corn need much water, so irrigation and drainage go hand in hand. The heat helps cotton set bolls and rice fill its grain, but "heat-forced ripening" and its yield loss must be guarded against.',
      },
      {
        title: 'Wellness',
        body: 'In the fierce heat, Chinese medicine advises "clearing heat and relieving summer-heat, boosting qi and generating fluids," with emphasis on "warding off summer lassitude." Keep the diet light and eat more heat-clearing, damp-draining foods (mung bean, winter melon, bitter melon, lotus leaf); a measured "fight heat with heat" (hot tea or ginger tea in the dog days) brings out sweat and expels damp. Avoid the fierce sun, rest often, and nap to nourish the heart. Keep the mood quiet and curb irritation. The old and the young especially must guard against heatstroke.',
      },
      {
        title: 'Poetry',
        body: 'Zeng Ji\'s "Greater Heat" finds a cool grace within the punishing heat: "When will the blazing sun pass? / A cool breeze is nowhere to be found. / I make a pillow of the classics, / and bob melons and plums in cold water." When will the scorching sun set; the cool wind is sought in vain — so he pillows his head on books and floats melon and plum in cool water to beat the heat. Amid the unbearable swelter, the poet finds a measure of ease in reading and chilled fruit — elegance drawn out of hardship.',
      },
    ],
  },
}
