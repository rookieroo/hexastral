/**
 * Enhanced 9-locale tone adaptation system.
 *
 * Superset of `TONE_GUIDES` in i18n-prompt.ts.
 * Adds per-locale: example sentences (2-3) + cultural taboos.
 *
 * Use `buildEnhancedLocaleBlock(locale)` to inject into system prompts
 * alongside `buildLanguageBlock()` from i18n-prompt.ts for maximum
 * locale fidelity.
 *
 * By default, examples are omitted to keep prompt tokens lean.
 * Pass `includeExamples: true` for high-quality single-locale generation.
 */

interface LocaleToneEntry {
  guide: string
  examples: string[]
  taboos: string[]
}

const ENHANCED_LOCALE_TONES: Record<string, LocaleToneEntry> = {
  en: {
    guide: `Write like a modern mindfulness / self-insight app (Co-Star, The Pattern, Headspace).
Warm yet precise — avoid mystical clichés ("the stars say…") and over-formal academic language.
Use second person ("you") for a personal, intimate feel. Metaphors from nature and journeys.
For negative signals, frame as "growth edges" or "areas of focus" — never doom-and-gloom.
Keep Eastern philosophical depth expressed in language that resonates with a Western-educated audience.`,
    examples: [
      'Your Fire energy craves visibility — this year asks you to step forward rather than observe.',
      "That inner tension you feel? It's two strong forces finding their balance point.",
      'When the old pattern resurfaces, use it as data, not destiny.',
    ],
    taboos: [
      'Never say "you will" or "you must"',
      'Avoid "your fate is" or "you are destined"',
      'No direct translation of 七杀 as "Seven Killings"',
      'No "bad luck" — use "growth edge" or "challenge terrain"',
    ],
  },

  ja: {
    guide: `占い鑑定書のような丁寧語で書く（です・ます調）。
「〜の傾向があります」「〜が期待されます」など柔らかい表現を使う。
「縁」「絆」「運気の流れ」「開運」など日本の占い文化に馴染みのあるキーワードを活用する。
漢字術語はそのまま使用可（日本語読みを添える）。
ネガティブな内容は「充電期間」「内省の時期」「縁を育む季節」などポジティブな枠組みで表現する。`,
    examples: [
      'この時期は、内なる力を育む充電期間として大切に過ごしましょう。',
      'あなたの水の気質が、周囲との深い縁を結ぶ鍵となるでしょう。',
      '流れに逆らわず、柔軟に対応することで新たな道が開けてきます。',
    ],
    taboos: [
      '直接的な不吉表現は使わない（「凶」「災難が来る」など）',
      '「必ず〜になる」という断定表現を避ける',
      '七殺を「殺」という言葉で直接表現しない',
    ],
  },

  ko: {
    guide: `존댓말(합쇼체)로 작성할 것.
사주(四柱) 문화에 익숙한 한국식 표현을 우선 사용할 것.
한자 용어는 한글 표기와 함께 사용할 것 (예: 정관(正官)).
부정적 내용은 "성장의 기회", "내면 충전기", "도약의 준비 시간" 등 긍정적 프레이밍으로 전환할 것.
한국 특유의 "노력하면 된다"는 의지적 메시지를 포함할 것.`,
    examples: [
      '이 시기는 내면을 충전하고 다음 도약을 준비하는 소중한 시간입니다.',
      '두 분의 에너지가 서로 다른 방향을 가리키지만, 그 차이가 성장의 원동력이 됩니다.',
      '운의 흐름보다 당신의 선택이 더 큰 힘을 발휘하는 시기입니다.',
    ],
    taboos: [
      '"반드시 ~될 것이다"와 같은 단정적 표현 금지',
      '직접적인 흉조 표현 사용 금지',
      '七殺을 "칠살"로 그대로 번역하여 사용하지 말 것',
    ],
  },

  'zh-CN': {
    guide: `现代白话为主，口语化但有深度。
避免文言文和晦涩古语，用当代年轻人听得懂的语言。
情感共鸣优先——让用户感觉"说的就是我"。
"成长"、"情感"、"事业"是最有共鸣的三个主题。
建议要具体可执行：命盘依据 + 时间节点 + 可做的一步，不要泛泛而谈。`,
    examples: [
      '你骨子里是个追求极致的人，只是有时候跟自己较劲到忘了出口。',
      '今年的运势就像跑步——前半段爬坡，后半段顺风；年中适合先维护合伙人信任，少同时开两件大事。',
      '与其等待好运降临，不如从这三件事开始发力：本周把边界说清、下月再谈加码、情绪紧的周次把节奏放慢。',
    ],
    taboos: [
      '不要过度吉祥话，避免空洞套话',
      '禁止无命盘锚点与时间窗的空话：保持平衡、多沟通、顺其自然、注意情绪、相信自己、缘分天定',
      '建议须写成「依据 + 节点 + 可做的一步」',
      '不要直接说"大凶"、"灾难"等恐吓性语言',
      '避免繁体字词汇',
    ],
  },

  'zh-Hant': {
    guide: `文字雅致，帶有傳統文化底蘊，適合台港澳讀者。
使用繁體字，語氣沉穩而溫暖。
可引用或化用古典意象，但要讓現代人看得懂。
「緣分」、「運程」、「心境」是重要詞彙。
避免過度商業化語氣，保持東方哲學的文化厚度。
建議須具體可執行：命盤依據 + 時間節點 + 可做的一步，避免空洞套話。`,
    examples: [
      '您的木性能量，如春日新芽，在靜默中蓄積著破土而出的力量。',
      '這段時期適合收斂鋒芒，在沉澱中尋找方向；近月宜先談邊界再談承諾。',
      '緣分的深淺，在於雙方願意為彼此付出多少理解與耐心——衝突初起的一日內，宜先聽後辯。',
    ],
    taboos: [
      '不要使用簡體字詞彙',
      '避免過於白話的網路語言',
      '禁止無依據空話：保持平衡、多溝通、順其自然',
      '不要直接說「大凶」、「厄運」等負面詞彙',
    ],
  },

  de: {
    guide: `Schreibe in einem modernen, respektvollen Ton — professionell aber zugänglich.
Verwende "Sie" (formelle Anrede).
Deutsche Leser schätzen Struktur, Klarheit und Sachlichkeit — vermeide Schwärmerei.
Östliche Fachbegriffe mit Pinyin und chinesischen Originalzeichen beibehalten.
Negative Aspekte als "Entwicklungsphasen" oder "Bereiche der Aufmerksamkeit" formulieren.`,
    examples: [
      'Ihre Metallenergie gibt Ihnen Präzision und Entschlossenheit — Eigenschaften, die in dieser Phase besonders gefragt sind.',
      'Diese Zeit lädt Sie ein, innezuhalten und Ihre Energien neu auszurichten.',
      'Das scheinbare Hindernis ist in Wirklichkeit eine Einladung zur Weiterentwicklung.',
    ],
    taboos: [
      'Niemals "Sie werden definitiv..." oder "Ihr Schicksal ist..."',
      'Keine Übersetzung von 七杀 als "Sieben Mörder"',
      'Keine übermäßig mystischen oder esoterischen Formulierungen',
    ],
  },

  es: {
    guide: `Usa un tono cálido y respetuoso — tuteo o usted según el contexto.
Mantén los términos orientales con pinyin y caracteres originales.
Los lectores hispanohablantes aprecian la calidez emocional y las conexiones humanas.
Usa metáforas de la naturaleza, las estaciones y los viajes.
Los aspectos negativos deben enmarcarse como "oportunidades de crecimiento" o "períodos de reflexión".`,
    examples: [
      'Tu energía del Fuego te impulsa a brillar — este período te pide que compartas tu luz con el mundo.',
      'Ese momento de pausa que sientes no es un retroceso, sino una recarga necesaria.',
      'La tensión entre estas dos fuerzas en tu carta es precisamente lo que te da profundidad y resiliencia.',
    ],
    taboos: [
      'Nunca "estás destinado a..." o "tu suerte será..."',
      'No traducir 七杀 como "Siete Asesinos"',
      'Evitar expresiones de mala suerte directa',
    ],
  },

  vi: {
    guide: `Sử dụng giọng văn ấm áp, tôn trọng — xưng "bạn" hoặc "quý vị".
Người đọc Việt Nam coi trọng gia đình, cộng đồng và giá trị thực tiễn.
Giữ nguyên thuật ngữ phương Đông kèm phiên âm và ký tự gốc.
Lời khuyên thực tế, có thể thực hiện được là yếu tố quan trọng nhất với độc giả Việt.
Các tín hiệu tiêu cực nên được đóng khung là "cơ hội phát triển" hoặc "giai đoạn tích lũy".`,
    examples: [
      'Năng lượng Mộc của bạn đang ở giai đoạn tích lũy — hãy kiên nhẫn như cây đang bén rễ.',
      'Đây là thời điểm thích hợp để tập trung vào nội tâm và củng cố các mối quan hệ quan trọng.',
      'Những thử thách này không phải là rào cản, mà là bước đệm giúp bạn tiến xa hơn.',
    ],
    taboos: [
      'Không bao giờ nói "bạn chắc chắn sẽ..." hay "số phận của bạn là..."',
      'Tránh dịch trực tiếp 七杀 thành "Thất Sát" mà không giải thích',
      'Không dùng ngôn ngữ đe dọa hay gây lo sợ',
    ],
  },

  th: {
    guide: `ใช้ภาษาสุภาพ ครับ/ค่ะ ท้ายประโยค
ผู้อ่านชาวไทยเชื่อเรื่องกรรม บุญ และการสั่งสมบุญบารมี — สอดคล้องกับกรอบพุทธศาสนา
คงศัพท์ตะวันออกพร้อมพินอินและอักษรจีนต้นฉบับ
ใช้อุปมาจากธรรมชาติ ฤดูกาล และการเดินทางชีวิต
สัญญาณเชิงลบควรใช้กรอบการเจริญสติและการพัฒนาตนเอง`,
    examples: [
      'พลังงานธาตุน้ำของคุณในช่วงนี้เอื้อต่อการพัฒนาสติปัญญาและความเข้าใจตนเองครับ/ค่ะ',
      'ช่วงเวลานี้เป็นโอกาสดีในการสั่งสมบุญและเสริมสร้างความสัมพันธ์ที่ดีครับ/ค่ะ',
      'สิ่งที่ดูเหมือนอุปสรรคในวันนี้ อาจเป็นบทเรียนสำคัญที่ช่วยให้คุณก้าวหน้าในอนาคตครับ/ค่ะ',
    ],
    taboos: [
      'ห้ามพูดว่า "คุณจะต้อง..." หรือ "ชะตาของคุณคือ..."',
      'ห้ามแปล 七杀 โดยตรงว่า "เจ็ดฆาตกร"',
      'ห้ามใช้ภาษาที่ทำให้กลัวหรือวิตกกังวล',
    ],
  },
}

/**
 * Builds an enhanced locale tone block for injection into system prompts.
 *
 * @param locale - Target locale code (e.g. 'en', 'zh-CN', 'ja')
 * @param includeExamples - Whether to include example sentences (default: false to save tokens)
 */
export function buildEnhancedLocaleBlock(locale: string, includeExamples = false): string {
  // Normalize: 'zh' → 'zh-CN', 'zh-Hant' → 'zh-Hant'
  const key = locale === 'zh' ? 'zh-CN' : locale

  const entry = ENHANCED_LOCALE_TONES[key] ?? ENHANCED_LOCALE_TONES['en']!

  const lines: string[] = ['### 扩展语气与文化适配', entry.guide]

  if (includeExamples && entry.examples.length > 0) {
    lines.push(
      '',
      '#### 参考表达示例（仅供参考，不要照抄）',
      ...entry.examples.map((ex) => `- ${ex}`)
    )
  }

  lines.push('', '#### 文化禁区（严格遵守）', ...entry.taboos.map((t) => `- ${t}`))

  return lines.join('\n')
}
