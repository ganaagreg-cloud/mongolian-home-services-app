import { Pressable, Text, View } from 'react-native'

import { authClient } from '@/lib/auth-client'

export default function Home() {
  const { data: session } = authClient.useSession()

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-6">
      <Text className="text-xl font-bold text-gray-900">
        Сайн байна уу, {session?.user.name ?? ''}
      </Text>
      <Text className="text-sm text-gray-500">{session?.user.email ?? ''}</Text>
      <Pressable
        className="rounded-xl bg-gray-900 px-8 py-3 active:opacity-80"
        onPress={() => void authClient.signOut()}
      >
        <Text className="text-base font-semibold text-white">Гарах</Text>
      </Pressable>
    </View>
  )
}
