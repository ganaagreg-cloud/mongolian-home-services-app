import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput } from 'react-native'

import { normalizePhone, validateMongolianPhone, type ApiResponse } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { useApi } from '@/lib/use-api'
import type { MeProfile } from '@/lib/types'

export default function PersonalInfo() {
  const { data: me, loading, refetch } = useApi<MeProfile>('/api/me')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!me) return
    setName(me.name)
    setEmail(me.email)
    setPhone(me.phone)
  }, [me])

  const save = async () => {
    setError('')
    setSaved(false)
    if (phone.trim() && !validateMongolianPhone(normalizePhone(phone))) {
      setError('Монгол дугаар (8 оронт) оруулна уу')
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: normalizePhone(phone) } : {}),
        }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) {
        setSaved(true)
        await refetch()
      } else {
        setError(body.error)
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !me) return <ActivityIndicator className="mt-12" />

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      <Text className="text-sm font-semibold text-gray-900">Нэр</Text>
      <TextInput
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Нэр"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={(v) => { setName(v); setSaved(false) }}
      />

      <Text className="text-sm font-semibold text-gray-900">Имэйл</Text>
      <TextInput
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Имэйл"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(v) => { setEmail(v); setSaved(false) }}
      />

      <Text className="text-sm font-semibold text-gray-900">Утасны дугаар</Text>
      <TextInput
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
        placeholder="Утасны дугаар"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(v) => { setPhone(v); setSaved(false) }}
      />

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      {saved ? <Text className="text-sm text-green-600">Хадгалагдлаа ✓</Text> : null}

      <Pressable
        className={`mt-2 items-center rounded-xl px-4 py-3 ${name.trim().length >= 2 && !saving ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'}`}
        disabled={name.trim().length < 2 || saving}
        onPress={() => void save()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Хадгалах</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
