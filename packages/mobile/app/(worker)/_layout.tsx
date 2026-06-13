import { ActivityIndicator, View } from 'react-native'
import { Redirect, Stack } from 'expo-router'

import { ModeToggle } from '@/components/mode-toggle'
import { getPendingMode } from '@/lib/mode-transition'
import { useApi } from '@/lib/use-api'
import type { AuthMe } from '@/lib/types'

export default function WorkerLayout() {
  const { data: me, loading } = useApi<AuthMe>('/api/auth/me')

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  // ModeToggle navigates here before its PATCH /api/me/mode commits, so the
  // /api/auth/me fetch above can briefly return stale activeMode === 'user'.
  const activeMode = getPendingMode() ?? me?.activeMode

  if (!me?.isWorker || activeMode !== 'worker') {
    return <Redirect href="/" />
  }

  return (
    <View className="flex-1">
      <Stack>
        <Stack.Screen name="worker-jobs" options={{ title: 'Ажлын самбар' }} />
        <Stack.Screen name="worker-active" options={{ title: 'Идэвхтэй ажил' }} />
        <Stack.Screen name="worker-earnings" options={{ title: 'Орлого' }} />
        <Stack.Screen name="worker-profile" options={{ title: 'Профайл' }} />
      </Stack>
      <ModeToggle />
    </View>
  )
}
