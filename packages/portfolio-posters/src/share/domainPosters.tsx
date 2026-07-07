import { Text } from 'react-native'
import { BaseSharePoster } from './BaseSharePoster'

interface DomainPosterProps {
  shareUrl: string
  headline: string
}

export function CoinCastSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='CoinCast' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] hexagram_brush_mark.png
      </Text>
    </BaseSharePoster>
  )
}

export function DreamSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='DreamRead' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] dream_symbol_ornament.png
      </Text>
    </BaseSharePoster>
  )
}

export function EightPillarsSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='EightPillars' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] wuxing_seal_stamp.png
      </Text>
    </BaseSharePoster>
  )
}

export function FaceReadSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='FaceRead' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] face_map_overlay.png
      </Text>
    </BaseSharePoster>
  )
}

export function YuelSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='Yuel' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] dual_orbit_thread.png
      </Text>
    </BaseSharePoster>
  )
}

/** @deprecated Use YuelSharePoster */
export const SoulMatchSharePoster = YuelSharePoster

export function StarPalaceSharePoster(props: DomainPosterProps) {
  return (
    <BaseSharePoster title='StarPalace' subtitle={props.headline} shareUrl={props.shareUrl}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20 }}>
        [asset-slot] palace_arc_ornament.png
      </Text>
    </BaseSharePoster>
  )
}
