import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchCustomers } from '@/lib/api'
import { COLORS, RADIUS } from '@/lib/theme'

export default function CRMListScreen() {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search],
    queryFn:  () => fetchCustomers(search || undefined),
  })

  const customers = data ?? []

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={COLORS.textMuted}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No clients found</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={c => String(c.id)}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/crm/${c.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{c.name}</Text>
                  {c.is_blocked && <Text style={styles.blockedTag}>🚫 Blocked</Text>}
                  {(c.tags ?? []).includes('VIP') && <Text style={styles.vipTag}>⭐ VIP</Text>}
                </View>
                <Text style={styles.email}>{c.email}</Text>
                {c.phone ? <Text style={styles.phone}>{c.phone}</Text> : null}
              </View>
              <View style={styles.right}>
                {(c.loyalty_points ?? 0) > 0 && (
                  <Text style={styles.points}>{c.loyalty_points} pts</Text>
                )}
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.screenBg },
  searchBar:  { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput:{ backgroundColor: COLORS.screenBg, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:  { color: COLORS.textMuted, fontSize: 15 },
  card:       { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#7A0050', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  info:       { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  blockedTag: { fontSize: 11, color: COLORS.danger },
  vipTag:     { fontSize: 11, color: COLORS.warning },
  email:      { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  phone:      { fontSize: 12, color: COLORS.textMuted },
  right:      { alignItems: 'flex-end' },
  points:     { fontSize: 11, fontWeight: '700', color: COLORS.gold, marginBottom: 4 },
  arrow:      { fontSize: 20, color: COLORS.textMuted },
})
