'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Package, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LocationsPage() {
  const supabase = createClient()
  const [locations, setLocations] = useState<{ rack: string; items: unknown[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('materials')
        .select('id, material_code, material_name, rack_location, balance_qty, unit, categories(name, color)')
        .eq('is_active', true)
        .not('rack_location', 'is', null)
        .order('rack_location')

      // Group by rack
      const map: Record<string, unknown[]> = {}
      for (const m of data || []) {
        const mat = m as { rack_location: string }
        const rack = mat.rack_location || 'Unknown'
        if (!map[rack]) map[rack] = []
        map[rack].push(m)
      }
      setLocations(Object.entries(map).map(([rack, items]) => ({ rack, items })))
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = locations.filter(l =>
    !search ||
    l.rack.toLowerCase().includes(search.toLowerCase()) ||
    (l.items as Array<{ material_name: string }>).some(i => i.material_name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AppLayout title="Rack Locations">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Rack / Location Map</h1>
          <p className="page-subtitle">{locations.length} locations, {locations.reduce((acc, l) => acc + l.items.length, 0)} materials mapped</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rack or material..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <MapPin className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500">No locations found. Add rack locations to your materials.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ rack, items }) => (
            <div key={rack} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{rack}</p>
                  <p className="text-[10px] text-slate-400">{items.length} material{items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {(items as Array<{
                  id: string; material_code: string; material_name: string;
                  balance_qty: number; unit: string;
                  categories: { name: string; color: string } | null;
                }>).slice(0, 5).map(m => (
                  <Link key={m.id} href={`/materials/${m.material_code}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.categories?.color || '#6366f1' }} />
                    <span className="text-xs font-medium text-slate-900 dark:text-white flex-1 truncate">{m.material_name}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{m.balance_qty} {m.unit}</span>
                  </Link>
                ))}
                {items.length > 5 && (
                  <p className="text-[10px] text-slate-400 pl-3.5">+{items.length - 5} more items</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
