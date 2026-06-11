import type { FestivalContent } from './schema'

/**
 * 大寒 — 节气 (last of the 24). Structure 物候(三候)/农事/养生/诗. 诗: 邵雍
 * 《大寒吟》(「旧雪未及消，新雪又拥户」). CJK literal, en explained (ADR-0020).
 */
export const DAHAN: FestivalContent = {
  id: 'jieqi-dahan',
  kind: 'jieqi',
  name: {
    'zh-Hans': '大寒',
    'zh-Hant': '大寒',
    ja: '大寒',
    en: 'Dahan (Greater Cold)',
  },
  tagline: {
    'zh-Hans': '二十四节气之末 · 寒之极，冬藏转春生',
    'zh-Hant': '二十四節氣之末 · 寒之極，冬藏轉春生',
    ja: '二十四節気の最後 · 一年で最も寒い極み',
    en: 'The last solar term · the depth of cold, winter turning to spring',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '大寒三候——「一候鸡始乳，二候征鸟厉疾，三候水泽腹坚」。母鸡感阳气渐回而开始孵育（「乳」即孵小鸡）；鹰隼（征鸟）盘旋高空、迅猛搏击以补御寒之能；水域冰冻至最厚最坚（「腹坚」）。大寒者，寒之极也，是二十四节气中最后一个节气。',
      },
      {
        title: '农事',
        body: '大寒虽冷，已近春耕筹备。农谚「大寒不寒，人马不安」，强调冬寒利于来年。北方继续牲畜防寒、温室管理、积肥造肥，检修农具、谋划春耕；南方加强小麦、油菜冬管，防冻保苗。大寒一过，立春将至，农事将由「藏」转「生」。',
      },
      {
        title: '养生',
        body: '大寒为隆冬之极，中医主张「温阳散寒、调补脾肾」，并为「冬藏转春生」做准备——进补宜由重转轻，可酌增升散之品（如少量葱姜）以应将至的春气。饮食宜温补固护（羊肉、鸡汤、红枣、山药、糯米），忌过食生冷。起居宜早睡晚起、严防寒邪与心脑血管病。情志宜舒畅安宁。',
      },
      {
        title: '诗',
        body: '邵雍《大寒吟》写严冬苦寒：「旧雪未及消，新雪又拥户。阶前冻银床，檐头冰钟乳。」——旧雪尚未消融，新雪又已堆拥门户；台阶前结起如银的冰床，屋檐头垂下钟乳般的冰凌。诗人以「冻银床」「冰钟乳」等意象，写尽大寒时节天寒地冻、冰封万物的极致之景。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '大寒三候——「一候雞始乳，二候征鳥厲疾，三候水澤腹堅」。母雞感陽氣漸回而開始孵育（「乳」即孵小雞）；鷹隼（征鳥）盤旋高空、迅猛搏擊以補禦寒之能；水域冰凍至最厚最堅（「腹堅」）。大寒者，寒之極也，是二十四節氣中最後一個節氣。',
      },
      {
        title: '農事',
        body: '大寒雖冷，已近春耕籌備。農諺「大寒不寒，人馬不安」，強調冬寒利於來年。北方繼續牲畜防寒、溫室管理、積肥造肥，檢修農具、謀劃春耕；南方加強小麥、油菜冬管，防凍保苗。大寒一過，立春將至，農事將由「藏」轉「生」。',
      },
      {
        title: '養生',
        body: '大寒為隆冬之極，中醫主張「溫陽散寒、調補脾腎」，並為「冬藏轉春生」做準備——進補宜由重轉輕，可酌增升散之品（如少量蔥薑）以應將至的春氣。飲食宜溫補固護（羊肉、雞湯、紅棗、山藥、糯米），忌過食生冷。起居宜早睡晚起、嚴防寒邪與心腦血管病。情志宜舒暢安寧。',
      },
      {
        title: '詩',
        body: '邵雍《大寒吟》寫嚴冬苦寒：「舊雪未及消，新雪又擁戶。階前凍銀床，簷頭冰鐘乳。」——舊雪尚未消融，新雪又已堆擁門戶；台階前結起如銀的冰床，屋簷頭垂下鐘乳般的冰凌。詩人以「凍銀床」「冰鐘乳」等意象，寫盡大寒時節天寒地凍、冰封萬物的極致之景。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '大寒の三候——「一候 鶏 始めて乳（こ）す、二候 征鳥 厲（はげ）しく疾（と）し、三候 水沢 腹堅し」。母鶏は陽気の戻りを感じて卵を孵し始め（「乳」は雛を孵すの意）、鷹隼（征鳥）は高空を翔り迅（はや）く猛々しく搏（う）って寒さに耐える力を補い、水域は最も厚く堅く凍る（「腹堅」）。大寒とは、寒さの極みであり、二十四節気の最後の節気である。',
      },
      {
        title: '農事',
        body: '大寒は寒いとはいえ、すでに春耕の備えに近い。「大寒に寒からずば、人馬安からず」と農諺に言い、冬の寒さが来年に利することを説く。北方では引き続き家畜の防寒、温室の管理、積肥造肥を行い、農具を検め春耕を謀る。南方では小麦・菜種の冬管を強め、凍えを防いで苗を護る。大寒が過ぎれば立春が近づき、農事は「蔵」から「生」へと転じる。',
      },
      {
        title: '養生',
        body: '大寒は隆冬の極みで、漢方では「陽を温め寒を散じ、脾腎を調え補う」ことを説き、「冬蔵から春生へ」の備えをする——進補は重きから軽きへ転じ、来たる春の気に応じて升散の品（少量の葱・生姜など）を酌んで加える。食は温補し固く護るもの（羊肉・鶏湯・棗・山芋・糯米）を宜とし、生冷の摂りすぎを忌む。早寝遅起きし、寒邪と心脳血管の病を厳に防ぐ。情を伸びやかに安らかに保つ。',
      },
      {
        title: '詩',
        body: '邵雍「大寒吟」は厳冬の苦寒を詠む：「旧雪 未だ消ゆるに及ばず、新雪 又た戸を擁す。階前 銀床を凍らせ、簷頭（えんとう）氷の鐘乳。」——旧い雪がまだ消えきらぬうちに、新たな雪がまた戸口を覆い塞ぐ。階の前には銀のような氷の床が張り、軒先には鐘乳石のような氷柱が垂れる。詩人は「凍れる銀床」「氷の鐘乳」の意象によって、大寒の頃の天寒地凍・万物を氷封する極致の景を写し尽くす。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Greater Cold: "first, the hen begins to brood (鸡始乳); second, the birds of prey are fierce and swift (征鸟厉疾); third, the waters freeze thick and solid (水泽腹坚)." The hen, sensing the yang\'s slow return, begins to hatch her chicks; the hawks and falcons wheel high and strike hard and fast to build the strength to bear the cold; and the waters freeze to their thickest and most solid ("solid to the center"). Greater Cold is the extreme of cold — the last of the twenty-four solar terms.',
      },
      {
        title: 'Farming',
        body: 'Cold as it is, Greater Cold already nears the preparations for spring plowing. "If Greater Cold isn\'t cold, man and beast aren\'t at ease," runs the proverb, holding that a cold winter benefits the year to come. The north keeps sheltering livestock, managing greenhouses, building manure, mending tools, and planning the spring plowing; the south steps up the winter care of wheat and rapeseed, protecting the seedlings from frost. Once Greater Cold passes, the Start of Spring is near, and farm work turns from "storing" to "growing."',
      },
      {
        title: 'Wellness',
        body: 'As the depth of midwinter, Greater Cold calls, in Chinese medicine, for "warming the yang and dispersing cold, regulating and tonifying the spleen and kidneys," and for preparing the turn from "winter storing" to "spring growth" — tonification shifts from heavy to light, with a measured addition of rising, dispersing foods (a little scallion or ginger) to meet the coming spring qi. Favor warming, protective foods (mutton, chicken soup, red dates, yam, glutinous rice) and avoid too much cold and raw. Sleep early and rise late, and strictly guard against cold and against heart and vascular trouble. Keep the mood open and calm.',
      },
      {
        title: 'Poetry',
        body: 'Shao Yong\'s "Song of Greater Cold" writes the bitter cold of deep winter: "The old snow has not finished melting, / and new snow already crowds the door. / Before the steps, an icy silver bed; / at the eaves, icicles like dripstone." Before the old snow can melt, new snow piles against the doorway; an ice-bed gleams like silver before the steps, and icicles hang like limestone dripstone from the eaves. With images of the "frozen silver bed" and "ice dripstone," the poet captures the utmost of Greater Cold — a frozen world, all things sealed in ice.',
      },
    ],
  },
}
