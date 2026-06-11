import type { FestivalContent } from './schema'

/**
 * 惊蛰 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 韦应物《观田家》
 * (「微雨众卉新，一雷惊蛰始」). CJK literal, en explained (ADR-0020).
 */
export const JINGZHE: FestivalContent = {
  id: 'jieqi-jingzhe',
  kind: 'jieqi',
  name: {
    'zh-Hans': '惊蛰',
    'zh-Hant': '驚蟄',
    ja: '啓蟄',
    en: 'Jingzhe (Awakening of Insects)',
  },
  tagline: {
    'zh-Hans': '二十四节气之三 · 春雷乍动，万物苏醒',
    'zh-Hant': '二十四節氣之三 · 春雷乍動，萬物甦醒',
    ja: '二十四節気の第三 · 春雷が蟄虫を起こす',
    en: 'The 3rd solar term · spring thunder wakes the hibernating',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '惊蛰三候——「一候桃始华，二候仓庚鸣，三候鹰化为鸠」。桃花初绽，黄鹂（仓庚）鸣于枝头；古人见鹰渐隐、鸠渐多，遂有「鹰化为鸠」之想象。一声春雷惊醒蛰伏之虫，天地自此真正回春。',
      },
      {
        title: '农事',
        body: '惊蛰是春耕全面开始的节点，农谚云「到了惊蛰节，锄头不停歇」。北方冬小麦返青，需顶凌耙地、保墒；南方早稻育秧、茶园采制春茶。气温回升也令病虫害苏醒，需及早防治，故有「惊蛰不耙地，好比蒸馍跑了气」之说。',
      },
      {
        title: '养生',
        body: '惊蛰阳气升发、乍暖还寒，中医主张顺时养阳、护肝健脾。饮食宜清淡，可食梨润燥（「惊蛰吃梨」古俗），多食春芽时蔬，忌过食辛辣油腻。起居宜早睡早起、舒展筋骨，情志宜平和，慎防春困与肝火上炎，并注意保暖防流感。',
      },
      {
        title: '诗',
        body: '韦应物《观田家》直写惊蛰农事：「微雨众卉新，一雷惊蛰始。田家几日闲，耕种从此起。」——一场细雨令百草新绿，一声春雷揭开惊蛰，农家短暂的清闲就此结束，新一年的耕种由此开始。诗人以平淡笔墨写尽农时之紧与稼穑之劳。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '驚蟄三候——「一候桃始華，二候倉庚鳴，三候鷹化為鳩」。桃花初綻，黃鸝（倉庚）鳴於枝頭；古人見鷹漸隱、鳩漸多，遂有「鷹化為鳩」之想像。一聲春雷驚醒蟄伏之蟲，天地自此真正回春。',
      },
      {
        title: '農事',
        body: '驚蟄是春耕全面開始的節點，農諺云「到了驚蟄節，鋤頭不停歇」。北方冬小麥返青，需頂凌耙地、保墒；南方早稻育秧、茶園採製春茶。氣溫回升也令病蟲害甦醒，需及早防治，故有「驚蟄不耙地，好比蒸饃跑了氣」之說。',
      },
      {
        title: '養生',
        body: '驚蟄陽氣升發、乍暖還寒，中醫主張順時養陽、護肝健脾。飲食宜清淡，可食梨潤燥（「驚蟄吃梨」古俗），多食春芽時蔬，忌過食辛辣油膩。起居宜早睡早起、舒展筋骨，情志宜平和，慎防春困與肝火上炎，並注意保暖防流感。',
      },
      {
        title: '詩',
        body: '韋應物《觀田家》直寫驚蟄農事：「微雨眾卉新，一雷驚蟄始。田家幾日閒，耕種從此起。」——一場細雨令百草新綠，一聲春雷揭開驚蟄，農家短暫的清閒就此結束，新一年的耕種由此開始。詩人以平淡筆墨寫盡農時之緊與稼穡之勞。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '啓蟄の三候——「一候 桃始めて華さく、二候 倉庚鳴く、三候 鷹化して鳩と為る」。桃の花が初めて咲き、黄鸝（こうらい、倉庚）が枝で鳴く。古人は鷹が姿を隠し鳩が増えるのを見て「鷹化して鳩と為る」と想った。一声の春雷が蟄（こも）れる虫を驚かし起こし、天地はここに真の春を迎える。',
      },
      {
        title: '農事',
        body: '啓蟄は春耕が本格的に始まる節目で、「啓蟄に至れば、鋤は休まず」と農諺に言う。北方では冬小麦が芽を吹き返し、凍て土を耙（なら）して墒を保つ。南方では早稲の苗代づくりや茶園の春茶摘みが始まる。気温の上昇は病虫害をも目覚めさせるため、早めの防除が肝要である。',
      },
      {
        title: '養生',
        body: '啓蟄は陽気が立ち上がりつつ、暖かさと寒さが入り混じる。漢方では時に順って陽を養い、肝を護り脾を健やかにすることを説く。食は淡白に、梨で燥を潤し（「啓蟄に梨を食う」古俗）、春の新芽の旬菜を多くとり、辛味・脂を摂りすぎない。早寝早起きで筋を伸ばし、情を穏やかに保ち、春の眠気と肝火の上昇を慎み、保温して流感を防ぐ。',
      },
      {
        title: '詩',
        body: '韋応物「田家を観る」は啓蟄の農事を直に詠む：「微雨 衆卉（しゅうき）新たに、一雷 驚蟄始まる。田家 幾日か閑なる、耕種 此れより起こる。」——細雨が百草を新緑に染め、一声の春雷が啓蟄を開く。農家のつかの間の閑はここで終わり、新たな一年の耕しが始まる。詩人は淡々とした筆で、農時の切迫と稼穡の労を写し尽くす。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Awakening of Insects: "first, the peach begins to bloom (桃始华); second, the oriole sings (仓庚鸣); third, the hawk becomes a dove (鹰化为鸠)." Peach blossoms open and the oriole calls from the branches; seeing hawks grow scarce and doves plentiful, the ancients imagined the one turning into the other. A clap of spring thunder startles the hibernating insects awake, and the world turns truly back to spring.',
      },
      {
        title: 'Farming',
        body: 'Jingzhe marks the full start of spring plowing — "Come Jingzhe, the hoe never rests," as the proverb goes. In the north winter wheat greens again and the still-frozen soil is harrowed to hold its moisture; in the south early-rice seedbeds are prepared and the first spring tea is picked. The warming also wakes pests and disease, so early control is essential.',
      },
      {
        title: 'Wellness',
        body: 'At Jingzhe the yang force rises while warm and cold still alternate, so Chinese medicine advises nourishing the yang in step with the season and protecting the liver and spleen. Keep the diet light; pears moisten dryness (hence the old custom of "eating pears at Jingzhe"); favor spring sprouts and seasonal greens, and go easy on the spicy and greasy. Sleep and rise early, stretch the sinews, keep the mood even, guard against spring drowsiness and rising liver-fire, and stay warm against flu.',
      },
      {
        title: 'Poetry',
        body: 'Wei Yingwu\'s "Watching the Farmers" writes the work of Jingzhe directly: "A fine rain, and all the plants are new; / one thunderclap, and Jingzhe begins. / The farmhouse has had but a few idle days — / from here, the plowing and sowing start." A drizzle greens a hundred grasses; a spring thunder opens the term; the farmer\'s brief leisure ends, and the year\'s tilling begins. In plain strokes the poet captures the urgency of the farming seasons and the toil of the harvest year.',
      },
    ],
  },
}
