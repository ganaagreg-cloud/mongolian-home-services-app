import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'

import { authClient } from '@/lib/auth-client'
import { useApi } from '@/lib/use-api'
import type { MeProfile } from '@/lib/types'

const MENU: { href: Href; icon: string; label: string }[] = [
  { href: '/profile/personal-info', icon: '👤', label: 'Хувийн мэдээлэл' },
  { href: '/profile/saved-workers', icon: '⭐', label: 'Хадгалсан ажилчид' },
  { href: '/profile/help',          icon: '❓', label: 'Тусламж' },
  { href: '/profile/privacy',       icon: '🔒', label: 'Нууцлалын бодлого' },
]

export default function Profile() {
  const router = useRouter()
  const { data: me, loading } = useApi<MeProfile>('/api/me')

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      {loading ? <ActivityIndicator className="mt-4" /> : null}

      {me ? (
        <View className="items-center gap-1 py-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-3xl font-bold text-gray-500">{(me.name || '?')[0]}</Text>
          </View>
          <Text className="mt-2 text-lg font-bold text-gray-900">{me.name}</Text>
          {me.email ? <Text className="text-sm text-gray-500">{me.email}</Text> : null}
          {me.phone ? <Text className="text-sm text-gray-500">{me.phone}</Text> : null}
        </View>
      ) : null}

      <View className="overflow-hidden rounded-xl border border-gray-200">
        {MENU.map((item, i) => (
          <Pressable
            key={item.label}
            className={`flex-row items-center gap-3 px-4 py-4 active:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            onPress={() => router.push(item.href)}
          >
            <Text className="text-lg">{item.icon}</Text>
            <Text className="flex-1 text-base text-gray-900">{item.label}</Text>
            <Text className="text-gray-300">›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        className="items-center rounded-xl border border-red-200 px-4 py-3 active:bg-red-50"
        onPress={() => void authClient.signOut()}
      >
        <Text className="text-base font-semibold text-red-600">Гарах</Text>
      </Pressable>
    </ScrollView>
  )
}
