import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'

import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { authClient } from '@/lib/auth-client'

type Loading = 'credentials' | 'google' | 'facebook' | null

export default function SignIn() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<Loading>(null)

  const handleSubmit = async () => {
    setError('')
    setLoading('credentials')
    try {
      let email = identifier.trim()

      const normalized = normalizePhone(identifier)
      if (validateMongolianPhone(normalized)) {
        // Step 1: client-side lookup — server returns the stored email for this phone
        const res = await apiFetch('/api/auth/phone-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized }),
        })
        const data = (await res.json()) as { success: boolean; email?: string; error?: string }
        if (!data.success || !data.email) {
          setError(data.error ?? 'Утасны дугаар бүртгэлгүй байна')
          return
        }
        email = data.email
      }

      // Step 2: sign in via Better Auth directly — same contract as web
      const { error: signInError } = await authClient.signIn.email({ email, password })
      if (signInError) {
        setError('Утасны дугаар эсвэл нууц үг буруу байна')
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(null)
    }
  }

  const handleSocial = (provider: 'google' | 'facebook') => {
    setLoading(provider)
    void authClient
      .signIn.social({ provider, callbackURL: '/' })
      .finally(() => setLoading(null))
  }

  const canSubmit = !loading && identifier.trim().length > 0 && password.length > 0

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <View className="items-center pb-10">
        <Text className="text-2xl font-bold text-gray-900">HomeService</Text>
        <Text className="mt-1 text-sm text-gray-500">Гэрийн Үйлчилгээ</Text>
      </View>

      <View className="gap-3">
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Утас эсвэл имэйл"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Нууц үг"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <Pressable
          className={`items-center rounded-xl px-4 py-3 ${canSubmit ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
          disabled={!canSubmit}
          onPress={() => void handleSubmit()}
        >
          {loading === 'credentials' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Нэвтрэх</Text>
          )}
        </Pressable>
      </View>

      <View className="my-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-gray-200" />
        <Text className="text-xs text-gray-400">эсвэл</Text>
        <View className="h-px flex-1 bg-gray-200" />
      </View>

      <View className="gap-3">
        <Pressable
          className="items-center rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50"
          disabled={!!loading}
          onPress={() => handleSocial('google')}
        >
          <Text className="text-base font-medium text-gray-900">Google-ээр нэвтрэх</Text>
        </Pressable>
        <Pressable
          className="items-center rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50"
          disabled={!!loading}
          onPress={() => handleSocial('facebook')}
        >
          <Text className="text-base font-medium text-gray-900">Facebook-ээр нэвтрэх</Text>
        </Pressable>
      </View>

      <View className="mt-8 flex-row justify-center gap-1">
        <Text className="text-sm text-gray-500">Бүртгэл байхгүй юу?</Text>
        <Link href="/register" className="text-sm font-semibold text-gray-900">
          Бүртгүүлэх
        </Link>
      </View>
    </View>
  )
}
