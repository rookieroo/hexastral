import type { FestivalContent } from './schema'

/**
 * 大雪 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 柳宗元《江雪》
 * (「独钓寒江雪」). CJK literal, en explained (ADR-0020).
 */
export const DAXUE: FestivalContent = {
  id: 'jieqi-daxue',
  kind: 'jieqi',
  name: {
    'zh-Hans': '大雪',
    'zh-Hant': '大雪',
    ja: '大雪',
    en: 'Daxue (Greater Snow)',
  },
  tagline: {
    'zh-Hans': '二十四节气之二十一 · 雪盛于此，瑞雪兆丰',
    'zh-Hant': '二十四節氣之二十一 · 雪盛於此，瑞雪兆豐',
    ja: '二十四節気の第二十一 · 雪が盛んになる頃',
    en: 'The 21st solar term · the snow grows heavy',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '大雪三候——「一候鹖鴠不鸣，二候虎始交，三候荔挺出」。寒号鸟（鹖鴠）感天寒而不再鸣叫；老虎感微弱阳气而始有求偶之举；马兰草（荔）一类感阳萌动而抽出新芽。大雪者，雪盛于此，气温更低、降雪可能更大。',
      },
      {
        title: '农事',
        body: '大雪时节，「瑞雪兆丰年」，积雪覆盖农田，既保温保墒、又冻杀害虫，利于冬小麦安全越冬。农事多为田间管理与积肥造肥，兴修水利、整理农具。北方「大雪封地」，农人多歇冬备春；南方仍可种植耐寒蔬菜，并防冻护苗。',
      },
      {
        title: '养生',
        body: '大雪天寒，阳气深藏，中医主张「大补」温阳、固护肾气，「冬令进补」正当时。饮食宜温热滋补（羊肉、牛肉、当归生姜羊肉汤、栗子、桂圆），少食生冷。起居宜早睡晚起、避严寒、防风寒感冒与心脑血管病。情志宜平和喜乐，多晒太阳。适度温和运动，微汗即止。',
      },
      {
        title: '诗',
        body: '柳宗元《江雪》是写雪的千古绝唱：「千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。」——千山之中飞鸟绝迹，万径之上人踪湮灭；一叶孤舟、一位蓑笠老翁，独自垂钓于风雪寒江之上。诗以极简的二十字，画出天地洁净空寂的雪境与孤高不屈的襟怀，被誉为「千古绝唱」。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '大雪三候——「一候鶡鴠不鳴，二候虎始交，三候荔挺出」。寒號鳥（鶡鴠）感天寒而不再鳴叫；老虎感微弱陽氣而始有求偶之舉；馬蘭草（荔）一類感陽萌動而抽出新芽。大雪者，雪盛於此，氣溫更低、降雪可能更大。',
      },
      {
        title: '農事',
        body: '大雪時節，「瑞雪兆豐年」，積雪覆蓋農田，既保溫保墒、又凍殺害蟲，利於冬小麥安全越冬。農事多為田間管理與積肥造肥，興修水利、整理農具。北方「大雪封地」，農人多歇冬備春；南方仍可種植耐寒蔬菜，並防凍護苗。',
      },
      {
        title: '養生',
        body: '大雪天寒，陽氣深藏，中醫主張「大補」溫陽、固護腎氣，「冬令進補」正當時。飲食宜溫熱滋補（羊肉、牛肉、當歸生薑羊肉湯、栗子、桂圓），少食生冷。起居宜早睡晚起、避嚴寒、防風寒感冒與心腦血管病。情志宜平和喜樂，多曬太陽。適度溫和運動，微汗即止。',
      },
      {
        title: '詩',
        body: '柳宗元《江雪》是寫雪的千古絕唱：「千山鳥飛絕，萬徑人蹤滅。孤舟蓑笠翁，獨釣寒江雪。」——千山之中飛鳥絕跡，萬徑之上人蹤湮滅；一葉孤舟、一位蓑笠老翁，獨自垂釣於風雪寒江之上。詩以極簡的二十字，畫出天地潔淨空寂的雪境與孤高不屈的襟懷，被譽為「千古絕唱」。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '大雪の三候——「一候 鶡鴠（かったん）鳴かず、二候 虎 始めて交わる、三候 荔（れい）挺（ぬき）出づ」。寒号鳥（鶡鴠）は寒さを感じてもう鳴かず、虎は微かな陽気を感じて交尾を始め、馬蘭の類（荔）は陽の萌しを感じて新芽を抽く。大雪とは、雪がここに盛んとなり、気温はさらに低く、降雪もより多くなりうる頃である。',
      },
      {
        title: '農事',
        body: '大雪の頃、「瑞雪は豊年の兆し」と言い、積雪が農田を覆って保温・保墒し、また害虫を凍え殺し、冬小麦の安全な越冬を助ける。農事は田の管理や積肥造肥、水利の修築、農具の整理が主となる。北方では「大雪 地を封ず」、農人は冬を休んで春に備える者が多い。南方では耐寒の野菜をなお植え、凍えを防いで苗を護る。',
      },
      {
        title: '養生',
        body: '大雪は寒く、陽気が深く蔵れる。漢方では「大いに補い」陽を温め、腎気を固く護ることを説き、「冬の進補」の正にその時である。食は温熱で滋補するもの（羊肉・牛肉・当帰生姜羊肉湯・栗・龍眼）を宜とし、生冷を控える。早寝遅起きし、厳寒を避け、風寒の感冒と心脳血管の病を防ぐ。情を穏やかに喜ばしく保ち、日光を多く浴びる。適度に穏やかに動き、微かに汗ばめば止める。',
      },
      {
        title: '詩',
        body: '柳宗元「江雪」は雪を詠む千古の絶唱：「千山 鳥飛ぶこと絶え、万径 人蹤（じんしょう）滅す。孤舟 蓑笠（さりゅう）の翁、独り釣る 寒江の雪。」——千の山に飛ぶ鳥の影は絶え、万の小径に人の足跡は消える。一葉の孤舟に蓑笠の老翁、ただ独り、雪降る寒江に釣り糸を垂れる。詩はわずか二十字で、天地の清く空しい雪の境と、孤高にして屈せぬ襟懐を描き、「千古の絶唱」と称えられる。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Greater Snow: "first, the cold-cry bird falls silent (鹖鴠不鸣); second, the tiger begins to mate (虎始交); third, the lichen-orchid sprouts (荔挺出)." The cold-cry bird, feeling the deep cold, sings no more; the tiger, sensing the faint stir of yang, begins to seek a mate; and the orchid-like 荔 grass, feeling the first stir of yang, pushes out new shoots. Greater Snow is when the snow grows heavy — colder still, and the snowfall possibly greater.',
      },
      {
        title: 'Farming',
        body: 'At Greater Snow, "a timely snow foretells a good year": the snow blanket warms the soil and holds its moisture while freezing the pests, helping the winter wheat through the cold safely. Farm work is mostly field management and building manure, repairing irrigation and mending tools. In the north, "Greater Snow seals the ground," and many rest for the winter and prepare for spring; the south can still plant cold-hardy vegetables and protect the seedlings from frost.',
      },
      {
        title: 'Wellness',
        body: 'With the cold of Greater Snow and the yang deep in hiding, Chinese medicine advises "great tonification" to warm the yang and firmly guard the kidney qi — the very time for "winter tonifying." Favor warm, nourishing foods (mutton, beef, angelica-and-ginger mutton soup, chestnut, longan) and ease off the cold and raw. Sleep early and rise late, avoid the bitter cold, and guard against wind-cold colds and heart and vascular trouble. Keep the mood calm and glad, and take plenty of sun. Exercise gently and in moderation, stopping at the first light sweat.',
      },
      {
        title: 'Poetry',
        body: 'Liu Zongyuan\'s "River Snow" is the timeless poem of snow: "A thousand hills, and the birds\' flight gone; / ten thousand paths, and human tracks erased. / A lone boat, an old man in straw cape and hat, / fishing alone in the cold river snow." Across a thousand hills no bird flies, on ten thousand paths no footprint remains; a single boat, an old man in straw cape and hat, fishes alone on the snow-swept cold river. In a bare twenty characters the poem paints a clean, empty world of snow and a spirit aloof and unbending — celebrated as a "verse for the ages."',
      },
    ],
  },
}
