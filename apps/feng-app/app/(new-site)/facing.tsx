/**
 * Legacy route — facing merged into (new-site)/address step 1 (locate + orient).
 */

import { Redirect } from 'expo-router'

export default function FacingScreen() {
  return <Redirect href='/(new-site)/address' />
}
