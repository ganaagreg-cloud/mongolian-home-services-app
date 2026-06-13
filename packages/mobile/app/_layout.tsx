import '../global.css'

import { useEffect } from 'react'
import { Stack } from 'expo-router'

import { authClient } from '@/lib/auth-client'
import { registerForPushNotificationsAsync, useNotificationRouting } from '@/lib/push-notifications'

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession()

  useNotificationRouting()

  useEffect(() => {
    if (session) void registerForPushNotificationsAsync()
  }, [session?.user.id])

  // Splash stays visible until the SecureStore session cache resolves
  if (isPending) return null

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Нууц үг сэргээх' }} />
        <Stack.Screen name="otp-verify" options={{ title: 'Баталгаажуулах' }} />
        <Stack.Screen name="pin-reset" options={{ title: 'Шинэ нууц үг' }} />
      </Stack.Protected>
    </Stack>
  )
}
