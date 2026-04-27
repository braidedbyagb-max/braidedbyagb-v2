'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const STATUS_DOT: Record<string, string> = {
  pending:   '#f59e0b',
  confirmed: '#10b981',
  completed: '#3b82f6',
  no_show:   '#6b7280',
}

interface Props {
  year: number
  month: number
  bookings: any[]
  blocks: any[]
}

export default function CalendarClient({ year, month, bookings, blocks }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [blockReason, setBlockReason]   = useState('')
  const [saving, setSaving]             = useState(false)

  // Build the grid
  const firstDay  = new Date(year, month - 1, 1)
  const lastDay   = new Date(year, month, 0).getDate()
  // Monday = 0 offset
  const startOffset = (firstDay.getDay() + 6) % 7

  const days: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (days.length % 7 !== 0) days.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  function bookingsFor(day: number) {
    return bookings.filter(b => b.booked_date === dateStr(day))
  }

  function isBlocked(day: number) {
    return blocks.some(b => b.avail_date === dateStr(day) && b.is_blocked && !b.time_slot)
  }

  const prevMonth = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year }
  const nextMonth = month === 12 ? { m: 1,  y: year + 1 } : { m: month + 1, y: year }

  const selectedBookings = selectedDate
    ? bookings.filter(b => b.booked_date === selectedDate)
    : []
  const selectedBlocked = selectedDate ? isBlocked(parseInt(selectedDate.split('-')[2])) : false

  async function toggleBlock() {
    if (!selectedDate) return
    setSaving(true)
    if (selectedBlocked) {
      // Unblock
      await supabase.from('availability')
        .delete()
        .eq('avail_date', selectedDate)
        .is('time_slot', null)
    } else {
      // Block
      await supabase.from('availability')
        .upsert({
          avail_date:   selectedDate,
          time_slot:    null,
          is_blocked:   true,
          block_reason: blockReason || null,
        }, { onConflict: 'avail_date,time_slot' })
    }
    setSaving(false)
    setBlockReason('')
    router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/admin/calendar?month=${prevMonth.m}&year=${prevMonth.y}`}
          className="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          ← {MONTHS[prevMonth.m - 1]}
        </Link>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
          {MONTHS[month - 1]} {year}
        </h2>
        <Link
          href={`/admin/calendar?month=${nextMonth.m}&year=${nextMonth.y}`}
          className="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          {MONTHS[nextMonth.m - 1]} →
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: '#f3f4f6' }}>
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-bold uppercase tracking-wider"
                     style={{ color: 'var(--color-text-muted)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="min-h-[80px] border-r border-b"
                              style={{ borderColor: '#f3f4f6', background: '#fafafa' }} />
                }
                const ds = dateStr(day)
                const dayBookings = bookingsFor(day)
                const blocked    = isBlocked(day)
                const isToday    = ds === today
                const isSelected = ds === selectedDate
                const isWeekend  = [6, 0].includes(new Date(ds).getDay())

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : ds)}
                    className="min-h-[80px] p-2 border-r border-b text-left transition-colors relative"
                    style={{
                      borderColor: '#f3f4f6',
                      background: isSelected ? 'rgba(204,26,138,0.08)'
                                : blocked ? 'rgba(239,68,68,0.06)'
                                : isWeekend ? '#fafafa' : 'white',
                    }}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                        style={isToday
                          ? { background: 'var(--color-primary)', color: '#fff' }
                          : { color: blocked ? '#dc2626' : 'var(--color-text)' }
                        }
                      >
                        {day}
                      </span>
                      {blocked && (
                        <span className="text-xs font-bold text-red-500">🚫</span>
                      )}
                    </div>

                    {/* Booking pills */}
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id}
                          className="flex items-center gap-1 text-xs rounded px-1 py-0.5 truncate"
                          style={{ background: 'rgba(204,26,138,0.08)', color: 'var(--color-primary)' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: STATUS_DOT[b.status] ?? '#6b7280' }} />
                          <span className="truncate">{b.booked_time?.substring(0,5)} {b.customers?.name?.split(' ')[0]}</span>
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {Object.entries(STATUS_DOT).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="capitalize">{status}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span>🚫</span> <span>Blocked</span>
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-72 flex-shrink-0">
          {selectedDate ? (
            <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-base mb-4" style={{ color: 'var(--color-deep-purple)' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </h3>

              {/* Bookings list */}
              {selectedBookings.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {selectedBookings.map((b: any) => (
                    <Link key={b.id} href={`/admin/bookings/${b.id}`}
                      className="block p-3 rounded-xl border transition-colors hover:bg-pink-50"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {b.customers?.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {b.booked_time?.substring(0, 5)} · {b.services?.name}
                          </p>
                        </div>
                        <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                              style={{ background: STATUS_DOT[b.status] ?? '#6b7280' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  No bookings this day.
                </p>
              )}

              {/* Block / unblock */}
              <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
                {selectedBlocked ? (
                  <button onClick={toggleBlock} disabled={saving}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: '#059669' }}>
                    {saving ? 'Saving…' : '✓ Unblock this day'}
                  </button>
                ) : (
                  <>
                    <input type="text" value={blockReason}
                      onChange={e => setBlockReason(e.target.value)}
                      placeholder="Block reason (optional)"
                      className="w-full text-xs border rounded-lg px-3 py-2 mb-2"
                      style={{ borderColor: 'var(--color-border)' }} />
                    <button onClick={toggleBlock} disabled={saving}
                      className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: '#dc2626' }}>
                      {saving ? 'Saving…' : '🚫 Block this day'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                Click a day to view bookings and manage availability.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
