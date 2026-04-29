import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '@/lib/api'
import { COLORS, RADIUS, formatTime, formatCurrency, STATUS_CONFIG } from '@/lib/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Card from '@/components/Card'
import Badge from '@/components/Badge'

export default function DashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  fetchDashboardStats,
    refetchInterval: 60_000, // auto-refresh every minute
  })

  const todayBookings   = data?.todayBookings   ?? []
  const pendingDeposits = data?.pendingDeposits ?? []
  const takings         = data?.takings         ?? 0

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.date}>{todayStr}</Text>
        </View>

        <View style={styles.content}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Today's bookings" value={String(todayBookings.length)} icon="📅" />
            <StatCard label="Today's takings"  value={formatCurrency(takings)}        icon="💰" color={COLORS.success} />
            <StatCard label="Pending deposits" value={String(pendingDeposits.length)} icon="⏳" color={pendingDeposits.length > 0 ? COLORS.warning : COLORS.textMuted} />
          </View>

          {/* Pending deposit alerts */}
          {pendingDeposits.length > 0 && (
            <Card style={styles.alertCard}>
              <Text style={styles.sectionTitle}>⚠ Awaiting Payment</Text>
              {pendingDeposits.map((b: any) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.alertRow}
                  onPress={() => router.push(`/(tabs)/bookings/${b.id}`)}
                >
                  <Text style={styles.alertRef}>{b.booking_ref}</Text>
                  <Text style={styles.alertName}>{b.customers?.name}</Text>
                  <Text style={styles.alertArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {/* Today's schedule */}
          <Card>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {isLoading ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : todayBookings.length === 0 ? (
              <Text style={styles.muted}>No bookings today.</Text>
            ) : (
              todayBookings.map((b: any) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.bookingRow}
                  onPress={() => router.push(`/(tabs)/bookings/${b.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingTime}>
                    <Text style={styles.timeText}>{formatTime(b.booked_time)}</Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName}>{b.customers?.name}</Text>
                    <Text style={styles.bookingService}>{b.services?.name}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <Badge status={b.status} />
                    {b.customers?.phone && (
                      <TouchableOpacity
                        style={styles.waBtn}
                        onPress={() => Linking.openURL(`https://wa.me/${b.customers.phone.replace(/\D/g, '')}`)}
                      >
                        <Text style={styles.waBtnText}>💬</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </Card>

          {/* Quick actions */}
          <Card>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              {[
                { label: '📅 All Bookings',   onPress: () => router.push('/(tabs)/bookings') },
                { label: '👥 Clients',         onPress: () => router.push('/(tabs)/crm') },
                { label: '💸 Log Expense',     onPress: () => router.push('/(tabs)/accounting') },
                { label: '💵 Pay Myself',      onPress: () => router.push('/(tabs)/accounting') },
              ].map(a => (
                <TouchableOpacity key={a.label} style={styles.quickBtn} onPress={a.onPress} activeOpacity={0.7}>
                  <Text style={styles.quickBtnText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, icon, color = COLORS.deepPurple }: {
  label: string; value: string; icon: string; color?: string
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.deepPurple },
  header:        { backgroundColor: COLORS.deepPurple, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  greeting:      { fontSize: 24, fontWeight: '900', color: '#fff' },
  date:          { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  content:       { backgroundColor: COLORS.screenBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 600, padding: 16, marginTop: -12 },
  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard:      { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', shadowColor: '#7A0050', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  statIcon:      { fontSize: 20, marginBottom: 4 },
  statValue:     { fontSize: 20, fontWeight: '900', color: COLORS.deepPurple },
  statLabel:     { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  muted:         { color: COLORS.textMuted, fontSize: 14 },
  alertCard:     { borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  alertRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f5f0f7' },
  alertRef:      { fontSize: 12, fontFamily: 'monospace', color: COLORS.primary, width: 100 },
  alertName:     { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  alertArrow:    { fontSize: 18, color: COLORS.textMuted },
  bookingRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f0f7', gap: 10 },
  bookingTime:   { width: 64 },
  timeText:      { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bookingInfo:   { flex: 1 },
  bookingName:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  bookingService:{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  bookingRight:  { alignItems: 'flex-end', gap: 4 },
  waBtn:         { marginTop: 4 },
  waBtnText:     { fontSize: 18 },
  quickActions:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn:      { backgroundColor: COLORS.screenBg, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border },
  quickBtnText:  { fontSize: 13, fontWeight: '600', color: COLORS.deepPurple },
})
