import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { apiFetch } from '@/lib/api-fetch'

export default function PinReset() {
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (pin.length < 8) {
      setError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой')
      return
    }
    if (pin !== confirm) {
      setError('Нууц үг таарахгүй байна')
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, pin }),
      })
      const body = (await res.json()) as { success?: boolean; error?: string }
      if (body.success) setDone(true)
      else setError(body.error ?? 'Алдаа гарлаа')
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-5xl">✅</Text>
        <Text className="mt-4 text-xl font-bold text-gray-900">Нууц үг шинэчлэгдлээ</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Шинэ нууц үгээрээ нэвтэрнэ үү.
        </Text>
        <Pressable
          className="mt-6 w-full items-center rounded-xl bg-gray-900 px-4 py-3 active:opacity-80"
          onPress={() => router.dismissTo('/sign-in')}
        >
          <Text className="text-base font-semibold text-white">Нэвтрэх</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-xl font-bold text-gray-900">Шинэ нууц үг</Text>
      <Text className="mt-2 text-sm text-gray-500">
        Хамгийн багадаа 8 тэмдэгт бүхий шинэ нууц үг оруулна уу.
      </Text>

      <TextInput
        className="mt-6 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Шинэ нууц үг"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />
      <TextInput
        className="mt-3 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Нууц үг давтах"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

      <Pressable
        className={`mt-6 items-center rounded-xl px-4 py-3 ${!loading && pin.length >= 8 && confirm.length >= 8 ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={loading || pin.length < 8 || confirm.length < 8}
        onPress={() => void handleSubmit()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Хадгалах</Text>
        )}
      </Pressable>
    </View>
  )
}
