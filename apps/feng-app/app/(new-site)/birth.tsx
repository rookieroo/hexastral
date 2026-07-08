/**
 * Legacy route — birth info is optional on review; no longer a dedicated onboarding step.
 */

import { Redirect } from 'expo-router'

export default function BirthStepScreen() {
  return <Redirect href='/(new-site)/review' />
}
