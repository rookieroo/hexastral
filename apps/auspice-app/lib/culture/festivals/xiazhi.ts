import type { FestivalContent } from './schema'

/**
 * 夏至 — 节气 (longest day). Structure 物候(三候)/农事/养生/诗. 诗: 韦应物
 * 《夏至避暑北池》(「昼晷已云极，宵漏自此长」). CJK literal, en explained (ADR-0020).
 */
export const XIAZHI: FestivalContent = {
  id: 'jieqi-xiazhi',
  kind: 'jieqi',
  name: {
    'zh-Hans': '夏至',
    'zh-Hant': '夏至',
    ja: '夏至',
    en: 'Xiazhi (Summer Solstice)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十 · 白昼最长，阳极阴生',
    'zh-Hant': '二十四節氣之十 · 白晝最長，陽極陰生',
    ja: '二十四節気の第十 · 一年で最も昼が長い日',
    en: 'The 10th solar term · the longest day, yang at its peak',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '夏至三候——「一候鹿角解，二候蜩始鸣，三候半夏生」。鹿角属阳，夏至阴生而鹿角脱落；蝉（蜩）感阴气而鼓翼始鸣；喜阴的药草半夏在沼泽湿地中生长。夏至日北半球白昼最长，自此阴气渐生、昼渐短。',
      },
      {
        title: '农事',
        body: '夏至时节，「夏至不锄根边草，如同养虎来咬苗」，中耕除草、防旱排涝是田管重点。北方冬小麦收获已毕，夏播作物需保苗；南方早稻抽穗扬花、晚稻栽插，「夏至雨点值千金」，水分管理至为关键。',
      },
      {
        title: '养生',
        body: '夏至阳极阴生，中医主张「养阳护心、固护阴津」。饮食宜清淡、多苦酸（苦瓜、乌梅清心生津），慎食生冷以护脾胃。起居宜晚睡早起、午睡养心，避烈日、防中暑。情志宜静心宁神，「心静自然凉」。冬病夏治者，此时三伏将至，宜遵医调养。',
      },
      {
        title: '诗',
        body: '韦应物《夏至避暑北池》写长日炎夏：「昼晷已云极，宵漏自此长。未及施政教，所忧变炎凉。」——日影已至最长，夜漏自此渐增。诗人于北池避暑，却忧心政教未及施行、世态炎凉变迁，于节候之感中寄寓为政者的襟怀。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '夏至三候——「一候鹿角解，二候蜩始鳴，三候半夏生」。鹿角屬陽，夏至陰生而鹿角脫落；蟬（蜩）感陰氣而鼓翼始鳴；喜陰的藥草半夏在沼澤濕地中生長。夏至日北半球白晝最長，自此陰氣漸生、晝漸短。',
      },
      {
        title: '農事',
        body: '夏至時節，「夏至不鋤根邊草，如同養虎來咬苗」，中耕除草、防旱排澇是田管重點。北方冬小麥收穫已畢，夏播作物需保苗；南方早稻抽穗揚花、晚稻栽插，「夏至雨點值千金」，水分管理至為關鍵。',
      },
      {
        title: '養生',
        body: '夏至陽極陰生，中醫主張「養陽護心、固護陰津」。飲食宜清淡、多苦酸（苦瓜、烏梅清心生津），慎食生冷以護脾胃。起居宜晚睡早起、午睡養心，避烈日、防中暑。情志宜靜心寧神，「心靜自然涼」。冬病夏治者，此時三伏將至，宜遵醫調養。',
      },
      {
        title: '詩',
        body: '韋應物《夏至避暑北池》寫長日炎夏：「晝晷已云極，宵漏自此長。未及施政教，所憂變炎涼。」——日影已至最長，夜漏自此漸增。詩人於北池避暑，卻憂心政教未及施行、世態炎涼變遷，於節候之感中寄寓為政者的襟懷。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '夏至の三候——「一候 鹿角解（お）つ、二候 蜩（ひぐらし）始めて鳴く、三候 半夏生ず」。鹿の角は陽に属し、夏至に陰が生じて角が落ちる。蝉（蜩）は陰気を感じて羽を鼓して鳴き始め、陰を好む薬草の半夏が沼沢の湿地に生える。夏至の日、北半球は昼が最も長く、これより陰気が次第に生じ昼は短くなってゆく。',
      },
      {
        title: '農事',
        body: '夏至の頃、「夏至に根際の草を鋤かざれば、虎を養いて苗を噛ましむがごとし」と言い、中耕除草と旱・澇への備えが田管の要である。北方では冬小麦の収穫を終え、夏播きの作物の苗を守る。南方では早稲が穂を出して花を咲かせ、晩稲を植える。「夏至の雨点は千金に値す」、水の管理が極めて肝要となる。',
      },
      {
        title: '養生',
        body: '夏至は陽が極まり陰が生じる。漢方では「陽を養い心を護り、陰の津を固く守る」ことを説く。食は淡白に、苦と酸を多く（苦瓜・烏梅で心を清め津を生じ）、生冷を慎んで脾胃を護る。遅寝早起き、昼寝で心を養い、烈日を避けて中暑（熱中症）を防ぐ。情を静め神を寧んじ、「心静かなれば自ずから涼し」。冬の病を夏に治す者は、三伏が近づく今、医に従って調える。',
      },
      {
        title: '詩',
        body: '韋応物「夏至 北池に暑を避く」は長き日の炎暑を詠む：「昼晷（ちゅうき）已に云（ここ）に極まり、宵漏 此れより長し。未だ政教を施すに及ばず、憂うる所は炎涼の変ずるなり。」——日の影はすでに最も長く至り、夜の刻はこれより増してゆく。詩人は北池に暑を避けつつ、なお政教の行き届かぬことを憂い、世の炎涼（人情の移ろい）の変化を案じる。節候の感のうちに、為政者の襟懐を託している。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Summer Solstice: "first, the deer sheds its antlers (鹿角解); second, the cicada begins to sing (蜩始鸣); third, the pinellia herb grows (半夏生)." The deer\'s antlers, being yang, drop as yin is born at the solstice; the cicada, sensing the yin, beats its wings and starts to sing; and the shade-loving herb pinellia grows in marshy wet ground. On the solstice the northern hemisphere has its longest day; from here the yin slowly rises and the days shorten.',
      },
      {
        title: 'Farming',
        body: 'At the solstice, "Don\'t hoe the grass at the roots at Xiazhi, and it\'s like raising a tiger to bite your seedlings" — inter-row cultivation, weeding, and guarding against drought and flood are the field\'s priorities. The north has finished the winter-wheat harvest and protects its summer-sown crops; in the south early rice heads and flowers while late rice is transplanted. "A raindrop at the solstice is worth gold" — water management is everything.',
      },
      {
        title: 'Wellness',
        body: 'At the solstice the yang peaks and the yin is born, so Chinese medicine advises "nourishing the yang and protecting the heart, and firmly guarding the yin fluids." Keep the diet light, with more bitter and sour (bitter melon, dark plum to clear the heart and generate fluids), and be careful with cold raw foods to protect the spleen and stomach. Sleep late and rise early, nap to nourish the heart, avoid the fierce sun, and guard against heatstroke. Still the mind and calm the spirit — "when the heart is calm, one is naturally cool." For those treating winter ailments in summer, the dog days approach: tend yourself under a doctor\'s guidance.',
      },
      {
        title: 'Poetry',
        body: 'Wei Yingwu\'s "Escaping the Heat at North Pool on the Summer Solstice" writes the long day\'s blaze: "The sun\'s shadow has reached its farthest; / from now the night\'s water-clock runs long. / I have not yet put governance and teaching into effect — / what I fear is the turning of heat and cold." The shadow has reached its longest, the nights lengthen from here. Sheltering from the heat at North Pool, the poet still frets that good governance is undone, and worries over the world\'s shifting "heat and cold" — vesting, in a sense of the season, the conscience of one who governs.',
      },
    ],
  },
}
