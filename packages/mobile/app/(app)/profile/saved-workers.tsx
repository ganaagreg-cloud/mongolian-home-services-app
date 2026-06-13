import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { ApiResponse, Worker } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'

export default function SavedWorkers() {
  const router = useRouter()
  const { data: workers, loading, error, refetch } = useApi<Worker[]>('/api/me/saved-workers')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const remove = async (workerId: string) => {
    setRemovingId(workerId)
    try {
      const res = await apiFetch(`/api/me/saved-workers/${workerId}`, { method: 'DELETE' })
      const body = (await res.json()) as ApiResponse
      if (body.success) await refetch()
    } catch {
      // transient — list stays as-is
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      {loading && !workers ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      {workers && workers.length === 0 ? (
        <View className="items-center gap-2 py-16">
          <Text className="text-4xl">⭐</Text>
          <Text className="text-sm text-gray-500">Хадгалсан ажилтан байхгүй байна</Text>
        </View>
      ) : null}

      {(workers ?? []).map((w) => (
        <Pressable
          key={w.id}
          className="gap-1.5 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
          onPress={() => router.push({ pathname: '/workers/[id]', params: { id: w.id } })}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900">{w.name}</Text>
            <Text className="text-sm font-semibold text-gray-900">{formatMnt(w.pricePerHour)}/цаг</Text>
          </View>
          <Text className="text-xs text-gray-500">
            {w.specialty} · ★ {w.rating.toFixed(1)} ({w.reviewCount} сэтгэгдэл)
          </Text>
          <Pressable
            className="mt-1 items-center self-start rounded-lg border border-gray-300 px-3 py-1.5 active:bg-gray-100"
            disabled={removingId !== null}
            onPress={() => void remove(w.id)}
          >
            {removingId === w.id ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-xs font-medium text-gray-600">Хасах</Text>
            )}
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  )
}
