import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { apiFetch } from '@/lib/api-fetch'

export default function OtpVerify() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const body = (await res.json()) as { success?: boolean; resetToken?: string; error?: string }
      if (body.success && body.resetToken) {
        router.push({ pathname: '/pin-reset', params: { resetToken: body.resetToken } })
      } else {
        setError(body.error ?? 'Код буруу байна')
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && /^\d{6}$/.test(code)

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-xl font-bold text-gray-900">Код баталгаажуулах</Text>
      <Text className="mt-2 text-sm text-gray-500">
        {phone} дугаарт илгээсэн 6 оронтой кодыг оруулна уу.
      </Text>

      <TextInput
        className="mt-6 rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-[8px] text-gray-900"
        placeholder="••••••"
        placeholderTextColor="#9ca3af"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

      <Pressable
        className={`mt-6 items-center rounded-xl px-4 py-3 ${canSubmit ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Баталгаажуулах</Text>
        )}
      </Pressable>
    </View>
  )
}
