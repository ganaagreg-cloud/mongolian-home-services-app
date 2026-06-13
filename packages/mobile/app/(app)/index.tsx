import { useCallback } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'

import { authClient } from '@/lib/auth-client'
import { useApi } from '@/lib/use-api'
import type { ServiceTypeRow } from '@/lib/types'

const BADGE_POLL_MS = 30_000

export default function Home() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { data: serviceTypes, loading, error } = useApi<ServiceTypeRow[]>('/api/service-types')
  const { data: badge, refetch: refetchBadge } = useApi<{ count: number }>(
    '/api/notifications/badge',
    BADGE_POLL_MS,
  )

  // Returning from the notifications feed must clear the badge immediately
  useFocusEffect(
    useCallback(() => {
      void refetchBadge()
    }, [refetchBadge]),
  )

  const unread = badge?.count ?? 0

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      <View className="flex-row items-center justify-between">
        <Text className="shrink text-lg font-bold text-gray-900">
          Сайн байна уу, {session?.user.name ?? ''}
        </Text>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          onPress={() => router.push('/notifications')}
        >
          <Text className="text-xl">🔔</Text>
          {unread > 0 ? (
            <View className="absolute right-0 top-0 min-w-4 items-center rounded-full bg-red-600 px-1">
              <Text className="text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="flex-row gap-3">
        <Link href="/orders" asChild>
          <Pressable className="flex-1 items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50">
            <Text className="text-xl">📋</Text>
            <Text className="text-sm font-medium text-gray-900">Захиалгууд</Text>
          </Pressable>
        </Link>
        <Link href="/workers" asChild>
          <Pressable className="flex-1 items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50">
            <Text className="text-xl">🧹</Text>
            <Text className="text-sm font-medium text-gray-900">Ажилчид</Text>
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable className="flex-1 items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50">
            <Text className="text-xl">👤</Text>
            <Text className="text-sm font-medium text-gray-900">Профайл</Text>
          </Pressable>
        </Link>
      </View>

      <Text className="mt-2 text-base font-semibold text-gray-900">Үйлчилгээ сонгох</Text>

      {loading ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <View className="flex-row flex-wrap gap-3">
        {(serviceTypes ?? []).map((st) => (
          <Pressable
            key={st.id}
            className="w-[47%] gap-1 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
            onPress={() => router.push({ pathname: '/book/[serviceTypeId]', params: { serviceTypeId: String(st.id) } })}
          >
            <Text className="text-2xl">{st.icon}</Text>
            <Text className="text-sm font-semibold text-gray-900">{st.name_mn}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
