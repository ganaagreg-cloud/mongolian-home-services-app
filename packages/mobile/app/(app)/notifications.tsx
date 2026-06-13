import { useEffect } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import type { Notification } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { useApi } from '@/lib/use-api'

const AMBIENT_POLL_MS = 30_000

const TYPE_ICONS: Record<Notification['type'], string> = {
  order_accepted:    '✅',
  worker_on_the_way: '🚗',
  order_completed:   '🏁',
  order_cancelled:   '❌',
  payment_confirmed: '💳',
  admin_broadcast:   '📢',
}

export default function Notifications() {
  const { data: notifications, loading, error } = useApi<Notification[]>(
    '/api/notifications',
    AMBIENT_POLL_MS,
  )

  // Viewing the feed advances the notifications_read_at high-water-mark — clears the badge
  useEffect(() => {
    void apiFetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markNotificationsRead: true }),
    }).catch(() => {})
  }, [])

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-2 px-4 py-6">
      {loading && !notifications ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      {notifications && notifications.length === 0 ? (
        <View className="items-center gap-2 py-16">
          <Text className="text-4xl">🔔</Text>
          <Text className="text-sm text-gray-500">Мэдэгдэл байхгүй байна</Text>
        </View>
      ) : null}

      {(notifications ?? []).map((n) => (
        <View key={n.id} className="flex-row gap-3 rounded-xl border border-gray-200 p-4">
          <Text className="text-xl">{TYPE_ICONS[n.type]}</Text>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-gray-900">{n.title}</Text>
            <Text className="text-sm text-gray-600">{n.body}</Text>
            <Text className="mt-0.5 text-xs text-gray-400">
              {n.createdAt.slice(0, 10)} · {n.createdAt.slice(11, 16)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}
