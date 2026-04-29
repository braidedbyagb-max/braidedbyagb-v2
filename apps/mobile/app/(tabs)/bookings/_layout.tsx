import { Stack } from 'expo-router'
import { COLORS } from '@/lib/theme'

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:      { backgroundColor: COLORS.deepPurple },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bookings' }} />
      <Stack.Screen name="[id]"  options={{ title: 'Booking Detail' }} />
    </Stack>
  )
}
