import type { FestivalContent } from './schema'

/**
 * 重阳 — the Double Ninth Festival. Literary centerpiece: 王维《九月九日忆山东兄弟》
 * (「独在异乡为异客，每逢佳节倍思亲」). CJK prints the quatrain literally; en pairs
 * the original with explanation + a sense gloss (ADR-0020).
 */
export const CHONGYANG: FestivalContent = {
  id: 'chongyang',
  kind: 'festival',
  name: {
    'zh-Hans': '重阳',
    'zh-Hant': '重陽',
    ja: '重陽節',
    en: 'Double Ninth Festival',
  },
  tagline: {
    'zh-Hans': '农历九月初九 · 登高望远，敬老怀亲',
    'zh-Hant': '農曆九月初九 · 登高望遠，敬老懷親',
    ja: '農暦九月九日 · 高きに登り、長寿を祈る',
    en: 'Lunar 9/9 · climbing high, honoring elders',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '重阳为农历九月初九，《易经》以九为阳数，双九相重，故名「重阳」。其俗源于先秦的秋季祭祀与避灾——相传东汉桓景从费长房之嘱，于九月九日携家登高、佩茱萸、饮菊花酒以避瘟疫，遂成登高之始。九与「久」谐音，重阳又含长寿之祈。',
      },
      {
        title: '习俗',
        body: '登高、赏菊、佩茱萸、饮菊花酒，是重阳四事。登高既为避灾，也为极目秋光、舒展胸怀；茱萸辟邪，菊花延年。古人视九九为长久之兆，故重阳自古便与敬老、祈寿相连。',
      },
      {
        title: '食',
        body: '重阳食「重阳糕」——以米粉蒸制，层叠如塔，插小旗、缀枣栗，取「步步登高」之意。菊花酒则以菊花、糯米、酒曲酿成，清苦回甘，古人信其明目延年。一糕一酒，是秋日里对康健长寿的朴素祝祷。',
      },
      {
        title: '诗',
        body: '王维《九月九日忆山东兄弟》是重阳怀人的千古名篇：「独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。」——时年十七、客居长安的王维，不写自己思乡，反想家中兄弟登高时独缺自己一人，从对面着笔，思念愈显深婉。「每逢佳节倍思亲」一句，道尽天下游子之心。',
      },
      {
        title: '现代庆祝',
        body: '1989 年起，重阳被定为中国「老人节」（敬老节），2013 年《老年人权益保障法》更将其入法。今日重阳，登高秋游、为长辈尽孝成为主调，社区多办敬老活动。古老的避灾之节，在现代转身为一个关于陪伴与感恩的日子。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '重陽為農曆九月初九，《易經》以九為陽數，雙九相重，故名「重陽」。其俗源於先秦的秋季祭祀與避災——相傳東漢桓景從費長房之囑，於九月九日攜家登高、佩茱萸、飲菊花酒以避瘟疫，遂成登高之始。九與「久」諧音，重陽又含長壽之祈。',
      },
      {
        title: '習俗',
        body: '登高、賞菊、佩茱萸、飲菊花酒，是重陽四事。登高既為避災，也為極目秋光、舒展胸懷；茱萸辟邪，菊花延年。古人視九九為長久之兆，故重陽自古便與敬老、祈壽相連。',
      },
      {
        title: '食',
        body: '重陽食「重陽糕」——以米粉蒸製，層疊如塔，插小旗、綴棗栗，取「步步登高」之意。菊花酒則以菊花、糯米、酒麴釀成，清苦回甘，古人信其明目延年。一糕一酒，是秋日裡對康健長壽的樸素祝禱。',
      },
      {
        title: '詩',
        body: '王維《九月九日憶山東兄弟》是重陽懷人的千古名篇：「獨在異鄉為異客，每逢佳節倍思親。遙知兄弟登高處，遍插茱萸少一人。」——時年十七、客居長安的王維，不寫自己思鄉，反想家中兄弟登高時獨缺自己一人，從對面著筆，思念愈顯深婉。「每逢佳節倍思親」一句，道盡天下遊子之心。',
      },
      {
        title: '現代慶祝',
        body: '1989 年起，重陽被定為中國「老人節」（敬老節），2013 年《老年人權益保障法》更將其入法。今日重陽，登高秋遊、為長輩盡孝成為主調，社區多辦敬老活動。古老的避災之節，在現代轉身為一個關於陪伴與感恩的日子。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '重陽は旧暦九月九日。『易経』は九を陽の数とし、九が二つ重なるゆえ「重陽」と呼ぶ。その風習は先秦の秋の祭祀と厄除けに発する——後漢の桓景が費長房の戒めに従い、九月九日に家族を連れて高きに登り、茱萸（しゅゆ）を佩び、菊花酒を飲んで疫を避けたのが登高の始まりと伝えられる。九は「久」に通じ、重陽は長寿の祈りをも帯びる。',
      },
      {
        title: '習俗',
        body: '登高（高きに登る）、菊を愛で、茱萸を佩び、菊花酒を飲む——これが重陽の四事である。登高は厄を避けるためであり、また秋の眺めに目を放ち胸を広げるためでもある。茱萸は邪を払い、菊は齢を延ばすとされた。古人は九九を「久しき」吉兆とみなし、重陽は古来、敬老と長寿の祈りに結びついてきた。',
      },
      {
        title: '食',
        body: '重陽には「重陽糕」を食べる——米粉を蒸して塔のように層を重ね、小旗を挿し棗や栗を散らして「一歩ずつ高く登る」意を託す。菊花酒は菊と糯米と麹で醸し、ほろ苦く後に甘い。古人はこれを目を明らかにし齢を延ばすものと信じた。一つの糕、一杯の酒に、秋の日の健やかさと長寿への素朴な祈りがこもる。',
      },
      {
        title: '詩',
        body: '王維「九月九日 山東の兄弟を憶う」は、重陽に人を思う千古の名篇：「独り異郷に在りて異客と為り、佳節に逢う毎に倍して親を思う。遥かに知る 兄弟 高きに登る処、遍く茱萸を挿して一人を少（か）くを。」——時に十七歳、長安に客居した王維は、自らの郷愁を直に書かず、故郷の兄弟が登高するとき独り自分だけが欠けていようと、向こう側から筆を起こす。「佳節に逢う毎に倍して親を思う」の一句は、天下の旅人の心を言い尽くしている。',
      },
      {
        title: '現代の祝い方',
        body: '1989年以降、重陽は中国の「老人節（敬老の日）」と定められ、2013年には「高齢者権益保障法」がこれを法に明記した。今日の重陽は、秋の登山行楽と年長者への孝行が主旋律となり、地域では敬老の催しが多く開かれる。古き厄除けの節句は、現代において、寄り添いと感謝をめぐる一日へと姿を変えた。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'The Double Ninth falls on the ninth day of the ninth lunar month; the Book of Changes counts nine as a yang number, and with two nines doubled the day is named 重阳, "double yang." Its customs descend from autumn sacrifices and warding-off rites of the pre-Qin era. By tradition, Huan Jing of the Eastern Han, heeding his master Fei Changfang, led his family up a height on the ninth day, wore dogwood sprigs, and drank chrysanthemum wine to escape a plague — the origin of the climb. Because 九 ("nine") echoes 久 ("long-lasting"), the day also carries a wish for long life.',
      },
      {
        title: 'Customs',
        body: "Climbing to a height, admiring chrysanthemums, wearing dogwood, and drinking chrysanthemum wine are the four observances of the Double Ninth. The climb is both to escape misfortune and to cast one's gaze over the autumn vista and open the heart; dogwood wards off evil, chrysanthemum prolongs life. The ancients read the doubled nine as an omen of endurance, so the day has always been tied to honoring elders and praying for longevity.",
      },
      {
        title: 'Food',
        body: 'The Double Ninth food is 重阳糕 — steamed rice-flour cake, stacked in tower-like layers, stuck with little flags and studded with dates and chestnuts, carrying the sense of "rising step by step." Chrysanthemum wine is brewed from chrysanthemum, glutinous rice, and yeast — faintly bitter, sweet on the finish — which the ancients believed brightened the eyes and lengthened life. A cake and a cup hold autumn\'s plain prayer for health and long years.',
      },
      {
        title: 'Poetry',
        body: 'Wang Wei\'s "Thinking of My Brothers in Shandong on the Double Ninth" is the timeless poem of longing for kin: "Alone, a stranger in a strange land, / at each festival I think of my family twice as much. / From afar I know my brothers climb the height, / and each plants dogwood — with one man missing." Seventeen and living as a guest in Chang\'an, Wang Wei writes not of his own homesickness but imagines his brothers on the climb, the one absent being himself — beginning from the far side, so the longing deepens. The line "at each festival I think of my family twice as much" speaks the heart of every traveler far from home.',
      },
      {
        title: 'Modern celebration',
        body: "Since 1989 the Double Ninth has been China's \"Seniors' Day,\" and in 2013 the Law on Protection of the Rights of the Elderly wrote it into statute. Today the day's main themes are autumn climbs and acts of filial care, with community events honoring elders. The ancient festival of warding off misfortune has turned, in modern times, into a day about companionship and gratitude.",
      },
    ],
  },
}
