#!/usr/bin/env bun
/**
 * generate-archetype-json.ts — 从内存预设生成 D1 种子文件
 *
 * 输出: scripts/archetype-presets.json
 *
 * 逻辑:
 *   10天干 × 12地支 × 2性别 × 4语言(zh/zh-Hant/en/ja) = 960行
 *
 * 男/女初始内容相同（作为基础版本）— 上传后可在 Cloudflare Dashboard 或
 * 新的 seed 批次中按需修改个性化内容。
 *
 * zh-Hant 采用台湾/港澳书写语感，非简繁转换：
 *   - 文学性短句，直接以「你」贴近读者，少说教感
 *   - 承袭古典汉语意象，带「你自己心里有数」式内省语气
 * zh-Hant / ja 行均有独立内容（非回退链）。
 *
 * 重新种植已有 zh-Hant 行请用: bun run scripts/seed-archetypes.ts --replace
 *
 * 用法:
 *   bun run scripts/generate-archetype-json.ts
 *   # 然后执行种子脚本:
 *   bun run scripts/seed-archetypes.ts
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 内嵌预设数据（来源：personality-presets.ts）────────────────────────────

type PresetPersonality = {
  personalityBullets: [string, string, string]
  fateTease: string
  warning: string
}
type FourLangMap<T> = { zh: T; 'zh-Hant': T; en: T; ja: T }

const STEM_PROFILES: Record<string, FourLangMap<PresetPersonality>> = {
  甲: {
    zh: {
      personalityBullets: [
        '骨子里是攀升者，停滞比失败更让你难受',
        '给予庇护是天性，却常忘了问自己是否也需要被看见',
        '对未知保持好奇，对阻碍保持执拗',
      ],
      fateTease: '有一个你一直绕开的方向，正悄悄靠近你的轨道……',
      warning: '正面突破的劲头有时会在最需要弯曲的地方折断……',
    },
    'zh-Hant': {
      personalityBullets: [
        '棟樑之材，不取捷徑，那份偏執是尊嚴也是代價',
        '替人撐傘，卻忘了問：誰替你擋過雨？',
        '有些路你非走不可，不是因為有把握，而是你不甘心繞開',
      ],
      fateTease: '有個方向你一直說「以後再說」，它沒在等你……',
      warning: '一直往前沖是本能，但有些彎道，繞開才是真的勇氣……',
    },
    en: {
      personalityBullets: [
        'Built to rise — stagnation hurts you more than failure',
        'You shelter others instinctively, rarely asking to be seen yourself',
        'Curious about the unknown, relentless when blocked',
      ],
      fateTease: "A direction you've long avoided is quietly entering your orbit…",
      warning: 'The force that drives you forward is the same one that breaks when it should bend…',
    },
    ja: {
      personalityBullets: [
        '本質は上昇者──停滞は失敗より辛い',
        '庇護することが本能で、自分が見てもらえるかを問うのを忘れがち',
        '未知への好奇心と、障害への頑固さを持ち合わせている',
      ],
      fateTease: 'ずっと避けてきた方向が、あなたの軌道に静かに近づいている……',
      warning: '前に突き進む力は、曲がるべきときに折れる力と表裏一体だ……',
    },
  },
  乙: {
    zh: {
      personalityBullets: [
        '以柔克刚是你的生存之道，没人注意到你什么时候扎了根',
        '读懂周围的能量比大多数人快，只是很少说出来',
        '适应力强到几乎无声无息，但内核从未真正动摇',
      ],
      fateTease: '你长期在弯曲中等待的那扇门，可能比你以为的更近……',
      warning: '适应得太好，有时会让你忘记了本来想去往的方向……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你是會往縫隙裡長的那種人，安靜紮根，從不叫嚷自己在哪',
        '讀懂人和場合是你天生的能力，只是你很少讓人知道你讀了',
        '適應是你的保護色，但那個沒動搖過的芯——你清楚得很',
      ],
      fateTease: '那扇門你繞著走太久了，繞的圈子快畫成一個方向了……',
      warning: '適應得太徹底，有時候連你自己也分不清，哪個才是原來的你……',
    },
    en: {
      personalityBullets: [
        'Flexible where others break — you root quietly without anyone noticing',
        'You read the room faster than most and almost never say what you noticed',
        'Adaptable to the point of invisibility, but your core never actually shifts',
      ],
      fateTease: "The door you've been bending toward for so long may be closer than you think…",
      warning: 'Adapting too well can make you forget the direction you originally chose…',
    },
    ja: {
      personalityBullets: [
        '柔よく剛を制すのが生き方で、いつ根を張ったか誰も気づかない',
        '周囲のエネルギーを人より早く読み取るが、ほとんど口に出さない',
        '適応力が高すぎてほぼ無音だが、芯は一度も揺らいでいない',
      ],
      fateTease: 'ずっと曲がり続けて待ってきた扉は、思っているより近いかもしれない……',
      warning: '適応しすぎると、本来向かいたかった方向を忘れてしまうことがある……',
    },
  },
  丙: {
    zh: {
      personalityBullets: [
        '天生的光源，凡靠近者皆被你的热度改变',
        '付出是本能，但没有人问过那个热烈的你需要什么',
        '你的感染力是真实的，耗尽也是真实的',
      ],
      fateTease: '你的可见度即将在意想不到的地方接受一次考验……',
      warning: '不停给予光热的代价，你一个人扛着，没跟任何人说过……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你走進一個空間，氣氛就不一樣了——你自己知道，但你從不說',
        '你給出去的從來不少，只是沒什麼人想到要回頭問：你還好嗎？',
        '被你的熱度暖過的人很多，知道你也會冷的人很少',
      ],
      fateTease: '你一直是別人故事裡的光，但你自己的故事，快要需要有人認真看了……',
      warning: '一直發光而沒有被接住，久了是真的會冷的……',
    },
    en: {
      personalityBullets: [
        'A natural light source — everyone near you gets changed by your warmth',
        'Giving is instinct, but no one ever asked what you need in return',
        'Your charisma is real; so is the depletion that follows it',
      ],
      fateTease: "Your visibility is about to be tested in a way you didn't plan for…",
      warning: "The cost of radiating heat without receiving it — you've been carrying it alone…",
    },
    ja: {
      personalityBullets: [
        '生まれながらの光源──近づく者はみなあなたの熱量に影響される',
        '与えることが本能で、熱心なあなた自身が何を必要とするかを誰も尋ねない',
        '感染力は本物で、枯渇もまた本物だ',
      ],
      fateTease: 'あなたの存在感が予期しない場所で試されようとしている……',
      warning: '光と熱を与え続ける代償を、あなたは一人で抱えて誰にも言っていない……',
    },
  },
  丁: {
    zh: {
      personalityBullets: [
        '烛光而非烈焰：渺小、持久、照亮最近的人',
        '很少有人第一眼就懂你，但懂了之后就舍不得',
        '那团从未说出口的火，是你最深的驱动力',
      ],
      fateTease: '那团从未说出口的火，正从无声积累走向被看见的临界点……',
      warning: '向内燃烧而不说出口的部分，迟早会在最意外的时机找到出口……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你的溫度不張揚，像燭光——燒得久、照得近，沒人特別記得你點過',
        '懂你需要時間，但懂了的人，大多留下來了',
        '有些話你始終沒說出口，不是沒有，是說出來了，怕它就輕了',
      ],
      fateTease: '你一直沒說的那個，已經在等你自己承認很久了……',
      warning: '火留在心裡太久，不會熄，但會悶——你知道那滋味……',
    },
    en: {
      personalityBullets: [
        'A candle, not a bonfire — steady warmth for whoever is closest',
        'Few understand you at first glance; once they do they rarely leave',
        "The fire you've never spoken aloud is your deepest fuel",
      ],
      fateTease:
        "That fire you've never fully spoken aloud is approaching the point of being seen…",
      warning: 'What burns inward without release tends to find the most unexpected exit point…',
    },
    ja: {
      personalityBullets: [
        'ろうそくの炎──か細く、持続し、最も近い人を照らす',
        '第一印象で理解される人は少ないが、一度わかるともう離れられない',
        '口に出したことのない炎が、あなたの最深の原動力だ',
      ],
      fateTease: '声に出したことのない炎が、静かな蓄積から「見られる」臨界点へと近づいている……',
      warning: '内側で燃え続けて出口を持たないものは、最も予想外の瞬間に出口を見つける……',
    },
  },
  戊: {
    zh: {
      personalityBullets: [
        '如山岳般承载，别人的重量你扛，自己的重量你独吞',
        '包容一切是你的天性，但世界上最孤独的往往是撑住一切的人',
        '稳是你的优点，也是把你困住的那道无形的墙',
      ],
      fateTease: '那个在所有稳重之下等待被发现的你，已经等了很久了……',
      warning: '埋入土里的东西不会消失，只是在等一个时机破土而出……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你是會扛住的那種人，不是因為不累，而是你不知道怎麼開口說「我撐不住了」',
        '你替大家撐著，但沒有人問過要替你撐——這個問題，你也沒有答案',
        '山不是不動，是動了，沒有人懂那意味著什麼',
      ],
      fateTease: '在所有穩重底下，有個你一直壓著的東西，在等一個說得出口的時機……',
      warning: '壓進土裡的不會消失，最終還是會破土而出，只是你說不準是什麼時候……',
    },
    en: {
      personalityBullets: [
        'Mountain energy — you hold what others cannot, and absorb what they will not',
        'At your loneliest, you are also the least visible',
        'Steadiness is your strength and the invisible wall that holds you in',
      ],
      fateTease:
        'The version of you buried beneath all that reliability has been waiting for a long time…',
      warning: "What gets pressed into the ground doesn't disappear, it accumulates pressure…",
    },
    ja: {
      personalityBullets: [
        '山のように支える──他者の重さを引き受け、自分の重さは一人で飲み込む',
        'すべてを包容するのが本性だが、すべてを支える人が最も孤独なことが多い',
        '安定さはあなたの強みで、あなたを閉じ込める見えない壁でもある',
      ],
      fateTease: 'あの安定感の奥深くで発見されるのを待っているあなたは、もう長い間待っている……',
      warning: '土に埋まったものは消えない──ただ、芽吹く機会を待っているだけだ……',
    },
  },
  己: {
    zh: {
      personalityBullets: [
        '滋养型人格，细腻到能接住别人漏掉的每一粒情绪',
        '低调运筹，从不提需求，以至于有时忘了自己也有',
        '表面上什么都不争，内心有一个没有说出口的世界',
      ],
      fateTease: '你一直在安静耕耘的那件事，离破土的时间越来越近……',
      warning: '最安静的声音往往藏着最重要的答案，你还没有听见它……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你對別人的感受，往往比他們自己還清楚一點——這不是本事，是一種承擔',
        '你從不開口要什麼，久了，連你自己也忘了，你原來是可以要的',
        '你不爭，不是沒有立場，是把那個世界藏得太深，外人看不見',
      ],
      fateTease: '你靜靜耕的那塊地，有東西要破土了，時候快到了……',
      warning: '最安靜的人往往藏著最沉的答案，那個答案你還沒讓自己聽見……',
    },
    en: {
      personalityBullets: [
        'You absorb what others drop — every emotional detail registers, even when you say nothing',
        'Quietly strategic, rarely asking for anything — until you forget asking is even an option',
        'Nothing on the surface; an entire inner world no one has been let into',
      ],
      fateTease: "What you've been tending to in silence is getting closer to breaking through…",
      warning:
        "The quietest part of you holds the most important answer, and you haven't listened yet…",
    },
    ja: {
      personalityBullets: [
        '養育型の人格で、他者が取りこぼした感情のひと粒ひと粒を受け止めるほど繊細',
        '控えめに采配し、要求を口にすることがないため、自分にも欲求があることを忘れがち',
        '表面では何も争わない。内側には、口にされていない世界がある',
      ],
      fateTease: 'あなたが静かに耕し続けてきたことが、芽吹く時期にどんどん近づいている……',
      warning:
        '最も静かな声が最も重要な答えを宿していることが多い。あなたはまだそれを聴いていない……',
    },
  },
  庚: {
    zh: {
      personalityBullets: [
        '原则比利益更难撼动，那是你的铠甲，也是别人无法绕过的墙',
        '真实得有时刺伤人，但这份锐利换来了一种罕见的可信',
        '孤峭是你的常态，这让你清醒，也让你难被靠近',
      ],
      fateTease: '有一场你无法用原则解决的考验正在靠近你的生命轨道……',
      warning: '你对别人的标准，迟早会被同等的力度回到你自己身上……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你的原則不是態度，是你這個人的形狀——在妥協之前，那條線就已經在那裡',
        '你說的話刺是刺，但人家知道那是真的——這種可信，很少見',
        '不是你不想被靠近，是你骨子裡有一股氣，讓人靠近前先掂量一下',
      ],
      fateTease: '有一場你用原則擋不住的事，正在你看不見的地方慢慢成形……',
      warning: '你拿來量別人的那把尺，最終還是要量到你自己身上……',
    },
    en: {
      personalityBullets: [
        'Your principles outlast your strategies — they are your armor and your wall',
        'Honest to the point of hurt, which is exactly why the people who stay, stay completely',
        'Solitary clarity is your natural state — it keeps you sharp and hard to reach',
      ],
      fateTease: "A test that can't be solved by principles alone is approaching your life's edge…",
      warning: 'The standards you hold others to tend to circle back in ways you do not expect…',
    },
    ja: {
      personalityBullets: [
        '信念は利益より揺らがない──それがあなたの鎧であり、誰も回り込めない壁だ',
        '率直さが時に傷つけるが、その鋭さがまれな信頼をもたらす',
        '孤高であることが常態で、それがあなたを明晰にし、近づきにくくする',
      ],
      fateTease: '信念だけでは解決できない試練があなたの人生の軌道に近づいている……',
      warning: '他者に向ける基準は、いつか同じ強さであなた自身に返ってくる……',
    },
  },
  辛: {
    zh: {
      personalityBullets: [
        '对细节的洁癖来自一种信念：粗糙了就不再是你',
        '感受力极强，美能触动你，瑕疵也能，你无法假装不在意',
        '不会轻易动心，一旦动了，就是深入骨髓',
      ],
      fateTease: '有一件同时美丽又令人不安的事，正在朝你的命盘靠近……',
      warning: '你称之为高标准的事情，有时候会把你真正需要的东西挡在门外……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你對「標準」這件事，有一種說不清楚但自己清楚得很的要求',
        '美的，你收；傷的，你也收——兩種都不是當下就忘得了的',
        '你不是不動情，是一旦動了，那份重量，連你自己也嚇到',
      ],
      fateTease: '有件事同時美麗又令人不安，正在朝你這裡靠近……',
      warning: '你說的高標準，有時候是一面盾——擋住的不是讓你失望的，是讓你動心的……',
    },
    en: {
      personalityBullets: [
        'Precision is identity — you cannot be approximate and still be you',
        'Beauty moves you; so does every imperfection; you cannot pretend otherwise',
        'Slow to open, permanent once you do',
      ],
      fateTease: 'Something beautiful and destabilizing is moving toward your chart…',
      warning:
        'What you frame as high standards sometimes blocks exactly what you are waiting for…',
    },
    ja: {
      personalityBullets: [
        '細部への潔癖は信念から来ている──粗雑になった瞬間、あなたではなくなる',
        '感受性が極めて高く、美しさも傷も等しく響く。無関心なふりはできない',
        '軽々しく心を開かないが、一度開いたら骨の髄まで届く',
      ],
      fateTease: '美しくも不安定な何かが、あなたの命盤に近づいている……',
      warning: '高い基準と呼ぶそれが、本当に必要なものをドアの外に弾き出すことがある……',
    },
  },
  壬: {
    zh: {
      personalityBullets: [
        '大水漫流，表面轻松，暗处有深渊，只有你知道在哪里',
        '策略感强，包容一切，却极难被真正接近',
        '奔流不止，一直在找一个能承受你全部重量的地方',
      ],
      fateTease: '你一直逆势而行的那股暗流，有可能在这个节点发生转向……',
      warning: '水越深越难读，包括你自己有时候也读不懂自己……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你看起來好相處，但真的進來過的人，你心裡清楚，沒有幾個',
        '你懂所有人，但沒什麼人懂你——你不說，他們也不知道要去懂',
        '你一直在流，尋找的是能承住你全部重量的地方，不只是一個岸',
      ],
      fateTease: '那股你一直逆著走的暗流，快要轉向了……',
      warning: '水深了，就連自己也讀不清自己——你自己也知道的……',
    },
    en: {
      personalityBullets: [
        'Deep, broad water — easy to be near, almost impossible to truly enter',
        'You understand everything and everyone; what you keep hidden is how rarely you feel understood',
        'Always moving, always searching for somewhere that can hold your full weight',
      ],
      fateTease: "The current you've been moving against may be about to shift direction…",
      warning: 'The deeper water runs, the harder it is to read — even for yourself…',
    },
    ja: {
      personalityBullets: [
        '広く深い水──傍にいるのは易しく、真に踏み込むのはほぼ不可能',
        'すべてを理解するが、理解されることがいかに稀かを隠し続けている',
        '常に流れ、自分のすべての重さを支えられる場所を探し続けている',
      ],
      fateTease: 'ずっと逆らって進んできた暗流が、このタイミングで向きを変えるかもしれない……',
      warning: '水が深くなるほど読み取りにくい──あなた自身さえも例外ではない……',
    },
  },
  癸: {
    zh: {
      personalityBullets: [
        '安静而绵绵，内里藏着比外表深得多的执念',
        '不争、不说，却什么都感受着、记着',
        '你习惯滋养别人，却不擅长为自己开口',
      ],
      fateTease: '你过去某段经历的重量，正在以另一种方式回到你的现在……',
      warning: '接纳了太多别人的情绪，有时候找不到哪部分才是自己的……',
    },
    'zh-Hant': {
      personalityBullets: [
        '你安靜，但那個安靜底下藏的東西，你自己心裡有數',
        '你不說，但你記著——比你自己以為的，記得更清楚、更久',
        '養別人是本能，為自己開口這件事，你還在學，而且學得比你以為的慢',
      ],
      fateTease: '過去的某段重量，正在以另一種方式找回你……',
      warning: '攬進來太多別人的情緒，有時候你也不確定，哪個感受才是你自己的……',
    },
    en: {
      personalityBullets: [
        'Quiet surface, mountain depth — you hold things longer than anyone realizes',
        "You don't fight or announce, you feel and remember long after everyone else has moved on",
        'You nourish others instinctively; speaking up for yourself is the ongoing work',
      ],
      fateTease:
        'The weight of something from your past is finding its way back into your present…',
      warning:
        "When you absorb everyone else's emotional world, finding your own voice becomes the work…",
    },
    ja: {
      personalityBullets: [
        '静かで持続的──外見より遥かに深い執念を内に秘めている',
        '争わず、語らず、感じ続け、誰よりも長く覚えている',
        '他者を養うことが習慣で、自分のために声を上げるのが苦手',
      ],
      fateTease: '過去のある出来事の重さが、別の形で現在へと還ってきている……',
      warning: '他者の感情を受け入れすぎると、どこまでが自分なのかわからなくなることがある……',
    },
  },
}

const BRANCH_MODIFIERS: Record<string, FourLangMap<string>> = {
  子: {
    zh: '冬水生人，内敛中藏着最汹涌的暗流——表面越平静，内里越复杂',
    'zh-Hant': '冬水生的人，話少，但那個沉默裡頭是有潮汐的',
    en: 'Born in winter water — your introversion hides the deepest current; the calmer the surface, the more is running beneath',
    ja: '冬の水に生まれ、内向きの中に最も激しい暗流を秘めている──表面が穏やかなほど、内側は複雑',
  },
  丑: {
    zh: '土水相搏月，脚踏实地的背后压着一股想动的劲，两者同时存在',
    'zh-Hant': '你蹩得很實，但骨子裡有一股說不出口的勁，一直在找出口',
    en: 'Earth-water tension month — grounded and restless in the same breath; both are real',
    ja: '土と水がせめぎ合う月──地に足がついている裏側に動きたい衝動があり、両者は共存している',
  },
  寅: {
    zh: '木旺破冬月，那股冲劲连你自己都压不住，等待和突破同时在拉你',
    'zh-Hant': '木破冬月，蓄到飽就要沖——你等得住，但那個要沖的勁，壓不住',
    en: 'Spring-surge month — that drive to break through is something even you cannot fully contain',
    ja: '木が冬を破る月──あの突進力はあなた自身でさえ抑えきれない。待機と突破が同時に引っ張っている',
  },
  卯: {
    zh: '卯月生者，对自由的渴望和对深度联结的需求同样强烈，缺一都会空',
    'zh-Hant': '你要自由，也要被真正懂——這兩樣你都需要，沒人告訴你怎麼同時擁有',
    en: 'Rabbit month — the need for freedom and the need for deep connection are equally urgent; neither can be sacrificed',
    ja: '卯月生まれは、自由への渇望と深いつながりへの欲求が同じくらい強い。どちらが欠けても空虚になる',
  },
  辰: {
    zh: '辰月水库，内蓄巨量，等一个时机一泻而出，旁人很难预判',
    'zh-Hant': '辰月的人，不動聲色，但裡面積的那些，旁人完全摸不透',
    en: 'Dragon-reservoir month — enormous stored energy awaiting a precise release point; almost no one sees it coming',
    ja: '辰月は水の貯蔵庫──内側に莫大なエネルギーを蓄え、解放の瞬間を待っている。誰も予測できない',
  },
  巳: {
    zh: '巳月直觉锋利，但想太多容易成为你最大的自我内耗来源',
    'zh-Hant': '你直覺很準，腦子也停不下來——最耗你的，往往是你自己',
    en: 'Snake-month intuition — exceptionally sharp, but overthinking is your primary drain from yourself',
    ja: '巳月の直感は鋭い。しかし考えすぎがあなたにとって最大の自己消耗の源になりやすい',
  },
  午: {
    zh: '午月如火正旺，全力以赴是天然设置，只是满格投入的代价也是满格的',
    'zh-Hant': '午月的人投入起來沒有一半這回事，代價也是',
    en: 'Peak-fire month — full commitment is your default mode; so is the full cost of it',
    ja: '午月は火の絶頂──全力投球が自然な設定だが、全力の代償も全力分かかる',
  },
  未: {
    zh: '未月静藏，你在安静地积蓄一些别人还看不见、摸不透的东西',
    'zh-Hant': '未月安靜，但那個靜底下你在養著什麼，你自己清楚',
    en: 'Late-summer quiet — you are accumulating something in silence that others cannot yet see or name',
    ja: '未月は静かに蓄える──他者にはまだ見えない何かを、あなたは静かに積み上げている',
  },
  申: {
    zh: '申月金气旺，思维快，行动快，心有时快过脚，这是优势也是隐患',
    'zh-Hant': '申月的腦子轉得比腳步快，有時候人到了，心早已在想下一步了',
    en: 'Metal-precision month — fast mind, fast action; your heart sometimes moves ahead of your footing',
    ja: '申月は金の気が盛ん──思考も行動も速い。心が足より先へ進みすぎることがあり、強みにも危うさにもなる',
  },
  酉: {
    zh: '酉月对细节极其敏感，你的优点和你的痛苦，来自同一个地方',
    'zh-Hant': '你比任何人都更快察覺到哪裡不對勁，也比任何人都更快被那個不對勁傷到',
    en: 'Autumn-refinement month — your sensitivity to detail is both your greatest gift and your most reliable source of pain',
    ja: '酉月は細部への感受性が極めて高い──あなたの長所と痛みは同じ場所から来ている',
  },
  戌: {
    zh: '戌月处于转折，那种说不清楚的不安定感其实是在为下一段悄悄做准备',
    'zh-Hant': '戌月的這份不安，不是沒來由的——是要帶你去下一個地方之前的徵兆',
    en: 'Transition-month — that undefinable restlessness is preparation in disguise for what comes after',
    ja: '戌月は転換期──言葉にならない不安定感は、実は次の段階への静かな準備だ',
  },
  亥: {
    zh: '亥月水藏深，你此刻的状态是某段旅程的终点，也是另一段旅程的起始',
    'zh-Hant': '你現在這個位置，是某個終點，也是另一個起點——不必急著知道是哪個',
    en: 'Winter-beginning born — where you are now is simultaneously an ending and a threshold',
    ja: '亥月は水が深く潜る──あなたが今いる場所は、ある旅の終わりであり、別の旅の始まりでもある',
  },
}

// ── Generator ───────────────────────────────────────────────────────────────

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const GENDERS = ['男', '女'] as const
const LANGS = ['zh', 'zh-Hant', 'en', 'ja'] as const

type Lang = (typeof LANGS)[number]

type ArchetypePresetRow = {
  day_stem: string
  month_branch: string
  gender: '男' | '女'
  lang: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  fate_tease: string
  warning: string
  variant: string
}

const rows: ArchetypePresetRow[] = []

for (const stem of STEMS) {
  for (const branch of BRANCHES) {
    for (const gender of GENDERS) {
      for (const lang of LANGS) {
        const stemData = STEM_PROFILES[stem]?.[lang as Lang]
        if (!stemData) continue
        const branchMod = BRANCH_MODIFIERS[branch]?.[lang as Lang]

        rows.push({
          day_stem: stem,
          month_branch: branch,
          gender,
          lang,
          bullet_1: stemData.personalityBullets[0],
          bullet_2: stemData.personalityBullets[1],
          bullet_3: branchMod ?? stemData.personalityBullets[2],
          fate_tease: stemData.fateTease,
          warning: stemData.warning,
          variant: 'A',
        })
      }
    }
  }
}

// ── Output ───────────────────────────────────────────────────────────────────

const outPath = join(import.meta.dir, 'archetype-presets.json')
writeFileSync(outPath, JSON.stringify(rows, null, 2))

const byLang = LANGS.map((l) => `${l}: ${rows.filter((r) => r.lang === l).length}`).join(', ')
console.log(`\n✅  Generated ${rows.length} rows → ${outPath}`)
console.log(`    Coverage: 10 stems × 12 branches × 2 genders × 4 langs`)
console.log(`    Per lang: ${byLang}`)
console.log('')
console.log('    Next steps:')
console.log('      1. bun run scripts/seed-archetypes.ts          # local D1')
console.log('      2. bun run scripts/validate-archetypes.ts      # QA gate')
console.log('      3. bun run scripts/seed-archetypes.ts --remote # production')
