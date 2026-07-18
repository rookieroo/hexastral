import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_DONE_KEY = 'xingqi_onboarding_complete_v1'

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

export async function isOnboardingComplete(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) != null
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_DONE_KEY)
}
