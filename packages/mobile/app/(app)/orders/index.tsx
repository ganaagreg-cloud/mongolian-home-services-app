import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { Order } from '@homeservices/shared'

import { formatMnt, formatSchedule, OPEN_STATUSES, ORDER_STATUS_LABELS } from '@/lib/format'
import { useApi } from '@/lib/use-api'

const AMBIENT_POLL_MS = 30_000

type Tab = 'active' | 'past'

export default function Orders() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('active')
  const { data: orders, loading, error } = useApi<Order[]>('/api/orders', AMBIENT_POLL_MS)

  const filtered = (orders ?? []).filter((o) =>
    tab === 'active' ? OPEN_STATUSES.includes(o.status) : !OPEN_STATUSES.includes(o.status),
  )

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      <View className="flex-row rounded-xl bg-gray-100 p-1">
        {([['active', 'Идэвхтэй'], ['past', 'Түүх']] as const).map(([value, label]) => (
          <Pressable
            key={value}
            className={`flex-1 items-center rounded-lg py-2 ${tab === value ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab(value)}
          >
            <Text className={`text-sm ${tab === value ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      {!loading && filtered.length === 0 ? (
        <View className="items-center gap-2 py-16">
          <Text className="text-4xl">📋</Text>
          <Text className="text-sm text-gray-500">
            {tab === 'active' ? 'Идэвхтэй захиалга байхгүй байна' : 'Өмнөх захиалга байхгүй байна'}
          </Text>
        </View>
      ) : null}

      {filtered.map((o) => (
        <Pressable
          key={o.id}
          className="gap-1.5 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: o.id } })}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900">{o.service}</Text>
            <Text className="text-sm font-bold text-gray-900">{formatMnt(o.totalAmount)}</Text>
          </View>
          <Text className="text-xs text-gray-500">{formatSchedule(o.scheduledDate)}</Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>{o.address}</Text>
          <View className="mt-1 self-start rounded-full bg-gray-100 px-2.5 py-1">
            <Text className="text-xs font-medium text-gray-700">{ORDER_STATUS_LABELS[o.status]}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  )
}
