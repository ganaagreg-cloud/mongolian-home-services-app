import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'

import { apiFetch } from './api-fetch'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// Best-effort: registers this device for native push and stores the Expo push
// token server-side. Never throws — polling (RN3) remains the fallback when
// permissions are denied, the project has no EAS projectId, or this is web.
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === 'web') return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      })
    }

    const existing = await Notifications.getPermissionsAsync()
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted
    if (!granted) return

    const extra = Constants.expoConfig?.extra as unknown as { eas?: { projectId?: string } } | undefined
    const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) return

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId })

    await apiFetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoPushToken }),
    })
  } catch {
    // best-effort — push registration must never block app startup
  }
}

interface PushData {
  orderId?: number
}

// Routes to the relevant screen when the user taps a push notification.
// Foreground/background delivery is handled by the OS; this covers the tap.
export function useNotificationRouting(): void {
  const router = useRouter()
  const response = Notifications.useLastNotificationResponse()

  useEffect(() => {
    if (!response) return

    const data = (response.notification.request.content.data ?? {}) as unknown as PushData
    if (data.orderId !== undefined) {
      router.push({ pathname: '/orders/[id]', params: { id: String(data.orderId) } })
    } else {
      router.push('/notifications')
    }

    Notifications.clearLastNotificationResponse()
  }, [response, router])
}
