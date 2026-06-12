import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'

import { authClient } from '@/lib/auth-client'
import { useApi } from '@/lib/use-api'
import type { ServiceTypeRow } from '@/lib/types'

export default function Home() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { data: serviceTypes, loading, error } = useApi<ServiceTypeRow[]>('/api/service-types')

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 px-4 py-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">
          Сайн байна уу, {session?.user.name ?? ''}
        </Text>
        <Pressable onPress={() => void authClient.signOut()}>
          <Text className="text-sm text-gray-500">Гарах</Text>
        </Pressable>
      </View>

      <Link href="/workers" asChild>
        <Pressable className="rounded-xl border border-gray-300 px-4 py-3 active:bg-gray-50">
          <Text className="text-base font-medium text-gray-900">Ажилчид үзэх →</Text>
        </Pressable>
      </Link>

      <Text className="mt-2 text-base font-semibold text-gray-900">Үйлчилгээ сонгох</Text>

      {loading ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <View className="flex-row flex-wrap gap-3">
        {(serviceTypes ?? []).map((st) => (
          <Pressable
            key={st.id}
            className="w-[47%] gap-1 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
            onPress={() => router.push({ pathname: '/book/[serviceTypeId]', params: { serviceTypeId: String(st.id) } })}
          >
            <Text className="text-2xl">{st.icon}</Text>
            <Text className="text-sm font-semibold text-gray-900">{st.name_mn}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
