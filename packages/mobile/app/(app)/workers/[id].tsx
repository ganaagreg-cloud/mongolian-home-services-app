import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { Worker } from '@homeservices/shared'

import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: worker, loading, error } = useApi<Worker>(`/api/workers/${id}`)

  if (loading) return <ActivityIndicator className="mt-12" />
  if (error || !worker) {
    return <Text className="mt-12 text-center text-sm text-red-600">{error || 'Ажилтан олдсонгүй'}</Text>
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      <Text className="text-2xl font-bold text-gray-900">{worker.name}</Text>
      <Text className="text-base text-gray-500">{worker.specialty}</Text>

      <View className="mt-2 gap-2 rounded-xl border border-gray-200 p-4">
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-500">Үнэлгээ</Text>
          <Text className="text-sm font-medium text-gray-900">
            ★ {worker.rating.toFixed(1)} ({worker.reviewCount} сэтгэгдэл)
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-500">Цагийн хөлс</Text>
          <Text className="text-sm font-medium text-gray-900">{formatMnt(worker.pricePerHour)}/цаг</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-500">ДАН баталгаажсан</Text>
          <Text className="text-sm font-medium text-gray-900">{worker.danVerified ? 'Тийм' : 'Үгүй'}</Text>
        </View>
      </View>

      {worker.serviceTypeId ? (
        <Pressable
          className="mt-4 items-center rounded-xl bg-gray-900 px-4 py-3 active:opacity-80"
          onPress={() =>
            router.push({
              pathname: '/book/[serviceTypeId]',
              params: { serviceTypeId: String(worker.serviceTypeId) },
            })
          }
        >
          <Text className="text-base font-semibold text-white">Захиалах</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}
