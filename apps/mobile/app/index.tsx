import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

export default function Index() {
  const { session, loading } = useAuthStore()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.deepPurple }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    )
  }

  if (session) return <Redirect href="/(tabs)" />
  return <Redirect href="/login" />
}
