import { View, StyleSheet } from 'react-native'
import { COLORS, RADIUS } from '@/lib/theme'

interface Props {
  children: React.ReactNode
  style?: object
  padding?: number
}

export default function Card({ children, style, padding = 16 }: Props) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    shadowColor: '#7A0050',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
})
