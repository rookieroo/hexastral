/**
 * DEV preview — the LOCKED synastry card design (chapter-en) with hardcoded
 * English sample data (Metal × Fire), so it can be QA'd on device without
 * deploying svc-astro or regenerating a bond. Reachable via /_sitemap or the
 * home DEV row. Not linked from production; safe to leave or delete.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { ChapterPager, type SynastryChapter, type SynastryReport } from '@zhop/scenario-kindred'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { Dimensions, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InkCenterpiece } from '@/components/ink/InkCenterpiece'

const CHAPTERS: SynastryChapter[] = [
  {
    kind: 'first_impression',
    title: 'First Impression',
    goldenLine:
      'When metal meets fire, the first glance both lights you and burns you — you keep his heat, he keeps your light.',
    body: '',
    evidence:
      'Your day master is Geng Metal — keen, holding its light within; his is Bing Fire — blazing, thrown outward. The two light each other at once; neither can treat the other as background.',
    dynamic:
      'It catches at first sight: he is drawn to your cool, you are lit by his blaze. After the first meeting, neither of you forgets the other.',
    reef: 'A glance that bright mistakes the person for the light itself. When the glow fades, the gap is widest — don’t let one look make every judgment for you.',
    severity: 'mid',
    remedy:
      'Let the light settle slowly. Through ordinary days and many meetings, turn “that brightness” back into “that person”, and both heat and light find a place to rest.',
    yongshen: '土',
    counterpoint:
      'Yin and yang already hold each other — the first pull runs this strong because your fields fit by nature, not by chance.',
  },
  {
    kind: 'communication',
    title: 'Communication',
    goldenLine:
      'He speaks like fire, straight at you; you ring back like struck metal. It isn’t that you won’t listen — the frequency is just too loud.',
    body: '',
    evidence:
      'His Bing Fire bears down on your Geng Metal, so in talk he naturally presses you a step; yet his month stem feeds the fire and your hour stem cools the metal — it isn’t all war.',
    dynamic:
      'He wants it said clearly, you want room left. The harder he asks, the quieter you go — your silence isn’t coldness, it’s you lowering the fire.',
    reef: 'Fire-and-metal talk turns a discussion into a contest fast: his directness reads to you as pressure, your restraint reads to him as distance.',
    severity: 'high',
    remedy:
      'Let Earth mediate — bring the talk down to the concrete (Earth is trust). Agree to “repeat back, then answer”, so the heat passes through Earth before it reaches Metal.',
    yongshen: '土',
    counterpoint:
      'Speech leaves the mouth in measured beats — what you lack is never words, but the breath between them.',
  },
  {
    kind: 'conflict',
    title: 'Sources of Friction',
    goldenLine:
      'Your clash is fire against metal — the more he burns, the sharper you turn. Yet this is the very fire that forges you into form.',
    body: '',
    evidence:
      'Your day pillars sit in direct clash (Zi–Wu); your month pillars clash again (Mao–You). Metal and fire are at war at the chart’s core, and his Bing Fire bears down on your Geng Metal. The friction is structural — not a passing quarrel.',
    dynamic:
      'He comes straight at you like flame; you ring back like struck metal. The harder you both try, the louder it gets — and what you fight over is rarely the point. It’s who lowers the fire first.',
    reef: 'Two clashes stack on the day and month pillars — arguments slide fastest from the issue to the person. When fire overwhelms, it is the metal that gets hurt; over a long burn, the one wounded first is usually you.',
    severity: 'high',
    remedy:
      'Your bridging element is Earth. Fire feeds Earth, Earth feeds Metal — let Earth mediate and the burning turns to nourishing. Build one steady structure together; give both edges a place to rest.',
    yongshen: '土',
    counterpoint:
      'Only your hour pillars combine (Yin–Hai) — alone, with the world shut out, you reconcile best. The far side of friction is a closeness no one else can enter.',
  },
  {
    kind: 'complement',
    title: 'Where You Complete',
    goldenLine:
      'You take shape under fire; he takes form under metal. What each of you lacks is exactly the other’s strength.',
    body: '',
    evidence:
      'Fire feeds Earth, Earth feeds Metal — his Bing Fire warms your Geng Metal’s cold; your Metal feeds Water, which cools his fire’s dryness. There is a generative path, not only control.',
    dynamic:
      'He gives you warmth and drive; you give him an edge and a boundary. He charges, you steady; he scatters, you gather — one pushing, one holding, exactly a circle.',
    reef: 'Complement can turn into dependence: he leans on you to finish things, you become his brake. Fill the gap — don’t become the substitute.',
    severity: 'low',
    remedy:
      'Keep it on “generate”, not “control” — with Earth as the hinge (Fire→Earth→Metal), receive the other’s strength as nourishment, not pressure.',
    yongshen: '土',
    counterpoint:
      'A lid meets its vessel — always two pieces. They fit because each is whole, not because either is broken.',
  },
  {
    kind: 'monthly_outlook',
    title: 'This Month',
    goldenLine:
      'This month, fire runs high. He grows quicker, you grow colder — on a windy ridge, keep words light and moves slow.',
    body: '',
    evidence:
      'The month enters Wu, fire’s season — his Bing Fire finds its ground, your Geng Metal takes the forging. Metal and fire already war; the month adds one more flame.',
    dynamic:
      'This month he leads, you follow; he flares up easily, you slip away. Small things catch fire fastest in this stretch.',
    reef: 'Wu’s fire strikes your day-pillar Zi–Wu clash head-on — mid-month (the solstice run) is the high-risk window; watch for one old account reopening.',
    severity: 'high',
    remedy:
      'Drain fire through Earth: this month do grounded things together (shared errands, ordering the home) — channel the heat into the concrete, not into words.',
    yongshen: '土',
    counterpoint:
      'The moon waxes and wanes — this fire, entering Wei next month, turns to Earth and drains on its own. No need to brace.',
  },
  {
    kind: 'long_term_advice',
    title: 'The Long View',
    goldenLine:
      'Fate sets the bounds; you choose the bridge. Fire on metal can wound, or it can forge — the difference is only whether there is Earth between you.',
    body: '',
    evidence:
      'The whole knot is metal and fire at war; the bridging element is Earth. Fire feeds Earth, Earth feeds Metal — one Earthen path turns the burning into nourishing.',
    dynamic:
      'Lasting isn’t putting out the fire but cultivating Earth: whatever settles you both — a shared home, a rhythm to rely on, a promise kept — is Earth.',
    reef: 'The biggest risk is clashing with no Earth — only arguing right and wrong, with nothing built together. Fire and metal without Earth grow thinner the longer they burn.',
    severity: 'low',
    remedy:
      'Your key is Earth, made concrete in three: one shared rhythm of home, one long goal carried together, one ritual for resetting after a fight. With Earth thick, fire and metal each find their place.',
    yongshen: '土',
    counterpoint:
      'A figure swims the long current — a bond isn’t the absence of friction, but the will, after the clash, to wade on together.',
  },
]

const REPORT: SynastryReport = {
  id: 'preview',
  headline: 'Metal × Fire',
  chapters: CHAPTERS,
}

export default function ChapterPreview() {
  const [index, setIndex] = useState(0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredPaper.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 12, letterSpacing: 2, color: kindredPaper.muted }}>
          DEV · SYNASTRY PREVIEW
        </Text>
        <Text style={{ fontSize: 12, letterSpacing: 1, color: kindredPaper.cinnabar }}>
          {`${index + 1} / ${CHAPTERS.length} · swipe`}
        </Text>
      </View>
      <ChapterPager
        report={REPORT}
        currentIndex={index}
        onIndexChange={setIndex}
        onShareChapter={() => {}}
        aElement='Metal'
        bElement='Fire'
        locale='en'
        renderCenterpiece={(ch) => (
          <InkCenterpiece kind={ch.kind} width={Dimensions.get('window').width - 44} />
        )}
      />
    </SafeAreaView>
  )
}
