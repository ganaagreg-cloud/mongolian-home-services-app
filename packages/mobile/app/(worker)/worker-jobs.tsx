import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { ApiResponse, Order } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt, formatSchedule } from '@/lib/format'
import { useApi } from '@/lib/use-api'

const POLL_MS = 5000
const INSTANT_WINDOW_SECONDS = 60

function useCountdown(resetKey: string) {
  const [countdown, setCountdown] = useState(INSTANT_WINDOW_SECONDS)

  useEffect(() => {
    setCountdown(INSTANT_WINDOW_SECONDS)
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resetKey])

  return countdown
}

export default function WorkerJobs() {
  const router = useRouter()
  const { data: offered, loading: offeredLoading, refetch: refetchOffered } = useApi<Order[]>(
    '/api/orders?offered=1',
    POLL_MS,
  )
  const { data: scheduled, loading: scheduledLoading } = useApi<Order[]>('/api/orders?scheduled=1', POLL_MS)

  const countdown = useCountdown((offered ?? []).map((j) => j.id).join(','))
  const expired = countdown <= 0
  const urgentCountdown = countdown <= 15

  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [applyError, setApplyError] = useState<{ id: string; message: string } | null>(null)

  const handleDeclineInstant = async (id: string) => {
    setDecliningId(id)
    try {
      const res = await apiFetch(`/api/orders/${id}/decline-instant`, { method: 'POST' })
      if (!res.ok) Alert.alert('Алдаа', 'Татгалзахад алдаа гарлаа')
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setDecliningId(null)
      void refetchOffered()
    }
  }

  const handleAcceptInstant = async (id: string) => {
    setAcceptingId(id)
    try {
      const res = await apiFetch(`/api/orders/${id}/accept-instant`, { method: 'POST' })
      if (res.ok) {
        void refetchOffered()
        router.push('/worker-active')
      } else {
        Alert.alert('Алдаа', 'Авахад алдаа гарлаа')
        void refetchOffered()
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleAcceptScheduled = async (id: string) => {
    setApplyingId(id)
    setApplyError(null)
    try {
      const res = await apiFetch(`/api/orders/${id}/apply`, { method: 'POST' })
      const body = (await res.json()) as ApiResponse<unknown>
      if (body.success) {
        setAcceptedIds((prev) => new Set(prev).add(id))
      } else {
        setApplyError({ id, message: body.error })
      }
    } catch {
      setApplyError({ id, message: 'Сүлжээний алдаа гарлаа' })
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6 pb-28">
      <View className="gap-1">
        <Text className="text-base font-semibold text-gray-900">Яг одоо хүсэлтүүд</Text>
        <Text className="text-xs text-gray-500">60 секундийн дотор хариулна уу</Text>
      </View>

      {offeredLoading ? <ActivityIndicator className="mt-2" /> : null}

      {!offeredLoading && (offered ?? []).length === 0 ? (
        <View className="items-center gap-2 rounded-xl border border-gray-200 py-10">
          <Text className="text-4xl">⚡</Text>
          <Text className="text-sm font-medium text-gray-900">Шуурхай захиалга байхгүй</Text>
          <Text className="px-6 text-center text-xs text-gray-500">Захиалга ирэхэд мэдэгдэл ирнэ</Text>
        </View>
      ) : null}

      {(offered ?? []).map((job) => (
        <View key={job.id} className="gap-2 rounded-xl border border-gray-200 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900">{job.service}</Text>
            <Text className={`text-sm font-bold ${urgentCountdown ? 'text-red-600' : 'text-gray-900'}`}>
              {expired ? 'Дууссан' : `${countdown}с`}
            </Text>
          </View>
          {job.urgent ? (
            <View className="self-start rounded-full bg-red-100 px-2.5 py-1">
              <Text className="text-xs font-medium text-red-600">Яаралтай</Text>
            </View>
          ) : null}
          <Text className="text-xs text-gray-500">{formatSchedule(job.scheduledDate)}</Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>{job.address.split(',')[0]}</Text>
          <Text className="text-sm font-bold text-gray-900">{formatMnt(job.totalAmount)}</Text>

          <View className="mt-1 flex-row gap-2">
            <Pressable
              className="flex-1 items-center rounded-xl border border-red-200 py-2.5 active:bg-red-50"
              disabled={decliningId === job.id}
              onPress={() => void handleDeclineInstant(job.id)}
            >
              {decliningId === job.id ? (
                <ActivityIndicator color="#dc2626" />
              ) : (
                <Text className="text-sm font-semibold text-red-600">Татгалзах</Text>
              )}
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-xl py-2.5 active:opacity-80 ${expired ? 'bg-gray-100' : 'bg-gray-900'}`}
              disabled={expired || acceptingId === job.id}
              onPress={() => void handleAcceptInstant(job.id)}
            >
              {acceptingId === job.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${expired ? 'text-gray-400' : 'text-white'}`}>
                  {expired ? 'Дууссан' : 'Авах'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ))}

      <View className="mt-4 gap-1">
        <Text className="text-base font-semibold text-gray-900">Цаг товлох ажлууд</Text>
        <Text className="text-xs text-gray-500">
          Сонирхсон бол санал илгээгээрэй. Хэрэглэгч таныг сонговол мэдэгдэл ирнэ.
        </Text>
      </View>

      {scheduledLoading ? <ActivityIndicator className="mt-2" /> : null}

      {!scheduledLoading && (scheduled ?? []).length === 0 ? (
        <View className="items-center gap-2 rounded-xl border border-gray-200 py-10">
          <Text className="text-4xl">📅</Text>
          <Text className="text-sm font-medium text-gray-900">Цаг товлох захиалга байхгүй</Text>
          <Text className="px-6 text-center text-xs text-gray-500">Шинэ захиалга нийтлэгдэхэд энд харагдана</Text>
        </View>
      ) : null}

      {(scheduled ?? []).map((job) => {
        const accepted = acceptedIds.has(job.id)
        return (
          <View key={job.id} className="gap-2 rounded-xl border border-gray-200 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">{job.service}</Text>
              <Text className="text-sm font-bold text-gray-900">{formatMnt(job.totalAmount)}</Text>
            </View>
            <Text className="text-xs text-gray-500">{formatSchedule(job.scheduledDate)}</Text>
            <Text className="text-xs text-gray-500" numberOfLines={1}>{job.address.split(',')[0]}</Text>
            {applyError?.id === job.id ? (
              <Text className="text-xs text-red-600">{applyError.message}</Text>
            ) : null}
            <Pressable
              className={`mt-1 items-center rounded-xl py-2.5 active:opacity-80 ${accepted ? 'bg-gray-100' : 'bg-gray-900'}`}
              disabled={accepted || applyingId === job.id}
              onPress={() => void handleAcceptScheduled(job.id)}
            >
              {applyingId === job.id ? (
                <ActivityIndicator color={accepted ? '#000' : '#fff'} />
              ) : (
                <Text className={`text-sm font-semibold ${accepted ? 'text-gray-500' : 'text-white'}`}>
                  {accepted ? 'Санал илгээгдлээ' : 'Сонирхож байна'}
                </Text>
              )}
            </Pressable>
          </View>
        )
      })}
    </ScrollView>
  )
}
