import type { FestivalContent } from './schema'

/**
 * 小满 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·小满》
 * (「小满气全时，如何靡草衰」). CJK literal, en explained (ADR-0020).
 */
export const XIAOMAN: FestivalContent = {
  id: 'jieqi-xiaoman',
  kind: 'jieqi',
  name: {
    'zh-Hans': '小满',
    'zh-Hant': '小滿',
    ja: '小満',
    en: 'Grain Buds (Xiaoman)',
  },
  tagline: {
    'zh-Hans': '二十四节气之八 · 麦粒渐满，物致小得盈满',
    'zh-Hant': '二十四節氣之八 · 麥粒漸滿，物致小得盈滿',
    ja: '二十四節気の第八 · 麦の実が満ち始める',
    en: 'The 8th solar term · the grain begins to fill',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '小满三候——「一候苦菜秀，二候靡草死，三候麦秋至」。苦菜繁茂可采，喜阴的靡草在烈日下枯死，麦类渐次成熟（「麦秋」指麦子的成熟之秋）。小满者，物致于此小得盈满，夏熟作物籽粒渐满而未全熟。',
      },
      {
        title: '农事',
        body: '小满是夏收夏种的前奏。农谚「小满不满，干断思坎」，强调蓄水之要——南方需防水量不足影响插秧，北方冬小麦籽粒灌浆需防干热风。此时油菜成熟待收，蚕事正忙，农家「抢水」「祭车神」以祈灌溉。',
      },
      {
        title: '养生',
        body: '小满湿热并重，中医主张清热利湿、健脾和胃。饮食宜清淡、多食「苦」（苦瓜、苦菜清心火），少食肥甘厚腻与生湿之物。起居防潮防暑，衣物透气。情志宜平和恬淡，避免烦躁。皮肤病、湿疹多发，宜清淡饮食、保持干爽。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·小满》写节候之态：「小满气全时，如何靡草衰。田家私黍稷，方伯问蚕丝。」——小满时节天地之气渐趋盈满，喜阴的靡草却在强光下枯衰。农家忙于黍稷之事，地方长官则关切蚕丝收成，寥寥数语写出小满农桑两忙的图景。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '小滿三候——「一候苦菜秀，二候靡草死，三候麥秋至」。苦菜繁茂可採，喜陰的靡草在烈日下枯死，麥類漸次成熟（「麥秋」指麥子的成熟之秋）。小滿者，物致於此小得盈滿，夏熟作物籽粒漸滿而未全熟。',
      },
      {
        title: '農事',
        body: '小滿是夏收夏種的前奏。農諺「小滿不滿，乾斷思坎」，強調蓄水之要——南方需防水量不足影響插秧，北方冬小麥籽粒灌漿需防乾熱風。此時油菜成熟待收，蠶事正忙，農家「搶水」「祭車神」以祈灌溉。',
      },
      {
        title: '養生',
        body: '小滿濕熱並重，中醫主張清熱利濕、健脾和胃。飲食宜清淡、多食「苦」（苦瓜、苦菜清心火），少食肥甘厚膩與生濕之物。起居防潮防暑，衣物透氣。情志宜平和恬淡，避免煩躁。皮膚病、濕疹多發，宜清淡飲食、保持乾爽。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·小滿》寫節候之態：「小滿氣全時，如何靡草衰。田家私黍稷，方伯問蠶絲。」——小滿時節天地之氣漸趨盈滿，喜陰的靡草卻在強光下枯衰。農家忙於黍稷之事，地方長官則關切蠶絲收成，寥寥數語寫出小滿農桑兩忙的圖景。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '万物が小さく満ちる——夏熟作物の実が膨らみつつ、まだ熟しきらない節気。\n\n「一候苦菜秀，二候靡草死，三候麦秋至」\n\n苦菜が茂って採れる。陰を好む靡草が強い日差しの下で枯れる。麦が次第に実る（「麦秋」は麦の成熟の意）。小満の名は、満ちつつあるがまだ満たない状態を表す。',
      },
      {
        title: '農事',
        body: '小満は夏の収穫と種まきの前奏である。「小満 満たざれば、乾きて坎（みぞ）を思う」と農諺に言い、水を蓄える要を説く。南方では水量不足が田植えに響くのを防ぎ、北方では冬小麦の実の充実期に乾いた熱風を防ぐ。菜種は熟して収穫を待ち、蚕事も忙しく、農家は「水を争い」「車神を祭って」灌漑を祈る。',
      },
      {
        title: '養生',
        body: '小満は湿と熱がともに重い。養生では熱を清め湿を利し、脾を健やかにして胃を和らげる。食事は淡白に、苦瓜・苦菜などで心火を清め、肥甘の濃いものや湿を生むものは控える。起居は湿気と暑さを防ぎ、衣は通気よく。気持ちを穏やかに保って苛立ちを避ける。皮膚病や湿疹が出やすい時期なので、淡白な食と清潔を保つとよい。',
      },
      {
        title: '詩',
        body: '元稹の「咏廿四气诗·小满」は、節候と農桑の忙しさを簡潔に描く。\n\n「小满气全时，如何靡草衰。田家私黍稷，方伯问蚕丝。」\n\n小満の頃、天地の気は満ちようとするのに、陰を好む靡草は強い光の下で枯れる。農家は黍や稷の仕事に追われ、地方の長官は蚕糸の収穫を気にかける——農と桑の二重の忙しさが数行に収まっている。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Lesser Fullness: first, the bitter herb flourishes; second, the shade-loving grass withers; third, the wheat ripens (the "wheat autumn"). The bitter herb grows thick enough to gather, the shade-loving grass dies under the strong sun, and the grain begins to ripen. Xiaoman — "small fullness" — names the moment when summer-ripening crops fill out their grain but are not yet fully ripe. Classical three pentads: 「一候苦菜秀，二候靡草死，三候麦秋至」。',
      },
      {
        title: 'Farming',
        body: 'Lesser Fullness is the prelude to summer harvest and sowing. "If Xiaoman is not full, the ditches run dry," runs the proverb, stressing the need to store water — the south guards against a shortfall that would set back transplanting, the north against hot dry winds during the wheat\'s grain-filling. Rapeseed ripens and waits to be cut, the silkworms keep everyone busy, and farmers "vie for water" and "make offering to the cart-god" to pray for irrigation.',
      },
      {
        title: 'Wellness',
        body: 'Damp and heat both weigh heavy at Xiaoman, so Chinese medicine advises clearing heat and draining damp, strengthening the spleen and harmonizing the stomach. Keep the diet light and eat more "bitter" (bitter melon, bitter herb to clear heart-fire); ease off rich, sweet, greasy, and damp-forming foods. Keep the home dry and cool and wear breathable clothes. Keep the mood calm and unhurried. Skin conditions and eczema are common now — a light diet and a dry, clean body help.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Lesser Fullness" sketches the season: "At Xiaoman the qi grows full — / yet how the shade-grass withers. / The farm folk tend their millet and grain; / the magistrate asks after the silk." Even as the qi of heaven and earth swells toward fullness, the shade-loving grass dies in the strong light. The farmers labor over their millet while the local lord inquires after the silkworm yield — in a few words, the doubled busyness of field and mulberry at Xiaoman.',
      },
    ],
  },
}
