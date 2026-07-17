import { Redirect } from 'expo-router'

/** Legacy deep links enter the motion-causal casting flow instead of creating a random cast. */
export default function CastRedirectScreen() {
  return <Redirect href='/(tabs)' />
}
