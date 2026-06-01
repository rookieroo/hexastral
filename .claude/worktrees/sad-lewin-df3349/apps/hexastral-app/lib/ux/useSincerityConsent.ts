/**
 * 诚心则灵同意状态管理 (§六B-1)
 *
 * 用户第一次触发占卜前显示 SincerityConsentModal
 * 同意后存储到 AsyncStorage
 * 独立于 useKarmaDisclaimer（法律免责声明）
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const SINCERITY_KEY = 'hexastral_sincerity_consent'
const SINCERITY_VERSION = '1.0' // 更新版本号可强制重新显示

export function useSincerityConsent() {
  const [loading, setLoading] = useState(true)
  const [hasConsented, setHasConsented] = useState(false)

  useEffect(() => {
    checkConsentStatus()
  }, [checkConsentStatus])

  async function checkConsentStatus() {
    try {
      const value = await AsyncStorage.getItem(SINCERITY_KEY)
      setHasConsented(value === SINCERITY_VERSION)
    } catch (error) {
      console.error('Error checking sincerity consent:', error)
      setHasConsented(false)
    } finally {
      setLoading(false)
    }
  }

  const grantConsent = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SINCERITY_KEY, SINCERITY_VERSION)
      setHasConsented(true)
    } catch (error) {
      console.error('Error saving sincerity consent:', error)
      // 即使保存失败也允许继续
      setHasConsented(true)
    }
  }, [])

  return {
    loading,
    hasConsented,
    showSincerityModal: !loading && !hasConsented,
    grantConsent,
  }
}
