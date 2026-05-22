'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import StatsCard from '@/components/dashboard/StatsCard'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Package, AlertTriangle, ClipboardList, Upload,
  TrendingUp, Clock, CheckCircle2, XCircle, Layers,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'
import { formatDate, formatDateTime, requestStatusColor, stockStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#14b8a6', '#eab308', '#64748b']

interface DashStats {
  totalMaterials: number
  inStock: number
  lowStock: number
  outOfStock: number
  pendingRequests: number
  approvedToday: number
  totalRequestsMonth: number
  lastUpload: string | null
}

export default function DashboardPage() {
  const { profile } = useStore()
  const supabase = createClient()
  const [stats, setStats] = useState<DashStats>({
    totalMaterials: 0, inStock: 0, lowStock: 0, outOfStock: 0,
    pendingRequests: 0, approvedToday: 0, totalRequestsMonth: 0, lastUpload: null,
  })
  const [categoryData, setCategoryData] = useState<{ name: string; count: number; value: number }[]>([])
  const [requestTrend, setRequestTrend] = useState<{ date: string; pending: number; approved: number; rejected: number }[]>([])
  const [recentRequests, setRecentRequests] = useState<unknown[]>([])
  const [lowStockItems, setLowStockItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      type MatRow = { id: string; balance_qty: number; min_stock_level: number; category_id: string | null; categories: { name: string; color: string } | null }
    const [matRes, reqRes, uploadRes, catRes] = await Promise.all([
        supabase.from('materials').select('id, balance_qty, min_stock_level, category_id, categories(name, color)'),
        supabase.from('material_requests').select('*, materials(material_name, material_code), profiles(full_name)').order('created_at', { ascending: false }).limit(8),
        supabase.from('upload_history').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('categories').select('id, name, color'),
      ])

      const materials = (matRes.data || []) as MatRow[]

      const requests = reqRes.data || []
      const uploads = uploadRes.data || []
      const cats = catRes.data || []

      const inStock = materials.filter(m => m.balance_qty > m.min_stock_level).length
      const lowStock = materials.filter(m => m.balance_qty > 0 && m.balance_qty <= m.min_stock_level).length
      const outOfStock = materials.filter(m => m.balance_qty <= 0).length
      const pendingRequests = requests.filter(r => (r as { status: string }).status === 'pending').length

      // Category distribution
      const catCounts: Record<string, { name: string; count: number; value: number; color: string }> = {}
      materials.forEach(m => {
        const cat = (m as { categories?: { name: string; color: string } | null }).categories
        const catName = cat?.name || 'Uncategorized'
        if (!catCounts[catName]) catCounts[catName] = { name: catName, count: 0, value: 0, color: cat?.color || '#64748b' }
        catCounts[catName].count++
        catCounts[catName].value += m.balance_qty
      })
      setCategoryData(Object.values(catCounts).sort((a, b) => b.count - a.count).slice(0, 8))

      // Request trend (last 7 days)
      const trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const dayReqs = requests.filter(r => (r as { created_at: string }).created_at.startsWith(dateStr))
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pending: dayReqs.filter(r => (r as { status: string }).status === 'pending').length,
          approved: dayReqs.filter(r => (r as { status: string }).status === 'approved').length,
          rejected: dayReqs.filter(r => (r as { status: string }).status === 'rejected').length,
        }
      })
      setRequestTrend(trend)
      setRecentRequests(requests.slice(0, 6))

      // Low stock items
      const low = materials
        .filter(m => m.balance_qty <= m.min_stock_level)
        .sort((a, b) => a.balance_qty - b.balance_qty)
        .slice(0, 5)
      setLowStockItems(low)

      setStats({
        totalMaterials: materials.length,
        inStock, lowStock, outOfStock,
        pendingRequests,
        approvedToday: requests.filter(r => {
          const req = r as { status: string; reviewed_at: string | null }
          return req.status === 'approved' && req.reviewed_at?.startsWith(new Date().toISOString().split('T')[0])
        }).length,
        totalRequestsMonth: requests.length,
        lastUpload: (uploads[0] as { created_at: string } | undefined)?.created_at || null,
      })
      setLoading(false)
    }
    load()
  }, [supabase])

  const isAdmin = profile?.role === 'admin'

  return (
    <AppLayout title="Dashboard">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="page-title">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
          {' '}{profile?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Materials" value={loading ? '—' : stats.totalMaterials.toLocaleString()}
          icon={Package} iconBg="bg-blue-50 dark:bg-blue-950/30" iconColor="text-blue-600"
          subtitle="Active materials in database" />
        <StatsCard title="Low Stock" value={loading ? '—' : stats.lowStock}
          icon={AlertTriangle} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-500"
          subtitle={`${stats.outOfStock} out of stock`} />
        <StatsCard title="Pending Requests" value={loading ? '—' : stats.pendingRequests}
          icon={ClipboardList} iconBg="bg-purple-50 dark:bg-purple-950/30" iconColor="text-purple-600"
          subtitle="Awaiting admin review" />
        <StatsCard title="Last Stock Upload" value={loading ? '—' : stats.lastUpload ? formatDate(stats.lastUpload) : 'Never'}
          icon={Upload} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600"
          subtitle={stats.lastUpload ? formatDateTime(stats.lastUpload) : 'Upload stock data'} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/materials', label: 'Browse Materials', icon: Package, color: 'from-blue-500 to-blue-700' },
          { href: '/scanner', label: 'Scan QR Code', icon: Layers, color: 'from-purple-500 to-purple-700' },
          { href: '/requests', label: 'My Requests', icon: ClipboardList, color: 'from-pink-500 to-rose-700' },
          ...(isAdmin ? [{ href: '/upload', label: 'Upload Stock', icon: Upload, color: 'from-emerald-500 to-emerald-700' }] : []),
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href}
            className={`bg-gradient-to-br ${color} rounded-xl p-4 flex flex-col items-center gap-2 text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5`}>
            <Icon className="w-6 h-6" />
            <span className="text-xs font-semibold text-center">{label}</span>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Request Trend */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Request Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={requestTrend}>
              <defs>
                <linearGradient id="approved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="approved" stroke="#22c55e" fill="url(#approved)" strokeWidth={2} name="Approved" />
              <Area type="monotone" dataKey="pending" stroke="#f59e0b" fill="url(#pending)" strokeWidth={2} name="Pending" />
              <Area type="monotone" dataKey="rejected" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Rejected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Stock by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Requests */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Requests</h3>
            <Link href="/requests" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No requests yet</p>
            ) : (
              recentRequests.map((req) => {
                const r = req as {
                  id: string; request_number: string; status: string; priority: string;
                  requested_qty: number; created_at: string;
                  materials: { material_name: string; material_code: string } | null;
                  profiles: { full_name: string | null } | null;
                }
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {r.materials?.material_name || 'Unknown Material'}
                      </p>
                      <p className="text-[10px] text-slate-400">{r.request_number} · {r.profiles?.full_name || 'Unknown'}</p>
                    </div>
                    <span className={cn('badge text-[10px]', requestStatusColor(r.status))}>
                      {r.status}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </h3>
            <Link href="/materials?filter=low" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="text-sm text-slate-400">All stock levels are healthy!</p>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const m = item as {
                  id: string; balance_qty: number; min_stock_level: number;
                  categories?: { name: string; color: string } | null;
                }
                const status = m.balance_qty <= 0 ? 'out' : 'low'
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className={cn('w-2 h-8 rounded-full flex-shrink-0', status === 'out' ? 'bg-red-500' : 'bg-amber-400')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white">
                        {(m as { categories?: { name: string } | null }).categories?.name || 'Unknown'} Material
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', status === 'out' ? 'bg-red-500' : 'bg-amber-400')}
                            style={{ width: `${Math.min((m.balance_qty / m.min_stock_level) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {m.balance_qty} / {m.min_stock_level}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
