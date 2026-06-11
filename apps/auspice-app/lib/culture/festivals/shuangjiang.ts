import type { FestivalContent } from './schema'

/**
 * 霜降 — 节气 (last of autumn). Structure 物候(三候)/农事/养生/诗. 诗: 张继
 * 《枫桥夜泊》(「月落乌啼霜满天」). CJK literal, en explained (ADR-0020).
 */
export const SHUANGJIANG: FestivalContent = {
  id: 'jieqi-shuangjiang',
  kind: 'jieqi',
  name: {
    'zh-Hans': '霜降',
    'zh-Hant': '霜降',
    ja: '霜降',
    en: "Shuangjiang (Frost's Descent)",
  },
  tagline: {
    'zh-Hans': '二十四节气之十八 · 露结为霜，秋之将尽',
    'zh-Hant': '二十四節氣之十八 · 露結為霜，秋之將盡',
    ja: '二十四節気の第十八 · 露が霜と結ぶ頃',
    en: 'The 18th solar term · dew freezes to frost, autumn ends',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '霜降三候——「一候豺乃祭兽，二候草木黄落，三候蛰虫咸俯」。豺狼开始大量捕兽陈列如祭，备过冬之储；草木枯黄、落叶纷飞；蛰虫垂头蛰伏于穴中，不食不动以越冬。霜降者，气肃而凝，露结为霜，是秋季最后一个节气。',
      },
      {
        title: '农事',
        body: '霜降是秋收扫尾、备耕冬作的节点，「霜降见霜，米谷满仓」。北方秋收基本结束，需深耕翻地、储粮防冻；南方晚稻收割、油菜移栽。农谚「霜降不起葱，越长越要空」，提示蔬果采收与农作之时。',
      },
      {
        title: '养生',
        body: '霜降秋燥转寒、易伤脾肺，中医主张「平补润燥、健脾养胃、护阳防寒」。民间有「霜降吃柿子，不流鼻涕」之俗。饮食宜温润平补（栗子、山药、白果、萝卜、柿子、鸭肉），少食寒凉。起居宜早睡早起、注意保暖（尤护膝、足、胃）。情志宜舒畅，防「悲秋」。适度运动，固护正气以迎冬。',
      },
      {
        title: '诗',
        body: '张继《枫桥夜泊》写秋夜霜寒：「月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。」——月落乌啼，霜气弥漫满天；江畔枫树、点点渔火，伴着旅人的愁眠。姑苏城外寒山寺的夜半钟声，悠悠传到客船之上。诗以「霜满天」写尽深秋霜降的清寒，羁旅之愁与钟声寒夜交融，成为千古绝唱。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '霜降三候——「一候豺乃祭獸，二候草木黃落，三候蟄蟲咸俯」。豺狼開始大量捕獸陳列如祭，備過冬之儲；草木枯黃、落葉紛飛；蟄蟲垂頭蟄伏於穴中，不食不動以越冬。霜降者，氣肅而凝，露結為霜，是秋季最後一個節氣。',
      },
      {
        title: '農事',
        body: '霜降是秋收掃尾、備耕冬作的節點，「霜降見霜，米穀滿倉」。北方秋收基本結束，需深耕翻地、儲糧防凍；南方晚稻收割、油菜移栽。農諺「霜降不起蔥，越長越要空」，提示蔬果採收與農作之時。',
      },
      {
        title: '養生',
        body: '霜降秋燥轉寒、易傷脾肺，中醫主張「平補潤燥、健脾養胃、護陽防寒」。民間有「霜降吃柿子，不流鼻涕」之俗。飲食宜溫潤平補（栗子、山藥、白果、蘿蔔、柿子、鴨肉），少食寒涼。起居宜早睡早起、注意保暖（尤護膝、足、胃）。情志宜舒暢，防「悲秋」。適度運動，固護正氣以迎冬。',
      },
      {
        title: '詩',
        body: '張繼《楓橋夜泊》寫秋夜霜寒：「月落烏啼霜滿天，江楓漁火對愁眠。姑蘇城外寒山寺，夜半鐘聲到客船。」——月落烏啼，霜氣彌漫滿天；江畔楓樹、點點漁火，伴著旅人的愁眠。姑蘇城外寒山寺的夜半鐘聲，悠悠傳到客船之上。詩以「霜滿天」寫盡深秋霜降的清寒，羈旅之愁與鐘聲寒夜交融，成為千古絕唱。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '霜降の三候——「一候 豺（やまいぬ）乃ち獣を祭る、二候 草木 黄落す、三候 蟄虫 咸（ことごと）く俯（ふ）す」。豺狼が獣を多く捕えて祭るがごとく並べ、冬越しの蓄えとする。草木は枯れ黄ばみ落葉が舞い、蟄虫は頭を垂れて穴に蟄（こも）り、食わず動かず冬を越す。霜降とは、気が粛として凝り、露が結んで霜となる、秋の最後の節気である。',
      },
      {
        title: '農事',
        body: '霜降は秋収の仕上げと冬作の備えの節目で、「霜降に霜を見れば、米穀 倉に満つ」と言う。北方では秋収がほぼ終わり、深く耕し土を反し、糧を蓄え凍えを防ぐ。南方では晩稲を刈り、菜種を移植する。「霜降に葱を起こさざれば、長ずるほど空（す）になる」と農諺に言い、蔬果の取り入れと農作の時を促す。',
      },
      {
        title: '養生',
        body: '霜降は秋の燥が寒へ転じ、脾肺を損ないやすい。漢方では「平らかに補い燥を潤し、脾を健やかにし胃を養い、陽を護り寒を防ぐ」ことを説く。民間には「霜降に柿を食えば鼻水が出ぬ」の俗がある。食は温かく潤し穏やかに補うもの（栗・山芋・銀杏・大根・柿・鴨肉）を宜とし、寒涼を控える。早寝早起きし、保温に努める（とりわけ膝・足・胃を護る）。情を伸びやかに保ち「悲秋」を防ぐ。適度に動いて正気を固め、冬を迎える。',
      },
      {
        title: '詩',
        body: '張継「楓橋夜泊」は秋夜の霜寒を詠む：「月落ち烏啼きて 霜 天に満つ、江楓 漁火 愁眠に対す。姑蘇城外 寒山寺、夜半の鐘声 客船に到る。」——月は落ち烏が啼き、霜の気が天に満ちる。川辺の楓、点々たる漁火が、旅人の愁いの眠りに向き合う。姑蘇城外の寒山寺の、夜半の鐘の声が、はるばると客船に届く。詩は「霜 天に満つ」によって深秋・霜降の清らかな寒さを写し尽くし、羈旅の愁いと寒夜の鐘声が溶け合って、千古の絶唱となった。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Frost\'s Descent: "first, the jackal makes offering of beasts (豺乃祭兽); second, the plants yellow and shed (草木黄落); third, the hibernating insects all bow down (蛰虫咸俯)." The jackal takes many beasts and lays them out as if in offering, laying in winter stores; the plants wither yellow and the leaves fall; and the hibernating insects droop their heads in their burrows, neither eating nor moving as they pass the winter. Frost\'s Descent is when the air grows austere and congeals, and dew freezes into frost — the last term of autumn.',
      },
      {
        title: 'Farming',
        body: 'Frost\'s Descent is the close of the autumn harvest and the threshold of winter-crop preparation — "See frost at Frost\'s Descent, and the grain fills the barn." In the north the harvest is largely done; the land is deep-plowed and turned, and grain is stored against the freeze. The south cuts its late rice and transplants rapeseed. "Don\'t lift the scallions by Frost\'s Descent, or the longer they grow the more hollow they get," runs the proverb, marking the time for gathering crops and working the land.',
      },
      {
        title: 'Wellness',
        body: 'As autumn dryness turns cold and easily harms the spleen and lungs, Chinese medicine advises "gentle tonifying and moistening dryness, strengthening the spleen and nourishing the stomach, protecting the yang against the cold." Folk custom holds that "eat persimmons at Frost\'s Descent and your nose won\'t run." Favor warm, moistening, gently tonifying foods (chestnut, yam, ginkgo, radish, persimmon, duck) and ease off the cold. Sleep and rise early and keep warm — the knees, feet, and stomach especially. Keep the mood open against "autumn melancholy." Exercise in moderation to firm the vital qi for the coming winter.',
      },
      {
        title: 'Poetry',
        body: 'Zhang Ji\'s "Mooring by Maple Bridge at Night" writes the frost-cold autumn night: "The moon sets, a crow caws, frost fills the sky; / riverside maples, fishing lamps, a traveler\'s troubled sleep. / Beyond the walls of Gusu, at Cold Mountain Temple, / the midnight bell reaches the passenger\'s boat." The moon sinks, a crow cries, and frost-air fills the heavens; the riverside maples and scattered fishing lamps keep watch over the traveler\'s uneasy sleep, and from Cold Mountain Temple outside Gusu the midnight bell drifts out to the visitor\'s boat. With "frost fills the sky" the poem captures all the clear cold of late-autumn Frost\'s Descent — the sorrow of the road merging with the bell in the cold night, a verse renowned through the ages.',
      },
    ],
  },
}
