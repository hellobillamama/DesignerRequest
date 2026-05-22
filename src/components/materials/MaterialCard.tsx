'use client'

import { cn, formatCurrency, getStockStatus, stockStatusColor, stockStatusLabel } from '@/lib/utils'
import type { MaterialWithDetails } from '@/types/database'
import { Package, MapPin, QrCode } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MaterialCardProps {
  material: MaterialWithDetails
  onRequest?: (material: MaterialWithDetails) => void
}

export default function MaterialCard({ material, onRequest }: MaterialCardProps) {
  const stockStatus = getStockStatus(material.balance_qty, material.min_stock_level)
  const primaryImage = material.material_images?.[0]?.image_url

  return (
    <div className="card-hover group flex flex-col overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {primaryImage ? (
          <Image src={primaryImage} alt={material.material_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
        )}
        {/* Stock badge overlay */}
        <div className={cn('absolute top-2 right-2 badge text-[10px]', stockStatusColor(stockStatus))}>
          {stockStatusLabel(stockStatus)}
        </div>
        {/* Category */}
        {material.categories && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: material.categories.color || '#6366f1' }}>
              {material.categories.name}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">{material.material_code}</p>
          <Link href={`/materials/${material.material_code}`}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
              {material.material_name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {material.color && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: material.color }} />
              <span className="capitalize">{material.color}</span>
            </div>
          )}
          {material.rack_location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{material.rack_location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(material.price)}</p>
            <p className="text-[10px] text-slate-400">per {material.unit}</p>
          </div>
          <div className="text-right">
            <p className={cn('text-sm font-bold', stockStatus === 'out' ? 'text-red-500' : stockStatus === 'low' ? 'text-amber-500' : 'text-emerald-600')}>
              {material.balance_qty.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">{material.unit} avail.</p>
          </div>
        </div>

        {/* Stock bar */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500',
            stockStatus === 'out' ? 'bg-red-500' : stockStatus === 'low' ? 'bg-amber-400' : 'bg-emerald-500')}
            style={{ width: `${Math.min((material.balance_qty / Math.max(material.min_stock_level * 3, 1)) * 100, 100)}%` }} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={() => onRequest?.(material)}
            className="flex-1 btn-primary text-xs py-1.5 justify-center">
            Request
          </button>
          <Link href={`/materials/${material.material_code}`}
            className="btn-secondary text-xs py-1.5 px-2.5">
            <QrCode className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
