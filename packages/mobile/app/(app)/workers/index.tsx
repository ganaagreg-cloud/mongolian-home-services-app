import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { Worker } from '@homeservices/shared'

import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'

export default function Workers() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const path = q ? `/api/workers?q=${encodeURIComponent(q)}` : '/api/workers'
  const { data: workers, loading, error } = useApi<Worker[]>(path)

  return (
    <View className="flex-1 bg-white px-4 pt-4">
      <TextInput
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Хайх (нэр, үйлчилгээ)"
        placeholderTextColor="#9ca3af"
        value={q}
        onChangeText={setQ}
      />

      {loading ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="mt-4 text-sm text-red-600">{error}</Text> : null}
      {!loading && (workers ?? []).length === 0 && !error ? (
        <Text className="mt-8 text-center text-sm text-gray-500">Ажилтан олдсонгүй</Text>
      ) : null}

      <FlatList
        className="mt-3"
        data={workers ?? []}
        keyExtractor={(w) => w.id}
        renderItem={({ item: w }) => (
          <Pressable
            className="mb-3 gap-1 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
            onPress={() => router.push({ pathname: '/workers/[id]', params: { id: w.id } })}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">{w.name}</Text>
              <Text className="text-sm text-amber-600">★ {w.rating.toFixed(1)} ({w.reviewCount})</Text>
            </View>
            <Text className="text-sm text-gray-500">{w.specialty}</Text>
            <Text className="text-sm font-medium text-gray-900">{formatMnt(w.pricePerHour)}/цаг</Text>
          </Pressable>
        )}
      />
    </View>
  )
}
