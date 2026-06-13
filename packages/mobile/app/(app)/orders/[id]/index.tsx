import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Order } from '@homeservices/shared'

import { SosButton } from '@/components/sos-button'
import { apiFetch } from '@/lib/api-fetch'
import {
  CANCELLABLE_STATUSES,
  formatMnt,
  formatSchedule,
  LIVE_STATUSES,
  ORDER_STATUS_LABELS,
} from '@/lib/format'
import { useApi } from '@/lib/use-api'

const ACTIVE_POLL_MS = 4000

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: order, loading, error, refetch } = useApi<Order>(`/api/orders/${id}`, ACTIVE_POLL_MS)
  const [cancelling, setCancelling] = useState(false)

  if (loading && !order) return <ActivityIndicator className="mt-12" />
  if (error || !order) {
    return <Text className="mt-12 text-center text-sm text-red-600">{error || 'Захиалга олдсонгүй'}</Text>
  }

  const live = LIVE_STATUSES.includes(order.status)
  const cancellable = CANCELLABLE_STATUSES.includes(order.status)

  const doCancel = async () => {
    setCancelling(true)
    try {
      const res = await apiFetch(`/api/orders/${id}/cancel`, { method: 'POST' })
      const body = (await res.json()) as ApiResponse<{ refundAmount: number; fee: number }>
      if (body.success) {
        await refetch()
      } else {
        Alert.alert('Алдаа', body.error)
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setCancelling(false)
    }
  }

  const confirmCancel = () => {
    Alert.alert(
      'Захиалга цуцлах',
      'Та захиалгаа цуцлахдаа итгэлтэй байна уу? Эхлэхэд 1 цаг хүрэхгүй үлдсэн бол торгууль суутгагдана.',
      [
        { text: 'Үгүй', style: 'cancel' },
        { text: 'Тийм, цуцлах', style: 'destructive', onPress: () => void doCancel() },
      ],
    )
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-4 px-4 py-6 pb-28">
        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-gray-900">{order.service}</Text>
          <View className="rounded-full bg-gray-100 px-3 py-1">
            <Text className="text-sm font-medium text-gray-700">{ORDER_STATUS_LABELS[order.status]}</Text>
          </View>
        </View>

        <View className="gap-2 rounded-xl border border-gray-200 p-4">
          {order.workerName ? <Row label="Ажилтан" value={order.workerName} /> : null}
          <Row label="Огноо" value={formatSchedule(order.scheduledDate)} />
          <Row label="Хаяг" value={order.address} />
          <Row label="Хугацаа" value={`${order.hours} цаг`} />
          <Row label="Нийт дүн" value={formatMnt(order.totalAmount)} />
          <Row label="Төлбөр" value={order.paymentStatus === 'paid' ? 'Төлөгдсөн (Escrow)' : 'Төлөгдөөгүй'} />
        </View>

        {(order.beforeThumbUrl || order.afterThumbUrl) ? (
          <View className="gap-2 rounded-xl border border-gray-200 p-4">
            <Text className="text-sm font-semibold text-gray-900">Ажлын зураг</Text>
            <View className="flex-row gap-3">
              {order.beforeThumbUrl ? (
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-500">Өмнө</Text>
                  <Image source={{ uri: order.beforeThumbUrl }} className="h-28 w-full rounded-lg" resizeMode="cover" />
                </View>
              ) : null}
              {order.afterThumbUrl ? (
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-500">Дараа</Text>
                  <Image source={{ uri: order.afterThumbUrl }} className="h-28 w-full rounded-lg" resizeMode="cover" />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {order.status === 'pending_acceptances' ? (
          <PrimaryButton
            label="Ажилтнуудын санал үзэх"
            onPress={() => router.push({ pathname: '/orders/[id]/board', params: { id: order.id } })}
          />
        ) : null}

        {order.status === 'awaiting_payment' ? (
          <PrimaryButton
            label="Төлбөр төлөх"
            onPress={() => router.push({ pathname: '/orders/[id]/pay', params: { id: order.id } })}
          />
        ) : null}

        {(order.status === 'searching_worker' || order.status === 'pending_worker_acceptance') ? (
          <PrimaryButton
            label="Хайлтын явц харах"
            onPress={() => router.push({ pathname: '/book/confirm/[orderId]', params: { orderId: order.id } })}
          />
        ) : null}

        {live ? (
          <PrimaryButton
            label="Ажилтантай чатлах"
            onPress={() => router.push({ pathname: '/orders/[id]/chat', params: { id: order.id } })}
          />
        ) : null}

        {order.status === 'completed' ? (
          <PrimaryButton
            label="Үнэлгээ өгөх"
            onPress={() => router.push({ pathname: '/orders/[id]/review', params: { id: order.id } })}
          />
        ) : null}

        {cancellable ? (
          <Pressable
            className="items-center rounded-xl border border-red-200 px-4 py-3 active:bg-red-50"
            disabled={cancelling}
            onPress={confirmCancel}
          >
            {cancelling ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-base font-semibold text-red-600">Захиалга цуцлах</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      {/* SOS stays mounted for the whole live booking */}
      {live ? <SosButton orderId={order.id} /> : null}
    </View>
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

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable className="items-center rounded-xl bg-gray-900 px-4 py-3 active:opacity-80" onPress={onPress}>
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  )
}
