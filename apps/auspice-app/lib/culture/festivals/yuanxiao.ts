import type { FestivalContent } from './schema'

/**
 * 元宵 — the Lantern Festival. Literary centerpiece: 辛弃疾《青玉案·元夕》
 * (「众里寻他千百度，蓦然回首，那人却在，灯火阑珊处」). CJK prints the lines
 * literally; en pairs the original with explanation + a sense gloss (ADR-0020).
 */
export const YUANXIAO: FestivalContent = {
  id: 'yuanxiao',
  kind: 'festival',
  name: {
    'zh-Hans': '元宵',
    'zh-Hant': '元宵',
    ja: '元宵節',
    en: 'Lantern Festival',
  },
  tagline: {
    'zh-Hans': '农历正月十五 · 灯火阑珊，年的尾声',
    'zh-Hant': '農曆正月十五 · 燈火闌珊，年的尾聲',
    ja: '農暦正月十五日 · 灯籠の夜、年の名残',
    en: 'Lunar 1/15 · lanterns, and the close of the New Year',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '元宵为农历正月十五，是新年第一个月圆之夜，故称「上元节」「灯节」。其源可溯至汉代——汉明帝为弘扬佛法，敕令正月十五燃灯敬佛，民间张灯之俗渐成。道教以正月十五为「上元」，天官赐福之日。唐代灯会盛极，宋代更增猜灯谜之趣，元宵遂成春节的压轴。',
      },
      {
        title: '习俗',
        body: '赏花灯、猜灯谜、舞龙舞狮、踏月行歌。古时元宵是少有的「夜禁」开放之夜，男女得以结伴出游，故又含几分情人节的意味——「月上柳梢头，人约黄昏后」。北方滚元宵，南方包汤圆，一家团坐，年味在这一夜画上圆满句点。',
      },
      {
        title: '食',
        body: '元宵与汤圆是这一夜的主角。北方「滚」元宵——馅料在糯米粉中反复滚沾成球；南方「包」汤圆——湿糯米粉裹馅搓圆。皮糯馅甜（芝麻、豆沙、花生），煮于沸水，浮起即熟。一碗圆子，取「团团圆圆」之意。',
      },
      {
        title: '诗',
        body: '辛弃疾《青玉案·元夕》写尽元宵灯夜：「东风夜放花千树，更吹落、星如雨……众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。」——满城灯火、宝马香车之间，词人偏寻那立于幽暗处的伊人。王国维以「灯火阑珊」一句喻人生治学的最高境界。元宵的繁华与孤照，都在这二十余字里。',
      },
      {
        title: '现代庆祝',
        body: '今日元宵，各地仍办灯会——自贡灯会、秦淮灯会蔚为大观，冰灯、电子灯与传统纸灯并陈。猜灯谜移师线上，舞龙舞狮登上晚会舞台。汤圆则进入速冻货架，四时可得。元宵一过，年才算真正过完，人们收拾心绪，重返各自的奔忙。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '元宵為農曆正月十五，是新年第一個月圓之夜，故稱「上元節」「燈節」。其源可溯至漢代——漢明帝為弘揚佛法，敕令正月十五燃燈敬佛，民間張燈之俗漸成。道教以正月十五為「上元」，天官賜福之日。唐代燈會盛極，宋代更增猜燈謎之趣，元宵遂成春節的壓軸。',
      },
      {
        title: '習俗',
        body: '賞花燈、猜燈謎、舞龍舞獅、踏月行歌。古時元宵是少有的「夜禁」開放之夜，男女得以結伴出遊，故又含幾分情人節的意味——「月上柳梢頭，人約黃昏後」。北方滾元宵，南方包湯圓，一家團坐，年味在這一夜畫上圓滿句點。',
      },
      {
        title: '食',
        body: '元宵與湯圓是這一夜的主角。北方「滾」元宵——餡料在糯米粉中反覆滾沾成球；南方「包」湯圓——濕糯米粉裹餡搓圓。皮糯餡甜（芝麻、豆沙、花生），煮於沸水，浮起即熟。一碗圓子，取「團團圓圓」之意。',
      },
      {
        title: '詩',
        body: '辛棄疾《青玉案·元夕》寫盡元宵燈夜：「東風夜放花千樹，更吹落、星如雨……眾裡尋他千百度，驀然回首，那人卻在，燈火闌珊處。」——滿城燈火、寶馬香車之間，詞人偏尋那立於幽暗處的伊人。王國維以「燈火闌珊」一句喻人生治學的最高境界。元宵的繁華與孤照，都在這二十餘字裡。',
      },
      {
        title: '現代慶祝',
        body: '今日元宵，各地仍辦燈會——自貢燈會、秦淮燈會蔚為大觀，冰燈、電子燈與傳統紙燈並陳。猜燈謎移師線上，舞龍舞獅登上晚會舞台。湯圓則進入速凍貨架，四時可得。元宵一過，年才算真正過完，人們收拾心緒，重返各自的奔忙。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '元宵節は旧暦正月十五日、新年最初の満月の夜であり、「上元節」「灯節」とも呼ばれる。漢代、明帝が仏法を広めるため正月十五日に灯をともして仏を敬うよう命じ、民間の張り灯の風習が育った。道教では正月十五日を「上元」、天官が福を賜う日とする。唐代に灯籠会が栄え、宋代には謎かけ（灯謎）の興が加わり、元宵は春節を締めくくる日となった。',
      },
      {
        title: '習俗',
        body: '灯籠を愛で、謎を解き、龍舞・獅子舞に興じ、月下を歩む。古来、元宵は数少ない「夜間外出の許される夜」であり、男女が連れ立って出歩けたことから、いささか恋の節句の趣も帯びた——「月は柳の梢に上り、人は黄昏に逢う」。北方では元宵を転がして作り、南方では湯圓を包む。一家団欒のうちに、年の名残はこの夜に円い句点を打つ。',
      },
      {
        title: '食',
        body: '元宵と湯圓がこの夜の主役。北方では餡を糯米粉の中で転がして球にし、南方では湿った糯米粉で餡を包んで丸める。もちもちの皮に甘い餡（胡麻・小豆・落花生）、熱湯で煮て浮き上がれば出来上がり。一椀の団子に「団団円円（まどか）」の願いを込める。',
      },
      {
        title: '詩',
        body: '辛棄疾「青玉案・元夕」は元宵の灯火の夜を描き尽くす：「東風夜に放つ花千樹、更に吹き落とす、星雨の如し……衆裡に彼を尋ぬること千百度、驀然と首を回らせば、その人は却って在り、灯火闌珊たる処。」——満城の灯、宝馬香車のただ中で、詞人はあえて暗がりに佇む人を探す。王国維はこの「灯火闌珊」の一句を、学問・人生の最高の境地に喩えた。元宵の華やぎと孤独な灯が、この二十数字に凝縮されている。',
      },
      {
        title: '現代の祝い方',
        body: '今日も各地で灯籠会が開かれる——自貢灯会や秦淮灯会は壮観で、氷の灯籠や電飾と伝統の紙灯籠が並ぶ。謎解きはオンラインへ移り、龍舞・獅子舞は祝祭の舞台に上がる。湯圓は冷凍食品として年中手に入る。元宵が過ぎて、ようやく年は本当に明け、人々は気持ちを整えてそれぞれの日常へ戻ってゆく。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'The Lantern Festival falls on the 15th day of the first lunar month — the first full moon of the new year, hence its other names, the "Upper Prime" (上元) and the "Festival of Lanterns." Tradition traces it to the Han dynasty, when Emperor Ming, to honor the Buddha, ordered lanterns lit on this night; the popular custom of lantern displays grew from there. Daoism marks the day as 上元, when the Official of Heaven bestows blessings. Lantern fairs flourished under the Tang (618-907), and the Song (960-1279) added the riddle game — making the festival the finale of the New Year season.',
      },
      {
        title: 'Customs',
        body: 'People admire lanterns, guess lantern riddles, watch dragon and lion dances, and stroll under the moon. In old times this was one of the rare nights the curfew lifted, so young men and women could go out together — lending the festival a quiet romance: "The moon climbs the willow tops; lovers meet at dusk." Northerners roll 元宵, southerners wrap 汤圆; the family sits together, and the year comes to a round, whole close on this night.',
      },
      {
        title: 'Food',
        body: "元宵 and 汤圆 — glutinous rice balls — are the night's centerpiece. In the north the filling is rolled in dry glutinous flour until it builds into a ball; in the south wet glutinous dough is wrapped around the filling and rounded by hand. Chewy skins, sweet fillings (sesame, red bean, peanut), boiled until they float. A bowl of round dumplings carries the wish for 团圆 — reunion, wholeness.",
      },
      {
        title: 'Poetry',
        body: 'Xin Qiji\'s "Green Jade Cup: Lantern Night" captures the festival\'s blaze: "The east wind by night opens a thousand trees of flowers, / and blows the stars down like rain… / Among the crowd I sought her a thousand times; / then I turned my head — / and there she stood, where the lights were guttering low." Amid the whole city\'s lanterns and perfumed carriages, the poet seeks instead the one who waits in the dimness. The scholar Wang Guowei took that final image — 灯火阑珊, "where the lanterns burn low" — as a metaphor for the highest stage of learning and of life. The festival\'s splendor and its solitary glow both live in these few lines.',
      },
      {
        title: 'Modern celebration',
        body: 'Lantern fairs still light up cities across China — the Zigong and Qinhuai fairs are spectacular, ice lanterns and LED displays standing beside traditional paper ones. Riddle-guessing has moved online; dragon and lion dances headline gala stages. 汤圆 now sit year-round in supermarket freezers. Only once the Lantern Festival passes is the New Year truly over — and people gather themselves and return to their separate busy lives.',
      },
    ],
  },
}
