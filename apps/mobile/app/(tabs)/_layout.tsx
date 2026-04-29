import { Tabs, Redirect } from 'expo-router'
import { Text } from 'react-native'
import { useAuthStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
}

export default function TabLayout() {
  const { session, loading } = useAuthStore()

  if (!loading && !session) return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={{
        headerStyle:           { backgroundColor: COLORS.deepPurple },
        headerTintColor:       '#fff',
        headerTitleStyle:      { fontWeight: '800', fontSize: 18 },
        tabBarStyle:           { backgroundColor: '#fff', borderTopColor: COLORS.border },
        tabBarActiveTintColor:  COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle:      { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: 'Clients',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="accounting"
        options={{
          title: 'Money',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
