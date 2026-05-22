'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { TrendingUp, Package, ClipboardList, Loader2 } from 'lucide-react'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#14b8a6', '#eab308', '#64748b', '#ef4444', '#06b6d4']

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [catData, setCatData] = useState<{ name: string; count: number; value: number }[]>([])
  const [reqTrend, setReqTrend] = useState<{ month: string; total: number; approved: number }[]>([])
  const [topRequested, setTopRequested] = useState<{ name: string; count: number }[]>([])
  const [vendorData, setVendorData] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    const load = async () => {
      const [matRes, reqRes] = await Promise.all([
        supabase.from('materials').select('id, balance_qty, min_stock_level, category_id, vendor_id, categories(name), vendors(name)'),
        supabase.from('material_requests').select('material_id, status, created_at, materials(material_name)').order('created_at'),
      ])

      const mats = matRes.data || []
      const reqs = reqRes.data || []

      // Category data
      const catMap: Record<string, { name: string; count: number; value: number }> = {}
      mats.forEach((m: unknown) => {
        const mat = m as { balance_qty: number; categories: { name: string } | null }
        const name = mat.categories?.name || 'Uncategorized'
        if (!catMap[name]) catMap[name] = { name, count: 0, value: 0 }
        catMap[name].count++
        catMap[name].value += mat.balance_qty
      })
      setCatData(Object.values(catMap).sort((a, b) => b.count - a.count).slice(0, 10))

      // Vendor data
      const vendMap: Record<string, number> = {}
      mats.forEach((m: unknown) => {
        const mat = m as { vendors: { name: string } | null }
        const name = mat.vendors?.name || 'No Vendor'
        vendMap[name] = (vendMap[name] || 0) + 1
      })
      setVendorData(Object.entries(vendMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8))

      // Monthly request trend
      const monthMap: Record<string, { total: number; approved: number }> = {}
      reqs.forEach((r: unknown) => {
        const req = r as { status: string; created_at: string }
        const month = req.created_at.substring(0, 7)
        if (!monthMap[month]) monthMap[month] = { total: 0, approved: 0 }
        monthMap[month].total++
        if (req.status === 'approved' || req.status === 'issued') monthMap[month].approved++
      })
      setReqTrend(Object.entries(monthMap).slice(-6).map(([m, v]) => ({
        month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...v
      })))

      // Top requested materials
      const matCount: Record<string, { name: string; count: number }> = {}
      reqs.forEach((r: unknown) => {
        const req = r as { material_id: string; materials: { material_name: string } | null }
        if (!matCount[req.material_id]) matCount[req.material_id] = { name: req.materials?.material_name || 'Unknown', count: 0 }
        matCount[req.material_id].count++
      })
      setTopRequested(Object.values(matCount).sort((a, b) => b.count - a.count).slice(0, 8))

      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <AppLayout title="Analytics">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Analytics">
      <div className="mb-5">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Material consumption and request insights</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Category stock distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            Materials by Category
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={catData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Request trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Monthly Request Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={reqTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} dot={false} name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top requested */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            Most Requested Materials
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topRequested} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendor distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Materials by Vendor</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={vendorData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                {vendorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  )
}
