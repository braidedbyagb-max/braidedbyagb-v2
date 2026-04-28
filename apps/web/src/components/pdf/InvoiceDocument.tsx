// react-pdf invoice template — server-side only, never imported in client components
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2A0020',
    padding: '48 48 48 48',
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#CC1A8A',
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#7A0050',
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 9,
    color: '#7A4A70',
    marginBottom: 2,
  },
  invoiceMeta: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#CC1A8A',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 9,
    color: '#7A4A70',
    width: 80,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2A0020',
  },

  // Two-column info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 24,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#CC1A8A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 10,
    color: '#2A0020',
    marginBottom: 2,
  },
  infoMuted: {
    fontSize: 9,
    color: '#7A4A70',
    marginBottom: 2,
  },

  // Service table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7A0050',
    padding: '8 12',
    borderRadius: 4,
    marginBottom: 0,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '10 12',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E4F5',
  },
  tableRowAlt: {
    backgroundColor: '#FAF5FF',
  },
  col60: { width: '60%' },
  col20: { width: '20%', textAlign: 'right' },
  cellText: {
    fontSize: 10,
    color: '#2A0020',
  },
  cellMuted: {
    fontSize: 9,
    color: '#7A4A70',
    marginTop: 2,
  },

  // Totals
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 240,
  },
  totalLabel: {
    fontSize: 10,
    color: '#7A4A70',
    width: 130,
    textAlign: 'right',
    paddingRight: 12,
  },
  totalValue: {
    fontSize: 10,
    color: '#2A0020',
    width: 80,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#CC1A8A',
    width: 240,
  },
  totalLabelFinal: {
    fontSize: 12,
    color: '#7A0050',
    fontFamily: 'Helvetica-Bold',
    width: 130,
    textAlign: 'right',
    paddingRight: 12,
  },
  totalValueFinal: {
    fontSize: 14,
    color: '#CC1A8A',
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right',
  },

  // Status badge
  statusBadge: {
    alignSelf: 'flex-end',
    marginTop: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 99,
    padding: '4 12',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#065f46',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 48,
    right: 48,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0E4F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: '#7A4A70',
  },
  thankYou: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#CC1A8A',
  },
})

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate:   string   // 'DD MMM YYYY'
  bookingRef:    string

  customerName:  string
  customerEmail: string

  serviceName:   string
  serviceDate:   string   // 'Monday, 12 May 2026'
  serviceTime:   string   // '10:00 AM'
  addons:        Array<{ name: string; price: number }>

  totalPrice:    number
  depositAmount: number
  depositPaid:   boolean
  remainingBalance: number
  loyaltyDiscount:  number

  paymentMethod: string   // 'stripe' | 'cash' | 'bank_transfer' | 'card'
  status:        string   // 'PAID' | 'DEPOSIT PAID' | 'PENDING'
}

export default function InvoiceDocument({ inv }: { inv: InvoiceData }) {
  const amountPaid = inv.depositPaid
    ? inv.depositAmount + (inv.remainingBalance === 0 ? 0 : 0)
    : 0
  const methodLabel: Record<string, string> = {
    stripe:       'Card (online)',
    bank_transfer:'Bank transfer',
    cash:         'Cash',
    card:         'Card (terminal)',
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>BraidedbyAGB</Text>
            <Text style={styles.brandTagline}>Professional Hair Braiding</Text>
            <Text style={styles.brandTagline}>Farnborough, Hampshire</Text>
            <Text style={styles.brandTagline}>hello@braidedbyagb.co.uk</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>RECEIPT</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>{inv.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{inv.invoiceDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Booking Ref</Text>
              <Text style={styles.metaValue}>{inv.bookingRef}</Text>
            </View>
          </View>
        </View>

        {/* Bill to + Booking info */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>Bill To</Text>
            <Text style={styles.infoText}>{inv.customerName}</Text>
            <Text style={styles.infoMuted}>{inv.customerEmail}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>Appointment</Text>
            <Text style={styles.infoText}>{inv.serviceDate}</Text>
            <Text style={styles.infoMuted}>{inv.serviceTime}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>Payment Method</Text>
            <Text style={styles.infoText}>{methodLabel[inv.paymentMethod] ?? inv.paymentMethod}</Text>
          </View>
        </View>

        {/* Service line items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.col60]}>Description</Text>
          <Text style={[styles.tableHeaderCell, styles.col20]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.col20]}>Amount</Text>
        </View>

        {/* Main service */}
        <View style={styles.tableRow}>
          <View style={styles.col60}>
            <Text style={styles.cellText}>{inv.serviceName}</Text>
          </View>
          <Text style={[styles.cellText, styles.col20]}>1</Text>
          <Text style={[styles.cellText, styles.col20]}>£{inv.totalPrice.toFixed(2)}</Text>
        </View>

        {/* Add-ons */}
        {inv.addons.map((a, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowAlt : {}]}>
            <View style={styles.col60}>
              <Text style={styles.cellMuted}>Add-on: {a.name}</Text>
            </View>
            <Text style={[styles.cellMuted, styles.col20]}>1</Text>
            <Text style={[styles.cellMuted, styles.col20]}>£{a.price.toFixed(2)}</Text>
          </View>
        ))}

        {/* Loyalty discount row */}
        {inv.loyaltyDiscount > 0 && (
          <View style={styles.tableRow}>
            <View style={styles.col60}>
              <Text style={[styles.cellText, { color: '#7c3aed' }]}>Loyalty points discount</Text>
            </View>
            <Text style={[styles.cellText, styles.col20]}>—</Text>
            <Text style={[styles.cellText, styles.col20, { color: '#7c3aed' }]}>
              −£{inv.loyaltyDiscount.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          {inv.depositPaid && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Deposit paid</Text>
              <Text style={styles.totalValue}>£{inv.depositAmount.toFixed(2)}</Text>
            </View>
          )}
          {inv.remainingBalance > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Balance due on day</Text>
              <Text style={styles.totalValue}>£{inv.remainingBalance.toFixed(2)}</Text>
            </View>
          )}
          {inv.loyaltyDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#7c3aed' }]}>Loyalty discount</Text>
              <Text style={[styles.totalValue, { color: '#7c3aed' }]}>
                −£{inv.loyaltyDiscount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>£{inv.totalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{inv.status}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>BraidedbyAGB · Farnborough, Hampshire</Text>
            <Text style={styles.footerText}>hello@braidedbyagb.co.uk · braidedbyagb.co.uk</Text>
            <Text style={[styles.footerText, { marginTop: 4 }]}>
              Thank you for booking with us — we look forward to seeing you again!
            </Text>
          </View>
          <Text style={styles.thankYou}>BraidedbyAGB ✦</Text>
        </View>

      </Page>
    </Document>
  )
}
