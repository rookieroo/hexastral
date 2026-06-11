import type { FestivalContent } from './schema'

/**
 * 冬至 — the Winter Solstice (both a 节气 and a festival). Literary centerpiece:
 * 白居易《邯郸冬至夜思家》(「想得家中夜深坐，还应说着远行人」). CJK prints the
 * quatrain literally; en pairs the original with explanation (ADR-0020).
 */
export const DONGZHI: FestivalContent = {
  id: 'dongzhi',
  kind: 'festival',
  name: {
    'zh-Hans': '冬至',
    'zh-Hant': '冬至',
    ja: '冬至',
    en: 'Winter Solstice',
  },
  tagline: {
    'zh-Hans': '一年最长夜 · 阳气始生，冬至大如年',
    'zh-Hant': '一年最長夜 · 陽氣始生，冬至大如年',
    ja: '一年で最も長い夜 · 一陽来復',
    en: 'The longest night · yang reborn, "as great as the New Year"',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '冬至是二十四节气中最早被测定的一个——周代以圭表测影，定冬至为一岁之始，曾以之为新年。「冬至大如年」之说由此而来。这一日北半球白昼最短、黑夜最长，此后阳气渐生，古人视为阴极阳回、万物复苏的转机，故有「冬至一阳生」之说。',
      },
      {
        title: '习俗',
        body: '冬至有祭祖、贺冬之礼，旧时官府放假、民间互拜，隆重不亚于年节。又有「数九」之俗——自冬至起每九日为一「九」，画九九消寒图，数尽八十一日，则春深矣。北方人围炉吃饺，南方人阖家搓圆，皆为这个转折之日添一分暖意。',
      },
      {
        title: '食',
        body: '「冬至饺子夏至面」——北方冬至必食饺子，相传纪念医圣张仲景以「祛寒娇耳汤」济民冻耳之恩。南方则食汤圆，谓之「冬至团」，取团圆添岁之意；江南有冬至吃赤豆糯米饭驱疫之俗。一碗热食落肚，是对最长寒夜的温柔抵御。',
      },
      {
        title: '诗',
        body: '白居易《邯郸冬至夜思家》写尽羁旅冬至的孤清：「邯郸驿里逢冬至，抱膝灯前影伴身。想得家中夜深坐，还应说着远行人。」——冬至本是团聚之日，诗人却独宿驿馆，抱膝灯前，唯有身影相伴。他不直说自己思家，反推想家人此刻正念叨着远行的自己，两地相思于一灯之下交叠，愈见深情。',
      },
      {
        title: '现代庆祝',
        body: '今日冬至，「吃饺子还是吃汤圆」已成南北一年一度的温情之争。一家人围坐包饺、搓圆，仍是这一夜的主题。养生者重「冬至进补」，中医有冬至艾灸、膏方之传统。数九消寒的雅趣虽渐淡，但「冬至阳生春又来」的盼头，依旧温暖着一年中最长的夜。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '冬至是二十四節氣中最早被測定的一個——周代以圭表測影，定冬至為一歲之始，曾以之為新年。「冬至大如年」之說由此而來。這一日北半球白晝最短、黑夜最長，此後陽氣漸生，古人視為陰極陽回、萬物復甦的轉機，故有「冬至一陽生」之說。',
      },
      {
        title: '習俗',
        body: '冬至有祭祖、賀冬之禮，舊時官府放假、民間互拜，隆重不亞於年節。又有「數九」之俗——自冬至起每九日為一「九」，畫九九消寒圖，數盡八十一日，則春深矣。北方人圍爐吃餃，南方人闔家搓圓，皆為這個轉折之日添一分暖意。',
      },
      {
        title: '食',
        body: '「冬至餃子夏至麵」——北方冬至必食餃子，相傳紀念醫聖張仲景以「祛寒嬌耳湯」濟民凍耳之恩。南方則食湯圓，謂之「冬至團」，取團圓添歲之意；江南有冬至吃赤豆糯米飯驅疫之俗。一碗熱食落肚，是對最長寒夜的溫柔抵禦。',
      },
      {
        title: '詩',
        body: '白居易《邯鄲冬至夜思家》寫盡羈旅冬至的孤清：「邯鄲驛裡逢冬至，抱膝燈前影伴身。想得家中夜深坐，還應說著遠行人。」——冬至本是團聚之日，詩人卻獨宿驛館，抱膝燈前，唯有身影相伴。他不直說自己思家，反推想家人此刻正念叨著遠行的自己，兩地相思於一燈之下交疊，愈見深情。',
      },
      {
        title: '現代慶祝',
        body: '今日冬至，「吃餃子還是吃湯圓」已成南北一年一度的溫情之爭。一家人圍坐包餃、搓圓，仍是這一夜的主題。養生者重「冬至進補」，中醫有冬至艾灸、膏方之傳統。數九消寒的雅趣雖漸淡，但「冬至陽生春又來」的盼頭，依舊溫暖著一年中最長的夜。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '冬至は二十四節気のうち最も早く測定された一つである——周代には圭表で日影を測り、冬至を一年の初めと定め、かつては新年とした。「冬至は年の如く大いなり」の言葉はここに由来する。この日、北半球は昼が最も短く夜が最も長い。以後、陽気が次第に生じるため、古人は陰が極まり陽が返る、万物蘇生の転機とみなし、「冬至 一陽生ず」と説いた。',
      },
      {
        title: '習俗',
        body: '冬至には祖先を祭り冬を賀する礼があり、昔は官府が休み、民間は互いに拝し合って、年節に劣らぬ盛大さであった。また「数九」の風習がある——冬至から九日ごとを一「九」とし、九九消寒図を描いて八十一日を数え尽くせば、春は深い。北方では炉を囲んで餃子を食べ、南方では一家で団子を丸める。いずれもこの転換の日に一分の温もりを添える。',
      },
      {
        title: '食',
        body: '「冬至には餃子、夏至には麺」——北方では冬至に必ず餃子を食べる。医聖・張仲景が「祛寒嬌耳湯」で民の凍えた耳を救った恩を記念するという。南方では湯圓を食べ「冬至団」と呼び、団円と一つ齢を加える意を込める。江南には冬至に赤豆の糯米飯を食べて疫を払う風習もある。熱い一椀が腹に落ちる——それは一年で最も長い寒夜への、やさしい抵抗である。',
      },
      {
        title: '詩',
        body: '白居易「邯鄲 冬至の夜 家を思う」は、旅にある冬至の孤独を描き尽くす：「邯鄲の駅裡 冬至に逢う、膝を抱きて灯前 影 身に伴う。想い得たり 家中 夜深く坐し、還た応に説くべし 遠行の人を。」——冬至は本来 団欒の日。なのに詩人は独り宿駅に泊まり、灯の前で膝を抱え、ただ己の影だけが伴う。自らの郷愁を直に言わず、家族が今ごろ遠く旅する自分を噂していようと推し量る。二つの地の思いが一つの灯の下で重なり、情の深さがいっそう際立つ。',
      },
      {
        title: '現代の祝い方',
        body: '今日の冬至、「餃子か、それとも湯圓か」は南北の年に一度の心温まる論争となっている。一家で囲んで餃子を包み団子を丸めるのが、なおこの夜の主題である。養生を重んじる人は「冬至の進補」を大切にし、漢方には冬至の灸や膏方の伝統がある。数九消寒の風雅は薄れつつあるが、「冬至に陽生じ 春また来たる」という希望は、今も一年で最も長い夜を温め続けている。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'The Winter Solstice was the earliest of the 24 solar terms to be fixed — in the Zhou dynasty, measuring the sun\'s shadow with a gnomon, astronomers set the solstice as the start of the year, and it once served as New Year. Hence the saying, "the Winter Solstice is as great as the New Year." On this day the northern hemisphere has its shortest daylight and longest night; thereafter the yang force slowly returns, and the ancients saw it as the turning point where yin reaches its limit and yang revives — "at the Winter Solstice, the first yang is born."',
      },
      {
        title: 'Customs',
        body: 'The solstice had rites of ancestor worship and "congratulating the winter"; in old times officials took leave and people paid each other visits, with a solemnity rivaling New Year. There is also the custom of "counting the nines" — from the solstice, each nine days form one "nine," and a "nine-nines cold-dispelling chart" is filled in; when all eighty-one days are counted off, spring is deep. Northerners gather round the stove for dumplings, southerners roll rice balls as a family — each adding a measure of warmth to this day of turning.',
      },
      {
        title: 'Food',
        body: '"Dumplings at the Winter Solstice, noodles at the Summer Solstice." In the north, dumplings are a must, said to honor the physician-sage Zhang Zhongjing, who relieved the people\'s frostbitten ears with his "cold-dispelling tender-ear soup." The south eats 汤圆, the "solstice reunion balls," for togetherness and the adding of a year; the lower Yangtze has a custom of red-bean glutinous rice to drive off pestilence. A bowl of hot food settling in the belly is a gentle defense against the longest cold night of the year.',
      },
      {
        title: 'Poetry',
        body: 'Bai Juyi\'s "Thinking of Home on the Winter Solstice Night at Handan" captures the loneliness of the solstice on the road: "At the Handan post-house I meet the Winter Solstice; / I hug my knees before the lamp, my shadow my only company. / I imagine them at home, sitting late into the night, / still talking, surely, of the one who travels far." The solstice is a day for reunion, yet the poet lodges alone at a post-station, knees drawn up by the lamp, only his shadow beside him. He does not say outright that he misses home; instead he imagines his family at this very hour speaking of him, far away — two places of longing overlapping under one lamp, the deeper for it.',
      },
      {
        title: 'Modern celebration',
        body: 'Today, "dumplings or rice balls?" has become a yearly, good-natured north-south debate. Gathering as a family to fold dumplings and roll rice balls is still the night\'s theme. Those who mind their health prize "solstice tonic-taking," and Chinese medicine keeps traditions of solstice moxibustion and herbal pastes. The refined pastime of counting the nines has faded, but the hope that "at the solstice yang is born, and spring comes again" still warms the longest night of the year.',
      },
    ],
  },
}
