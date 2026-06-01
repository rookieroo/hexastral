/**
 * scenario-feng components — Phase E Week 4.
 *
 * Most components depend on react-native (peer dep). Web consumers
 * (hexastral-web) currently re-implement compass UI directly with
 * DeviceOrientation; if web ever needs identical visuals, lift these
 * to a separate `@zhop/scenario-feng/components-web` entry.
 */

export { BaguaCompassOverlay, type BaguaCompassOverlayProps } from './BaguaCompassOverlay'
export { BaZhaiWheel, type BaZhaiWheelProps } from './BaZhaiWheel'
export { FacingCalibrator, type FacingCalibratorProps } from './FacingCalibrator'
export { FlyingStarsGrid, type FlyingStarsGridProps } from './FlyingStarsGrid'
