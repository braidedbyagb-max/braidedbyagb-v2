import { SafeAreaView, ScrollView, View, StyleSheet, RefreshControl } from 'react-native'
import { COLORS } from '@/lib/theme'

interface Props {
  children: React.ReactNode
  scrollable?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  padded?: boolean
  style?: object
}

export default function Screen({ children, scrollable = true, refreshing, onRefresh, padded = true, style }: Props) {
  const inner = (
    <View style={[padded && styles.padded, style]}>
      {children}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh
            ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={COLORS.primary} />
            : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : inner}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.screenBg },
  scroll: { flex: 1 },
  padded: { padding: 16 },
})
