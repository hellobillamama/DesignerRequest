'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { MaterialWithDetails } from '@/types/database'
import {
  QrCode, Camera, CameraOff, Search, Package,
  ArrowRight, RotateCcw, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Flashlight
} from 'lucide-react'
import { cn, getStockStatus, stockStatusColor, stockStatusLabel, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import RequestModal from '@/components/requests/RequestModal'

export default function ScannerPage() {
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<MaterialWithDetails | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [requestMaterial, setRequestMaterial] = useState<MaterialWithDetails | null>(null)
  const [scanHistory, setScanHistory] = useState<MaterialWithDetails[]>([])

  const lookupMaterial = async (query: string) => {
    setLoading(true)
    setNotFound(false)
    setResult(null)

    // Try to extract code from URL if it's a URL
    let code = query.trim()
    try {
      const url = new URL(query)
      const pathParts = url.pathname.split('/')
      code = pathParts[pathParts.length - 1] || query
    } catch {}

    const { data } = await supabase
      .from('materials')
      .select('*, categories(id, name, color), vendors(id, name), material_images(id, image_url, image_type, sort_order)')
      .or(`material_code.eq.${code},barcode.eq.${code}`)
      .single()

    if (data) {
      const material = data as MaterialWithDetails
      setResult(material)
      setScanHistory(prev => [material, ...prev.filter(m => m.id !== material.id)].slice(0, 5))
      toast.success(`Found: ${material.material_name}`)
    } else {
      setNotFound(true)
      toast.error('Material not found')
    }
    setLoading(false)
  }

  const startCamera = async () => {
    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setScanning(true)

      // Start QR scanning with ZXing
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()
      if (videoRef.current) {
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result) {
            const text = result.getText()
            stopCamera()
            lookupMaterial(text)
          }
        })
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions.')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => () => stopCamera(), [])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) lookupMaterial(manualCode.trim())
  }

  const stockStatus = result ? getStockStatus(result.balance_qty, result.min_stock_level) : 'in'
  const StockIcon = stockStatus === 'in' ? CheckCircle2 : stockStatus === 'low' ? AlertTriangle : XCircle

  return (
    <AppLayout title="QR Scanner">
      <div className="max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="page-title">QR / Barcode Scanner</h1>
          <p className="page-subtitle">Scan a QR code or enter a material code manually</p>
        </div>

        {/* Camera scanner */}
        <div className="card overflow-hidden mb-4">
          <div className="relative bg-slate-900" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {/* Overlay when not scanning */}
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm text-center px-4">
                  {cameraError || 'Tap the button below to start scanning QR codes or barcodes'}
                </p>
                {cameraError && (
                  <p className="text-xs text-red-400 bg-red-950/30 px-3 py-1.5 rounded-lg">{cameraError}</p>
                )}
              </div>
            )}

            {/* Scan frame overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  {/* Corners */}
                  {[
                    'top-0 left-0 border-t-2 border-l-2',
                    'top-0 right-0 border-t-2 border-r-2',
                    'bottom-0 left-0 border-b-2 border-l-2',
                    'bottom-0 right-0 border-b-2 border-r-2',
                  ].map((cls, i) => (
                    <div key={i} className={cn('absolute w-8 h-8 border-blue-400 rounded-sm', cls)} />
                  ))}
                  {/* Scan line */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400/60 animate-pulse" />
                  <p className="absolute -bottom-7 inset-x-0 text-center text-xs text-white/70">Align QR code within frame</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="p-4 flex gap-3">
            <button
              onClick={scanning ? stopCamera : startCamera}
              className={cn('flex-1 btn justify-center gap-2',
                scanning ? 'btn-danger' : 'btn-primary')}>
              {scanning ? <><CameraOff className="w-4 h-4" /> Stop Scanner</> : <><Camera className="w-4 h-4" /> Start Scanner</>}
            </button>
            {result && (
              <button onClick={() => { setResult(null); setManualCode('') }}
                className="btn-secondary px-3">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Manual search */}
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            Manual Code Entry
          </h3>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Enter material code or barcode..."
              className="input flex-1"
            />
            <button type="submit" disabled={loading || !manualCode.trim()} className="btn-primary px-4 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Result */}
        {notFound && (
          <div className="card p-5 text-center animate-slide-up">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-900 dark:text-white">Material Not Found</p>
            <p className="text-sm text-slate-500 mt-1">No material matches code: <span className="font-mono">{manualCode}</span></p>
          </div>
        )}

        {result && (
          <div className="card overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">Material Found</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {result.material_images?.[0]?.image_url ? (
                    <img src={result.material_images[0].image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-slate-400">{result.material_code}</p>
                  <h3 className="font-bold text-slate-900 dark:text-white">{result.material_name}</h3>
                  {result.categories && (
                    <span className="badge text-[10px] text-white mt-0.5" style={{ backgroundColor: result.categories.color }}>
                      {result.categories.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div className={cn('flex items-center gap-3 p-3 rounded-xl', stockStatusColor(stockStatus))}>
                <StockIcon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{stockStatusLabel(stockStatus)}</p>
                  <p className="text-xs opacity-75">{result.rack_location ? `Rack: ${result.rack_location}` : 'Location not set'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{result.balance_qty}</p>
                  <p className="text-xs opacity-70">{result.unit}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-0.5">PRICE</p>
                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(result.price)}</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-0.5">COLOR</p>
                  <div className="flex items-center gap-1.5">
                    {result.color && <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: result.color }} />}
                    <p className="font-medium text-slate-900 dark:text-white capitalize">{result.color || '—'}</p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-0.5">VENDOR</p>
                  <p className="font-medium text-slate-900 dark:text-white">{result.vendors?.name || '—'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-0.5">UNIT</p>
                  <p className="font-medium text-slate-900 dark:text-white">{result.unit}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/materials/${result.material_code}`}
                  className="btn-secondary flex-1 justify-center text-xs py-2">
                  View Details
                </Link>
                <button onClick={() => setRequestMaterial(result)}
                  className="btn-primary flex-1 justify-center text-xs py-2">
                  Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && !result && (
          <div className="card p-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {scanHistory.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => setResult(m)}>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-slate-900 dark:text-white">{m.material_name}</p>
                    <p className="text-[10px] text-slate-400">{m.material_code}</p>
                  </div>
                  <span className={cn('badge text-[10px]', stockStatusColor(getStockStatus(m.balance_qty, m.min_stock_level)))}>
                    {m.balance_qty} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {requestMaterial && (
        <RequestModal material={requestMaterial} onClose={() => setRequestMaterial(null)} />
      )}
    </AppLayout>
  )
}
