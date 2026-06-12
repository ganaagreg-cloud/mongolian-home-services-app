import { useCallback, useEffect, useRef, useState } from 'react'
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

import {
  calculatePrice,
  DEFAULT_PLATFORM_SETTINGS,
  type ApiResponse,
  type PaymentInvoice,
  type PropertyType,
} from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import type { ServiceTypeRow } from '@/lib/types'

const POLL_MS = 4000

type BookingParams = {
  serviceTypeId: string
  address: string
  scheduledDate: string
  hours: string
  areaSqm?: string
  propertyType?: PropertyType
}

export default function Payment() {
  const params = useLocalSearchParams<BookingParams>()
  const router = useRouter()
  const { data: serviceTypes } = useApi<ServiceTypeRow[]>('/api/service-types')
  const service = (serviceTypes ?? []).find((st) => st.id === Number(params.serviceTypeId))

  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(false)

  // One order per invoice — guard against parallel create attempts
  const creatingRef = useRef(false)
  const doneRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/payments/create-invoice', { method: 'POST' })
        const body = (await res.json()) as ApiResponse<PaymentInvoice>
        if (cancelled) return
        if (body.success) setInvoice(body.data)
        else setError(body.error)
      } catch {
        if (!cancelled) setError('Сүлжээний алдаа гарлаа')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const attemptCreateOrder = useCallback(async () => {
    if (!invoice || creatingRef.current || doneRef.current) return
    creatingRef.current = true
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.invoice_id,
          serviceTypeId: Number(params.serviceTypeId),
          address: params.address,
          scheduledDate: params.scheduledDate,
          hours: Number(params.hours),
          ...(params.areaSqm ? { areaSqm: Number(params.areaSqm) } : {}),
          ...(params.propertyType ? { propertyType: params.propertyType } : {}),
          matchingStrategy: 'instant',
        }),
      })
      if (res.status === 402) return // not paid yet — keep waiting
      const body = (await res.json()) as ApiResponse<{ id: string }>
      if (body.success) {
        doneRef.current = true
        router.replace({ pathname: '/book/confirm/[orderId]', params: { orderId: body.data.id } })
      } else {
        setError(body.error)
        setWaiting(false)
      }
    } catch {
      // transient network error — next poll retries
    } finally {
      creatingRef.current = false
    }
  }, [invoice, params, router])

  // Poll for paid_at (via the order-create gate) once payment was initiated;
  // deep-link return + app re-foreground trigger an immediate attempt.
  useEffect(() => {
    if (!waiting) return
    const interval = setInterval(() => void attemptCreateOrder(), POLL_MS)
    const linkSub = Linking.addEventListener('url', () => void attemptCreateOrder())
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void attemptCreateOrder()
    })
    return () => {
      clearInterval(interval)
      linkSub.remove()
      appSub.remove()
    }
  }, [waiting, attemptCreateOrder])

  const openBank = (link: string) => {
    setWaiting(true)
    void Linking.openURL(link).catch(() => {
      setError('Банкны аппликейшн нээж чадсангүй')
    })
  }

  const simPay = async () => {
    if (!invoice) return
    setWaiting(true)
    try {
      const res = await apiFetch('/api/payments/dev-sim-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.invoice_id }),
      })
      const body = (await res.json()) as ApiResponse
      if (!body.success) setError(body.error)
      else void attemptCreateOrder()
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    }
  }

  const total = service
    ? calculatePrice({
        service: {
          pricing_model: service.pricing_model,
          base_rate: service.base_rate,
          min_charge: service.min_charge,
        },
        settings: DEFAULT_PLATFORM_SETTINGS,
        quantity: Number(params.areaSqm ?? 0),
      }).total
    : null

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      {total !== null ? (
        <View className="items-center gap-1 rounded-xl border border-gray-200 p-4">
          <Text className="text-sm text-gray-500">Төлөх дүн</Text>
          <Text className="text-2xl font-bold text-gray-900">{formatMnt(total)}</Text>
        </View>
      ) : null}

      {!invoice && !error ? <ActivityIndicator className="mt-4" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

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

          {waiting ? (
            <View className="flex-row items-center justify-center gap-2 py-2">
              <ActivityIndicator />
              <Text className="text-sm text-gray-500">Төлбөр шалгаж байна…</Text>
            </View>
          ) : null}

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
