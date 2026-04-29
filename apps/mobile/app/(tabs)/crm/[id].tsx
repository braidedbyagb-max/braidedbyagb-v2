import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Alert, TextInput, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCustomerProfile } from '@/lib/api'
import { COLORS, RADIUS, formatDate, formatCurrency } from '@/lib/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import { supabase } from '@/lib/supabase'

const TAGS = ['VIP', 'Regular', 'New Client', 'At Risk']

export default function CustomerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn:  () => fetchCustomerProfile(Number(id)),
  })

  const [note,        setNote]        = useState('')
  const [addingNote,  setAddingNote]  = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['customer', id] })
    await queryClient.invalidateQueries({ queryKey: ['customers'] })
    refetch()
  }

  async function toggleTag(tag: string) {
    if (!data) return
    const current = data.customer.tags ?? []
    const next = current.includes(tag)
      ? current.filter((t: string) => t !== tag)
      : [...current, tag]
    await supabase.from('customers').update({ tags: next }).eq('id', Number(id))
    await invalidate()
  }

  async function addNote() {
    if (!note.trim()) return
    setAddingNote(true)
    await supabase.from('customer_notes').insert({ customer_id: Number(id), note: note.trim() })
    setNote('')
    setAddingNote(false)
    await invalidate()
  }

  async function adjustPoints(delta: number, description: string) {
    const current = data?.customer.loyalty_points ?? 0
    await supabase.from('loyalty_transactions').insert({
      customer_id: Number(id), type: delta > 0 ? 'manual_add' : 'manual_remove',
      points: delta, description,
    })
    await supabase.from('customers').update({ loyalty_points: current + delta }).eq('id', Number(id))
    await invalidate()
  }

  async function blockCustomer() {
    Alert.prompt('Block Client', 'Enter reason for blocking (internal only):', async (reason) => {
      if (!reason?.trim()) return
      setActionLoading(true)
      await supabase.from('customers').update({
        is_blocked: true, block_reason: reason, blocked_at: new Date().toISOString(),
      }).eq('id', Number(id))
      setActionLoading(false)
      await invalidate()
    })
  }

  async function unblockCustomer() {
    setActionLoading(true)
    await supabase.from('customers').update({
      is_blocked: false, block_reason: null, blocked_at: null,
    }).eq('id', Number(id))
    setActionLoading(false)
    await invalidate()
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    )
  }

  const { customer, bookings, notes, loyalty, ltv } = data
  const completedCount = bookings.filter((b: any) => b.status === 'completed').length

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Blocked banner */}
        {customer.is_blocked && (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedText}>⚠ This client is blocked{customer.block_reason ? `: ${customer.block_reason}` : ''}</Text>
            <TouchableOpacity onPress={unblockCustomer} disabled={actionLoading}>
              <Text style={styles.unblockLink}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Identity */}
        <Card>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{customer.name}</Text>
              <Text style={styles.clientSince}>
                Client since {new Date(customer.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>📧 {customer.email}</Text>
          <Text style={styles.meta}>📱 {customer.phone}</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: COLORS.whatsapp }]}
              onPress={() => Linking.openURL(`https://wa.me/${customer.phone?.replace(/\D/g, '')}`)}
            >
              <Text style={styles.contactBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: COLORS.screenBg, borderWidth: 1, borderColor: COLORS.border }]}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            >
              <Text style={[styles.contactBtnText, { color: COLORS.primary }]}>✉ Email</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Stats */}
        <Card>
          <Text style={styles.sectionTitle}>Metrics</Text>
          <Row label="Lifetime Value"  value={formatCurrency(ltv)}               bold color={COLORS.primary} />
          <Row label="Total Bookings"  value={String(bookings.length)} />
          <Row label="Completed"       value={String(completedCount)} />
          <Row label="Loyalty Points"  value={`${customer.loyalty_points ?? 0} pts`} bold color={COLORS.gold} />
        </Card>

        {/* Tags */}
        <Card>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {TAGS.map(tag => {
              const active = (customer.tags ?? []).includes(tag)
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Card>

        {/* Admin actions */}
        <Card>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.pointsRow}>
            <Button
              label="+ Add Points"
              onPress={() => {
                Alert.prompt('Add Points', 'How many points to add?', (pts) => {
                  if (!pts) return
                  Alert.prompt('Reason', 'Enter reason:', (reason) => {
                    if (reason) adjustPoints(parseInt(pts), reason)
                  })
                }, 'plain-text', '', 'numeric')
              }}
              variant="outline"
              fullWidth={false}
              small
            />
            <Button
              label="− Remove Points"
              onPress={() => {
                Alert.prompt('Remove Points', 'How many points to remove?', (pts) => {
                  if (!pts) return
                  Alert.prompt('Reason', 'Enter reason:', (reason) => {
                    if (reason) adjustPoints(-Math.abs(parseInt(pts)), reason)
                  })
                }, 'plain-text', '', 'numeric')
              }}
              variant="danger"
              fullWidth={false}
              small
            />
          </View>
          {!customer.is_blocked ? (
            <Button
              label="🚫 Block Client"
              onPress={blockCustomer}
              variant="danger"
              loading={actionLoading}
            />
          ) : null}
        </Card>

        {/* Loyalty history */}
        {loyalty.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Loyalty History</Text>
            {loyalty.map((t: any) => (
              <View key={t.id} style={styles.loyaltyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loyaltyDesc}>{t.description ?? t.type}</Text>
                  <Text style={styles.loyaltyDate}>{new Date(t.created_at).toLocaleDateString('en-GB')}</Text>
                </View>
                <Text style={[styles.loyaltyPts, { color: t.points > 0 ? COLORS.success : COLORS.danger }]}>
                  {t.points > 0 ? '+' : ''}{t.points} pts
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Booking history */}
        <Card>
          <Text style={styles.sectionTitle}>Booking History</Text>
          {bookings.length === 0 ? (
            <Text style={styles.muted}>No bookings yet.</Text>
          ) : bookings.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bookingRow}
              onPress={() => router.push(`/(tabs)/bookings/${b.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingService}>{b.services?.name}</Text>
                <Text style={styles.bookingDate}>{formatDate(b.booked_date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge status={b.status} />
                <Text style={styles.bookingPrice}>{formatCurrency(b.total_price)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Notes */}
        <Card>
          <Text style={styles.sectionTitle}>Admin Notes</Text>
          <View style={styles.noteInputRow}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note…"
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="done"
              onSubmitEditing={addNote}
            />
            <TouchableOpacity style={styles.noteAddBtn} onPress={addNote} disabled={addingNote || !note.trim()}>
              <Text style={styles.noteAddText}>Add</Text>
            </TouchableOpacity>
          </View>
          {notes.length === 0 ? (
            <Text style={styles.muted}>No notes yet.</Text>
          ) : notes.map((n: any) => (
            <View key={n.id} style={styles.noteItem}>
              <View style={styles.noteDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteText}>{n.note}</Text>
                <Text style={styles.noteMeta}>{new Date(n.created_at).toLocaleString('en-GB')}</Text>
              </View>
            </View>
          ))}
        </Card>

      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && { fontWeight: '700' }, color && { color }]}>{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { fontSize: 13, color: COLORS.textMuted },
  value: { fontSize: 13, fontWeight: '600', color: COLORS.text },
})

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.screenBg },
  blockedBanner:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: RADIUS.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' },
  blockedText:    { fontSize: 13, fontWeight: '600', color: COLORS.danger, flex: 1 },
  unblockLink:    { fontSize: 13, color: COLORS.danger, fontWeight: '700', textDecorationLine: 'underline' },
  identityRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:         { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText:     { color: '#fff', fontSize: 22, fontWeight: '800' },
  clientName:     { fontSize: 18, fontWeight: '800', color: COLORS.text },
  clientSince:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  meta:           { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  contactRow:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  contactBtn:     { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  tagsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:            { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  tagActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagText:        { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tagTextActive:  { color: '#fff' },
  pointsRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  loyaltyRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f5f0f7' },
  loyaltyDesc:    { fontSize: 13, color: COLORS.text },
  loyaltyDate:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  loyaltyPts:     { fontSize: 14, fontWeight: '700' },
  bookingRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f5f0f7' },
  bookingService: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  bookingDate:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  bookingPrice:   { fontSize: 12, color: COLORS.textMuted },
  noteInputRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  noteInput:      { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text },
  noteAddBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, justifyContent: 'center' },
  noteAddText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  noteItem:       { flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f5f0f7' },
  noteDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5 },
  noteText:       { fontSize: 13, color: COLORS.text },
  noteMeta:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  muted:          { color: COLORS.textMuted, fontSize: 13 },
})
