// /booking/[slug] — redirects to /booking
// Handles any slug-based booking links (from homepage cards, emails, etc.)
import { redirect } from 'next/navigation'

export default function BookingSlugPage() {
  redirect('/booking')
}
