import { useEffect } from 'react'
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Order, PaymentInvoice } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'

const ORDER_POLL_MS = 3000

// Bid payment: invoice was created by select-worker; pending-invoice re-fetches it
// so this screen survives back/forward navigation and app restarts.
export default function BidPay() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: invoice, error: invoiceError } = useApi<PaymentInvoice>(
    `/api/orders/${id}/pending-invoice`,
  )
  const { data: order, refetch: refetchOrder } = useApi<Order>(`/api/orders/${id}`, ORDER_POLL_MS)

  // Payment confirmed → slot booked, order locked
  useEffect(() => {
    if (order?.status === 'worker_assigned') {
      router.dismissTo({ pathname: '/orders/[id]', params: { id: String(id) } })
    }
  }, [order?.status, id, router])

  // Deep-link return from a bank app + re-foreground → check immediately
  useEffect(() => {
    const linkSub = Linking.addEventListener('url', () => void refetchOrder())
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refetchOrder()
    })
    return () => {
      linkSub.remove()
      appSub.remove()
    }
  }, [refetchOrder])

  const openBank = (link: string) => {
    void Linking.openURL(link).catch(() => {})
  }

  const simPay = async () => {
    if (!invoice) return
    try {
      const res = await apiFetch('/api/payments/bid-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.invoice_id }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) void refetchOrder()
    } catch {
      // transient — poll keeps checking
    }
  }

  // Payment window expired — order was re-listed
  if (order && order.status === 'pending_acceptances') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <Text className="text-5xl">⏳</Text>
        <Text className="text-lg font-semibold text-gray-900">Төлбөрийн хугацаа дууссан</Text>
        <Text className="text-center text-sm text-gray-500">
          Захиалга дахин нийтлэгдсэн. Ажилтнаа дахин сонгоно уу.
        </Text>
        <Pressable
          className="mt-2 items-center self-stretch rounded-xl bg-gray-900 px-4 py-3 active:opacity-80"
          onPress={() => router.dismissTo({ pathname: '/orders/[id]/board', params: { id: String(id) } })}
        >
          <Text className="text-base font-semibold text-white">Санал руу буцах</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      {order ? (
        <View className="items-center gap-1 rounded-xl border border-gray-200 p-4">
          <Text className="text-sm text-gray-500">Төлөх дүн</Text>
          <Text className="text-2xl font-bold text-gray-900">{formatMnt(order.totalAmount)}</Text>
          {order.paymentDeadline ? (
            <Text className="text-xs text-gray-400">
              Төлбөрийн хугацаа: {order.paymentDeadline.slice(11, 16)} хүртэл
            </Text>
          ) : null}
        </View>
      ) : null}

      <View className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <Text className="text-xs text-gray-500">
          🔒 Escrow-оор хамгаалагдсан — ажил дуусаагүй бол мөнгө суллагдахгүй.
        </Text>
      </View>

      {!invoice && !invoiceError ? <ActivityIndicator className="mt-4" /> : null}
      {invoiceError ? <Text className="text-sm text-red-600">{invoiceError}</Text> : null}

      {invoice ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">Банк сонгох</Text>
          <View className="gap-2">
            {invoice.urls.map((bank) => (
              <Pressable
                key={bank.name}
                className="rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50"
                onPress={() => openBank(bank.link)}
              >
                <Text className="text-base font-medium text-gray-900">{bank.name}</Text>
                <Text className="text-xs text-gray-500">{bank.description}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-sm font-semibold text-gray-900">эсвэл QR уншуулах</Text>
          <View className="items-center gap-2 rounded-xl border border-gray-200 p-4">
            <Image source={{ uri: invoice.qr_image }} className="h-40 w-40" resizeMode="contain" />
            <Text className="text-xs text-gray-400">{invoice.qr_text}</Text>
          </View>

          <View className="flex-row items-center justify-center gap-2 py-2">
            <ActivityIndicator />
            <Text className="text-sm text-gray-500">Төлбөр шалгаж байна…</Text>
          </View>

          {__DEV__ ? (
            <Pressable
              className="items-center rounded-xl border border-dashed border-amber-400 px-4 py-3 active:bg-amber-50"
              onPress={() => void simPay()}
            >
              <Text className="text-sm font-medium text-amber-600">DEV: төлбөр симуляци</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  )
}
