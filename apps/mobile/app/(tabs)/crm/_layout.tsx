import { Stack } from 'expo-router'
import { COLORS } from '@/lib/theme'

export default function CRMLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:      { backgroundColor: COLORS.deepPurple },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Clients' }} />
      <Stack.Screen name="[id]"  options={{ title: 'Client Profile' }} />
    </Stack>
  )
}
