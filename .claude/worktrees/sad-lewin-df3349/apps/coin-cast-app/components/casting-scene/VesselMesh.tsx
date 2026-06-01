// @ts-nocheck — R3F + RN JSX intrinsics (see CastingScene.tsx).
import { VESSEL_RADIUS } from './constants'

export function VesselMesh({
  rimColor = '#2c2824',
  bowlColor = '#1f1c19',
}: {
  rimColor?: string
  bowlColor?: string
}) {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[VESSEL_RADIUS * 0.92, 0.03, 12, 48]} />
        <meshStandardMaterial color={rimColor} roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry
          args={[VESSEL_RADIUS * 0.82, VESSEL_RADIUS * 0.52, 0.07, 40, 1, false]}
        />
        <meshStandardMaterial color={bowlColor} roughness={0.78} metalness={0.06} />
      </mesh>
    </group>
  )
}
