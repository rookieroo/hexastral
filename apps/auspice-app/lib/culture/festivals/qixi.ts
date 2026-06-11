import type { FestivalContent } from './schema'

/**
 * 七夕 — the Qixi (Cowherd-and-Weaver-Girl) Festival. Literary centerpiece:
 * 秦观《鹊桥仙》(「金风玉露一相逢，便胜却人间无数……两情若是久长时，又岂在朝朝暮暮」).
 * CJK prints the lyric literally; en pairs the original with explanation (ADR-0020).
 */
export const QIXI: FestivalContent = {
  id: 'qixi',
  kind: 'festival',
  name: {
    'zh-Hans': '七夕',
    'zh-Hant': '七夕',
    ja: '七夕',
    en: 'Qixi Festival',
  },
  tagline: {
    'zh-Hans': '农历七月初七 · 鹊桥相会，乞巧穿针',
    'zh-Hant': '農曆七月初七 · 鵲橋相會，乞巧穿針',
    ja: '農暦七月七日 · 鵲橋の逢瀬、巧を乞う夜',
    en: 'Lunar 7/7 · the magpie bridge, and the begging of skill',
  },
  sections: {
    'zh-Hans': [
      {
        title: '历史',
        body: '七夕为农历七月初七，源于牛郎织女的星宿传说。织女星与牵牛星隔银河相望，民间演为一对被天河阻隔、每年七夕由喜鹊搭桥一会的恋人。汉代已有「穿针乞巧」之俗，魏晋南北朝渐盛，七夕遂成女儿祈巧、情侣盼聚的节日，被称为中国的「情人节」。',
      },
      {
        title: '习俗',
        body: '七夕以「乞巧」为名——女子于月下穿针引线、陈瓜果以拜织女，祈求心灵手巧、姻缘美满。又有「喜蛛应巧」「投针验巧」等占验之戏。情侣则以这一夜寄相思，盼如牛女鹊桥之会。一针一线之间，是旧时女子对才情与良缘的双重期许。',
      },
      {
        title: '食',
        body: '七夕应节食「巧果」——以面粉和糖油炸或烘制，捏作花样，取「乞巧」之意。各地又有吃巧芽面、酥糖（「巧人」「巧酥」）之俗。瓜果亦不可少，陈于庭中以飨织女。甜脆的巧果，是这个柔软节日的味觉注脚。',
      },
      {
        title: '诗',
        body: '秦观《鹊桥仙》是七夕词的绝唱：「纤云弄巧，飞星传恨，银汉迢迢暗度。金风玉露一相逢，便胜却人间无数……两情若是久长时，又岂在朝朝暮暮。」——他不叹一年一会之苦，反以「金风玉露」之逢胜过人间长相厮守，末句更将爱情升华为对「久长」的信念。哀怨的牛女传说，被这首词点化出旷世的豁达。',
      },
      {
        title: '现代庆祝',
        body: '今日七夕已成名副其实的「中国情人节」，鲜花、礼物、烛光晚餐与西式情人节并行而各擅其美。商家借势促销，年轻人则更愿回望牛郎织女的古典浪漫。一些地方复兴乞巧手作、汉服祈巧之俗，让星河传说在霓虹时代仍有回声。',
      },
    ],
    'zh-Hant': [
      {
        title: '歷史',
        body: '七夕為農曆七月初七，源於牛郎織女的星宿傳說。織女星與牽牛星隔銀河相望，民間演為一對被天河阻隔、每年七夕由喜鵲搭橋一會的戀人。漢代已有「穿針乞巧」之俗，魏晉南北朝漸盛，七夕遂成女兒祈巧、情侶盼聚的節日，被稱為中國的「情人節」。',
      },
      {
        title: '習俗',
        body: '七夕以「乞巧」為名——女子於月下穿針引線、陳瓜果以拜織女，祈求心靈手巧、姻緣美滿。又有「喜蛛應巧」「投針驗巧」等占驗之戲。情侶則以這一夜寄相思，盼如牛女鵲橋之會。一針一線之間，是舊時女子對才情與良緣的雙重期許。',
      },
      {
        title: '食',
        body: '七夕應節食「巧果」——以麵粉和糖油炸或烘製，捏作花樣，取「乞巧」之意。各地又有吃巧芽麵、酥糖（「巧人」「巧酥」）之俗。瓜果亦不可少，陳於庭中以饗織女。甜脆的巧果，是這個柔軟節日的味覺註腳。',
      },
      {
        title: '詩',
        body: '秦觀《鵲橋仙》是七夕詞的絕唱：「纖雲弄巧，飛星傳恨，銀漢迢迢暗度。金風玉露一相逢，便勝卻人間無數……兩情若是久長時，又豈在朝朝暮暮。」——他不嘆一年一會之苦，反以「金風玉露」之逢勝過人間長相廝守，末句更將愛情昇華為對「久長」的信念。哀怨的牛女傳說，被這首詞點化出曠世的豁達。',
      },
      {
        title: '現代慶祝',
        body: '今日七夕已成名副其實的「中國情人節」，鮮花、禮物、燭光晚餐與西式情人節並行而各擅其美。商家借勢促銷，年輕人則更願回望牛郎織女的古典浪漫。一些地方復興乞巧手作、漢服祈巧之俗，讓星河傳說在霓虹時代仍有迴聲。',
      },
    ],
    ja: [
      {
        title: '歴史',
        body: '七夕は旧暦七月七日、牽牛星と織女星の伝説に由来する。天の川を隔てて向かい合う二星は、民間で、天の河に引き裂かれ毎年七夕の夜だけ鵲（かささぎ）の架ける橋で逢う恋人として語り継がれた。漢代にはすでに「針に糸を通して巧を乞う」風習があり、魏晋南北朝に盛んとなって、七夕は女子が手芸の上達を祈り、恋人が再会を願う節句——中国の「バレンタイン」となった。',
      },
      {
        title: '習俗',
        body: '七夕は「乞巧（きっこう）」の名のとおり、女子が月下で針に糸を通し、瓜や果物を供えて織女を拝し、手先の器用さと良縁を祈る。「喜蛛応巧」「投針験巧」といった占いの遊びもある。恋人たちはこの夜に思いを託し、牛郎織女の鵲橋の逢瀬になぞらえる。一針一糸に、かつての女性たちの才と縁への二重の願いが込められていた。',
      },
      {
        title: '食',
        body: '七夕には「巧果」を食べる——小麦粉に砂糖を混ぜ、油で揚げるか焼き、花の形に作って「乞巧」の意を託す。地方によっては巧芽麺や落雁（「巧人」「巧酥」）を食べる風習もある。瓜や果物も欠かせず、庭先に供えて織女をもてなす。甘く香ばしい巧果は、この柔らかな節句の味の脚注である。',
      },
      {
        title: '詩',
        body: '秦観「鵲橋仙」は七夕詞の絶唱：「纖雲 巧を弄し、飛星 恨みを伝え、銀漢 迢迢として暗に度（わた）る。金風玉露 一たび相逢えば、便ち勝る 人間無数……両情 若し是れ久長ならば、又た豈に朝朝暮暮に在らんや。」——一年に一度しか逢えぬ苦しみを嘆くのではなく、「金風玉露」の逢瀬こそ人間世界の長き睦みに勝ると詠み、末句では愛を「久長」への信念へと昇華させる。哀しい牛郎織女の物語が、この一首によって稀有な大らかさへと点化された。',
      },
      {
        title: '現代の祝い方',
        body: '今日の七夕は名実ともに「中国のバレンタインデー」となり、花や贈り物、ろうそくの灯る晩餐が、西洋のそれと並んでそれぞれの趣を競う。商家は商機とし、若者はむしろ牛郎織女の古典的なロマンへ目を向ける。一部の地方では乞巧の手仕事や漢服での祈りが復興し、星河の伝説はネオンの時代にも谺している。',
      },
    ],
    en: [
      {
        title: 'History',
        body: 'Qixi falls on the seventh day of the seventh lunar month and springs from the star-myth of the Cowherd and the Weaver Girl. The stars Vega and Altair face each other across the Milky Way; folklore made them lovers parted by the Heavenly River, allowed to meet just once a year on Qixi night, over a bridge built by magpies. The custom of "threading needles to beg for skill" existed by the Han dynasty and flourished through the Wei, Jin, and Southern-Northern dynasties — making Qixi a festival on which girls prayed for deft hands and lovers longed to reunite, China\'s own "Valentine\'s Day."',
      },
      {
        title: 'Customs',
        body: 'Qixi takes its old name from 乞巧, "begging for skill": by moonlight girls threaded needles and laid out melons and fruit before the Weaver Girl, praying for nimble fingers and a happy match. There were divination games too — watching a spider\'s web for "answered skill," floating a needle to test it. Lovers entrusted their longing to this night, hoping for a meeting like the magpie-bridge tryst. In each needle and thread lay an old double wish: for talent, and for a good marriage.',
      },
      {
        title: 'Food',
        body: 'The seasonal food is 巧果 — wheat-flour dough sweetened, fried or baked, and shaped into patterns, carrying the wish "to beg for skill." Some regions eat sprout noodles or 酥糖 ("clever sweets"). Melons and fruit are indispensable, set out in the courtyard to feast the Weaver Girl. The sweet, crisp 巧果 is the tasting note of this tender festival.',
      },
      {
        title: 'Poetry',
        body: 'Qin Guan\'s "Immortals at the Magpie Bridge" is the supreme Qixi lyric: "Fine clouds work their craft, / shooting stars carry their grief, / and silently they cross the far reaches of the Silver River. / One meeting amid golden wind and jade dew / outshines countless reunions in the mortal world… / If two hearts hold fast for the long years, / why must they cling to dawn and dusk?" Rather than lament a love that meets but once a year, the poet finds that single meeting "amid golden wind and jade dew" worth more than a lifetime together — and lifts love, in the last lines, into faith in what lasts. A mournful legend is transfigured into rare serenity.',
      },
      {
        title: 'Modern celebration',
        body: 'Qixi today is, in name and fact, China\'s "Valentine\'s Day," with flowers, gifts, and candlelit dinners standing beside the Western holiday, each with its own appeal. Merchants seize the occasion; the young, more and more, look back to the classical romance of the Cowherd and the Weaver Girl. Some places have revived the handcrafts of 乞巧 and prayer in Han-style dress, so the star-river legend still echoes in an age of neon.',
      },
    ],
  },
}
