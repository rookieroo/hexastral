import type { DivinationRecord } from '@zhop/hexastral-client'
import { useRouter } from 'expo-router'
import { ChevronLeft, Info } from 'lucide-react-native'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { useYichingHistoryQuery } from '@/lib/hooks/useYichingHistoryQuery'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function YichingHistoryScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const { data, isLoading } = useYichingHistoryQuery(userId)

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    card: isDark ? '#18181B' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    separator: isDark ? '#27272A' : '#E4E4E7',
  }

  const renderItem = ({ item }: { item: DivinationRecord }) => {
    return (
      <Pressable
        className='p-4 mb-3 border rounded-xl'
        style={{
          backgroundColor: ios.card,
          borderColor: ios.separator,
        }}
        onPress={() => {
          // Just an example view
        }}
      >
        <View className='flex-row justify-between mb-2'>
          <Text className='font-medium' style={{ color: ios.text }}>
            {item.question}
          </Text>
          <Text style={{ color: ios.secondary, fontSize: 12 }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text numberOfLines={2} style={{ color: ios.secondary, fontSize: 14, lineHeight: 20 }}>
          {item.summary || '...'}
        </Text>
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }} edges={['top']}>
      {/* Header */}
      <View
        className='flex-row items-center px-4 py-3 border-b'
        style={{ borderColor: ios.separator }}
      >
        <Pressable onPress={() => router.back()} className='p-2 -ml-2'>
          <ChevronLeft color={ios.text} size={24} />
        </Pressable>
        <Text className='flex-1 text-lg font-bold text-center' style={{ color: ios.text }}>
          卜卦记录
        </Text>
        <View className='w-8' />
      </View>

      {/* List */}
      {isLoading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator color={ios.text} />
        </View>
      ) : data?.length === 0 ? (
        <View className='flex-1 items-center justify-center p-8'>
          <Info color={ios.secondary} size={48} className='mb-4' />
          <Text style={{ color: ios.secondary }} className='text-center'>
            暂无记录
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}
