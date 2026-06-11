import type { FestivalContent } from './schema'

/**
 * 立秋 — 节气 (start of autumn). Structure 物候(三候)/农事/养生/诗. 诗: 刘翰
 * 《立秋》(「满阶梧叶月明中」). CJK literal, en explained (ADR-0020).
 */
export const LIQIU: FestivalContent = {
  id: 'jieqi-liqiu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '立秋',
    'zh-Hant': '立秋',
    ja: '立秋',
    en: 'Liqiu (Start of Autumn)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十三 · 凉风初至，一叶知秋',
    'zh-Hant': '二十四節氣之十三 · 涼風初至，一葉知秋',
    ja: '二十四節気の第十三 · 秋の始まり',
    en: 'The 13th solar term · the cool wind, autumn begins',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '立秋三候——「一候凉风至，二候白露降，三候寒蝉鸣」。凉风渐起，暑气稍敛；清晨草木始凝白露；寒蝉感阴而鸣。立秋是秋季第一个节气，「梧桐一叶落，天下尽知秋」，然暑热未消，常有「秋老虎」。',
      },
      {
        title: '农事',
        body: '立秋是农作物成熟的关键期，「立秋十天遍地黄」。北方玉米、大豆灌浆鼓粒，需保水防早霜；南方晚稻孕穗、抽穗，需肥水管理。农谚「立秋三场雨，秕稻变成米」，提示因时抢管。',
      },
      {
        title: '养生',
        body: '立秋阳气渐收、阴气渐长，中医主张「养收」，重在润燥养肺。饮食宜滋阴润燥（百合、银耳、梨、蜂蜜、芝麻），少食辛辣以防「秋燥」伤肺。起居宜早睡早起，「秋三月，早卧早起，与鸡俱兴」。情志宜安宁平和，收敛神气，以避肃杀之气。「秋冻」适度，勿过早厚衣。',
      },
      {
        title: '诗',
        body: '刘翰《立秋》写凉意初生：「乳鸦啼散玉屏空，一枕新凉一扇风。睡起秋声无觅处，满阶梧叶月明中。」——雏鸦啼散，画屏空寂，一枕新凉伴一扇微风。睡起欲寻那一缕秋声却无处可觅，唯见满阶梧桐落叶静卧于明月之中。立秋的清凉与萧疏，尽在这澄澈的秋夜。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '立秋三候——「一候涼風至，二候白露降，三候寒蟬鳴」。涼風漸起，暑氣稍斂；清晨草木始凝白露；寒蟬感陰而鳴。立秋是秋季第一個節氣，「梧桐一葉落，天下盡知秋」，然暑熱未消，常有「秋老虎」。',
      },
      {
        title: '農事',
        body: '立秋是農作物成熟的關鍵期，「立秋十天遍地黃」。北方玉米、大豆灌漿鼓粒，需保水防早霜；南方晚稻孕穗、抽穗，需肥水管理。農諺「立秋三場雨，秕稻變成米」，提示因時搶管。',
      },
      {
        title: '養生',
        body: '立秋陽氣漸收、陰氣漸長，中醫主張「養收」，重在潤燥養肺。飲食宜滋陰潤燥（百合、銀耳、梨、蜂蜜、芝麻），少食辛辣以防「秋燥」傷肺。起居宜早睡早起，「秋三月，早臥早起，與雞俱興」。情志宜安寧平和，收斂神氣，以避肅殺之氣。「秋凍」適度，勿過早厚衣。',
      },
      {
        title: '詩',
        body: '劉翰《立秋》寫涼意初生：「乳鴉啼散玉屏空，一枕新涼一扇風。睡起秋聲無覓處，滿階梧葉月明中。」——雛鴉啼散，畫屏空寂，一枕新涼伴一扇微風。睡起欲尋那一縷秋聲卻無處可覓，唯見滿階梧桐落葉靜臥於明月之中。立秋的清涼與蕭疏，盡在這澄澈的秋夜。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '立秋の三候——「一候 涼風至る、二候 白露降る、三候 寒蟬（かんせん）鳴く」。涼しい風が立ち始め、暑気はやや収まる。早朝、草木に白露が結び、寒蟬（ひぐらし）が陰を感じて鳴く。立秋は秋の最初の節気で、「梧桐 一葉落ちて、天下ことごとく秋を知る」。なお暑さは残り、「秋老虎（残暑）」が訪れることも多い。',
      },
      {
        title: '農事',
        body: '立秋は作物の成熟の要であり、「立秋十日 地は一面に黄ばむ」と言う。北方ではトウモロコシや大豆が実を充たし、水を保って早霜を防ぐ。南方では晩稲が穂を孕み穂を出し、肥と水の管理を要する。「立秋に三たびの雨あれば、秕（しいな）も米となる」と農諺に言い、時に応じた管理を促す。',
      },
      {
        title: '養生',
        body: '立秋は陽気が次第に収まり陰気が伸びる。漢方では「収を養う」とし、燥を潤し肺を養うことを重んじる。食は陰を滋し燥を潤すもの（百合・白きくらげ・梨・蜂蜜・胡麻）を宜とし、辛辣を控えて「秋燥」が肺を損なうのを防ぐ。早寝早起きし、「秋の三月は早く臥し早く起き、鶏とともに興（た）つ」。情を安らかに保ち、神気を収めて粛殺の気を避ける。「秋凍（薄着の慣らし）」は適度にし、早くから厚着しない。',
      },
      {
        title: '詩',
        body: '劉翰「立秋」は涼の初めを詠む：「乳鴉啼き散じて玉屏空し、一枕の新涼 一扇の風。睡り起きて秋声 覓（もと）むる処無し、満階の梧葉 月明の中。」——雛鴉が啼いて散り、画屏は空しく静まる。枕辺の新たな涼しさに、扇一つの微風。眠りから覚めてあの秋の声を探しても見つからず、ただ階に満ちた梧桐の落葉が、明月の中に静かに臥している。立秋の清涼と蕭疎が、この澄んだ秋の夜に尽くされている。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Start of Autumn: "first, the cool wind arrives (凉风至); second, white dew descends (白露降); third, the cold cicada sings (寒蝉鸣)." A cool wind rises and the heat eases a little; at dawn white dew settles on the grass; the cold cicada, sensing the yin, begins to sing. Liqiu is autumn\'s first term — "one paulownia leaf falls, and all the world knows autumn" — yet the heat lingers, and an "autumn tiger" of late warmth is common.',
      },
      {
        title: 'Farming',
        body: 'Liqiu is the crucial ripening time — "ten days past Liqiu and the fields turn yellow." In the north corn and soybean fill out their grain and need water against early frost; in the south late rice forms and sends up its ears and needs water and feeding. "Three rains at Liqiu, and even the empty husks turn to rice," runs the proverb, urging timely management.',
      },
      {
        title: 'Wellness',
        body: 'At Liqiu the yang gathers in and the yin lengthens, so Chinese medicine advises "nourishing the gathering-in," above all moistening dryness and nourishing the lungs. Favor yin-enriching, moistening foods (lily bulb, white fungus, pear, honey, sesame) and ease off the spicy to spare the lungs from "autumn dryness." Sleep and rise early — "in the three months of autumn, lie down early and rise early, with the rooster." Keep the mood settled and calm, drawing the spirit inward against the season\'s austere air. "Autumn toughening" should be moderate — don\'t bundle up too soon.',
      },
      {
        title: 'Poetry',
        body: 'Liu Han\'s "Start of Autumn" catches the first chill: "The young crows cry and scatter; the painted screen is bare. / One pillow of new cool, one fan of breeze. / I wake and seek the autumn sound, but nowhere is it found — / only paulownia leaves fill the steps, in the bright moonlight." The fledgling crows scatter, the screen falls still; a new coolness at the pillow, a breath of fan-stirred air. Waking, he seeks that thread of autumn sound and finds it nowhere — only the fallen paulownia leaves lying still in the moonlight. All of Liqiu\'s coolness and bareness is in this clear autumn night.',
      },
    ],
  },
}
