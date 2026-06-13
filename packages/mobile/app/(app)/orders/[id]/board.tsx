import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Order, PaymentInvoice } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt, formatSchedule } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import type { OrderApplication } from '@/lib/types'

const BOARD_POLL_MS = 5000

// Scheduled-jobs board: workers apply, the customer picks one.
export default function ScheduledBoard() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: order } = useApi<Order>(`/api/orders/${id}`)
  const { data: applications, loading, error } = useApi<OrderApplication[]>(
    `/api/orders/${id}/applications`,
    BOARD_POLL_MS,
  )
  const [selectError, setSelectError] = useState('')
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const select = async (workerId: string) => {
    setSelectError('')
    setSelectingId(workerId)
    try {
      const res = await apiFetch(`/api/orders/${id}/select-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: Number(workerId) }),
      })
      const body = (await res.json()) as ApiResponse<PaymentInvoice>
      if (body.success) {
        // Slot reserved + invoice created — pay screen re-fetches it via pending-invoice
        router.push({ pathname: '/orders/[id]/pay', params: { id: String(id) } })
      } else {
        setSelectError(body.error)
      }
    } catch {
      setSelectError('Сүлжээний алдаа гарлаа')
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      {order ? (
        <View className="gap-1 rounded-xl border border-gray-200 p-4">
          <Text className="text-xs text-gray-500">Таны захиалга</Text>
          <Text className="text-base font-semibold text-gray-900">{order.service}</Text>
          <Text className="text-xs text-gray-500">
            {formatSchedule(order.scheduledDate)} · {order.address}
          </Text>
          <Text className="mt-1 text-base font-bold text-gray-900">{formatMnt(order.totalAmount)}</Text>
        </View>
      ) : null}

      <Text className="mt-1 text-base font-semibold text-gray-900">
        Ажилтнуудын хариу{applications && applications.length > 0 ? ` (${applications.length})` : ''}
      </Text>

      {loading && !applications ? <ActivityIndicator className="mt-4" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      {selectError ? <Text className="text-sm text-red-600">{selectError}</Text> : null}

      {applications && applications.length === 0 ? (
        <View className="items-center gap-2 rounded-xl border border-gray-200 py-10">
          <ActivityIndicator />
          <Text className="text-sm font-medium text-gray-900">Ажилтнуудын хариуг хүлээж байна</Text>
          <Text className="px-6 text-center text-xs text-gray-500">
            Захиалга ажилтнуудад харагдаж байна. Хуудас 5 секунд тутамд шинэчлэгдэнэ.
          </Text>
        </View>
      ) : null}

      {(applications ?? []).map((a) => (
        <View key={a.id} className="gap-2 rounded-xl border border-gray-200 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900">{a.workerName}</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {formatMnt(a.workerPricePerHour)}/цаг
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            {a.workerSpecialty} · ★ {a.workerRating} ({a.workerReviewCount} сэтгэгдэл)
          </Text>
          <Pressable
            className="mt-1 items-center rounded-xl bg-gray-900 px-4 py-2.5 active:opacity-80"
            disabled={selectingId !== null}
            onPress={() => void select(a.workerId)}
          >
            {selectingId === a.workerId ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Сонгох</Text>
            )}
          </Pressable>
        </View>
      ))}

      <Text className="mt-2 text-center text-xs text-gray-400">
        Ажилтныг сонгосны дараа төлбөрийн дэлгэц рүү шилжинэ. Төлбөр баталгаажсаны дараа л захиалга батлагдана.
      </Text>
    </ScrollView>
  )
}
