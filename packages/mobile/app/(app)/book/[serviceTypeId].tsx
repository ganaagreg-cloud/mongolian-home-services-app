import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import {
  calculatePrice,
  DEFAULT_PLATFORM_SETTINGS,
  type ApiResponse,
  type PropertyType,
} from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import type { ServiceTypeRow } from '@/lib/types'

type Strategy = 'instant' | 'scheduled'

const STRATEGIES: { value: Strategy; label: string; hint: string }[] = [
  { value: 'instant',   label: 'Шууд захиалах',  hint: 'Төлбөр төлөөд ажилтан автоматаар олдоно' },
  { value: 'scheduled', label: 'Саналаар сонгох', hint: 'Ажилтнуудын саналаас сонгож дараа нь төлнө' },
]

const HOURS = [1, 2, 3, 4, 5, 6, 8]
const TIME_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00']
const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Орон сууц' },
  { value: 'house', label: 'Хаус' },
  { value: 'office', label: 'Оффис' },
]

function nextDays(count: number): { iso: string; label: string }[] {
  const days = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = i === 0 ? 'Өнөөдөр' : i === 1 ? 'Маргааш' : iso.slice(5)
    days.push({ iso, label })
  }
  return days
}

export default function BookService() {
  const { serviceTypeId } = useLocalSearchParams<{ serviceTypeId: string }>()
  const router = useRouter()
  const { data: serviceTypes, loading } = useApi<ServiceTypeRow[]>('/api/service-types')
  const service = (serviceTypes ?? []).find((st) => st.id === Number(serviceTypeId))

  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [quantity, setQuantity] = useState('')
  const [hours, setHours] = useState(2)
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null)
  const [strategy, setStrategy] = useState<Strategy>('instant')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const days = useMemo(() => nextDays(7), [])

  const needsQuantity = service?.pricing_model === 'area' || service?.pricing_model === 'unit'
  const qty = parseInt(quantity, 10) || 0

  const breakdown = service
    ? calculatePrice({
        service: {
          pricing_model: service.pricing_model,
          base_rate: service.base_rate,
          min_charge: service.min_charge,
        },
        settings: DEFAULT_PLATFORM_SETTINGS,
        quantity: qty,
      })
    : null

  const canContinue =
    !!service &&
    address.trim().length > 0 &&
    date.length > 0 &&
    time.length > 0 &&
    (!needsQuantity || qty >= 1) &&
    (!service.requires_property_type || propertyType !== null)

  if (loading) return <ActivityIndicator className="mt-12" />
  if (!service) {
    return <Text className="mt-12 text-center text-sm text-red-600">Үйлчилгээний төрөл олдсонгүй</Text>
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      <Text className="text-xl font-bold text-gray-900">
        {service.icon} {service.name_mn}
      </Text>

      <TextInput
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Хаяг"
        placeholderTextColor="#9ca3af"
        value={address}
        onChangeText={setAddress}
      />

      <Text className="text-sm font-semibold text-gray-900">Өдөр</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {days.map((d) => (
          <Pressable
            key={d.iso}
            className={`rounded-xl border px-4 py-2 ${date === d.iso ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}
            onPress={() => setDate(d.iso)}
          >
            <Text className={`text-sm ${date === d.iso ? 'font-semibold text-white' : 'text-gray-700'}`}>
              {d.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text className="text-sm font-semibold text-gray-900">Цаг</Text>
      <View className="flex-row flex-wrap gap-2">
        {TIME_SLOTS.map((t) => (
          <Pressable
            key={t}
            className={`rounded-xl border px-4 py-2 ${time === t ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}
            onPress={() => setTime(t)}
          >
            <Text className={`text-sm ${time === t ? 'font-semibold text-white' : 'text-gray-700'}`}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {needsQuantity ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            Хэмжээ ({service.unit_label})
          </Text>
          <TextInput
            className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            placeholder={`Жишээ нь 50 ${service.unit_label}`}
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
        </>
      ) : null}

      <Text className="text-sm font-semibold text-gray-900">Үргэлжлэх цаг</Text>
      <View className="flex-row flex-wrap gap-2">
        {HOURS.map((h) => (
          <Pressable
            key={h}
            className={`rounded-xl border px-4 py-2 ${hours === h ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}
            onPress={() => setHours(h)}
          >
            <Text className={`text-sm ${hours === h ? 'font-semibold text-white' : 'text-gray-700'}`}>{h}ц</Text>
          </Pressable>
        ))}
      </View>

      {service.requires_property_type ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">Байрны төрөл</Text>
          <View className="flex-row gap-2">
            {PROPERTY_TYPES.map((p) => (
              <Pressable
                key={p.value}
                className={`rounded-xl border px-4 py-2 ${propertyType === p.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}
                onPress={() => setPropertyType(p.value)}
              >
                <Text
                  className={`text-sm ${propertyType === p.value ? 'font-semibold text-white' : 'text-gray-700'}`}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text className="text-sm font-semibold text-gray-900">Захиалгын төрөл</Text>
      <View className="gap-2">
        {STRATEGIES.map((s) => (
          <Pressable
            key={s.value}
            className={`rounded-xl border px-4 py-3 ${strategy === s.value ? 'border-gray-900 bg-gray-50' : 'border-gray-300'}`}
            onPress={() => setStrategy(s.value)}
          >
            <Text className={`text-sm ${strategy === s.value ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {s.label}
            </Text>
            <Text className="text-xs text-gray-500">{s.hint}</Text>
          </Pressable>
        ))}
      </View>

      {breakdown ? (
        <View className="mt-2 gap-2 rounded-xl border border-gray-200 p-4">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-500">Дүн</Text>
            <Text className="text-sm text-gray-900">{formatMnt(breakdown.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-base font-semibold text-gray-900">Нийт</Text>
            <Text className="text-base font-bold text-gray-900">{formatMnt(breakdown.total)}</Text>
          </View>
        </View>
      ) : null}

      {submitError ? <Text className="text-sm text-red-600">{submitError}</Text> : null}

      <Pressable
        className={`items-center rounded-xl px-4 py-3 ${canContinue && !submitting ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={!canContinue || submitting}
        onPress={() => {
          if (strategy === 'instant') {
            router.push({
              pathname: '/book/payment',
              params: {
                serviceTypeId: String(service.id),
                address: address.trim(),
                scheduledDate: `${date} ${time}`,
                hours: String(hours),
                ...(needsQuantity ? { areaSqm: String(qty) } : {}),
                ...(propertyType ? { propertyType } : {}),
              },
            })
            return
          }
          // Scheduled bid order — posted without upfront payment, paid after picking a worker
          setSubmitError('')
          setSubmitting(true)
          void (async () => {
            try {
              const res = await apiFetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serviceTypeId: service.id,
                  address: address.trim(),
                  scheduledDate: `${date} ${time}`,
                  hours,
                  ...(needsQuantity ? { areaSqm: qty } : {}),
                  ...(propertyType ? { propertyType } : {}),
                  matchingStrategy: 'scheduled',
                }),
              })
              const body = (await res.json()) as ApiResponse<{ id: string }>
              if (body.success) {
                router.replace({ pathname: '/orders/[id]/board', params: { id: body.data.id } })
              } else {
                setSubmitError(body.error)
              }
            } catch {
              setSubmitError('Сүлжээний алдаа гарлаа')
            } finally {
              setSubmitting(false)
            }
          })()
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">
            {strategy === 'instant' ? 'Төлбөр рүү' : 'Захиалга нийтлэх'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
