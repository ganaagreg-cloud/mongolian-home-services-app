import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { ApiResponse, Order } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { useApi } from '@/lib/use-api'

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: order } = useApi<Order>(`/api/orders/${id}`)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/orders/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) {
        router.dismissTo('/orders')
      } else {
        setError(body.error)
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      <View className="items-center gap-1">
        <Text className="text-xl font-bold text-gray-900">Үйлчилгээг үнэлнэ үү</Text>
        {order?.workerName ? (
          <Text className="text-sm text-gray-500">{order.workerName} — {order.service}</Text>
        ) : null}
      </View>

      <View className="flex-row justify-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)}>
            <Text className={`text-4xl ${star <= rating ? '' : 'opacity-25'}`}>⭐</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        className="min-h-28 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Сэтгэгдэл (заавал биш)"
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
        maxLength={2000}
        value={comment}
        onChangeText={setComment}
      />

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <Pressable
        className={`items-center rounded-xl px-4 py-3 ${rating > 0 && !submitting ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={rating === 0 || submitting}
        onPress={() => void submit()}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Үнэлгээ илгээх</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
