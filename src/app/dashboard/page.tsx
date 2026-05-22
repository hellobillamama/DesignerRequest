'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import StatsCard from '@/components/dashboard/StatsCard'
import { useStore } from '@/store/useStore'
import {
  Package, AlertTriangle, ClipboardList, Upload,
  TrendingUp, Clock, CheckCircle2, Layers,
} from 'lucide-react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#14b8a6', '#eab308', '#64748b']

interface DashStats {
  totalMaterials: number
  inStock: number
  lowStock: number
  outOfStock: number
  pendingRequests: number
  lowStockItems: Array<{ material_code: string; material_name: string; balance_qty: string; min_stock_level: string; category: string }>
  recentRequests: Array<{ request_number: string; material_name: string; requested_by_name: string; status: string; created_at: string }>
  categoryData: Array<{ name: string; count: number }>
}

export default function DashboardPage() {
  const { profile } = useStore()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const isAdmin = profile?.role === 'admin'

  return (
    <AppLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="page-title">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
          {' '}{profile?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Materials" value={loading ? '—' : stats?.totalMaterials?.toLocaleString() || '0'}
          icon={Package} iconBg="bg-blue-50 dark:bg-blue-950/30" iconColor="text-blue-600"
          subtitle="Active materials in database" />
        <StatsCard title="Low Stock" value={loading ? '—' : stats?.lowStock || 0}
          icon={AlertTriangle} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-500"
          subtitle={`${stats?.outOfStock || 0} out of stock`} />
        <StatsCard title="Pending Requests" value={loading ? '—' : stats?.pendingRequests || 0}
          icon={ClipboardList} iconBg="bg-purple-50 dark:bg-purple-950/30" iconColor="text-purple-600"
          subtitle="Awaiting admin review" />
        <StatsCard title="In Stock" value={loading ? '—' : stats?.inStock || 0}
          icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600"
          subtitle="Materials available" />
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

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Category Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Stock by Category</h3>
          {stats?.categoryData && stats.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {stats.categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No data yet. Upload materials to see chart.</p>
          )}
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Requests</h3>
            <Link href="/requests" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {!stats?.recentRequests?.length ? (
              <p className="text-sm text-slate-400 text-center py-6">No requests yet</p>
            ) : (
              stats.recentRequests.map((r) => (
                <div key={r.request_number} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {r.material_name}
                    </p>
                    <p className="text-[10px] text-slate-400">{r.request_number} · {r.requested_by_name}</p>
                  </div>
                  <span className={cn('badge text-[10px]',
                    r.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                    r.status === 'approved' ? 'text-emerald-600 bg-emerald-50' :
                    r.status === 'rejected' ? 'text-red-600 bg-red-50' :
                    'text-blue-600 bg-blue-50'
                  )}>
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Low Stock Alerts
          </h3>
          <Link href="/materials?stock=low" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="space-y-2">
          {!stats?.lowStockItems?.length ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-sm text-slate-400">All stock levels are healthy!</p>
            </div>
          ) : (
            stats.lowStockItems.map((m) => {
              const qty = parseFloat(m.balance_qty || '0')
              const min = parseFloat(m.min_stock_level || '10')
              const status = qty <= 0 ? 'out' : 'low'
              return (
                <div key={m.material_code} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className={cn('w-2 h-8 rounded-full flex-shrink-0', status === 'out' ? 'bg-red-500' : 'bg-amber-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{m.material_name}</p>
                    <p className="text-[10px] text-slate-400">{m.material_code} · {m.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-xs font-bold', status === 'out' ? 'text-red-500' : 'text-amber-500')}>
                      {m.balance_qty} left
                    </p>
                    <p className="text-[10px] text-slate-400">min: {m.min_stock_level}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AppLayout>
  )
}
