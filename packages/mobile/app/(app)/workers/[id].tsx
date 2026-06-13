import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Worker } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: worker, loading, error } = useApi<Worker>(`/api/workers/${id}`)
  const { data: saved, refetch: refetchSaved } = useApi<Worker[]>('/api/me/saved-workers')
  const [toggling, setToggling] = useState(false)

  const isSaved = (saved ?? []).some((w) => w.id === id)

  const toggleSave = async () => {
    setToggling(true)
    try {
      const res = isSaved
        ? await apiFetch(`/api/me/saved-workers/${id}`, { method: 'DELETE' })
        : await apiFetch('/api/me/saved-workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker_id: Number(id) }),
          })
      const body = (await res.json()) as ApiResponse
      if (body.success) await refetchSaved()
    } catch {
      // transient — state unchanged
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <ActivityIndicator className="mt-12" />
  if (error || !worker) {
    return <Text className="mt-12 text-center text-sm text-red-600">{error || 'Ажилтан олдсонгүй'}</Text>
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      <View className="flex-row items-start justify-between">
        <View className="shrink">
          <Text className="text-2xl font-bold text-gray-900">{worker.name}</Text>
          <Text className="text-base text-gray-500">{worker.specialty}</Text>
        </View>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 active:bg-gray-50"
          disabled={toggling}
          onPress={() => void toggleSave()}
        >
          {toggling ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className={`text-lg ${isSaved ? '' : 'opacity-30'}`}>⭐</Text>
          )}
        </Pressable>
      </View>

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
