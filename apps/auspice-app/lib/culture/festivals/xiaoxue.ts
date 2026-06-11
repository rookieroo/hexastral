import type { FestivalContent } from './schema'

/**
 * 小雪 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·小雪》
 * (「莫怪虹无影，如今小雪时」). CJK literal, en explained (ADR-0020).
 */
export const XIAOXUE: FestivalContent = {
  id: 'jieqi-xiaoxue',
  kind: 'jieqi',
  name: {
    'zh-Hans': '小雪',
    'zh-Hant': '小雪',
    ja: '小雪',
    en: 'Xiaoxue (Lesser Snow)',
  },
  tagline: {
    'zh-Hans': '二十四节气之二十 · 寒气渐增，雨凝为雪',
    'zh-Hant': '二十四節氣之二十 · 寒氣漸增，雨凝為雪',
    ja: '二十四節気の第二十 · 雨が雪に変わる頃',
    en: 'The 20th solar term · cold deepens, rain turns to snow',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '小雪三候——「一候虹藏不见，二候天气上升地气下降，三候闭塞而成冬」。阴阳不交，彩虹隐没不见；天地之气各自升降、不再交融；万物闭藏，天地闭塞而入深冬。小雪者，寒气渐增，雨凝为雪而雪量未大，故曰「小」。',
      },
      {
        title: '农事',
        body: '小雪时节，大田农活基本结束，转入农产品贮藏与加工。农谚「小雪铲白菜，大雪铲菠菜」。北方修整农田水利、积肥造肥，储白菜萝卜入窖；南方油菜、小麦田间管理。民间有小雪腌菜、做腊味之俗，「冬腊风腌，蓄以御冬」。',
      },
      {
        title: '养生',
        body: '小雪天寒地冻、阳气闭藏，中医主张温补益肾、护阳防寒，兼「解郁安神」。饮食宜温润（羊肉、萝卜、黑豆、山药、大枣），少食燥热。起居宜早睡晚起、注意保暖（尤护头、背、足）。冬日易生郁闷，情志宜多见阳光、舒展心怀。适度运动以助阳，忌大汗。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·小雪》写初雪之候：「莫怪虹无影，如今小雪时。阴阳依上下，寒暑喜分离。」——莫要怪彩虹已无踪影，如今正是小雪时节。阴阳之气各依上下而行，寒暑就此分道。诗人以「虹藏」「阴阳上下」扣合小雪三候，将节气物候化入诗中。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '小雪三候——「一候虹藏不見，二候天氣上升地氣下降，三候閉塞而成冬」。陰陽不交，彩虹隱沒不見；天地之氣各自升降、不再交融；萬物閉藏，天地閉塞而入深冬。小雪者，寒氣漸增，雨凝為雪而雪量未大，故曰「小」。',
      },
      {
        title: '農事',
        body: '小雪時節，大田農活基本結束，轉入農產品貯藏與加工。農諺「小雪鏟白菜，大雪鏟菠菜」。北方修整農田水利、積肥造肥，儲白菜蘿蔔入窖；南方油菜、小麥田間管理。民間有小雪醃菜、做臘味之俗，「冬臘風醃，蓄以禦冬」。',
      },
      {
        title: '養生',
        body: '小雪天寒地凍、陽氣閉藏，中醫主張溫補益腎、護陽防寒，兼「解鬱安神」。飲食宜溫潤（羊肉、蘿蔔、黑豆、山藥、大棗），少食燥熱。起居宜早睡晚起、注意保暖（尤護頭、背、足）。冬日易生鬱悶，情志宜多見陽光、舒展心懷。適度運動以助陽，忌大汗。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·小雪》寫初雪之候：「莫怪虹無影，如今小雪時。陰陽依上下，寒暑喜分離。」——莫要怪彩虹已無蹤影，如今正是小雪時節。陰陽之氣各依上下而行，寒暑就此分道。詩人以「虹藏」「陰陽上下」扣合小雪三候，將節氣物候化入詩中。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '小雪の三候——「一候 虹 蔵れて見えず、二候 天気上昇し地気下降す、三候 閉塞して冬と成る」。陰陽が交わらず、虹は隠れて見えなくなる。天と地の気はそれぞれ昇降して交わらず、万物は閉じ蔵れ、天地は閉塞して深い冬に入る。小雪とは、寒気が次第に増し、雨が凝って雪となるがその量はまだ大きくないゆえ「小」という。',
      },
      {
        title: '農事',
        body: '小雪の頃、大田の農仕事はほぼ終わり、農産物の貯蔵と加工に移る。「小雪に白菜を鏟（か）り、大雪に菠薐草（ほうれんそう）を鏟る」と農諺に言う。北方では農田水利を整え、肥を積み、白菜や大根を蔵に納める。南方では菜種・小麦の田の管理を行う。民間には小雪に漬物を漬け、腊味（干し肉）を作る風習があり、「冬腊に風で干し漬け、蓄えて冬に備う」と言う。',
      },
      {
        title: '養生',
        body: '小雪は寒く地は凍り、陽気が閉じ蔵れる。漢方では温補して腎を益し、陽を護り寒を防ぎ、あわせて「鬱を解き神を安んずる」ことを説く。食は温潤のもの（羊肉・大根・黒豆・山芋・棗）を宜とし、燥熱を控える。早寝遅起きし、保温に努める（とりわけ頭・背・足を護る）。冬は鬱屈しやすく、情は陽光を多く浴びて心を舒べる。適度に動いて陽を助け、大汗を忌む。',
      },
      {
        title: '詩',
        body: '元稹「廿四気を詠ずる詩・小雪」は初雪の候を詠む：「怪しむ莫れ 虹の影無きを、如今 是れ小雪の時。陰陽 上下に依り、寒暑 分離を喜ぶ。」——虹が影も形もなくなったのを怪しむな、今はちょうど小雪の頃。陰陽の気はそれぞれ上と下へ行き、寒暑はここで道を分かつ。詩人は「虹蔵る」「陰陽上下」をもって小雪の三候に扣（かな）え、節気の物候を詩に化す。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Lesser Snow: "first, the rainbow hides and is not seen (虹藏不见); second, the sky\'s qi rises and the earth\'s qi sinks (天气上升地气下降); third, all closes up and becomes winter (闭塞而成冬)." With yin and yang no longer meeting, the rainbow vanishes; the qi of heaven and earth each move apart, no longer mingling; all things shut and store themselves away, and the world seals over into deep winter. Lesser Snow is when the cold grows and rain congeals into snow — but not yet heavily, hence "lesser."',
      },
      {
        title: 'Farming',
        body: 'At Lesser Snow the field work is largely done, turning to storing and processing the harvest. "At Lesser Snow trim the cabbage; at Greater Snow trim the spinach," runs the proverb. The north repairs irrigation works, builds up manure, and cellars cabbage and radish; the south manages its rapeseed and wheat. Folk custom pickles vegetables and makes cured meats now — "salt and wind-dry in the twelfth month, and store against the winter."',
      },
      {
        title: 'Wellness',
        body: 'With cold weather and frozen ground and the yang shut away, Chinese medicine advises warming tonification to benefit the kidneys, protecting the yang against the cold, and also "easing depression and calming the spirit." Favor warm, moistening foods (mutton, radish, black bean, yam, jujube) and ease off the hot and drying. Sleep early and rise late, and keep warm (the head, back, and feet especially). Winter brings low spirits easily, so seek the sunlight and open the heart. Exercise moderately to aid the yang, but avoid heavy sweating.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Lesser Snow" writes the season of first snow: "Don\'t wonder that the rainbow casts no shadow — / right now it is the time of Lesser Snow. / Yin and yang keep to high and low; / heat and cold gladly part their ways." Don\'t wonder the rainbow has left no trace; this is just the time of Lesser Snow, when the qi of yin and yang go their separate ways above and below, and cold and warmth divide. With "the rainbow hides" and "yin and yang, high and low," the poet matches the term\'s pentads and turns its phenology into verse.',
      },
    ],
  },
}
