import type { FestivalContent } from './schema'

/**
 * 芒种 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 陆游《时雨》
 * (「时雨及芒种，四野皆插秧」). CJK literal, en explained (ADR-0020).
 */
export const MANGZHONG: FestivalContent = {
  id: 'jieqi-mangzhong',
  kind: 'jieqi',
  name: {
    'zh-Hans': '芒种',
    'zh-Hant': '芒種',
    ja: '芒種',
    en: 'Grain in Ear (Mangzhong)',
  },
  tagline: {
    'zh-Hans': '二十四节气之九 · 麦收稻插，最忙的农时',
    'zh-Hant': '二十四節氣之九 · 麥收稻插，最忙的農時',
    ja: '二十四節気の第九 · 麦を刈り稲を植える',
    en: 'The 9th solar term · reaping wheat, planting rice',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '芒种三候——「一候螳螂生，二候鵙始鸣，三候反舌无声」。螳螂感阴气初生而破卵，伯劳鸟（鵙）开始鸣叫，而善学百鸟之声的反舌鸟却停止了鸣唱。芒种者，「有芒之谷可种」，是播种与收割交叠的繁忙之节。',
      },
      {
        title: '农事',
        body: '芒种是一年中最忙的农时，「芒」指麦类等有芒作物的收获，「种」指晚谷、黍、稷的播种。农谚「芒种不种，再种无用」「芒种忙，麦上场」。北方抢收冬小麦，南方抢插晚稻，「三夏」（夏收、夏种、夏管）大忙，分秒必争。',
      },
      {
        title: '养生',
        body: '芒种湿热渐盛，中医主张清补降火、健脾化湿。饮食宜清淡、多补水（绿豆汤、酸梅汤生津解暑），少食辛热油腻。起居宜晚睡早起、午间小憩，勤洗澡以「止汗防疰夏」。情志宜舒畅平和，避免烦闷。出汗多者注意补充津液与电解质。',
      },
      {
        title: '诗',
        body: '陆游《时雨》直写芒种农忙：「时雨及芒种，四野皆插秧。家家麦饭美，处处菱歌长。」——应时之雨恰逢芒种，田野处处插秧；家家以新麦做饭，水乡处处响起采菱之歌。诗人笔下，芒种是一幅麦熟稻插、丰足而欢愉的田园长卷。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '芒種三候——「一候螳螂生，二候鵙始鳴，三候反舌無聲」。螳螂感陰氣初生而破卵，伯勞鳥（鵙）開始鳴叫，而善學百鳥之聲的反舌鳥卻停止了鳴唱。芒種者，「有芒之穀可種」，是播種與收割交疊的繁忙之節。',
      },
      {
        title: '農事',
        body: '芒種是一年中最忙的農時，「芒」指麥類等有芒作物的收穫，「種」指晚穀、黍、稷的播種。農諺「芒種不種，再種無用」「芒種忙，麥上場」。北方搶收冬小麥，南方搶插晚稻，「三夏」（夏收、夏種、夏管）大忙，分秒必爭。',
      },
      {
        title: '養生',
        body: '芒種濕熱漸盛，中醫主張清補降火、健脾化濕。飲食宜清淡、多補水（綠豆湯、酸梅湯生津解暑），少食辛熱油膩。起居宜晚睡早起、午間小憩，勤洗澡以「止汗防疰夏」。情志宜舒暢平和，避免煩悶。出汗多者注意補充津液與電解質。',
      },
      {
        title: '詩',
        body: '陸游《時雨》直寫芒種農忙：「時雨及芒種，四野皆插秧。家家麥飯美，處處菱歌長。」——應時之雨恰逢芒種，田野處處插秧；家家以新麥做飯，水鄉處處響起採菱之歌。詩人筆下，芒種是一幅麥熟稻插、豐足而歡愉的田園長卷。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '「芒のある穀物を種う時」——播種と収穫が重なる繁忙の節気である。\n\n「一候螳螂生，二候鵙始鸣，三候反舌无声」\n\nカマキリが卵から孵る。モズ（鵙）が鳴き始める。ウグイス模様の鳥（反舌）が、かえって鳴きやむ。陰の気が芽生え始め、夏の忙しさが頂点に近づく。',
      },
      {
        title: '農事',
        body: '芒種は一年で最も忙しい農時で、「芒」は麦など芒ある作物の収穫を、「種」は晩稲・黍・稷の播種を指す。「芒種に種えずば、再び種うとも益なし」「芒種忙し、麦は場に上る」と農諺に言う。北方では冬小麦を急ぎ刈り、南方では晩稲を急ぎ植える。「三夏」（夏の収穫・種まき・管理）が一気に重なり、寸刻を争う。',
      },
      {
        title: '養生',
        body: '芒種は湿熱が次第に盛んになる。養生では清やかに補い火を降ろし、脾を健やかにして湿を化す。食事は淡白に、緑豆湯・酸梅湯で水を補い津を生じ暑を解き、辛熱・脂は控える。遅寝早起き、昼の小憩をとり、よく身を洗って「汗を止め疰夏（夏負け）を防ぐ」。気持ちを伸びやかに保ち、鬱屈を避ける。汗の多い人は津液と電解質の補給に努める。',
      },
      {
        title: '詩',
        body: '陸游の「时雨」は、芒種の農忙を素直に描いた作品。麦熟れと田植え、水郷の菱歌が一幅の絵になる。\n\n「时雨及芒种，四野皆插秧。家家麦饭美，处处菱歌长。」\n\n時雨が芒種に降り、四方の野は田植えに忙しい。家ごとに新麦の飯が香り、水辺では菱を摘む歌が響く——豊かで歓ばしい田園の長巻である。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Grain in Ear: first, the mantis is born; second, the shrike begins to call; third, the mockingbird falls silent. The mantis, sensing the first stir of yin, hatches from its egg; the shrike starts to cry; and the mockingbird, which mimics a hundred birds, falls quiet. Mangzhong — "awned grain may be sown" — is the crowded season where sowing and reaping overlap. Classical three pentads: 「一候螳螂生，二候鵙始鸣，三候反舌无声」。',
      },
      {
        title: 'Farming',
        body: 'Mangzhong is the busiest farming time of the year: 芒 ("awn") points to harvesting awned crops like wheat, 种 to sowing late grain, millet, and panic-grass. "Don\'t sow by Mangzhong and sowing later is useless," "Mangzhong rush — the wheat to the threshing floor," say the proverbs. The north races to cut winter wheat, the south to transplant late rice; the "three summers" — harvest, sowing, and field-tending — pile up at once, every minute counting.',
      },
      {
        title: 'Wellness',
        body: 'Damp-heat grows at Mangzhong, so Chinese medicine advises cool tonification and lowering fire, strengthening the spleen and transforming damp. Keep the diet light and replenish water generously (mung-bean soup, sour-plum drink to generate fluids and relieve heat); go easy on the hot, spicy, and greasy. Sleep late and rise early, rest at midday, and bathe often to "stop the sweat and ward off summer lassitude." Keep the mood open and even, avoiding stuffy frustration. Those who sweat much should replenish fluids and electrolytes.',
      },
      {
        title: 'Poetry',
        body: 'Lu You\'s "Timely Rain" writes the bustle of Mangzhong directly: "The timely rain reaches Grain in Ear; / across all the fields they are transplanting rice. / In every house the new-wheat meal is good; / everywhere the water-chestnut songs run long." A timely rain falls right at Mangzhong, and the fields everywhere ring with transplanting; each house cooks fragrant new wheat, and across the water country rise the songs of chestnut-gathering. Under the poet\'s brush, Mangzhong becomes a long pastoral scroll — wheat ripe, rice planted, abundant and glad.',
      },
    ],
  },
}
