import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native'
import { COLORS, RADIUS } from '@/lib/theme'

type Variant = 'primary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost'

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.primary,  text: '#fff' },
  success: { bg: COLORS.success,  text: '#fff' },
  danger:  { bg: COLORS.danger,   text: '#fff' },
  warning: { bg: COLORS.warning,  text: '#fff' },
  outline: { bg: 'transparent',   text: COLORS.primary, border: COLORS.primary },
  ghost:   { bg: 'transparent',   text: COLORS.textMuted },
}

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  small?: boolean
}

export default function Button({ label, onPress, variant = 'primary', loading, disabled, fullWidth = true, small }: Props) {
  const vs = VARIANT_STYLES[variant]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: vs.bg },
        vs.border && { borderWidth: 1.5, borderColor: vs.border },
        !fullWidth && { alignSelf: 'flex-start' },
        small && styles.small,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading
        ? <ActivityIndicator color={vs.text} size="small" />
        : <Text style={[styles.text, { color: vs.text }, small && { fontSize: 13 }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
})
