import '../global.css'

import { Stack } from 'expo-router'

import { authClient } from '@/lib/auth-client'

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession()

  // Splash stays visible until the SecureStore session cache resolves
  if (isPending) return null

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: 'HomeService' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}
