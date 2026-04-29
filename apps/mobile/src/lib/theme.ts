// BraidedbyAGB brand colours + shared style constants

export const COLORS = {
  primary:      '#CC1A8A',
  primaryDark:  '#A8146E',
  deepPurple:   '#7A0050',
  gold:         '#F0C030',
  bg:           '#F0D6F5',
  text:         '#2A0020',
  textMuted:    '#7A4A70',
  border:       '#E8D0E4',
  white:        '#FFFFFF',
  success:      '#059669',
  danger:       '#DC2626',
  warning:      '#D97706',
  whatsapp:     '#25D366',
  cardBg:       '#FFFFFF',
  screenBg:     '#F5EDF8',
}

export const FONTS = {
  regular:    'System',
  bold:       'System',
}

export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 999,
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Pending',      color: '#92400e', bg: '#fef3c7' },
  confirmed:      { label: 'Confirmed',    color: '#065f46', bg: '#d1fae5' },
  completed:      { label: 'Completed',    color: '#1e40af', bg: '#dbeafe' },
  cancelled:      { label: 'Cancelled',    color: '#991b1b', bg: '#fee2e2' },
  late_cancelled: { label: 'Late Cancel',  color: '#7c2d12', bg: '#ffedd5' },
  no_show:        { label: 'No Show',      color: '#4b5563', bg: '#f3f4f6' },
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function formatCurrency(amount: number | string): string {
  return `£${Number(amount).toFixed(2)}`
}
