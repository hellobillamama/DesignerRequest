'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { FileText, Download, Loader2, Package, ClipboardList } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const exportMaterials = async () => {
    setLoading('materials')
    try {
      const res = await fetch('/api/materials?limit=10000')
      const data = await res.json()
      const rows = data.materials.map((m: Record<string, string>) => ({
        'Code': m.material_code, 'Name': m.material_name, 'Category': m.category,
        'Color': m.color, 'Size': m.size, 'Unit': m.unit, 'Price': m.price,
        'Stock Qty': m.balance_qty, 'Min Level': m.min_stock_level, 'Vendor': m.vendor,
        'Location': m.rack_location, 'Last Updated': m.last_updated,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Materials')
      XLSX.writeFile(wb, `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Report downloaded!')
    } catch { toast.error('Failed') }
    setLoading(null)
  }

  const exportRequests = async () => {
    setLoading('requests')
    try {
      const res = await fetch('/api/requests')
      const data = await res.json()
      const rows = data.requests.map((r: Record<string, string>) => ({
        'Request #': r.request_number, 'Material': r.material_name, 'Code': r.material_code,
        'Requester': r.requested_by_name, 'Dept': r.department, 'Qty': r.requested_qty,
        'Purpose': r.purpose, 'Priority': r.priority, 'Status': r.status, 'Date': r.created_at,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Requests')
      XLSX.writeFile(wb, `requests-report-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Report downloaded!')
    } catch { toast.error('Failed') }
    setLoading(null)
  }

  return (
    <AppLayout title="Reports">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5"><h1 className="page-title">Export Reports</h1><p className="page-subtitle">Download data as Excel</p></div>
        <div className="space-y-3">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600"><Package className="w-5 h-5" /></div>
            <div className="flex-1"><p className="font-semibold text-sm">Full Inventory Report</p><p className="text-xs text-slate-500">All materials with stock levels</p></div>
            <button onClick={exportMaterials} disabled={loading === 'materials'} className="btn-primary text-xs py-2 px-4">
              {loading === 'materials' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export
            </button>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><ClipboardList className="w-5 h-5" /></div>
            <div className="flex-1"><p className="font-semibold text-sm">Requests Report</p><p className="text-xs text-slate-500">All material requests with status</p></div>
            <button onClick={exportRequests} disabled={loading === 'requests'} className="btn-primary text-xs py-2 px-4">
              {loading === 'requests' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
