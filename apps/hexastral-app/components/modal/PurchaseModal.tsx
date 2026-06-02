/**
 * 单次购买确认弹窗
 *
 * 当 API 返回 purchase_required (guard.purchaseRequired 有值) 时显示。
 * 提供两个操作路径:
 *   1. 单次解锁 → purchaseSingleReading → onSuccess()
 *   2. 订阅 Pro → onSubscribe()
 */

import { Sparkles, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BaseModal } from '@/components/modal/BaseModal'
import { Button } from '@/components/ui/Button'
import { purchaseSingleReading, type SingleSkuId } from '@/lib/domain/subscription'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface PurchaseModalProps {
  visible: boolean
  skuId: string
  iapProductId: string
  price: string
  onClose: () => void
  onSuccess: () => void
  onSubscribe: () => void
}

export function PurchaseModal({
  visible,
  skuId,
  iapProductId: _iapProductId, // passed for context; purchaseSingleReading uses skuId
  price,
  onClose,
  onSuccess,
  onSubscribe,
}: PurchaseModalProps) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const [purchasing, setPurchasing] = useState(false)

  const handlePurchase = async () => {
    setPurchasing(true)
    const success = await purchaseSingleReading(skuId as SingleSkuId)
    setPurchasing(false)
    if (success) {
      onSuccess()
    }
  }

  const _titleKey = `${skuId.replace(/_/g, '')}_title` // best-effort, falls through to generic

  return (
    <BaseModal visible={visible} onDismiss={onClose} position='bottom' animationType='fade'>
      <View
        style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 24,
          paddingBottom: 40,
        }}
      >
        {/* Close */}
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
          hitSlop={12}
        >
          <X size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Icon */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: isDark ? '#27272A' : '#F4F4F5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} color={colors.accent} strokeWidth={1.2} />
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {t(`shop_${skuId}_title` as never) ?? t('sku_detail_start')}
        </Text>

        {/* Price info */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '300',
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          {t('shop_single_price' as never, { price } as never)}
        </Text>

        {/* Primary CTA */}
        <Button
          variant='default'
          size='lg'
          onPress={handlePurchase}
          loading={purchasing}
          style={{ marginBottom: 12 }}
        >
          {t('sku_detail_single_cta' as never, { price } as never)}
        </Button>

        {/* Secondary: subscribe link */}
        <Button variant='ghost' size='sm' onPress={onSubscribe}>
          {t('sku_detail_or_subscribe')}
        </Button>
      </View>
    </BaseModal>
  )
}
