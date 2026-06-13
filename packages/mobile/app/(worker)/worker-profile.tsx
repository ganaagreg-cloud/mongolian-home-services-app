import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'

import type { AccountType, ApiResponse, BankingInfo, Worker } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { authClient } from '@/lib/auth-client'
import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import type { ServiceTypeRow } from '@/lib/types'

const BANKS = [
  'Хаан Банк', 'Голомт', 'ХХБ', 'Төрийн Банк',
  'Хас Банк', 'Капитрон', 'Үндэсний хөрөнгө оруулалт', 'Чингис Хаан Банк',
]

const IBAN_RE = /^MN\d{2}[A-Z0-9]{18}$/

const MENU: { href: Href; icon: string; label: string }[] = [
  { href: '/profile/personal-info', icon: '👤', label: 'Хувийн мэдээлэл' },
  { href: '/profile/help',          icon: '❓', label: 'Тусламж' },
  { href: '/profile/privacy',       icon: '🔒', label: 'Нууцлалын бодлого' },
]

function maskAccount(num: string): string {
  return '****' + num.slice(-4)
}

function formatIban(iban: string): string {
  return iban.match(/.{1,4}/g)?.join(' ') ?? iban
}

export default function WorkerProfile() {
  const router = useRouter()
  const { data: worker, loading, refetch: refetchWorker } = useApi<Worker | null>('/api/workers/me')
  const { data: banking, refetch: refetchBanking } = useApi<BankingInfo | null>('/api/workers/me/banking')
  const { data: servicesData, refetch: refetchServices } = useApi<{ serviceTypeIds: number[] }>('/api/workers/me/services')
  const { data: serviceTypes } = useApi<ServiceTypeRow[]>('/api/service-types')

  const [isAvailable, setIsAvailable] = useState(false)
  useEffect(() => { if (worker) setIsAvailable(worker.isAvailable) }, [worker])

  const toggleAvailability = async (next: boolean) => {
    setIsAvailable(next)
    try {
      const res = await apiFetch('/api/workers/me/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: next }),
      })
      const body = (await res.json()) as ApiResponse
      if (!body.success) {
        setIsAvailable(!next)
        Alert.alert('Алдаа', body.error)
      }
    } catch {
      setIsAvailable(!next)
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    }
  }

  const [editingPrice, setEditingPrice] = useState(false)
  const [price, setPrice] = useState('')
  const [priceSaving, setPriceSaving] = useState(false)
  useEffect(() => { if (worker) setPrice(String(worker.pricePerHour)) }, [worker])

  const priceNum = parseInt(price, 10)
  const priceValid = !isNaN(priceNum) && priceNum >= 1000 && priceNum <= 500000

  const savePrice = async () => {
    setPriceSaving(true)
    try {
      const res = await apiFetch('/api/workers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerHour: priceNum }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) {
        setEditingPrice(false)
        await refetchWorker()
      } else {
        Alert.alert('Алдаа', body.error)
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setPriceSaving(false)
    }
  }

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [servicesSaving, setServicesSaving] = useState(false)
  const [servicesSaved, setServicesSaved] = useState(false)
  useEffect(() => { if (servicesData) setSelectedIds(servicesData.serviceTypeIds) }, [servicesData])

  const toggleServiceId = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setServicesSaved(false)
  }

  const saveServiceTypes = async () => {
    setServicesSaving(true)
    try {
      const res = await apiFetch('/api/workers/me/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceTypeIds: selectedIds }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) {
        setServicesSaved(true)
        await refetchServices()
      } else {
        Alert.alert('Алдаа', body.error)
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setServicesSaving(false)
    }
  }

  const [editingBank, setEditingBank] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [iban, setIban] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('checking')
  const [bankSaving, setBankSaving] = useState(false)
  const [bankError, setBankError] = useState('')

  const openBankEdit = () => {
    setBankName(banking?.bankName ?? '')
    setAccountNumber(banking?.accountNumber ?? '')
    setAccountHolderName(banking?.accountHolderName ?? '')
    setIban(banking?.iban ?? '')
    setAccountType(banking?.accountType ?? 'checking')
    setBankError('')
    setEditingBank(true)
  }

  const bankValid =
    !!bankName &&
    /^\d{10,20}$/.test(accountNumber) &&
    accountHolderName.trim().length >= 3 &&
    IBAN_RE.test(iban)

  const saveBanking = async () => {
    setBankSaving(true)
    setBankError('')
    try {
      const res = await apiFetch('/api/workers/me/banking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumber, accountHolderName, iban, accountType }),
      })
      const body = (await res.json()) as ApiResponse<BankingInfo>
      if (body.success) {
        setEditingBank(false)
        await refetchBanking()
      } else {
        setBankError(body.error)
      }
    } catch {
      setBankError('Сүлжээний алдаа гарлаа')
    } finally {
      setBankSaving(false)
    }
  }

  if (loading && !worker) return <ActivityIndicator className="mt-12" />

  if (!worker) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white px-6">
        <Text className="text-4xl">🛠️</Text>
        <Text className="text-sm font-medium text-gray-900">Ажилтны профайл олдсонгүй</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6 pb-28">
      <View className="items-center gap-1 py-2">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <Text className="text-3xl font-bold text-gray-500">{(worker.name || '?')[0]}</Text>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-lg font-bold text-gray-900">{worker.name}</Text>
          {worker.danVerified ? (
            <View className="rounded-full bg-green-100 px-2 py-0.5">
              <Text className="text-xs font-medium text-green-700">ДАН</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm text-gray-500">{worker.specialty}</Text>
        <Text className="text-sm font-medium text-gray-900">⭐ {worker.rating.toFixed(1)} ({worker.reviewCount})</Text>
      </View>

      <View className="flex-row items-center justify-between rounded-xl border border-gray-200 p-4">
        <View className="flex-1 gap-1 pr-3">
          <Text className="text-sm font-semibold text-gray-900">Ажил хүлээж авах</Text>
          <Text className="text-xs text-gray-500">
            {isAvailable ? 'Шинэ захиалга хүлээн авч байна' : 'Шинэ захиалга хүлээж авахгүй байна'}
          </Text>
        </View>
        <Switch value={isAvailable} onValueChange={(v) => void toggleAvailability(v)} />
      </View>

      <View className="gap-2 rounded-xl border border-gray-200 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-900">Цагийн хөлс</Text>
          {!editingPrice ? (
            <Pressable onPress={() => setEditingPrice(true)}>
              <Text className="text-sm font-medium text-gray-500">Засах</Text>
            </Pressable>
          ) : null}
        </View>

        {editingPrice ? (
          <>
            <TextInput
              className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
              placeholder="Цагийн хөлс"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
            />
            {!priceValid ? <Text className="text-xs text-red-600">1,000–500,000₮ хооронд байх ёстой</Text> : null}
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 items-center rounded-xl border border-gray-200 py-2.5 active:bg-gray-50"
                onPress={() => setEditingPrice(false)}
              >
                <Text className="text-sm font-semibold text-gray-700">Болих</Text>
              </Pressable>
              <Pressable
                className={`flex-1 items-center rounded-xl py-2.5 active:opacity-80 ${priceValid ? 'bg-gray-900' : 'bg-gray-200'}`}
                disabled={!priceValid || priceSaving}
                onPress={() => void savePrice()}
              >
                {priceSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`text-sm font-semibold ${priceValid ? 'text-white' : 'text-gray-400'}`}>Хадгалах</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Text className="text-base font-bold text-gray-900">{formatMnt(worker.pricePerHour)}/цаг</Text>
        )}
      </View>

      <View className="gap-3 rounded-xl border border-gray-200 p-4">
        <Text className="text-sm font-semibold text-gray-900">Үйлчилгээний төрөл</Text>
        <View className="flex-row flex-wrap gap-2">
          {(serviceTypes ?? []).map((st) => {
            const selected = selectedIds.includes(st.id)
            return (
              <Pressable
                key={st.id}
                className={`rounded-full px-3 py-1.5 ${selected ? 'bg-gray-900' : 'border border-gray-200'}`}
                onPress={() => toggleServiceId(st.id)}
              >
                <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {st.icon} {st.name_mn}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {servicesSaved ? <Text className="text-xs text-green-600">Хадгалагдлаа ✓</Text> : null}
        <Pressable
          className="items-center rounded-xl bg-gray-900 py-2.5 active:opacity-80"
          disabled={servicesSaving}
          onPress={() => void saveServiceTypes()}
        >
          {servicesSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-semibold text-white">Хадгалах</Text>}
        </Pressable>
      </View>

      <View className="gap-3 rounded-xl border border-gray-200 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-900">Банкны дансны мэдээлэл</Text>
          {!editingBank ? (
            <Pressable onPress={openBankEdit}>
              <Text className="text-sm font-medium text-gray-500">{banking ? 'Засах' : 'Нэмэх'}</Text>
            </Pressable>
          ) : null}
        </View>

        {!editingBank && banking ? (
          <View className="gap-1">
            <Text className="text-sm text-gray-900">{banking.bankName}</Text>
            <Text className="font-mono text-sm text-gray-900">{maskAccount(banking.accountNumber)}</Text>
            <Text className="text-xs text-gray-500">{banking.accountHolderName}</Text>
            <Text className="font-mono text-xs text-gray-500">{formatIban(banking.iban)}</Text>
            {banking.verified ? (
              <Text className="text-xs font-medium text-green-600">Баталгаажсан</Text>
            ) : (
              <Text className="text-xs font-medium text-yellow-600">Баталгаажуулж байна</Text>
            )}
          </View>
        ) : null}

        {!editingBank && !banking ? (
          <Text className="text-xs text-gray-500">Орлого авахын тулд банкны мэдээллээ бөглөнө үү</Text>
        ) : null}

        {editingBank ? (
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-xs text-gray-500">Банк</Text>
              <View className="flex-row flex-wrap gap-2">
                {BANKS.map((b) => (
                  <Pressable
                    key={b}
                    className={`rounded-full px-3 py-1.5 ${bankName === b ? 'bg-gray-900' : 'border border-gray-200'}`}
                    onPress={() => setBankName(b)}
                  >
                    <Text className={`text-xs font-medium ${bankName === b ? 'text-white' : 'text-gray-700'}`}>{b}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-xs text-gray-500">Дансны дугаар</Text>
              <TextInput
                className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                placeholder="10–20 оронтой тоо"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs text-gray-500">Дансны эзэмшигчийн нэр</Text>
              <TextInput
                className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                placeholder="Нэр"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs text-gray-500">IBAN</Text>
              <TextInput
                className="rounded-xl border border-gray-300 px-4 py-3 font-mono text-base text-gray-900"
                placeholder="MN86XXXXXXXXXXXXXXXXXX"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                value={iban}
                onChangeText={setIban}
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs text-gray-500">Дансны төрөл</Text>
              <View className="flex-row gap-2">
                {(['checking', 'savings'] as const).map((t) => (
                  <Pressable
                    key={t}
                    className={`flex-1 items-center rounded-xl py-2.5 ${accountType === t ? 'bg-gray-900' : 'border border-gray-200'}`}
                    onPress={() => setAccountType(t)}
                  >
                    <Text className={`text-sm font-medium ${accountType === t ? 'text-white' : 'text-gray-700'}`}>
                      {t === 'checking' ? 'Тооцоо' : 'Хадгаламж'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {bankError ? <Text className="text-sm text-red-600">{bankError}</Text> : null}

            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 items-center rounded-xl border border-gray-200 py-2.5 active:bg-gray-50"
                onPress={() => setEditingBank(false)}
              >
                <Text className="text-sm font-semibold text-gray-700">Болих</Text>
              </Pressable>
              <Pressable
                className={`flex-1 items-center rounded-xl py-2.5 active:opacity-80 ${bankValid ? 'bg-gray-900' : 'bg-gray-200'}`}
                disabled={!bankValid || bankSaving}
                onPress={() => void saveBanking()}
              >
                {bankSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`text-sm font-semibold ${bankValid ? 'text-white' : 'text-gray-400'}`}>Хадгалах</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200">
        {MENU.map((item, i) => (
          <Pressable
            key={item.label}
            className={`flex-row items-center gap-3 px-4 py-4 active:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            onPress={() => router.push(item.href)}
          >
            <Text className="text-lg">{item.icon}</Text>
            <Text className="flex-1 text-base text-gray-900">{item.label}</Text>
            <Text className="text-gray-300">›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        className="items-center rounded-xl border border-red-200 px-4 py-3 active:bg-red-50"
        onPress={() => void authClient.signOut()}
      >
        <Text className="text-base font-semibold text-red-600">Гарах</Text>
      </Pressable>
    </ScrollView>
  )
}
