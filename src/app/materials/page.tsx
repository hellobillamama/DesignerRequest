'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import MaterialCard from '@/components/materials/MaterialCard'
import { createClient } from '@/lib/supabase/client'
import type { MaterialWithDetails, Category, Vendor } from '@/types/database'
import {
  Search, Filter, Grid3X3, List, SlidersHorizontal,
  Package, X, ChevronDown, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import RequestModal from '@/components/requests/RequestModal'

const PAGE_SIZE = 24

function MaterialsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [materials, setMaterials] = useState<MaterialWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [requestMaterial, setRequestMaterial] = useState<MaterialWithDetails | null>(null)

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [stockFilter, setStockFilter] = useState(searchParams.get('filter') || '')
  const [vendorFilter, setVendorFilter] = useState('')
  const [sortBy, setSortBy] = useState('material_name')

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('materials')
      .select('*, categories(id, name, color), vendors(id, name), material_images(id, image_url, image_type, sort_order)', { count: 'exact' })
      .eq('is_active', true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order(sortBy, { ascending: sortBy === 'price' || sortBy === 'balance_qty' ? true : true })

    if (search) {
      query = query.or(`material_name.ilike.%${search}%,material_code.ilike.%${search}%,color.ilike.%${search}%,description.ilike.%${search}%`)
    }
    if (categoryFilter) query = query.eq('category_id', categoryFilter)
    if (vendorFilter) query = query.eq('vendor_id', vendorFilter)
    if (stockFilter === 'in') query = query.gt('balance_qty', 0)
    if (stockFilter === 'low') query = query.gt('balance_qty', 0).lte('balance_qty', 10)
    if (stockFilter === 'out') query = query.lte('balance_qty', 0)

    const { data, count, error } = await query
    if (!error && data) {
      setMaterials(data as MaterialWithDetails[])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [supabase, search, categoryFilter, vendorFilter, stockFilter, sortBy, page])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
    supabase.from('vendors').select('*').eq('is_active', true).order('name').then(({ data }) => setVendors(data || []))
  }, [supabase])

  const clearFilters = () => {
    setSearch(''); setCategoryFilter(''); setVendorFilter(''); setStockFilter(''); setPage(0)
  }
  const hasFilters = search || categoryFilter || vendorFilter || stockFilter

  return (
    <AppLayout title="Materials">
      <div className="mb-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Material Database</h1>
            <p className="page-subtitle">{total.toLocaleString()} materials found</p>
          </div>
        </div>

        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search by name, code, color..."
              className="input pl-10 h-11 text-base"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-secondary gap-2', showFilters && 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400')}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
            </button>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={cn('px-3 py-2 transition-colors', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={cn('px-3 py-2 transition-colors', viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
            <div>
              <label className="label">Category</label>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }} className="input">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stock Status</label>
              <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(0) }} className="input">
                <option value="">All Stock</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
            <div>
              <label className="label">Vendor</label>
              <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(0) }} className="input">
                <option value="">All Vendors</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sort By</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input">
                <option value="material_name">Name A→Z</option>
                <option value="material_code">Code</option>
                <option value="price">Price</option>
                <option value="balance_qty">Stock Qty</option>
                <option value="updated_at">Last Updated</option>
              </select>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost text-xs col-span-full justify-start">
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Quick filter pills */}
        <div className="flex gap-2 flex-wrap">
          {['in', 'low', 'out'].map(f => (
            <button key={f} onClick={() => { setStockFilter(stockFilter === f ? '' : f); setPage(0) }}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                stockFilter === f
                  ? f === 'in' ? 'bg-emerald-600 text-white border-emerald-600'
                    : f === 'low' ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-red-500 text-white border-red-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300')}>
              {f === 'in' ? '✓ In Stock' : f === 'low' ? '⚠ Low Stock' : '✕ Out of Stock'}
            </button>
          ))}
          {categories.slice(0, 5).map(cat => (
            <button key={cat.id} onClick={() => { setCategoryFilter(categoryFilter === cat.id ? '' : cat.id); setPage(0) }}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                categoryFilter === cat.id
                  ? 'text-white border-transparent'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')}
              style={categoryFilter === cat.id ? { backgroundColor: cat.color } : {}}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">No materials found</p>
          {hasFilters && <button onClick={clearFilters} className="btn-secondary text-xs">Clear filters</button>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {materials.map(m => (
            <MaterialCard key={m.id} material={m} onRequest={setRequestMaterial} />
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th hidden md:table-cell">Category</th>
                <th className="th hidden lg:table-cell">Color</th>
                <th className="th">Stock</th>
                <th className="th hidden md:table-cell">Price</th>
                <th className="th hidden lg:table-cell">Location</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => {
                const st = m.balance_qty <= 0 ? 'out' : m.balance_qty <= m.min_stock_level ? 'low' : 'in'
                return (
                  <tr key={m.id} className="table-row">
                    <td className="td font-mono text-xs text-slate-500">{m.material_code}</td>
                    <td className="td">
                      <Link href={`/materials/${m.material_code}`} className="font-medium text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                        {m.material_name}
                      </Link>
                    </td>
                    <td className="td hidden md:table-cell">
                      {m.categories && (
                        <span className="badge text-[10px] text-white" style={{ backgroundColor: m.categories.color }}>{m.categories.name}</span>
                      )}
                    </td>
                    <td className="td hidden lg:table-cell capitalize">{m.color || '—'}</td>
                    <td className="td">
                      <span className={cn('badge text-[10px]', st === 'out' ? 'text-red-600 bg-red-50' : st === 'low' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50')}>
                        {m.balance_qty} {m.unit}
                      </span>
                    </td>
                    <td className="td hidden md:table-cell">${m.price}</td>
                    <td className="td hidden lg:table-cell text-slate-400">{m.rack_location || '—'}</td>
                    <td className="td">
                      <div className="flex gap-1.5">
                        <Link href={`/materials/${m.material_code}`} className="btn-ghost py-1 px-2 text-xs">View</Link>
                        <button onClick={() => setRequestMaterial(m)} className="btn-primary py-1 px-2 text-xs">Request</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">
              Previous
            </button>
            <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Request modal */}
      {requestMaterial && (
        <RequestModal material={requestMaterial} onClose={() => setRequestMaterial(null)} />
      )}
    </AppLayout>
  )
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div></AppLayout>}>
      <MaterialsContent />
    </Suspense>
  )
}
