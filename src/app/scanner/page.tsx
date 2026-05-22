'use client'

import { useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { QrCode, Camera, CameraOff, Search, Package, ArrowRight, RotateCcw, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Material {
  material_code: string
  material_name: string
  category: string
  color: string
  unit: string
  price: string
  balance_qty: string
  min_stock_level: string
  vendor: string
  rack_location: string
  image_url: string
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<Material | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const lookupMaterial = async (query: string) => {
    setLoading(true)
    setNotFound(false)
    setResult(null)

    let code = query.trim()
    try { const url = new URL(query); const parts = url.pathname.split('/'); code = parts[parts.length - 1] || query } catch {}

    try {
      const res = await fetch(`/api/materials/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.material) {
        setResult(data.material)
        toast.success(`Found: ${data.material.material_name}`)
      } else {
        setNotFound(true)
        toast.error('Material not found')
      }
    } catch { setNotFound(true); toast.error('Lookup failed') }
    setLoading(false)
  }

  const startCamera = async () => {
    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setScanning(true)

      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()
      if (videoRef.current) {
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) { const text = result.getText(); stopCamera(); lookupMaterial(text) }
        })
      }
    } catch { setCameraError('Camera access denied.'); setScanning(false) }
  }

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setScanning(false) }

  useEffect(() => () => stopCamera(), [])

  const handleManualSearch = (e: React.FormEvent) => { e.preventDefault(); if (manualCode.trim()) lookupMaterial(manualCode.trim()) }

  const stockStatus = result ? (parseFloat(result.balance_qty || '0') <= 0 ? 'out' : parseFloat(result.balance_qty || '0') <= parseFloat(result.min_stock_level || '10') ? 'low' : 'in') : 'in'

  return (
    <AppLayout title="QR Scanner">
      <div className="max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="page-title">QR / Barcode Scanner</h1>
          <p className="page-subtitle">Scan a QR code or enter a material code manually</p>
        </div>

        <div className="card overflow-hidden mb-4">
          <div className="relative bg-slate-900" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center"><QrCode className="w-8 h-8 text-slate-400" /></div>
                <p className="text-slate-400 text-sm text-center px-4">{cameraError || 'Tap button below to start scanning'}</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                    <div key={i} className={cn('absolute w-8 h-8 border-blue-400 rounded-sm', cls)} />
                  ))}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400/60 animate-pulse" />
                </div>
              </div>
            )}
            {loading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
          </div>
          <div className="p-4 flex gap-3">
            <button onClick={scanning ? stopCamera : startCamera}
              className={cn('flex-1 btn justify-center gap-2', scanning ? 'btn-danger' : 'btn-primary')}>
              {scanning ? <><CameraOff className="w-4 h-4" /> Stop</> : <><Camera className="w-4 h-4" /> Start Scanner</>}
            </button>
            {result && <button onClick={() => { setResult(null); setManualCode('') }} className="btn-secondary px-3"><RotateCcw className="w-4 h-4" /></button>}
          </div>
        </div>

        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-slate-400" /> Manual Code Entry</h3>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Enter material code..." className="input flex-1" />
            <button type="submit" disabled={loading || !manualCode.trim()} className="btn-primary px-4 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="card p-5 text-center animate-slide-up">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-900 dark:text-white">Material Not Found</p>
          </div>
        )}

        {result && (
          <div className="card overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">Material Found</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {result.image_url ? <img src={result.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-400" />}
                </div>
                <div>
                  <p className="font-mono text-xs text-slate-400">{result.material_code}</p>
                  <h3 className="font-bold text-slate-900 dark:text-white">{result.material_name}</h3>
                  {result.category && <span className="badge text-[10px] bg-blue-600 text-white mt-0.5">{result.category}</span>}
                </div>
              </div>

              <div className={cn('flex items-center gap-3 p-3 rounded-xl',
                stockStatus === 'out' ? 'text-red-500 bg-red-50' : stockStatus === 'low' ? 'text-amber-500 bg-amber-50' : 'text-emerald-500 bg-emerald-50')}>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{stockStatus === 'out' ? 'Out of Stock' : stockStatus === 'low' ? 'Low Stock' : 'In Stock'}</p>
                  <p className="text-xs opacity-75">{result.rack_location ? `Rack: ${result.rack_location}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{result.balance_qty}</p>
                  <p className="text-xs opacity-70">{result.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2.5 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">PRICE</p><p className="font-bold">{formatCurrency(parseFloat(result.price || '0'))}</p></div>
                <div className="p-2.5 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">COLOR</p><p className="font-medium capitalize">{result.color || '—'}</p></div>
                <div className="p-2.5 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">VENDOR</p><p className="font-medium">{result.vendor || '—'}</p></div>
                <div className="p-2.5 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">UNIT</p><p className="font-medium">{result.unit}</p></div>
              </div>

              <Link href={`/materials/${result.material_code}`} className="btn-primary w-full justify-center text-sm py-2.5">
                View Full Details & Request
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
