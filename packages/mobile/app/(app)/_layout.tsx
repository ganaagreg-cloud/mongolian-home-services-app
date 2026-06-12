import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'HomeService' }} />
      <Stack.Screen name="workers/index" options={{ title: 'Ажилчид' }} />
      <Stack.Screen name="workers/[id]" options={{ title: 'Ажилтан' }} />
      <Stack.Screen name="book/[serviceTypeId]" options={{ title: 'Захиалга' }} />
      <Stack.Screen name="book/payment" options={{ title: 'Төлбөр' }} />
      <Stack.Screen
        name="book/confirm/[orderId]"
        options={{ title: 'Баталгаажуулалт', headerBackVisible: false }}
      />
    </Stack>
  )
}
