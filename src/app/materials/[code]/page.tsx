'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { MaterialWithDetails } from '@/types/database'
import {
  Package, MapPin, Tag, Layers, ArrowLeft,
  Download, Share2, Edit, QrCode, ZoomIn,
  CheckCircle, AlertTriangle, XCircle, Loader2,
  History, ShoppingCart
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime, getStockStatus, stockStatusColor, stockStatusLabel } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import RequestModal from '@/components/requests/RequestModal'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

export default function MaterialDetailPage() {
  const params = useParams()
  const code = params.code as string
  const supabase = createClient()

  const [material, setMaterial] = useState<MaterialWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [showZoom, setShowZoom] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [issueHistory, setIssueHistory] = useState<unknown[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('materials')
        .select('*, categories(id, name, color), vendors(id, name, email, phone), material_images(id, image_url, image_type, sort_order, alt_text)')
        .eq('material_code', decodeURIComponent(code))
        .single()

      if (data) {
        const mat = data as unknown as MaterialWithDetails
        setMaterial(mat)
        // Generate QR code
        const qrUrl = `${window.location.origin}/materials/${mat.material_code}`
        const qr = await QRCode.toDataURL(qrUrl, { width: 256, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
        setQrDataUrl(qr)

        // Load issue history
        const { data: issues } = await supabase
          .from('issue_history')
          .select('*, profiles!issued_to(full_name), issuer:profiles!issued_by(full_name)')
          .eq('material_id', mat.id)
          .order('issue_date', { ascending: false })
          .limit(10)
        setIssueHistory(issues || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, code])

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
    toast.success('Link copied to clipboard!')
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
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

  const stockStatus = getStockStatus(material.balance_qty, material.min_stock_level)
  const images = material.material_images?.sort((a, b) => a.sort_order - b.sort_order) || []
  const displayImages = images.length > 0 ? images : [{ id: 'placeholder', image_url: '', image_type: 'main' as const, alt_text: null, sort_order: 0, material_id: material.id, uploaded_by: null, created_at: '' }]

  const StockIcon = stockStatus === 'in' ? CheckCircle : stockStatus === 'low' ? AlertTriangle : XCircle

  return (
    <AppLayout title={material.material_name}>
      {/* Back */}
      <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Materials
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Images + QR */}
        <div className="lg:col-span-1 space-y-4">
          {/* Main image */}
          <div className="card overflow-hidden">
            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer" onClick={() => setShowZoom(true)}>
              {displayImages[activeImage]?.image_url ? (
                <Image
                  src={displayImages[activeImage].image_url}
                  alt={displayImages[activeImage].alt_text || material.material_name}
                  fill className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                </div>
              )}
              {displayImages[activeImage]?.image_url && (
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/30 backdrop-blur-sm text-white">
                  <ZoomIn className="w-4 h-4" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded text-white bg-black/30 backdrop-blur-sm">
                  {displayImages[activeImage]?.image_type || 'main'}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setActiveImage(i)}
                    className={cn('flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                      activeImage === i ? 'border-blue-600' : 'border-transparent hover:border-slate-300')}>
                    <Image src={img.image_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QR Code Card */}
          <div className="card p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 w-full">
              <QrCode className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">QR Code</h3>
              <span className="ml-auto text-[10px] font-mono text-slate-400">{material.material_code}</span>
            </div>

            {qrDataUrl ? (
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <Image src={qrDataUrl} alt="QR Code" width={160} height={160} />
              </div>
            ) : (
              <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center">Scan to open this material page</p>

            <div className="flex gap-2 w-full">
              <button onClick={downloadQR} className="btn-secondary flex-1 text-xs justify-center py-1.5">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button onClick={copyLink} className="btn-secondary flex-1 text-xs justify-center py-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {material.material_code}
                  </span>
                  {material.categories && (
                    <span className="badge text-[10px] text-white" style={{ backgroundColor: material.categories.color }}>
                      {material.categories.name}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{material.material_name}</h1>
                {material.vendors && (
                  <p className="text-sm text-slate-500 mt-0.5">by {material.vendors.name}</p>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/materials/${material.material_code}/edit`} className="btn-secondary text-xs py-1.5 px-2.5">
                  <Edit className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Stock status */}
            <div className={cn('flex items-center gap-3 p-3.5 rounded-xl mb-4', stockStatusColor(stockStatus))}>
              <StockIcon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{stockStatusLabel(stockStatus)}</p>
                <p className="text-xs opacity-80">Min. level: {material.min_stock_level} {material.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{material.balance_qty.toLocaleString()}</p>
                <p className="text-xs opacity-70">{material.unit} available</p>
              </div>
            </div>

            {/* Stock progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Stock Level</span>
                <span>{Math.round((material.balance_qty / Math.max(material.min_stock_level * 3, 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700',
                    stockStatus === 'out' ? 'bg-red-500' : stockStatus === 'low' ? 'bg-amber-400' : 'bg-emerald-500')}
                  style={{ width: `${Math.min((material.balance_qty / Math.max(material.min_stock_level * 3, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <p className="text-xs text-slate-500">Unit Price</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(material.price)}</p>
                <p className="text-xs text-slate-400">per {material.unit}</p>
              </div>
              <button onClick={() => setShowRequest(true)}
                className="btn-primary gap-2 text-sm py-2.5 px-5">
                <ShoppingCart className="w-4 h-4" />
                Request Material
              </button>
            </div>
          </div>

          {/* Specifications */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              Specifications
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Material Code', value: material.material_code, mono: true },
                { label: 'Color', value: material.color || '—', color: material.color },
                { label: 'Size', value: material.size || '—' },
                { label: 'Unit', value: material.unit },
                { label: 'Category', value: material.categories?.name || '—' },
                { label: 'Vendor', value: material.vendors?.name || '—' },
                { label: 'Rack/Location', value: material.rack_location || '—' },
                { label: 'Barcode', value: material.barcode || '—', mono: true },
                { label: 'Last Updated', value: formatDateTime(material.last_upload_date) },
              ].map(({ label, value, mono, color }) => (
                <div key={label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <div className="flex items-center gap-1.5">
                    {color && <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: color }} />}
                    <p className={cn('text-sm font-medium text-slate-900 dark:text-white truncate', mono && 'font-mono text-xs')}>{value}</p>
                  </div>
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

          {/* Issue History */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Issue History
            </h3>
            {issueHistory.length === 0 ? (
              <p className="text-sm text-slate-400 py-3">No issue history found for this material.</p>
            ) : (
              <div className="space-y-2">
                {issueHistory.map((h) => {
                  const issue = h as {
                    id: string; issued_qty: number; returned_qty: number;
                    issue_date: string; return_date: string | null;
                    profiles: { full_name: string | null } | null;
                    issuer: { full_name: string | null } | null;
                  }
                  return (
                    <div key={issue.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-xs">
                          Issued to {issue.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDateTime(issue.issue_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{issue.issued_qty} {material.unit}</p>
                        {issue.returned_qty > 0 && (
                          <p className="text-[10px] text-emerald-500">+{issue.returned_qty} returned</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      {showZoom && displayImages[activeImage]?.image_url && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowZoom(false)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <Image src={displayImages[activeImage].image_url} alt="" width={800} height={800} className="object-contain max-h-[90vh]" />
          </div>
        </div>
      )}

      {/* Request modal */}
      {showRequest && (
        <RequestModal material={material} onClose={() => setShowRequest(false)} />
      )}
    </AppLayout>
  )
}
