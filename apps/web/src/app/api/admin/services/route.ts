// GET  /api/admin/services         — list all services
// POST /api/admin/services         — create service (with variants + addons)
// PUT  /api/admin/services         — update service (with variants + addons)
// DELETE /api/admin/services       — delete service
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: services, error } = await supabase
    .from('services')
    .select(`
      id, name, slug, description, duration_mins, price_from, image_url,
      is_active, is_new, display_order,
      service_variants ( id, variant_name, price, duration_mins, is_active ),
      service_addons   ( id, name, price, is_active )
    `)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { service_variants, service_addons, ...serviceData } = body

  if (!serviceData.name?.trim()) {
    return NextResponse.json({ error: 'Service name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: svc, error: svcErr } = await supabase
    .from('services')
    .insert({
      name:          serviceData.name.trim(),
      slug:          serviceData.slug?.trim() || serviceData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description:   serviceData.description ?? '',
      duration_mins: serviceData.duration_mins ?? 60,
      price_from:    serviceData.price_from ?? 0,
      image_url:     serviceData.image_url ?? null,
      is_active:     serviceData.is_active ?? true,
      is_new:        serviceData.is_new ?? false,
      display_order: serviceData.display_order ?? 99,
    })
    .select('id')
    .single()

  if (svcErr || !svc) return NextResponse.json({ error: svcErr?.message ?? 'Failed to create service' }, { status: 500 })

  // Insert variants
  if (service_variants?.length) {
    await supabase.from('service_variants').insert(
      service_variants
        .filter((v: any) => v.variant_name?.trim())
        .map((v: any) => ({
          service_id:    svc.id,
          variant_name:  v.variant_name.trim(),
          price:         v.price,
          duration_mins: v.duration_mins,
          is_active:     v.is_active ?? true,
        }))
    )
  }

  // Insert add-ons
  if (service_addons?.length) {
    await supabase.from('service_addons').insert(
      service_addons
        .filter((a: any) => a.name?.trim())
        .map((a: any) => ({
          service_id: svc.id,
          name:       a.name.trim(),
          price:      a.price,
          is_active:  a.is_active ?? true,
        }))
    )
  }

  return NextResponse.json({ success: true, id: svc.id })
}

export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, service_variants, service_addons, ...serviceData } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()

  // Update core service
  const { error: svcErr } = await supabase
    .from('services')
    .update({
      name:          serviceData.name?.trim(),
      slug:          serviceData.slug?.trim(),
      description:   serviceData.description ?? '',
      duration_mins: serviceData.duration_mins,
      price_from:    serviceData.price_from,
      image_url:     serviceData.image_url ?? null,
      is_active:     serviceData.is_active,
      is_new:        serviceData.is_new,
      display_order: serviceData.display_order,
    })
    .eq('id', id)

  if (svcErr) return NextResponse.json({ error: svcErr.message }, { status: 500 })

  // Sync variants — delete existing, re-insert (simplest approach for admin CRUD)
  await supabase.from('service_variants').delete().eq('service_id', id)
  if (service_variants?.length) {
    await supabase.from('service_variants').insert(
      service_variants
        .filter((v: any) => v.variant_name?.trim())
        .map((v: any) => ({
          service_id:    id,
          variant_name:  v.variant_name.trim(),
          price:         v.price,
          duration_mins: v.duration_mins,
          is_active:     v.is_active ?? true,
        }))
    )
  }

  // Sync add-ons
  await supabase.from('service_addons').delete().eq('service_id', id)
  if (service_addons?.length) {
    await supabase.from('service_addons').insert(
      service_addons
        .filter((a: any) => a.name?.trim())
        .map((a: any) => ({
          service_id: id,
          name:       a.name.trim(),
          price:      a.price,
          is_active:  a.is_active ?? true,
        }))
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()

  // Check for bookings using this service
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete — this service has existing bookings. Deactivate it instead.' },
      { status: 409 }
    )
  }

  // Cascade delete variants and add-ons first (if not using DB cascades)
  await supabase.from('service_variants').delete().eq('service_id', id)
  await supabase.from('service_addons').delete().eq('service_id', id)
  await supabase.from('services').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
