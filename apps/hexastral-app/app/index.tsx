/**
 * 应用入口路由器 — 只做路由决策，无登录拦截
 *
 * 优先级:
 *   1. DDL KV 命中 → 跳过 onboarding，直达 /(tabs)/（Home Tab）
 *   2. 未完成引导 → /onboarding（极简三张卡）
 *   3. 其他   → /(tabs)/（Guest 自动登入，可从 You Tab 升级 Apple 登录）
 *
 * 背景色与 splash 一致（Zinc-950/#09090B），消除闪烁
 */

import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, useColorScheme, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { getBirthInfo } from '@/lib/domain/birthInfo'
import { hasCompletedOnboarding, markOnboardingComplete } from './(auth)/onboarding'

export default function AppRouter() {
  const { isLoading } = useAuth()
  const colorScheme = useColorScheme()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    async function checkOnboarding() {
      const done = await hasCompletedOnboarding()
      if (done) {
        setNeedsOnboarding(false)
        setOnboardingChecked(true)
        return
      }

      // DDL bypass: if birth info was restored from H5 (DDL KV hit),
      // skip onboarding entirely — user already entered their data on the web
      const birthInfo = await getBirthInfo()
      if (birthInfo.solarDate) {
        await markOnboardingComplete()
        setNeedsOnboarding(false)
        setOnboardingChecked(true)
        return
      }

      setNeedsOnboarding(true)
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [])

  if (isLoading || !onboardingChecked) {
    const bg = colorScheme === 'dark' ? '#09090B' : '#FAFAFA'
    return (
      <View
        style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator color={colorScheme === 'dark' ? '#A1A1AA' : '#71717A'} />
      </View>
    )
  }

  if (needsOnboarding) return <Redirect href='/onboarding' />
  return <Redirect href='/(tabs)' />
}
