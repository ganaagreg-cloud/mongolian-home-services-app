import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link } from 'expo-router'

import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { authClient } from '@/lib/auth-client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const emailValid = EMAIL_RE.test(email)

  const canSubmit =
    !loading &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid &&
    phone.length === 8 &&
    password.length >= 8 &&
    confirmPassword.length >= 8

  const handleSubmit = async () => {
    setError('')
    const normalized = normalizePhone(phone)
    if (!validateMongolianPhone(normalized)) {
      setError('Утасны дугаар буруу байна (8 оронтой, 8x эсвэл 9x-ээр эхэлнэ)')
      return
    }
    if (!emailValid) {
      setError('Имэйл хаяг буруу байна')
      return
    }
    if (password !== confirmPassword) {
      setError('Нууц үг таарахгүй байна')
      return
    }
    setLoading(true)
    try {
      const name = `${firstName} ${lastName}`

      const { error: signUpError } = await authClient.signUp.email({ email, password, name })
      if (signUpError) {
        setError('Бүртгэл үүсгэхэд алдаа гарлаа')
        return
      }

      // Store phone — must succeed; session cookie is already in the jar
      const updateRes = await apiFetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const updateData = (await updateRes.json()) as { success: boolean; error?: string }
      if (!updateData.success) {
        setError(updateData.error ?? 'Утасны дугаар хадгалахад алдаа гарлаа')
        return
      }
      // Session is live → Stack.Protected guard flips to the authed group
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="grow justify-center gap-3 px-6 py-12">
        <Text className="pb-6 text-center text-2xl font-bold text-gray-900">Бүртгүүлэх</Text>

        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Овог"
          placeholderTextColor="#9ca3af"
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Нэр"
          placeholderTextColor="#9ca3af"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Имэйл"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Утасны дугаар"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          maxLength={8}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Нууц үг (8+ тэмдэгт)"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
          placeholder="Нууц үг давтах"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <Pressable
          className={`items-center rounded-xl px-4 py-3 ${canSubmit ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
          disabled={!canSubmit}
          onPress={() => void handleSubmit()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Бүртгүүлэх</Text>
          )}
        </Pressable>

        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-500">Бүртгэлтэй юу?</Text>
          <Link href="/sign-in" className="text-sm font-semibold text-gray-900">
            Нэвтрэх
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
