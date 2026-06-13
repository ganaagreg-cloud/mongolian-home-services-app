import { View } from 'react-native'
import { Stack } from 'expo-router'

import { ModeToggle } from '@/components/mode-toggle'

export default function AppLayout() {
  return (
    <View className="flex-1">
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
        <Stack.Screen name="orders/index" options={{ title: 'Захиалгууд' }} />
        <Stack.Screen name="orders/[id]/index" options={{ title: 'Захиалга' }} />
        <Stack.Screen name="orders/[id]/chat" options={{ title: 'Чат' }} />
        <Stack.Screen name="orders/[id]/review" options={{ title: 'Үнэлгээ' }} />
        <Stack.Screen name="orders/[id]/board" options={{ title: 'Ажилтнуудын санал' }} />
        <Stack.Screen name="orders/[id]/pay" options={{ title: 'Төлбөр' }} />
        <Stack.Screen name="notifications" options={{ title: 'Мэдэгдэл' }} />
        <Stack.Screen name="profile/index" options={{ title: 'Профайл' }} />
        <Stack.Screen name="profile/personal-info" options={{ title: 'Хувийн мэдээлэл' }} />
        <Stack.Screen name="profile/saved-workers" options={{ title: 'Хадгалсан ажилчид' }} />
        <Stack.Screen name="profile/help" options={{ title: 'Тусламж' }} />
        <Stack.Screen name="profile/privacy" options={{ title: 'Нууцлалын бодлого' }} />
      </Stack>
      <ModeToggle />
    </View>
  )
}
