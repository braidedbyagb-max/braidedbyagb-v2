import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchBookings } from '@/lib/api'
import { COLORS, RADIUS, formatDate, formatTime, formatCurrency } from '@/lib/theme'
import Badge from '@/components/Badge'

type Filter = 'today' | 'pending' | 'confirmed' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'all',       label: 'All' },
]

export default function BookingsListScreen() {
  const [filter, setFilter] = useState<Filter>('today')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', filter],
    queryFn:  () => fetchBookings(filter),
  })

  const bookings = data ?? []

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No bookings</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => String(b.id)}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item: b }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/bookings/${b.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.ref}>{b.booking_ref}</Text>
                  <Text style={styles.name}>{b.customers?.name}</Text>
                  <Text style={styles.service}>{b.services?.name}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Badge status={b.status} />
                  <Text style={styles.price}>{formatCurrency(b.total_price)}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>
                  {formatDate(b.booked_date)} · {formatTime(b.booked_time)}
                </Text>
                {!b.deposit_paid && (
                  <Text style={styles.unpaidTag}>💰 Deposit unpaid</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: COLORS.screenBg },
  filters:         { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  filterBtn:       { flex: 1, paddingVertical: 7, borderRadius: RADIUS.full, alignItems: 'center', backgroundColor: COLORS.screenBg },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText:      { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive:{ color: '#fff' },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:       { color: COLORS.textMuted, fontSize: 15 },
  card:            { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, shadowColor: '#7A0050', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardLeft:        { flex: 1 },
  cardRight:       { alignItems: 'flex-end', gap: 6 },
  ref:             { fontSize: 11, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  name:            { fontSize: 15, fontWeight: '700', color: COLORS.text },
  service:         { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  price:           { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardBottom:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta:            { fontSize: 12, color: COLORS.textMuted },
  unpaidTag:       { fontSize: 11, color: COLORS.warning, fontWeight: '600' },
})
