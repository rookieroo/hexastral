import type { FestivalContent } from './schema'

/**
 * 雨水 — 节气. Structure 物候(三候)/农事/养生/诗 (ADR-0020 culture track).
 * 诗: 杜甫《春夜喜雨》(「随风潜入夜，润物细无声」). CJK literal, en explained.
 */
export const YUSHUI: FestivalContent = {
  id: 'jieqi-yushui',
  kind: 'jieqi',
  name: {
    'zh-Hans': '雨水',
    'zh-Hant': '雨水',
    ja: '雨水',
    en: 'Yushui (Rain Water)',
  },
  tagline: {
    'zh-Hans': '二十四节气之二 · 冰雪化雨，润物无声',
    'zh-Hant': '二十四節氣之二 · 冰雪化雨，潤物無聲',
    ja: '二十四節気の第二 · 雪が雨に変わる頃',
    en: 'The 2nd solar term · snow turns to rain',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '雨水三候——「一候獭祭鱼，二候候雁北，三候草木萌动」。水獭捕鱼陈于岸边如祭，大雁自南向北归飞，草木随地中阳气抽出嫩芽。天地由雪转雨，万物萌动之始，正合「雨水」之名。',
      },
      {
        title: '农事',
        body: '雨水时节，「春雨贵如油」。北方仍需防春旱、保墒抗寒，南方则忙于油菜、冬小麦的追肥与稻田整理。农谚云「雨水有雨庄稼好，大春小春一片宝」，此时田间管理与备耕并重，是春耕的关键过渡。',
      },
      {
        title: '养生',
        body: '雨水湿气渐重，中医主张健脾祛湿、疏肝养胃。饮食宜清淡甘平（山药、薏米、芡实、红枣），少食生冷油腻，可食粥以养脾胃。情志宜舒畅以养肝，避免郁怒。起居「春捂」为要，护好下肢与颈背，谨防「倒春寒」伤阳。',
      },
      {
        title: '诗',
        body: '杜甫《春夜喜雨》是写春雨的千古绝唱：「好雨知时节，当春乃发生。随风潜入夜，润物细无声。」——一场应时而至的夜雨，无声浸润万物。「润物细无声」五字写尽春雨的体贴与生机，也成为后世形容潜移默化之功的常语。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '雨水三候——「一候獺祭魚，二候候雁北，三候草木萌動」。水獺捕魚陳於岸邊如祭，大雁自南向北歸飛，草木隨地中陽氣抽出嫩芽。天地由雪轉雨，萬物萌動之始，正合「雨水」之名。',
      },
      {
        title: '農事',
        body: '雨水時節，「春雨貴如油」。北方仍需防春旱、保墒抗寒，南方則忙於油菜、冬小麥的追肥與稻田整理。農諺云「雨水有雨莊稼好，大春小春一片寶」，此時田間管理與備耕並重，是春耕的關鍵過渡。',
      },
      {
        title: '養生',
        body: '雨水濕氣漸重，中醫主張健脾祛濕、疏肝養胃。飲食宜清淡甘平（山藥、薏米、芡實、紅棗），少食生冷油膩，可食粥以養脾胃。情志宜舒暢以養肝，避免鬱怒。起居「春捂」為要，護好下肢與頸背，謹防「倒春寒」傷陽。',
      },
      {
        title: '詩',
        body: '杜甫《春夜喜雨》是寫春雨的千古絕唱：「好雨知時節，當春乃發生。隨風潛入夜，潤物細無聲。」——一場應時而至的夜雨，無聲浸潤萬物。「潤物細無聲」五字寫盡春雨的體貼與生機，也成為後世形容潛移默化之功的常語。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '雨水の三候——「一候 獺魚を祭る、二候 候雁北す、三候 草木萌動す」。獺（かわうそ）は捕えた魚を岸に並べて祭るがごとく、雁は南から北へ帰り、草木は地中の陽気に従って嫩芽を抽く。天地は雪から雨へと転じ、万物が芽吹き始める——まさに「雨水」の名にかなう。',
      },
      {
        title: '農事',
        body: '雨水の頃、「春雨は油の如く貴し」という。北方ではなお春の乾きを防ぎ墒（土の湿り）を保って寒に備え、南方では菜種や冬小麦の追肥、稲田の整えに忙しい。「雨水に雨あれば作柄よし」と農諺に言い、田の管理と耕しの備えが並び立つ、春耕への大切な転換期である。',
      },
      {
        title: '養生',
        body: '雨水は湿気が次第に重くなる。漢方では脾を健やかにし湿を除き、肝を疏（のび）やかにし胃を養うことを説く。食は淡白で甘平なもの（山芋・はと麦・芡実・棗）を宜とし、生冷・脂っこいものを控え、粥で脾胃を養うとよい。情は伸びやかに保って肝を養い、鬱や怒りを避ける。起居は「春の着込み」を要とし、足腰と首背を守って「寒の戻り」が陽を損なうのを防ぐ。',
      },
      {
        title: '詩',
        body: '杜甫「春夜 雨を喜ぶ」は春雨を詠んだ千古の絶唱：「好雨 時節を知り、春に当たりて乃ち発生す。風に随いて潜かに夜に入り、物を潤して細やかに声無し。」——時を得て降る夜の雨が、音もなく万物を潤す。「物を潤して細やかに声無し」の五字は春雨の優しさと生気を写し尽くし、後世、目に見えぬ感化の働きを言う常套句ともなった。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Rain Water: "first, the otter lays out its fish (獭祭鱼); second, the wild geese turn north (候雁北); third, plants and trees stir into bud (草木萌动)." The otter spreads its catch along the bank as if making an offering; the geese fly back from south to north; trees push out tender shoots as warmth rises from the earth. Snow gives way to rain, and all things begin to wake — true to the name "Rain Water."',
      },
      {
        title: 'Farming',
        body: 'At Rain Water, "spring rain is as precious as oil." The north still guards against spring drought, conserving soil moisture against the cold; the south is busy with top-dressing rapeseed and winter wheat and readying the paddies. As the proverb says, "Rain at Rain Water means good crops." Field management and pre-planting preparation run side by side — the crucial hinge into the spring plowing.',
      },
      {
        title: 'Wellness',
        body: 'Dampness deepens at Rain Water, so Chinese medicine advises strengthening the spleen and dispelling damp, soothing the liver and nourishing the stomach. Favor light, mild-sweet foods (yam, Job\'s tears, foxnut, red dates); avoid raw, cold, and greasy things; congee nourishes the spleen and stomach. Keep the mood open to nourish the liver, and avoid brooding and anger. In daily life, "spring layering" matters — protect the legs, neck, and back against a cold snap that would injure the yang.',
      },
      {
        title: 'Poetry',
        body: 'Du Fu\'s "Delighting in Rain on a Spring Night" is the timeless poem of spring rain: "A good rain knows its season; / when spring arrives, it brings forth life. / It steals into the night on the wind, / moistening all things softly, without a sound." A timely night rain silently nourishes everything; the five-character line 润物细无声 — "moistening all things softly, without a sound" — has become a byword for the quiet, unseen work of nurture.',
      },
    ],
  },
}
