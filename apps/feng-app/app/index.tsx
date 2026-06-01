/**
 * Boot redirect.
 *
 * Once auth + client are wired, hop straight into the tabs surface. The
 * (new-site) flow is entered via the empty-state CTA or the "+ Add" button
 * in the sites tab.
 */

import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href='/(tabs)' />
}
