import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
}

export default function StatsCard({
  title, value, subtitle, icon: Icon, iconBg = 'bg-blue-50 dark:bg-blue-950/30',
  iconColor = 'text-blue-600', trend, className,
}: StatsCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className={cn('stat-icon', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        {trend && (
          <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium',
            trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
