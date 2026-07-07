/**
 * /[locale]/compass/learn — SEO long-form explainer for magnetic declination,
 * the 24-Mountain compass, and why feng-shui needs both.
 *
 * Targets the "what is magnetic declination" / "compass for feng shui" /
 * "罗盘 磁偏角" search queries that are the entry point for Fēng's funnel.
 *
 * Pure server component, no client JS. Long-form prose, plain typography.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

interface CompassLearnPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CompassLearnPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Magnetic Declination, True North, and Why Feng-Shui Needs Both · HexAstral',
    zh: '磁偏角、真北、与风水为何两者都需要 · HexAstral',
    tw: '磁偏角、真北、與風水為何兩者都需要 · HexAstral',
    ja: '磁気偏角、真北、そして風水で両方が必要な理由 · HexAstral',
  }
  const descriptions: Record<string, string> & { en: string } = {
    en: 'A compass needle points to magnetic north, but maps and feng-shui charts use true north. The difference — magnetic declination — varies from -20° to +15° around the world. Here is what that means for your feng-shui reading.',
    zh: '罗盘指针指向磁北，但地图与风水盘使用真北。两者之差——磁偏角——全球范围在 -20° 到 +15° 之间。这对你的风水读数意味着什么？',
    tw: '羅盤指針指向磁北，但地圖與風水盤使用真北。兩者之差——磁偏角——全球範圍在 -20° 到 +15° 之間。這對你的風水讀數意味著什麼？',
    ja: 'コンパスの針は磁北を指しますが、地図や風水盤は真北を使います。両者の差「磁気偏角」は世界で-20°から+15°まで変化します。',
  }
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: `https://hexastral.com/${locale === 'en' ? '' : `${locale}/`}compass/learn`,
    },
  }
}

const COPY: Record<string, ReturnType<typeof getEnCopy>> = {
  en: getEnCopy(),
  zh: getZhCopy(),
  tw: getTwCopy(),
  ja: getJaCopy(),
}

function getEnCopy() {
  return {
    h1: 'Magnetic declination, true north, and feng-shui',
    lead: 'A compass needle does not point to the north pole. It points to magnetic north, which is hundreds of kilometers from true north and drifts every year. The difference is called magnetic declination — and if you ignore it, your feng-shui bearings are wrong from the start.',
    sections: [
      {
        h2: 'Two norths',
        p: 'True north is what your map uses: the geographic pole, the axis the Earth spins around. Magnetic north is where a compass needle points: a wandering magnetic spot in northern Canada. The angle between them, at your location, is magnetic declination. In New York it is about 13° west. In Tokyo, 7° west. In London, almost zero. In Singapore, less than 1°.',
      },
      {
        h2: 'Why feng-shui practitioners care',
        p: 'Traditional 24-Mountain (二十四山) feng-shui divides the compass into 24 sectors of 15° each. Misaligning your reading by 7° can land you in the next mountain — a different trigram, a different element, a different prescription. The classical compasses (羅盤) measure against magnetic north, but modern feng-shui needs the result in true-north terms to align with maps, satellite imagery, and building orientations.',
      },
      {
        h2: 'How Compass handles it',
        p: 'On iOS, the system uses your GPS location to look up the WMM-2025 magnetic model and report true heading directly. The Compass app shows both magnetic and true headings, with the current declination value clearly displayed. On Android (V1.1) we embed the WMM tables so the correction works offline. On the web (V1) we show magnetic heading only — accurate enough for orientation but not for a final feng-shui audit. The native app fixes that.',
      },
      {
        h2: '24-Mountain — what each label means',
        p: 'The 24 mountains pair eight trigrams (八卦) with their adjacent earthly branches and heavenly stems. The "天元" (heaven dragon) mountains are the cardinals — 子 (north), 午 (south), 卯 (east), 酉 (west) — plus 乾 (NW), 坤 (SW), 艮 (NE), 巽 (SE). The "人元" (human dragon) and "地元" (earth dragon) groups sit beside them. The grouping matters in flying-star feng-shui because it picks which sub-mountain inside a palace determines whether a chart flies forward or backward.',
      },
      {
        h2: 'Bottom line',
        p: 'Open the Compass tool, get a bearing, and look up what mountain you are facing. For a structured site study report — flying-star chart, personal trigram notes, annual star context — open the Kanyu app with that bearing pre-filled. For entertainment and cultural study only; not professional feng-shui advice.',
      },
    ],
    nextCta: 'Open the compass',
    nextHref: '/compass/use',
    fengCta: 'Get the Fēng app for a full reading',
    fengHref: '/feng',
  }
}

function getZhCopy(): ReturnType<typeof getEnCopy> {
  return {
    h1: '磁偏角、真北与风水',
    lead: '罗盘指针并不指向北极。它指向磁北——一个距离真北数百公里、每年都在漂移的磁极点。两者之差称为磁偏角。忽略它，你的风水朝向从一开始就是错的。',
    sections: [
      {
        h2: '两种北',
        p: '真北是地图所用：地球自转轴所指的地理极点。磁北是罗盘指针所指：加拿大北部一处游走的磁场点。在你所在位置，两者夹角即磁偏角。纽约约 -13°（偏西），东京约 -7°，伦敦近零，新加坡 1° 以内。',
      },
      {
        h2: '风水师为何在意',
        p: '传统二十四山把罗盘分成 24 个 15° 扇区。读数偏 7° 就可能落入相邻一座山——卦象不同、五行不同、化解方案也不同。古法罗盘以磁北读数，但现代风水需要把结果换算到真北，才能与地图、卫星图与建筑物对齐。',
      },
      {
        h2: 'Compass 如何处理',
        p: 'iOS 端利用 GPS 定位查询 WMM-2025 磁场模型，直接返回真北朝向。Compass 同时显示磁北、真北与当前磁偏角值。Android 版（V1.1）内置 WMM 表，离线可用。Web 端 (V1) 只显示磁北——做定向够用；完整站点研习报告需 Kanyu App 的真北精度（文化研习，非专业风水服务）。',
      },
      {
        h2: '二十四山——每个名字的含义',
        p: '二十四山把八卦与相邻的地支天干配对。"天元龙"是四正——子（北）午（南）卯（东）酉（西）——加四隅 乾（西北）坤（西南）艮（东北）巽（东南）。"人元龙"与"地元龙"分坐左右。这个分组在玄空飞星里决定了一个宫位的同元龙小山是哪只，进而决定下卦顺飞还是逆飞。',
      },
      {
        h2: '结语',
        p: '打开 Compass，记下当前朝向，看看自己面向哪一座山。若要做结构化站点研习报告——玄空飞星、个人命卦参考、流年星语境——把这个朝向带入 Kanyu App（仅供娱乐与文化研习，非专业风水建议）。先了解家中各方位也是免费的。',
      },
    ],
    nextCta: '打开罗盘',
    nextHref: '/compass/use',
    fengCta: '下载 Fēng App 做完整解读',
    fengHref: '/feng',
  }
}

function getTwCopy(): ReturnType<typeof getEnCopy> {
  return {
    h1: '磁偏角、真北與風水',
    lead: '羅盤指針並不指向北極。它指向磁北——一個距離真北數百公里、每年都在漂移的磁極點。兩者之差稱為磁偏角。忽略它，你的風水朝向從一開始就是錯的。',
    sections: [
      {
        h2: '兩種北',
        p: '真北是地圖所用：地球自轉軸所指的地理極點。磁北是羅盤指針所指：加拿大北部一處游走的磁場點。在你所在位置，兩者夾角即磁偏角。紐約約 -13°（偏西），東京約 -7°，倫敦近零，新加坡 1° 以內。',
      },
      {
        h2: '風水師為何在意',
        p: '傳統二十四山把羅盤分成 24 個 15° 扇區。讀數偏 7° 就可能落入相鄰一座山——卦象不同、五行不同、化解方案也不同。古法羅盤以磁北讀數，但現代風水需要把結果換算到真北，才能與地圖、衛星圖與建築物對齊。',
      },
      {
        h2: 'Compass 如何處理',
        p: 'iOS 端利用 GPS 定位查詢 WMM-2025 磁場模型，直接返回真北朝向。Compass 同時顯示磁北、真北與當前磁偏角值。Android 版（V1.1）內置 WMM 表，離線可用。Web 端 (V1) 只顯示磁北——做定向夠用，但風水審查需要原生 App 才有的真北精度。',
      },
      {
        h2: '二十四山——每個名字的含義',
        p: '二十四山把八卦與相鄰的地支天干配對。「天元龍」是四正——子（北）午（南）卯（東）酉（西）——加四隅 乾（西北）坤（西南）艮（東北）巽（東南）。「人元龍」與「地元龍」分坐左右。這個分組在玄空飛星裡決定了一個宮位的同元龍小山是哪只，進而決定下卦順飛還是逆飛。',
      },
      {
        h2: '結語',
        p: '打開 Compass，記下當前朝向，看看自己面向哪一座山。若要做完整解讀——玄空飛星、個人吉位、流年方位建議——把這個朝向帶入 Fēng App，或先了解一下家中各方位也是免費的。',
      },
    ],
    nextCta: '打開羅盤',
    nextHref: '/compass/use',
    fengCta: '下載 Fēng App 做完整解讀',
    fengHref: '/feng',
  }
}

function getJaCopy(): ReturnType<typeof getEnCopy> {
  return {
    h1: '磁気偏角、真北、そして風水',
    lead: 'コンパスの針は北極を指しません。磁北——真北から数百キロ離れ、毎年動いている磁気の点——を指します。両者の差を磁気偏角と呼びます。これを無視すると、風水の方位は最初から狂います。',
    sections: [
      {
        h2: '二つの北',
        p: '真北は地図が使う、地球の自転軸が指す地理的な極。磁北はコンパスの針が指す、カナダ北部の動く磁気の点。あなたの位置でその間の角度が磁気偏角です。ニューヨークは約 -13°、東京は約 -7°、ロンドンはほぼゼロ、シンガポールは 1° 以内。',
      },
      {
        h2: '風水師がこだわる理由',
        p: '伝統的な二十四山はコンパスを 24 個の 15° 扇に分けます。7° のずれで隣の山に入り、卦も五行も処方も変わります。古来の羅盤は磁北で測りますが、現代の風水では地図・衛星画像・建物方位と合わせるため、結果を真北系に変換する必要があります。',
      },
      {
        h2: 'Compass の対応',
        p: 'iOS では GPS 位置情報をもとに WMM-2025 磁気モデルを参照し、直接真北方位を返します。Compass は磁北・真北・現在の磁気偏角値を同時表示。Android (V1.1) では WMM テーブルを組み込み、オフライン補正に対応。Web (V1) は磁北のみ表示——方位確認には十分ですが、最終的な風水鑑定には iOS アプリの真北精度が必要です。',
      },
      {
        h2: '二十四山——それぞれの意味',
        p: '二十四山は八卦と隣接する十二支・十干を対にします。「天元龍」は四正方位——子（北）午（南）卯（東）酉（西）——と四隅 乾（北西）坤（南西）艮（北東）巽（南東）。「人元龍」「地元龍」がその左右に座ります。玄空飛星ではこのグループ分けが、宮内のどの小山が下卦の順逆を決めるかに関わります。',
      },
      {
        h2: '結び',
        p: 'Compass を開いて方位を確認し、どの山に向いているか見てみてください。本格的な鑑定——玄空飛星・個人の吉方位・流年方位——には、その方位を Fēng アプリに引き継ぐと便利です。あるいは家のおおまかな方位を知るだけでも十分役立ちます。',
      },
    ],
    nextCta: 'コンパスを開く',
    nextHref: '/compass/use',
    fengCta: 'Fēng アプリで本格鑑定',
    fengHref: '/feng',
  }
}

export default async function CompassLearnPage({ params }: CompassLearnPageProps) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  if (!copy) return null

  const prefix = locale === 'en' ? '' : `${locale}/`

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#18181B',
        paddingTop: '96px',
        paddingBottom: '96px',
        paddingLeft: '28px',
        paddingRight: '28px',
      }}
    >
      <article style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.18,
            fontWeight: 300,
            letterSpacing: -0.4,
            marginBottom: 24,
          }}
        >
          {copy.h1}
        </h1>
        <p
          style={{
            fontSize: 19,
            lineHeight: 1.55,
            color: 'rgba(24,24,27,0.78)',
            marginBottom: 48,
            fontWeight: 400,
          }}
        >
          {copy.lead}
        </p>

        {copy.sections.map((section) => (
          <section key={section.h2} style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 500,
                marginBottom: 10,
                letterSpacing: -0.1,
              }}
            >
              {section.h2}
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: 'rgba(24,24,27,0.84)',
                letterSpacing: 0.1,
              }}
            >
              {section.p}
            </p>
          </section>
        ))}

        <div
          style={{
            marginTop: 64,
            paddingTop: 32,
            borderTop: '0.5px solid rgba(24,24,27,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <Link
            href={`/${prefix}${copy.nextHref.replace(/^\//, '')}`}
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#0F1E26',
              borderBottom: '1px solid #0F1E26',
              alignSelf: 'flex-start',
              paddingBottom: 4,
              textDecoration: 'none',
            }}
          >
            {copy.nextCta} →
          </Link>
          <Link
            href={`/${prefix}${copy.fengHref.replace(/^\//, '')}`}
            style={{
              fontSize: 13,
              color: 'rgba(24,24,27,0.6)',
              letterSpacing: 0.4,
              textDecoration: 'none',
            }}
          >
            {copy.fengCta} →
          </Link>
        </div>
      </article>
    </main>
  )
}
