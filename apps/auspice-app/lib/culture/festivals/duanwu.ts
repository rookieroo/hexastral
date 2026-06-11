import type { FestivalContent } from './schema'

/**
 * 端午 — the literary entry. The founder's brief (2026-06): seed the culture
 * guide with genuine 文学 material; 端午 carries 屈原's 《离骚》.
 *
 * Locale principle (ADR-0020): the CJK locales print the 离骚 lines LITERALLY
 * (the classical text is the value — translating it would flatten it). The en
 * locale does NOT poeticize a translation; it prints the original line and pairs
 * it with an English EXPLANATION of meaning + context (屈原 / the seeking spirit).
 *
 * Attribution care: 长太息以掩涕兮 / 路漫漫其修远兮 / 亦余心之所善兮 are all from
 * 《离骚》 itself (NOT 《渔父》's 举世皆浊 — a common misattribution we avoid).
 */
export const DUANWU: FestivalContent = {
  id: 'duanwu',
  kind: 'festival',
  name: {
    'zh-Hans': '端午',
    'zh-Hant': '端午',
    ja: '端午の節句',
    en: 'Dragon Boat Festival',
  },
  tagline: {
    'zh-Hans': '农历五月初五 · 龙舟竞渡，以诗祭忠魂',
    'zh-Hant': '農曆五月初五 · 龍舟競渡，以詩祭忠魂',
    ja: '農暦五月五日 · 龍舟と詩人を悼む日',
    en: 'Lunar 5/5 · dragon boats, and a poet remembered',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '端午本是上古的祛病防疫之节——农历五月被古人视为「恶月」，五日为「恶日」，故有沐兰汤、挂艾草、佩香囊以避瘟驱邪的古俗。战国之后，端午渐与楚国诗人屈原相系：屈原名平，事楚怀王，主张联齐抗秦，屡遭谗放，眼见郢都陷落，于五月初五自投汨罗江。乡人荡舟相救、投粽喂鱼以全其身，遂成龙舟与粽子之源。一个驱疫的古节，自此叠上了一层家国与忠贞的重量。',
      },
      {
        title: '习俗',
        body: '赛龙舟为端午之最盛——百桨齐发、鼓声裂水，既是竞渡，也是对屈原「招魂」的古意。门楣插艾草、菖蒲以辟秽，孩童佩五彩丝线与香囊，成人饮雄黄酒、点额画「王」字驱五毒。江南有「躲端午」「画额」之俗，岭南有扒龙船、抢青之风，南北各异而辟邪祈安之心相同。',
      },
      {
        title: '食',
        body: '粽子是端午的灵魂——箬叶裹糯米，扎以麻线，蒸煮而成。咸甜之争由来已久：嘉兴鲜肉粽、广式蛋黄咸肉粽以咸为尊；北方红枣豆沙、嘉湖细点则以甜见长。佐以雄黄酒、五黄（黄鱼、黄瓜、咸蛋黄、黄鳝、雄黄酒）应「五月五」之数，取「以黄克毒」之意。',
      },
      {
        title: '诗',
        body: '端午所祭，是中国第一位留下姓名的伟大诗人屈原，其《离骚》为辞赋之祖。「长太息以掩涕兮，哀民生之多艰」——忧的是苍生而非一己；「亦余心之所善兮，虽九死其犹未悔」——守的是本心，纵死无悔；而「路漫漫其修远兮，吾将上下而求索」一句，两千余年来已成为一切寻路者的箴言。端午食粽、竞渡之外，读一篇《离骚》，方见这个节日的脊骨。',
      },
      {
        title: '现代庆祝',
        body: '端午是中国法定假日，2009 年「中国端午节」入选联合国教科文组织人类非物质文化遗产，为中国首个入选的节日。龙舟竞渡已成国际赛事，香港、新加坡、北美华埠皆有龙舟会；粽子则从节令食品延伸为礼盒经济，冰粽、低糖粽、文创联名层出不穷。校园里，端午也常作为诵读屈原、亲近古典的契机。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '端午本是上古的袪病防疫之節——農曆五月被古人視為「惡月」，五日為「惡日」，故有沐蘭湯、掛艾草、佩香囊以避瘟驅邪的古俗。戰國之後，端午漸與楚國詩人屈原相繫：屈原名平，事楚懷王，主張聯齊抗秦，屢遭讒放，眼見郢都陷落，於五月初五自投汨羅江。鄉人盪舟相救、投粽餵魚以全其身，遂成龍舟與粽子之源。一個驅疫的古節，自此疊上了一層家國與忠貞的重量。',
      },
      {
        title: '習俗',
        body: '賽龍舟為端午之最盛——百槳齊發、鼓聲裂水，既是競渡，也是對屈原「招魂」的古意。門楣插艾草、菖蒲以辟穢，孩童佩五彩絲線與香囊，成人飲雄黃酒、點額畫「王」字驅五毒。江南有「躲端午」「畫額」之俗，嶺南有扒龍船、搶青之風，南北各異而辟邪祈安之心相同。',
      },
      {
        title: '食',
        body: '粽子是端午的靈魂——箬葉裹糯米，紮以麻線，蒸煮而成。鹹甜之爭由來已久：嘉興鮮肉粽、廣式蛋黃鹹肉粽以鹹為尊；北方紅棗豆沙、嘉湖細點則以甜見長。佐以雄黃酒、五黃（黃魚、黃瓜、鹹蛋黃、黃鱔、雄黃酒）應「五月五」之數，取「以黃克毒」之意。',
      },
      {
        title: '詩',
        body: '端午所祭，是中國第一位留下姓名的偉大詩人屈原，其《離騷》為辭賦之祖。「長太息以掩涕兮，哀民生之多艱」——憂的是蒼生而非一己；「亦余心之所善兮，雖九死其猶未悔」——守的是本心，縱死無悔；而「路漫漫其修遠兮，吾將上下而求索」一句，兩千餘年來已成為一切尋路者的箴言。端午食粽、競渡之外，讀一篇《離騷》，方見這個節日的脊骨。',
      },
      {
        title: '現代慶祝',
        body: '端午是中國法定假日，2009 年「中國端午節」入選聯合國教科文組織人類非物質文化遺產，為中國首個入選的節日。龍舟競渡已成國際賽事，香港、新加坡、北美華埠皆有龍舟會；粽子則從節令食品延伸為禮盒經濟，冰粽、低糖粽、文創聯名層出不窮。校園裡，端午也常作為誦讀屈原、親近古典的契機。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '端午はもともと古代の厄除け・防疫の節句であった。旧暦五月は「悪月」、五日は「悪日」とされ、菖蒲湯に浸かり、艾（よもぎ）を掛け、香袋を佩びて疫を払う風習があった。戦国以降、端午は楚の詩人・屈原と結びつく。屈原は楚の懐王に仕え、斉と結んで秦に抗するよう説いたが讒言により退けられ、都の陥落を見て五月五日、汨羅江に身を投じた。里人が舟を漕いで救おうとし、粽を投げて魚から遺骸を守った——これが龍舟と粽の起源とされる。',
      },
      {
        title: '習俗',
        body: '龍舟競漕が端午の華である。百の櫂が一斉に水を打ち、太鼓が川面を裂く——競技であると同時に、屈原の魂を呼ぶ「招魂」の儀でもある。門口に艾と菖蒲を挿して邪を払い、子どもは五色の糸と香袋を佩び、大人は雄黄酒を飲み額に「王」の字を描いて五毒を退けた。地方ごとに様式は異なるが、邪を払い安寧を祈る心は南北で一つである。',
      },
      {
        title: '食',
        body: '粽（ちまき）は端午の主役。竹の葉で糯米を包み、麻紐で結んで蒸し上げる。塩味と甘味の論争は古くからあり、嘉興の鮮肉粽や広東式の卵黄入り塩肉粽は塩派、北方の棗・小豆餡は甘派を代表する。雄黄酒や「五黄」（黄魚・胡瓜・塩漬け卵黄・黄鱔・雄黄酒）を「五月五」の数に合わせて供し、毒を制すると説いた。',
      },
      {
        title: '詩',
        body: '端午が悼むのは、中国で初めて名を残した偉大な詩人・屈原であり、その『離騒』は辞賦の祖と仰がれる。「長太息以掩涕兮、哀民生之多艱」——憂えたのは己ではなく民の苦しみ。「亦余心之所善兮、雖九死其猶未悔」——本心を守り、九たび死すとも悔いなし。そして「路漫漫其修遠兮、吾将上下而求索」の一句は、二千余年にわたり道を求めるすべての人の箴言となった。粽と競漕の傍ら、『離騒』を一篇読むとき、この節句の背骨が見えてくる。',
      },
      {
        title: '現代の祝い方',
        body: '端午は中国の法定祝日で、2009 年に「中国端午節」がユネスコ無形文化遺産に登録された（中国の節句として初）。龍舟競漕は国際大会に発展し、香港・シンガポール・北米の華人街でも龍舟会が開かれる。粽は節句食品から贈答経済へと広がり、氷粽や低糖粽、コラボ商品も次々登場する。学校では、屈原を朗読し古典に親しむ機会ともなっている。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'The Dragon Boat Festival began as an ancient day of warding off pestilence — the fifth lunar month was deemed a "noxious month" and its fifth day a "noxious day," so people bathed in iris-and-mugwort water, hung mugwort over the door, and wore fragrant sachets to repel illness. After the Warring States period it became bound to the poet Qu Yuan (c. 340-278 BCE) of Chu. A minister who urged alliance with Qi against Qin, Qu Yuan was slandered into exile; when his capital fell, he drowned himself in the Miluo River on the fifth day of the fifth month. Villagers raced their boats to save him and threw rice dumplings into the water to keep the fish from his body — the origin, by tradition, of the dragon boats and the zongzi.',
      },
      {
        title: 'Customs',
        body: 'Dragon-boat racing is the festival\'s heart: scores of paddles strike the water as one, drums splitting the river — both a contest and an echo of the ancient rite of "summoning the soul" of Qu Yuan. Households hang mugwort and calamus at the door to drive off the unclean; children wear five-colored threads and scented sachets; adults drink realgar wine and paint the character 王 ("king") on a child\'s brow to repel the "five poisons." Regional forms differ across north and south, but the wish — to ward off harm and pray for safety — is shared.',
      },
      {
        title: 'Food',
        body: 'Zongzi are the soul of the festival — glutinous rice wrapped in bamboo or reed leaves, tied with twine, and steamed. The savory-versus-sweet debate is old: Jiaxing pork zongzi and Cantonese salted-egg-yolk zongzi lead the savory camp, while northern red-date and red-bean fillings lead the sweet. They are paired with realgar wine and the "five yellows" (yellow croaker, cucumber, salted egg yolk, eel, realgar wine) to match the "double fifth," in the old belief that yellow subdues poison.',
      },
      {
        title: 'Poetry',
        body: 'The festival honors Qu Yuan, the first great poet in China to leave his name, whose 《离骚》 (Li Sao, "Encountering Sorrow") is the fountainhead of the 辞赋 tradition. 「长太息以掩涕兮，哀民生之多艰」 — he wept not for himself but for the hardship of the people. 「亦余心之所善兮，虽九死其犹未悔」 — what his heart holds good, he will not repent of, "though I die nine times." And one line above all, 「路漫漫其修远兮，吾将上下而求索」 — "The road ahead is long and far; I will seek up and down for it" — has been, for over two thousand years, the watchword of everyone who searches for a way. Beyond the dumplings and the races, to read a passage of the Li Sao is to find the festival\'s backbone. (The lines are given in the original; a literal rendering can carry their sense, but not the cadence of the 骚体.)',
      },
      {
        title: 'Modern celebration',
        body: 'Dragon Boat is a statutory holiday in China, and in 2009 the "Dragon Boat Festival" was inscribed on UNESCO\'s list of Intangible Cultural Heritage — the first Chinese festival so recognized. Dragon-boat racing is now an international sport, with regattas in Hong Kong, Singapore, and Chinatowns across North America. Zongzi have grown from seasonal food into a gift-box economy, with iced and low-sugar versions and brand collaborations appearing each year. In schools, the festival often doubles as an occasion to recite Qu Yuan and return to the classics.',
      },
    ],
  },
}
