import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import ServicesClient from './ServicesClient'

export const metadata: Metadata = { title: 'Services — Admin' }

export default async function AdminServicesPage() {
  const supabase = createAdminClient()

  const { data: services } = await supabase
    .from('services')
    .select(`
      id, name, slug, description, duration_mins, price_from, image_url,
      is_active, is_new, display_order,
      service_variants ( id, variant_name, price, duration_mins, is_active ),
      service_addons   ( id, name, price, is_active )
    `)
    .order('display_order')

  return <ServicesClient initialServices={services ?? []} />
}
