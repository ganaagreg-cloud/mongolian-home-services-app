import { Alert, Pressable, Text, View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'

import { apiFetch } from '@/lib/api-fetch'
import { setPendingMode } from '@/lib/mode-transition'
import { useApi } from '@/lib/use-api'
import type { AuthMe } from '@/lib/types'

const MODES: { value: 'user' | 'worker'; label: string }[] = [
  { value: 'user', label: 'Хэрэглэгч' },
  { value: 'worker', label: 'Ажилтан' },
]

export function ModeToggle() {
  const router = useRouter()
  const segments = useSegments()
  const { data: me } = useApi<AuthMe>('/api/auth/me')

  if (!me?.isWorker) return null

  const currentMode: 'user' | 'worker' = segments[0] === '(worker)' ? 'worker' : 'user'

  const handleSwitch = (target: 'user' | 'worker') => {
    if (target === currentMode) return
    const targetPath = target === 'worker' ? '/worker-jobs' : '/'
    const revertPath = currentMode === 'worker' ? '/worker-jobs' : '/'

    setPendingMode(target)
    router.push(targetPath)

    void (async () => {
      try {
        const res = await apiFetch('/api/me/mode', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: target }),
        })
        if (!res.ok) throw new Error('persist failed')
        setPendingMode(null)
      } catch {
        setPendingMode(null)
        Alert.alert('Алдаа гарлаа', 'Горимыг хадгалж чадсангүй')
        router.push(revertPath)
      }
    })()
  }

  return (
    <View className="absolute bottom-6 left-0 right-0 items-center">
      <View className="flex-row rounded-2xl bg-white p-1 shadow-lg" style={{ width: 192 }}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            className={`flex-1 items-center rounded-xl py-2.5 active:opacity-80 ${
              currentMode === m.value ? 'bg-gray-900' : ''
            }`}
            onPress={() => handleSwitch(m.value)}
          >
            <Text className={`text-sm font-semibold ${currentMode === m.value ? 'text-white' : 'text-gray-500'}`}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
