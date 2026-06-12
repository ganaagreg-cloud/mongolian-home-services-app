import { Text, View } from 'react-native';

import { cn, type UserRole } from '@homeservices/shared';

const role: UserRole = 'user';

export default function Index() {
  return (
    <View className={cn('flex-1 items-center justify-center', 'bg-white')}>
      <Text className="text-lg font-semibold text-emerald-600">
        @homeservices/shared resolved — role: {role}
      </Text>
    </View>
  );
}
