'use client'

export const dynamic = 'force-dynamic'


import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Loader2, BarChart3, Package, ClipboardList } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const reports = [
  {
    id: 'full_inventory',
    title: 'Full Inventory Report',
    description: 'All materials with stock levels, prices, and vendor info',
    icon: Package,
    color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
  },
  {
    id: 'low_stock',
    title: 'Low Stock Report',
    description: 'Materials at or below minimum stock level',
    icon: BarChart3,
    color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600',
  },
  {
    id: 'requests',
    title: 'Requests Report',
    description: 'All material requests with status and details',
    icon: ClipboardList,
    color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600',
  },
]

export default function ReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const generateReport = async (reportId: string) => {
    setLoading(reportId)
    try {
      let rows: unknown[] = []
      let filename = ''

      if (reportId === 'full_inventory') {
        const { data } = await supabase
          .from('materials')
          .select('material_code, material_name, categories(name), color, size, unit, price, balance_qty, min_stock_level, rack_location, vendors(name), last_upload_date, updated_at')
          .eq('is_active', true)
          .order('material_name')
        rows = (data || []).map((m: unknown) => {
          const mat = m as {
            material_code: string; material_name: string; color?: string; size?: string;
            unit: string; price: number; balance_qty: number; min_stock_level: number;
            rack_location?: string; last_upload_date?: string; updated_at: string;
            categories: { name: string } | null; vendors: { name: string } | null;
          }
          return {
            'Material Code': mat.material_code, 'Material Name': mat.material_name,
            'Category': mat.categories?.name, 'Color': mat.color, 'Size': mat.size,
            'Unit': mat.unit, 'Price': mat.price, 'Balance Qty': mat.balance_qty,
            'Min Level': mat.min_stock_level, 'Status': mat.balance_qty <= 0 ? 'Out of Stock' : mat.balance_qty <= mat.min_stock_level ? 'Low Stock' : 'In Stock',
            'Location': mat.rack_location, 'Vendor': mat.vendors?.name,
            'Last Updated': mat.last_upload_date || mat.updated_at,
          }
        })
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`
      }

      if (reportId === 'low_stock') {
        const { data } = await supabase
          .from('materials')
          .select('material_code, material_name, categories(name), balance_qty, min_stock_level, unit, rack_location, vendors(name)')
          .eq('is_active', true)
          .lte('balance_qty', supabase.from('materials').select('min_stock_level') as unknown as number)
          .order('balance_qty')
        const { data: all } = await supabase.from('materials').select('material_code, material_name, categories(name), balance_qty, min_stock_level, unit, rack_location, vendors(name)').eq('is_active', true)
        const lowItems = (all || []).filter((m: unknown) => {
          const mat = m as { balance_qty: number; min_stock_level: number }
          return mat.balance_qty <= mat.min_stock_level
        })
        rows = lowItems.map((m: unknown) => {
          const mat = m as {
            material_code: string; material_name: string; balance_qty: number;
            min_stock_level: number; unit: string; rack_location?: string;
            categories: { name: string } | null; vendors: { name: string } | null;
          }
          return {
            'Material Code': mat.material_code, 'Material Name': mat.material_name,
            'Category': mat.categories?.name,
            'Current Qty': mat.balance_qty, 'Min Level': mat.min_stock_level,
            'Shortage': Math.max(0, mat.min_stock_level - mat.balance_qty),
            'Unit': mat.unit, 'Location': mat.rack_location, 'Vendor': mat.vendors?.name,
          }
        })
        filename = `low-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`
      }

      if (reportId === 'requests') {
        const { data } = await supabase
          .from('material_requests')
          .select('request_number, materials(material_name, material_code), profiles!requested_by(full_name, department), requested_qty, approved_qty, purpose, priority, status, created_at, reviewed_at, issued_at')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59')
          .order('created_at', { ascending: false })
        rows = (data || []).map((r: unknown) => {
          const req = r as {
            request_number: string; requested_qty: number; approved_qty?: number;
            purpose: string; priority: string; status: string;
            created_at: string; reviewed_at?: string; issued_at?: string;
            materials: { material_name: string; material_code: string } | null;
            profiles: { full_name: string | null; department: string | null } | null;
          }
          return {
            'Request #': req.request_number,
            'Material': req.materials?.material_name,
            'Code': req.materials?.material_code,
            'Requester': req.profiles?.full_name,
            'Department': req.profiles?.department,
            'Requested Qty': req.requested_qty,
            'Approved Qty': req.approved_qty,
            'Purpose': req.purpose,
            'Priority': req.priority,
            'Status': req.status,
            'Requested On': req.created_at,
            'Reviewed On': req.reviewed_at,
            'Issued On': req.issued_at,
          }
        })
        filename = `requests-report-${dateFrom}-to-${dateTo}.xlsx`
      }

      if (rows.length === 0) {
        toast.error('No data found for this report')
        setLoading(null)
        return
      }

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, filename)
      toast.success(`Report downloaded: ${filename}`)
    } catch {
      toast.error('Failed to generate report')
    }
    setLoading(null)
  }

  return (
    <AppLayout title="Reports">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <h1 className="page-title">Export Reports</h1>
          <p className="page-subtitle">Download data as Excel spreadsheets</p>
        </div>

        {/* Date range for requests */}
        <div className="card p-4 mb-5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Date Range (for Requests report)</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
            </div>
            <div className="flex-1">
              <label className="label">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {reports.map(({ id, title, description, icon: Icon, color }) => (
            <div key={id} className="card p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
              <button
                onClick={() => generateReport(id)}
                disabled={loading === id}
                className="btn-primary text-xs py-2 px-4 flex-shrink-0">
                {loading === id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                Export
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
