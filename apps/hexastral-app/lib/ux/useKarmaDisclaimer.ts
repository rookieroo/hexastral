/**
 * 因果免责声明同意状态管理
 *
 * 首次启动时显示免责声明弹窗
 * 用户同意后存储到 AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const DISCLAIMER_ACCEPTED_KEY = 'hexastral_disclaimer_accepted'
const DISCLAIMER_VERSION = '1.0' // 更新版本号可强制重新显示

export function useKarmaDisclaimer() {
  const [loading, setLoading] = useState(true)
  const [hasAccepted, setHasAccepted] = useState(false)

  useEffect(() => {
    checkDisclaimerStatus()
  }, [checkDisclaimerStatus])

  async function checkDisclaimerStatus() {
    try {
      const value = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY)
      setHasAccepted(value === DISCLAIMER_VERSION)
    } catch (error) {
      console.error('Error checking disclaimer status:', error)
      setHasAccepted(false)
    } finally {
      setLoading(false)
    }
  }

  const acceptDisclaimer = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, DISCLAIMER_VERSION)
      setHasAccepted(true)
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error)
      // 即使保存失败也允许用户继续使用
      setHasAccepted(true)
    }
  }, [])

  return {
    loading,
    hasAccepted,
    showDisclaimer: !loading && !hasAccepted,
    acceptDisclaimer,
  }
}
