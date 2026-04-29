import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPost } from '@/lib/api'
import { COLORS, RADIUS, formatCurrency } from '@/lib/theme'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

const EXPENSE_CATEGORIES = [
  { code: '5000', label: '💈 Extensions / Products' },
  { code: '5100', label: '📦 Business Supplies' },
  { code: '5110', label: '📱 Social Media / Ads' },
  { code: '5120', label: '🔧 Equipment' },
  { code: '5200', label: '💵 Other' },
]

export default function AccountingScreen() {
  const [tab, setTab] = useState<'expense' | 'draw'>('expense')

  // Expense form
  const [expAmount,  setExpAmount]  = useState('')
  const [expDesc,    setExpDesc]    = useState('')
  const [expCat,     setExpCat]     = useState('5100')
  const [expLoading, setExpLoading] = useState(false)

  // Draw form
  const [drawAmount,  setDrawAmount]  = useState('')
  const [drawNotes,   setDrawNotes]   = useState('')
  const [drawLoading, setDrawLoading] = useState(false)

  // Today's takings (completed bookings today)
  const { data: todayData } = useQuery({
    queryKey: ['today-takings'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('booked_date', today)
        .eq('status', 'completed')
      return (data ?? []).reduce((s, b) => s + Number(b.total_price), 0)
    },
  })

  async function submitExpense() {
    const amount = parseFloat(expAmount)
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return }
    if (!expDesc.trim()) { Alert.alert('Error', 'Enter a description'); return }
    setExpLoading(true)
    try {
      await apiPost('/api/accounting/log-expense', {
        amount,
        description: expDesc.trim(),
        category_code: expCat,
        date: new Date().toISOString().split('T')[0],
      })
      Alert.alert('Expense Logged', `£${amount.toFixed(2)} recorded.`)
      setExpAmount('')
      setExpDesc('')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setExpLoading(false)
  }

  async function submitDraw() {
    const amount = parseFloat(drawAmount)
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return }
    setDrawLoading(true)
    try {
      await apiPost('/api/accounting/log-draw', {
        amount,
        notes: drawNotes.trim(),
        date: new Date().toISOString().split('T')[0],
      })
      Alert.alert('Draw Recorded', `£${amount.toFixed(2)} pay-myself logged.`)
      setDrawAmount('')
      setDrawNotes('')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setDrawLoading(false)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Today's takings */}
        <Card style={styles.takingsCard}>
          <Text style={styles.takingsLabel}>Today's Takings</Text>
          <Text style={styles.takingsValue}>{formatCurrency(todayData ?? 0)}</Text>
          <Text style={styles.takingsSub}>From completed bookings today</Text>
        </Card>

        {/* Tab toggle */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'expense' && styles.tabBtnActive]}
            onPress={() => setTab('expense')}
          >
            <Text style={[styles.tabText, tab === 'expense' && styles.tabTextActive]}>
              💸 Log Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'draw' && styles.tabBtnActive]}
            onPress={() => setTab('draw')}
          >
            <Text style={[styles.tabText, tab === 'draw' && styles.tabTextActive]}>
              💵 Pay Myself
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'expense' ? (
          <Card>
            <Text style={styles.sectionTitle}>Log an Expense</Text>

            <Text style={styles.fieldLabel}>Amount (£)</Text>
            <TextInput
              style={styles.input}
              value={expAmount}
              onChangeText={setExpAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={expDesc}
              onChangeText={setExpDesc}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categories}>
              {EXPENSE_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.catBtn, expCat === c.code && styles.catBtnActive]}
                  onPress={() => setExpCat(c.code)}
                >
                  <Text style={[styles.catText, expCat === c.code && styles.catTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label={expLoading ? 'Logging…' : 'Log Expense'}
              onPress={submitExpense}
              variant="danger"
              loading={expLoading}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.sectionTitle}>Pay Myself</Text>

            <Text style={styles.fieldLabel}>Amount (£)</Text>
            <TextInput
              style={styles.input}
              value={drawAmount}
              onChangeText={setDrawAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={drawNotes}
              onChangeText={setDrawNotes}
              placeholder="e.g. Monthly draw"
              placeholderTextColor={COLORS.textMuted}
            />

            <Button
              label={drawLoading ? 'Saving…' : 'Record Draw'}
              onPress={submitDraw}
              variant="warning"
              loading={drawLoading}
            />
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.screenBg },
  takingsCard:    { backgroundColor: COLORS.deepPurple, marginBottom: 16 },
  takingsLabel:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 },
  takingsValue:   { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 4 },
  takingsSub:     { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  tabs:           { flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 4, marginBottom: 12, shadowColor: '#7A0050', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tabBtn:         { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center' },
  tabBtnActive:   { backgroundColor: COLORS.primary },
  tabText:        { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive:  { color: '#fff' },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  fieldLabel:     { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginTop: 4 },
  input:          { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: '#fafafa', marginBottom: 12 },
  categories:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.screenBg },
  catBtnActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText:        { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  catTextActive:  { color: '#fff' },
})
