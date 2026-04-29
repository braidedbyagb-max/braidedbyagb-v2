import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/lib/store'
import { COLORS, RADIUS } from '@/lib/theme'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export default function SettingsScreen() {
  const { signOut } = useAuthStore()

  const { data: user } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    },
  })

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  const links = [
    { label: '📅 Manage Bookings', url: `${process.env.EXPO_PUBLIC_API_URL}/admin/bookings` },
    { label: '⚙️ Admin Settings', url: `${process.env.EXPO_PUBLIC_API_URL}/admin/settings` },
    { label: '🧾 Invoices', url: `${process.env.EXPO_PUBLIC_API_URL}/admin/accounting/invoices` },
    { label: '📒 Accounting Ledger', url: `${process.env.EXPO_PUBLIC_API_URL}/admin/accounting/ledger` },
    { label: '📊 Analytics', url: `${process.env.EXPO_PUBLIC_API_URL}/admin/accounting` },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Account info */}
        <Card>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() ?? 'A'}
              </Text>
            </View>
            <View>
              <Text style={styles.adminLabel}>Admin</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Web admin links */}
        <Card>
          <Text style={styles.sectionTitle}>Open in Browser</Text>
          {links.map(l => (
            <TouchableOpacity
              key={l.label}
              style={styles.linkRow}
              onPress={() => Linking.openURL(l.url)}
              activeOpacity={0.7}
            >
              <Text style={styles.linkLabel}>{l.label}</Text>
              <Text style={styles.linkArrow}>↗</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* App info */}
        <Card>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App</Text>
            <Text style={styles.infoValue}>BraidedbyAGB Admin</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{process.env.EXPO_PUBLIC_API_URL}</Text>
          </View>
        </Card>

        {/* Sign out */}
        <Button label="Sign Out" onPress={confirmSignOut} variant="danger" />

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.screenBg },
  accountRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 22, fontWeight: '800' },
  adminLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  email:        { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  linkRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f5f0f7' },
  linkLabel:    { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  linkArrow:    { fontSize: 16, color: COLORS.textMuted },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel:    { fontSize: 13, color: COLORS.textMuted },
  infoValue:    { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
})
