import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { TransactionType } from '@homeservices/shared'

import { formatMnt } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import type { EarningsData } from '@/lib/types'

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  earning: 'Орлого',
  withdrawal: 'Татан авалт',
  refund: 'Буцаалт',
}

export default function WorkerEarnings() {
  const router = useRouter()
  const { data, loading, error } = useApi<EarningsData>('/api/workers/me/earnings')

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6 pb-28">
      {loading ? <ActivityIndicator className="mt-8" /> : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      {data ? (
        <>
          <View className="gap-1 rounded-xl bg-gray-900 p-5">
            <Text className="text-sm text-gray-300">Нийт орлого</Text>
            <Text className="text-2xl font-bold text-white">{formatMnt(data.totalEarned)}</Text>
            <Text className="text-xs text-gray-300">Энэ сар +{formatMnt(data.thisMonthEarned)}</Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1 rounded-xl border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Энэ сарын орлого</Text>
              <Text className="text-base font-bold text-gray-900">{formatMnt(data.thisMonthEarned)}</Text>
            </View>
            <View className="flex-1 gap-1 rounded-xl border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Хүлээгдэж буй</Text>
              <Text className="text-base font-bold text-gray-900">{formatMnt(data.pendingPayout)}</Text>
            </View>
          </View>

          <Pressable
            className="items-center rounded-xl border border-gray-200 px-4 py-3 active:bg-gray-50"
            onPress={() => router.push('/worker-profile')}
          >
            <Text className="text-sm font-semibold text-gray-900">Банкны дансны мэдээлэл</Text>
          </Pressable>

          <Text className="mt-2 text-base font-semibold text-gray-900">Гүйлгээний түүх</Text>

          {data.transactions.length === 0 ? (
            <View className="items-center gap-2 rounded-xl border border-gray-200 py-10">
              <Text className="text-4xl">🧾</Text>
              <Text className="text-sm font-medium text-gray-900">Гүйлгээ байхгүй</Text>
              <Text className="px-6 text-center text-xs text-gray-500">Ажил дуусгасны дараа энд харагдана</Text>
            </View>
          ) : null}

          {data.transactions.map((tx) => (
            <View key={tx.id} className="flex-row items-center justify-between rounded-xl border border-gray-200 p-4">
              <View className="gap-1">
                <Text className="text-sm font-medium text-gray-900">{tx.service || TX_TYPE_LABELS[tx.type]}</Text>
                <Text className="text-xs text-gray-500">{tx.createdAt.slice(0, 10)}</Text>
              </View>
              <Text className={`text-sm font-bold ${tx.type === 'earning' ? 'text-green-600' : 'text-gray-900'}`}>
                {tx.type === 'earning' ? '+' : ''}
                {formatMnt(tx.amount)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  )
}
