/**
 * 🌐 LanguagePickerModal
 *
 * iOS 风格底部弹层，选择 App 语言。
 * 当前语言以勾选标记高亮。
 */

import { Check } from 'lucide-react-native'
import { Modal, Pressable, Text, View } from 'react-native'
import { LOCALE_NAMES, useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { hapticSelection } from '@/lib/ux/haptics'

type Props = {
  visible: boolean
  onClose: () => void
}

export function LanguagePickerModal({ visible, onClose }: Props) {
  const { colors } = useTheme()
  const { locale, changeLocale, locales } = useI18n()

  function handleSelect(loc: (typeof locales)[number]) {
    if (loc !== locale) {
      changeLocale(loc)
      hapticSelection()
    }
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: 40,
            }}
          >
            {/* 拖动条 */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            {/* 标题 */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.text,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              Language · 语言
            </Text>

            {/* 语言列表 */}
            {locales.map((loc, index) => {
              const isSelected = loc === locale
              const isLast = index === locales.length - 1
              return (
                <Pressable
                  key={loc}
                  onPress={() => handleSelect(loc)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 24,
                      paddingVertical: 16,
                      borderBottomWidth: isLast ? 0 : 0.5,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 0,
                        backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      {isSelected && <Check size={16} color={colors.primary} />}
                    </View>
                    <Text
                      style={{
                        fontSize: 16,
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '600' : '400',
                        flex: 1,
                      }}
                    >
                      {LOCALE_NAMES[loc]}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
