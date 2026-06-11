import type { FestivalContent } from './schema'

/**
 * 小寒 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·小寒》
 * (「小寒连大吕，欢鹊垒新巢」). CJK literal, en explained (ADR-0020).
 */
export const XIAOHAN: FestivalContent = {
  id: 'jieqi-xiaohan',
  kind: 'jieqi',
  name: {
    'zh-Hans': '小寒',
    'zh-Hant': '小寒',
    ja: '小寒',
    en: 'Xiaohan (Lesser Cold)',
  },
  tagline: {
    'zh-Hans': '二十四节气之二十三 · 天渐寒，三九前后',
    'zh-Hant': '二十四節氣之二十三 · 天漸寒，三九前後',
    ja: '二十四節気の第二十三 · 寒さが深まる頃',
    en: 'The 23rd solar term · the cold deepens',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '小寒三候——「一候雁北乡，二候鹊始巢，三候雉始雊」。大雁感阳气萌动而始有北迁之意（「北乡」）；喜鹊感阳气而开始筑巢；雉鸡（雉）于近四九时鸣叫求偶（「雊」即雉鸣）。小寒者，天渐寒而未至极，故曰「小」，然民谚常云「小寒胜大寒」。',
      },
      {
        title: '农事',
        body: '小寒是一年中最冷的时段之一，农事以防冻保暖为主。北方大田歇冬，重在牲畜防寒、果树防冻、温室蔬菜管理；南方需防「霜冻」「寒潮」伤及油菜、蔬菜与柑橘。农谚「小寒大寒，准备过年」，亦是积肥造肥、检修农具、筹备春耕之时。',
      },
      {
        title: '养生',
        body: '小寒严寒，阳气内敛，中医主张「温补肾阳、防寒护心」，「三九补一冬，来年无病痛」。饮食宜温热补益（羊肉、当归、桂圆、核桃、黑豆、糯米饭），忌生冷。起居宜早睡晚起、避寒保暖（尤护头、颈、背、足）。情志宜乐观平和。运动宜「日出后」温和进行，防滑防摔，避免大汗当风。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·小寒》写隆冬鹊巢：「小寒连大吕，欢鹊垒新巢。拾食寻河曲，衔紫绕树梢。」——小寒之节应和着十二律中的「大吕」，欢快的喜鹊已开始衔枝垒筑新巢；它们沿着河湾觅食，衔着枝条绕着树梢盘旋。诗人于严寒之中，捕捉喜鹊筑巢的勃勃生机，于萧索里见暖意。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '小寒三候——「一候雁北鄉，二候鵲始巢，三候雉始雊」。大雁感陽氣萌動而始有北遷之意（「北鄉」）；喜鵲感陽氣而開始築巢；雉雞（雉）於近四九時鳴叫求偶（「雊」即雉鳴）。小寒者，天漸寒而未至極，故曰「小」，然民諺常云「小寒勝大寒」。',
      },
      {
        title: '農事',
        body: '小寒是一年中最冷的時段之一，農事以防凍保暖為主。北方大田歇冬，重在牲畜防寒、果樹防凍、溫室蔬菜管理；南方需防「霜凍」「寒潮」傷及油菜、蔬菜與柑橘。農諺「小寒大寒，準備過年」，亦是積肥造肥、檢修農具、籌備春耕之時。',
      },
      {
        title: '養生',
        body: '小寒嚴寒，陽氣內斂，中醫主張「溫補腎陽、防寒護心」，「三九補一冬，來年無病痛」。飲食宜溫熱補益（羊肉、當歸、桂圓、核桃、黑豆、糯米飯），忌生冷。起居宜早睡晚起、避寒保暖（尤護頭、頸、背、足）。情志宜樂觀平和。運動宜「日出後」溫和進行，防滑防摔，避免大汗當風。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·小寒》寫隆冬鵲巢：「小寒連大呂，歡鵲壘新巢。拾食尋河曲，銜紫繞樹梢。」——小寒之節應和著十二律中的「大呂」，歡快的喜鵲已開始銜枝壘築新巢；牠們沿著河灣覓食，銜著枝條繞著樹梢盤旋。詩人於嚴寒之中，捕捉喜鵲築巢的勃勃生機，於蕭索裡見暖意。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '小寒の三候——「一候 雁 北に郷（むか）う、二候 鵲（かささぎ）始めて巣くう、三候 雉 始めて雊（な）く」。雁は陽気の萌しを感じて北へ帰る気配を見せ、鵲は陽気を感じて巣を作り始め、雉は四九（最も寒い頃）近くに鳴いて雌を求める（「雊」は雉の鳴き声）。小寒とは、寒さが次第に増すがまだ極まらぬゆえ「小」という。されど民間では「小寒は大寒に勝る」とも言う。',
      },
      {
        title: '農事',
        body: '小寒は一年で最も寒い時期の一つで、農事は防凍と保温が主となる。北方では大田は冬を休み、家畜の防寒、果樹の凍え防ぎ、温室野菜の管理に重きを置く。南方では「霜凍」「寒波」が菜種・野菜・柑橘を損なうのを防ぐ。「小寒大寒、年越しの備え」と農諺に言い、肥を積み農具を検め、春耕を準備する時でもある。',
      },
      {
        title: '養生',
        body: '小寒は厳しい寒さで、陽気が内に収まる。漢方では「腎陽を温補し、寒を防ぎ心を護る」ことを説き、「三九に一冬を補えば、来年 病痛なし」と言う。食は温熱で補益するもの（羊肉・当帰・龍眼・胡桃・黒豆・糯米飯）を宜とし、生冷を忌む。早寝遅起きし、寒を避け保温に努める（とりわけ頭・首・背・足を護る）。情を楽観に穏やかに保つ。運動は「日の出の後」穏やかに行い、滑り転倒を防ぎ、大汗をかいて風に当たるのを避ける。',
      },
      {
        title: '詩',
        body: '元稹「廿四気を詠ずる詩・小寒」は隆冬の鵲の巣を詠む：「小寒 大呂に連なり、歓鵲 新巣を壘（きず）く。食を拾いて河曲を尋ね、紫を銜（ふく）みて樹梢を繞（めぐ）る。」——小寒の節は十二律の「大呂」に応じ、喜ばしげな鵲はもう枝をくわえて新しい巣を築き始める。川の湾に沿って餌を探し、枝をくわえて梢を巡り飛ぶ。詩人は厳寒のなかに、巣づくりに励む鵲の旺盛な生気を捉え、蕭索のうちに暖を見いだす。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Lesser Cold: "first, the wild geese turn homeward north (雁北乡); second, the magpie begins to nest (鹊始巢); third, the pheasant begins to call (雉始雊)." The geese, sensing the first stir of yang, begin to lean northward; the magpie, feeling the yang, starts to build its nest; and the pheasant calls for a mate near the coldest days. Lesser Cold is when the cold deepens but has not yet reached its limit, hence "lesser" — though folk wisdom often says "Lesser Cold beats Greater Cold."',
      },
      {
        title: 'Farming',
        body: 'Lesser Cold is one of the coldest stretches of the year, and farm work centers on frost protection and keeping warm. In the north the fields rest, and the focus is sheltering livestock, protecting fruit trees from frost, and managing greenhouse vegetables; the south guards rapeseed, vegetables, and citrus against frost and cold snaps. "Lesser Cold and Greater Cold — ready for the New Year," runs the proverb; it is also the time to build manure, mend tools, and prepare for spring plowing.',
      },
      {
        title: 'Wellness',
        body: 'In the hard cold of Lesser Cold, with the yang drawn inward, Chinese medicine advises "warming and tonifying the kidney yang, guarding against cold and protecting the heart" — "tonify through the coldest nine days, and the year ahead is free of illness." Favor warming, nourishing foods (mutton, angelica, longan, walnut, black bean, glutinous rice) and avoid the cold and raw. Sleep early and rise late, shelter from cold and keep warm (the head, neck, back, and feet especially). Keep the mood bright and even. Exercise gently and "after sunrise," guarding against slips and falls and against sweating heavily in the wind.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Lesser Cold" writes the magpie\'s nest in deep winter: "Lesser Cold answers the pitch of Dalü; / the glad magpie builds its new nest. / Gathering food, it seeks the river\'s bend; / carrying twigs, it circles the treetops." Lesser Cold sounds in harmony with "Dalü," one of the twelve pitches, and the happy magpie has begun to gather twigs and build anew, foraging along the river\'s bends and wheeling about the treetops with its sprigs. Amid the hard cold the poet catches the brimming vitality of the nesting magpie — warmth found in the bleakness.',
      },
    ],
  },
}
