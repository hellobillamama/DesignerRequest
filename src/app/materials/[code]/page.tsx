'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/store/useStore'
import {
  Package, ArrowLeft, Download, Share2, QrCode,
  CheckCircle, AlertTriangle, XCircle, Loader2, Layers, ShoppingCart
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import QRCodeLib from 'qrcode'

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
  barcode: string
  description: string
  image_url: string
  last_updated: string
}

export default function MaterialDetailPage() {
  const params = useParams()
  const code = params.code as string
  const { profile } = useStore()

  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestData, setRequestData] = useState({ qty: '1', purpose: '', priority: 'normal', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/materials/${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(async data => {
        if (data.material) {
          setMaterial(data.material)
          const qrUrl = `${window.location.origin}/materials/${data.material.material_code}`
          const qr = await QRCodeLib.toDataURL(qrUrl, { width: 256, margin: 2 })
          setQrDataUrl(qr)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [code])

  const downloadQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `QR-${material?.material_code}.png`
    a.click()
    toast.success('QR code downloaded!')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }

  const submitRequest = async () => {
    if (!material || !profile) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_code: material.material_code,
          material_name: material.material_name,
          requested_by_email: profile.email,
          requested_by_name: profile.name,
          department: profile.department,
          requested_qty: parseFloat(requestData.qty),
          purpose: requestData.purpose,
          priority: requestData.priority,
          notes: requestData.notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Request ${data.requestNumber} submitted!`)
        setShowRequestForm(false)
        setRequestData({ qty: '1', purpose: '', priority: 'normal', notes: '' })
      } else {
        toast.error('Failed to submit request')
      }
    } catch { toast.error('Failed to submit request') }
    setSubmitting(false)
  }

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div></AppLayout>
  }

  if (!material) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Package className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">Material not found</p>
          <Link href="/materials" className="btn-primary">Back to Materials</Link>
        </div>
      </AppLayout>
    )
  }

  const qty = parseFloat(material.balance_qty || '0')
  const min = parseFloat(material.min_stock_level || '10')
  const stockStatus = qty <= 0 ? 'out' : qty <= min ? 'low' : 'in'
  const StockIcon = stockStatus === 'in' ? CheckCircle : stockStatus === 'low' ? AlertTriangle : XCircle

  return (
    <AppLayout title={material.material_name}>
      <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Materials
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Image + QR */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
              {material.image_url ? (
                <img src={material.image_url} alt={material.material_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 w-full">
              <QrCode className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">QR Code</h3>
            </div>
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <img src={qrDataUrl} alt="QR Code" width={160} height={160} />
              </div>
            )}
            <p className="text-[10px] text-slate-400 text-center">Scan to open this material page</p>
            <div className="flex gap-2 w-full">
              <button onClick={downloadQR} className="btn-secondary flex-1 text-xs justify-center py-1.5">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={copyLink} className="btn-secondary flex-1 text-xs justify-center py-1.5">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{material.material_code}</span>
                {material.category && <span className="badge text-[10px] bg-blue-600 text-white">{material.category}</span>}
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{material.material_name}</h1>
              {material.vendor && <p className="text-sm text-slate-500 mt-0.5">by {material.vendor}</p>}
            </div>

            <div className={cn('flex items-center gap-3 p-3.5 rounded-xl mb-4',
              stockStatus === 'out' ? 'text-red-500 bg-red-50 dark:bg-red-950/30' :
              stockStatus === 'low' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' :
              'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30')}>
              <StockIcon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{stockStatus === 'out' ? 'Out of Stock' : stockStatus === 'low' ? 'Low Stock' : 'In Stock'}</p>
                <p className="text-xs opacity-80">Min. level: {material.min_stock_level} {material.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{qty.toLocaleString()}</p>
                <p className="text-xs opacity-70">{material.unit} available</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <p className="text-xs text-slate-500">Unit Price</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(material.price || '0'))}</p>
              </div>
              <button onClick={() => setShowRequestForm(true)} className="btn-primary gap-2 text-sm py-2.5 px-5">
                <ShoppingCart className="w-4 h-4" /> Request Material
              </button>
            </div>
          </div>

          {/* Specifications */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" /> Specifications
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Material Code', value: material.material_code },
                { label: 'Color', value: material.color || '—' },
                { label: 'Size', value: material.size || '—' },
                { label: 'Unit', value: material.unit },
                { label: 'Category', value: material.category || '—' },
                { label: 'Vendor', value: material.vendor || '—' },
                { label: 'Rack/Location', value: material.rack_location || '—' },
                { label: 'Barcode', value: material.barcode || '—' },
                { label: 'Last Updated', value: material.last_updated ? new Date(material.last_updated).toLocaleDateString() : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{value}</p>
                </div>
              ))}
            </div>
            {material.description && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{material.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-bold text-slate-900 dark:text-white mb-1">Request Material</h2>
            <p className="text-xs text-slate-500 mb-4">{material.material_name} ({material.material_code})</p>

            <div className="space-y-4">
              <div>
                <label className="label">Required Quantity *</label>
                <input type="number" value={requestData.qty} onChange={e => setRequestData(d => ({ ...d, qty: e.target.value }))}
                  min="0.01" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Purpose *</label>
                <input value={requestData.purpose} onChange={e => setRequestData(d => ({ ...d, purpose: e.target.value }))}
                  placeholder="e.g. Summer Collection 2025" className="input" />
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={requestData.priority} onChange={e => setRequestData(d => ({ ...d, priority: e.target.value }))} className="input">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={requestData.notes} onChange={e => setRequestData(d => ({ ...d, notes: e.target.value }))}
                  rows={2} className="input resize-none" placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRequestForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={submitRequest} disabled={submitting || !requestData.purpose}
                  className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
