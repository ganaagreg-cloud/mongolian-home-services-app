import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Order } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'

const POLL_MS = 3000

export default function ConfirmOrder() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const matchingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        const res = await apiFetch(`/api/orders/${orderId}`)
        const body = (await res.json()) as ApiResponse<Order>
        if (cancelled) return
        if (!body.success) {
          setError(body.error)
          return
        }
        setOrder(body.data)

        // Client drives the match loop while the order is searching
        if (body.data.status === 'searching_worker' && !matchingRef.current) {
          matchingRef.current = true
          try {
            await apiFetch(`/api/orders/${orderId}/match`, { method: 'POST' })
          } catch {
            // transient — next poll retries
          } finally {
            matchingRef.current = false
          }
        }
      } catch {
        // transient — next poll retries
      }
    }

    void tick()
    const interval = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderId])

  if (error) {
    return <Text className="mt-12 text-center text-sm text-red-600">{error}</Text>
  }
  if (!order) return <ActivityIndicator className="mt-12" />

  const searching =
    order.status === 'searching_worker' || order.status === 'pending_worker_acceptance'
  const assigned =
    order.status === 'worker_assigned' ||
    order.status === 'worker_on_the_way' ||
    order.status === 'in_progress'
  const failed = order.status === 'no_workers_found'

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="grow justify-center gap-4 px-4 py-6">
      {searching ? (
        <View className="items-center gap-3">
          <ActivityIndicator size="large" />
          <Text className="text-lg font-semibold text-gray-900">
            {order.status === 'searching_worker'
              ? 'Ажилтан хайж байна…'
              : 'Ажилтан хариу өгөхийг хүлээж байна…'}
          </Text>
          <Text className="text-sm text-gray-500">Төлбөр баталгаажсан</Text>
        </View>
      ) : null}

      {assigned ? (
        <View className="items-center gap-3">
          <Text className="text-5xl">✅</Text>
          <Text className="text-xl font-bold text-gray-900">Ажилтан оллоо!</Text>
          <View className="w-full gap-2 rounded-xl border border-gray-200 p-4">
            <Row label="Ажилтан" value={order.workerName ?? ''} />
            <Row label="Үйлчилгээ" value={order.service} />
            <Row label="Огноо" value={order.scheduledDate} />
            <Row label="Хаяг" value={order.address} />
            <Row label="Нийт дүн" value={formatMnt(order.totalAmount)} />
          </View>
        </View>
      ) : null}

      {failed ? (
        <View className="items-center gap-3">
          <Text className="text-5xl">😔</Text>
          <Text className="text-lg font-semibold text-gray-900">Ажилтан олдсонгүй</Text>
          <Text className="text-center text-sm text-gray-500">
            Одоогоор боломжтой ажилтан байхгүй байна. Дараа дахин оролдоно уу.
          </Text>
        </View>
      ) : null}

      {(assigned || failed) ? (
        <Pressable
          className="items-center rounded-xl bg-gray-900 px-4 py-3 active:opacity-80"
          onPress={() => router.dismissTo('/')}
        >
          <Text className="text-base font-semibold text-white">Нүүр хуудас</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-gray-900">{value}</Text>
    </View>
  )
}
