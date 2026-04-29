import { View, Text, StyleSheet } from 'react-native'
import { STATUS_CONFIG, RADIUS } from '@/lib/theme'

interface Props {
  status: string
}

export default function Badge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#4b5563', bg: '#f3f4f6' }
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
})
