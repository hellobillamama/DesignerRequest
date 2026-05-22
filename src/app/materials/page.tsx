'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Search, Grid3X3, List, SlidersHorizontal, Package, X, Loader2, MapPin, QrCode } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Material {
  material_code: string
  material_name: string
  category: string
  color: string
  size: string
  unit: string
  price: string
  balance_qty: string
  min_stock_level: string
  vendor: string
  rack_location: string
  image_url: string
}

function MaterialsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [vendors, setVendors] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [stockFilter, setStockFilter] = useState(searchParams.get('stock') || '')
  const [vendorFilter, setVendorFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (categoryFilter) params.set('category', categoryFilter)
    if (stockFilter) params.set('stock', stockFilter)
    if (vendorFilter) params.set('vendor', vendorFilter)
    params.set('page', String(page))
    params.set('limit', '24')

    fetch(`/api/materials?${params}`)
      .then(r => r.json())
      .then(data => {
        setMaterials(data.materials || [])
        setTotal(data.total || 0)
        setCategories(data.categories || [])
        setVendors(data.vendors || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, categoryFilter, stockFilter, vendorFilter, page])

  const clearFilters = () => {
    setSearch(''); setCategoryFilter(''); setVendorFilter(''); setStockFilter(''); setPage(0)
  }
  const hasFilters = search || categoryFilter || vendorFilter || stockFilter

  const getStockStatus = (m: Material) => {
    const qty = parseFloat(m.balance_qty || '0')
    const min = parseFloat(m.min_stock_level || '10')
    if (qty <= 0) return 'out'
    if (qty <= min) return 'low'
    return 'in'
  }

  return (
    <AppLayout title="Materials">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Material Database</h1>
            <p className="page-subtitle">{total.toLocaleString()} materials found</p>
          </div>
        </div>

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
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-secondary gap-2', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
            </button>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={cn('px-3 py-2 transition-colors', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500')}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={cn('px-3 py-2 transition-colors', viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="card p-4 grid grid-cols-2 md:grid-cols-3 gap-3 animate-slide-up">
            <div>
              <label className="label">Category</label>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }} className="input">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                {vendors.map(v => <option key={v} value={v}>{v}</option>)}
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
          {[
            { key: 'in', label: '✓ In Stock', active: 'bg-emerald-600 text-white border-emerald-600' },
            { key: 'low', label: '⚠ Low Stock', active: 'bg-amber-500 text-white border-amber-500' },
            { key: 'out', label: '✕ Out of Stock', active: 'bg-red-500 text-white border-red-500' },
          ].map(f => (
            <button key={f.key} onClick={() => { setStockFilter(stockFilter === f.key ? '' : f.key); setPage(0) }}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                stockFilter === f.key ? f.active : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
          {materials.map(m => {
            const st = getStockStatus(m)
            return (
              <div key={m.material_code} className="card-hover group flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.material_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className={cn('absolute top-2 right-2 badge text-[10px]',
                    st === 'out' ? 'text-red-500 bg-red-50' : st === 'low' ? 'text-amber-500 bg-amber-50' : 'text-emerald-500 bg-emerald-50')}>
                    {st === 'out' ? 'Out of Stock' : st === 'low' ? 'Low Stock' : 'In Stock'}
                  </div>
                  {m.category && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        {m.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3.5 flex flex-col gap-2 flex-1">
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 mb-0.5">{m.material_code}</p>
                    <Link href={`/materials/${m.material_code}`}>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 transition-colors line-clamp-2">
                        {m.material_name}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {m.color && <span className="capitalize">{m.color}</span>}
                    {m.rack_location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{m.rack_location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(m.price || '0'))}</p>
                      <p className="text-[10px] text-slate-400">per {m.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', st === 'out' ? 'text-red-500' : st === 'low' ? 'text-amber-500' : 'text-emerald-600')}>
                        {parseFloat(m.balance_qty || '0').toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">{m.unit} avail.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-1">
                    <Link href={`/materials/${m.material_code}`} className="flex-1 btn-primary text-xs py-1.5 justify-center">
                      View
                    </Link>
                    <Link href={`/materials/${m.material_code}`} className="btn-secondary text-xs py-1.5 px-2.5">
                      <QrCode className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
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
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => {
                const st = getStockStatus(m)
                return (
                  <tr key={m.material_code} className="table-row">
                    <td className="td font-mono text-xs text-slate-500">{m.material_code}</td>
                    <td className="td">
                      <Link href={`/materials/${m.material_code}`} className="font-medium text-slate-900 dark:text-white hover:text-blue-600">
                        {m.material_name}
                      </Link>
                    </td>
                    <td className="td hidden md:table-cell"><span className="badge text-[10px] bg-blue-50 text-blue-600">{m.category}</span></td>
                    <td className="td hidden lg:table-cell capitalize">{m.color || '—'}</td>
                    <td className="td">
                      <span className={cn('badge text-[10px]', st === 'out' ? 'text-red-600 bg-red-50' : st === 'low' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50')}>
                        {m.balance_qty} {m.unit}
                      </span>
                    </td>
                    <td className="td hidden md:table-cell">${m.price}</td>
                    <td className="td">
                      <Link href={`/materials/${m.material_code}`} className="btn-primary py-1 px-2 text-xs">View</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 24 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-slate-500">Showing {page * 24 + 1}–{Math.min((page + 1) * 24, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
            <button disabled={(page + 1) * 24 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
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
