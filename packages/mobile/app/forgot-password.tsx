import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'

import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'

export default function ForgotPassword() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    const normalized = normalizePhone(phone)
    if (!validateMongolianPhone(normalized)) {
      setError('Монгол дугаар (8 оронт) оруулна уу')
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const body = (await res.json()) as { success?: boolean; error?: string }
      if (body.success) {
        router.push({ pathname: '/otp-verify', params: { phone: normalized } })
      } else {
        setError(body.error ?? 'Алдаа гарлаа')
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-xl font-bold text-gray-900">Нууц үг сэргээх</Text>
      <Text className="mt-2 text-sm text-gray-500">
        Бүртгэлтэй утасны дугаараа оруулна уу. Бид баталгаажуулах код илгээнэ.
      </Text>

      <TextInput
        className="mt-6 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Утасны дугаар"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

      <Pressable
        className={`mt-6 items-center rounded-xl px-4 py-3 ${!loading && phone.trim().length > 0 ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={loading || phone.trim().length === 0}
        onPress={() => void handleSubmit()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Код илгээх</Text>
        )}
      </Pressable>
    </View>
  )
}
