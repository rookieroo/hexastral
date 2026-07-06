import { Redirect } from 'expo-router'

/** Legacy route — settings moved to `/(tabs)/profile`. */
export default function SettingsRedirect() {
  return <Redirect href='/(tabs)/profile' />
}
