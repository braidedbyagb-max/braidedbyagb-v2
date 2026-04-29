import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Linking, ActivityIndicator, TextInput, Share,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBookingDetail, apiPost } from '@/lib/api'
import { COLORS, RADIUS, formatDate, formatTime, formatCurrency } from '@/lib/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Badge from '@/components/Badge'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { supabase } from '@/lib/supabase'

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn:  () => fetchBookingDetail(Number(id)),
  })

  const [actionLoading,  setActionLoading]  = useState<string | null>(null)
  const [showComplete,   setShowComplete]   = useState(false)
  const [balanceMethod,  setBalanceMethod]  = useState<'cash' | 'card'>('cash')
  const [note,           setNote]           = useState('')
  const [addingNote,     setAddingNote]     = useState(false)

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['booking', id] })
    await queryClient.invalidateQueries({ queryKey: ['bookings'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  async function doAction(action: string, body: object) {
    setActionLoading(action)
    try {
      await apiPost(`/api/admin/bookings/${action}`, body)
      await invalidate()
      if (action === 'cancel') router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong')
    } finally {
      setActionLoading(null)
    }
  }

  async function completeBooking() {
    const method = Number(booking?.remaining_balance) > 0 ? balanceMethod : 'none'
    await doAction('complete', { booking_id: Number(id), balance_method: method })
    setShowComplete(false)
  }

  async function confirmDeposit() {
    await doAction('confirm-deposit', { booking_id: Number(id) })
  }

  async function addNote() {
    if (!note.trim()) return
    setAddingNote(true)
    await supabase.from('booking_activity').insert({
      booking_id: Number(id),
      actor: 'admin',
      note: note.trim(),
    })
    setNote('')
    setAddingNote(false)
    refetch()
  }

  async function generatePaymentLink() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('bookings').update({ payment_token: token }).eq('id', Number(id))
    const link = `${process.env.EXPO_PUBLIC_API_URL}/pay?token=${token}`
    await Share.share({ message: `Pay your deposit here: ${link}`, url: link })
    refetch()
  }

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    )
  }

  const customer     = booking.customers as any
  const service      = booking.services  as any
  const variant      = booking.service_variants as any
  const addons       = booking.booking_addons ?? []
  const activity     = (booking.booking_activity as any[] ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const invoices     = booking.invoices ?? []
  const isPending    = booking.status === 'pending'
  const isConfirmed  = booking.status === 'confirmed'
  const isCompleted  = booking.status === 'completed'
  const isCancellable = ['pending', 'confirmed'].includes(booking.status)
  const hasBalance   = Number(booking.remaining_balance) > 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Status header */}
        <View style={styles.refRow}>
          <Text style={styles.ref}>{booking.booking_ref}</Text>
          <Badge status={booking.status} />
        </View>

        {/* Booking summary */}
        <Card>
          <Row label="Service" value={`${service?.name}${variant?.variant_name ? ` — ${variant.variant_name}` : ''}`} />
          <Row label="Date"    value={formatDate(booking.booked_date)} />
          <Row label="Time"    value={formatTime(booking.booked_time)} />
          {addons.map((a: any, i: number) => (
            <Row key={i} label={`+ ${a.service_addons?.name}`} value={formatCurrency(a.price_charged)} />
          ))}
          <View style={styles.divider} />
          <Row label="Total"      value={formatCurrency(booking.total_price)} bold />
          <Row
            label="Deposit"
            value={`${formatCurrency(booking.deposit_amount)} ${booking.deposit_paid ? '✓ Paid' : '(unpaid)'}`}
            valueColor={booking.deposit_paid ? COLORS.success : COLORS.warning}
          />
          {hasBalance && (
            <Row label="Balance Due" value={formatCurrency(booking.remaining_balance)} valueColor={COLORS.primary} bold />
          )}
          {Number(booking.loyalty_discount) > 0 && (
            <Row label="Loyalty discount" value={`−${formatCurrency(booking.loyalty_discount)}`} valueColor='#7c3aed' />
          )}
          {booking.client_notes ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.notesLabel}>Client notes</Text>
              <Text style={styles.notesText}>{booking.client_notes}</Text>
            </>
          ) : null}
        </Card>

        {/* Client */}
        <Card>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.clientName}>{customer?.name}</Text>
          <Text style={styles.clientMeta}>{customer?.email}</Text>
          <Text style={styles.clientMeta}>{customer?.phone}</Text>
          <View style={styles.clientActions}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: COLORS.whatsapp }]}
              onPress={() => Linking.openURL(`https://wa.me/${customer?.phone?.replace(/\D/g, '')}`)}
            >
              <Text style={styles.contactBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: COLORS.screenBg, borderWidth: 1, borderColor: COLORS.border }]}
              onPress={() => Linking.openURL(`mailto:${customer?.email}`)}
            >
              <Text style={[styles.contactBtnText, { color: COLORS.primary }]}>✉ Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: COLORS.screenBg, borderWidth: 1, borderColor: COLORS.border }]}
              onPress={() => router.push(`/(tabs)/crm/${customer?.id}`)}
            >
              <Text style={[styles.contactBtnText, { color: COLORS.textMuted }]}>Profile →</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Actions</Text>

          {isPending && !booking.deposit_paid && booking.payment_method === 'bank_transfer' && (
            <Button
              label={actionLoading === 'confirm-deposit' ? 'Confirming…' : '✓ Confirm Bank Transfer'}
              onPress={confirmDeposit}
              variant="success"
              loading={actionLoading === 'confirm-deposit'}
            />
          )}

          {isPending && (
            <Button
              label={actionLoading === 'confirm' ? 'Confirming…' : 'Confirm Booking'}
              onPress={() => {
                Alert.alert('Confirm Booking', 'Mark this booking as confirmed?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: async () => {
                    setActionLoading('confirm')
                    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', Number(id))
                    await supabase.from('booking_activity').insert({ booking_id: Number(id), actor: 'admin', note: 'Status changed to confirmed' })
                    await invalidate()
                    setActionLoading(null)
                  }},
                ])
              }}
              variant="primary"
              loading={actionLoading === 'confirm'}
            />
          )}

          {isConfirmed && !showComplete && (
            <Button
              label="Mark Completed"
              onPress={() => setShowComplete(true)}
              variant="primary"
            />
          )}

          {/* Completion panel */}
          {showComplete && (
            <View style={styles.completePanel}>
              <Text style={styles.completePanelTitle}>
                {hasBalance
                  ? `How was the ${formatCurrency(booking.remaining_balance)} balance collected?`
                  : 'Confirm completion — no balance due.'}
              </Text>
              {hasBalance && (
                <View style={styles.methodRow}>
                  {(['cash', 'card'] as const).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, balanceMethod === m && styles.methodBtnActive]}
                      onPress={() => setBalanceMethod(m)}
                    >
                      <Text style={[styles.methodBtnText, balanceMethod === m && { color: '#fff' }]}>
                        {m === 'cash' ? '💵 Cash' : '💳 Card'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.completePanelNote}>
                This will create accounting entries, award loyalty points, and email the client a receipt.
              </Text>
              <View style={styles.completeActions}>
                <Button
                  label={actionLoading === 'complete' ? 'Completing…' : '✓ Confirm Complete'}
                  onPress={completeBooking}
                  variant="success"
                  loading={actionLoading === 'complete'}
                />
                <Button label="Cancel" onPress={() => setShowComplete(false)} variant="ghost" />
              </View>
            </View>
          )}

          {isCancellable && (
            <>
              <Button
                label={actionLoading === 'cancel-normal' ? 'Cancelling…' : 'Cancel Booking'}
                onPress={() => Alert.alert('Cancel Booking', 'Are you sure?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, cancel', style: 'destructive', onPress: () => {
                    setActionLoading('cancel-normal')
                    doAction('cancel', { booking_id: Number(id), status: 'cancelled' })
                  }},
                ])}
                variant="danger"
                loading={actionLoading === 'cancel-normal'}
              />
              <Button
                label={actionLoading === 'late-cancel' ? 'Cancelling…' : 'Late Cancel (deposit forfeited)'}
                onPress={() => Alert.alert('Late Cancel', 'Client will lose their deposit. Are you sure?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes', style: 'destructive', onPress: () => {
                    setActionLoading('late-cancel')
                    doAction('cancel', { booking_id: Number(id), status: 'late_cancelled' })
                  }},
                ])}
                variant="warning"
                loading={actionLoading === 'late-cancel'}
              />
            </>
          )}

          {!isCompleted && (
            <Button
              label={actionLoading === 'no_show' ? 'Saving…' : 'No Show'}
              onPress={() => Alert.alert('No Show', 'Mark this client as a no-show?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'No Show', onPress: () => doAction('cancel', { booking_id: Number(id), status: 'no_show' }) },
              ])}
              variant="warning"
              loading={actionLoading === 'no_show'}
            />
          )}

          {/* Payment link */}
          {!isCompleted && (
            <Button
              label="📤 Generate & Share Payment Link"
              onPress={generatePaymentLink}
              variant="outline"
              loading={actionLoading === 'payment_link'}
            />
          )}
        </Card>

        {/* Invoices */}
        {invoices.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Invoices</Text>
            {invoices.map((inv: any) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <Text style={styles.invoiceNum}>{inv.invoice_number}</Text>
                <Text style={styles.invoiceAmount}>{formatCurrency(inv.amount)}</Text>
                {inv.pdf_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(inv.pdf_url)}>
                    <Text style={styles.pdfLink}>PDF ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Activity log */}
        <Card>
          <Text style={styles.sectionTitle}>Activity Log</Text>
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
            <TouchableOpacity
              style={styles.noteAddBtn}
              onPress={addNote}
              disabled={addingNote || !note.trim()}
            >
              <Text style={styles.noteAddText}>Add</Text>
            </TouchableOpacity>
          </View>
          {activity.map((a: any) => (
            <View key={a.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityNote}>{a.note}</Text>
                <Text style={styles.activityMeta}>
                  {a.actor} · {new Date(a.created_at).toLocaleString('en-GB')}
                </Text>
              </View>
            </View>
          ))}
          {activity.length === 0 && <Text style={styles.muted}>No activity yet.</Text>}
        </Card>

      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, bold, valueColor }: {
  label: string; value: string; bold?: boolean; valueColor?: string
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700' }, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.screenBg },
  refRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ref:              { fontSize: 15, fontFamily: 'monospace', fontWeight: '700', color: COLORS.primary },
  sectionTitle:     { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel:         { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  rowValue:         { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1 },
  divider:          { height: 1, backgroundColor: '#f0e8f5', marginVertical: 8 },
  notesLabel:       { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  notesText:        { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  clientName:       { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  clientMeta:       { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
  clientActions:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  contactBtn:       { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  contactBtnText:   { fontSize: 12, fontWeight: '700', color: '#fff' },
  completePanel:    { backgroundColor: '#f9fafb', borderRadius: RADIUS.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  completePanelTitle:{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  completePanelNote: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  methodRow:        { flexDirection: 'row', gap: 8, marginBottom: 10 },
  methodBtn:        { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  methodBtnActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  methodBtnText:    { fontSize: 14, fontWeight: '600', color: COLORS.text },
  completeActions:  { gap: 4 },
  invoiceRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f0e8f5' },
  invoiceNum:       { flex: 1, fontSize: 12, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '600' },
  invoiceAmount:    { fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 12 },
  pdfLink:          { fontSize: 12, color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  noteInputRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  noteInput:        { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.text },
  noteAddBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, justifyContent: 'center' },
  noteAddText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  activityItem:     { flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f0e8f5' },
  activityDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5 },
  activityNote:     { fontSize: 13, color: COLORS.text },
  activityMeta:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  muted:            { color: COLORS.textMuted, fontSize: 13 },
})
