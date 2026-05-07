import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  trend?: number
  variant?: Variant
  icon?: ReactNode
  className?: string
}

const variantStyles: Record<Variant, { card: string; label: string; value: string }> = {
  default:  { card: 'bg-white border-border',          label: 'text-muted',   value: 'text-neutral' },
  success:  { card: 'bg-success-bg border-success/30', label: 'text-success', value: 'text-success' },
  warning:  { card: 'bg-warning-bg border-warning/30', label: 'text-warning', value: 'text-warning' },
  danger:   { card: 'bg-danger-bg border-danger/30',   label: 'text-danger',  value: 'text-danger' },
  info:     { card: 'bg-primary-bg border-primary/30', label: 'text-primary', value: 'text-primary' },
}

export function MetricCard({ label, value, subtext, trend, variant = 'default', icon, className = '' }: MetricCardProps) {
  const s = variantStyles[variant]

  return (
    <div className={`rounded-xl border p-5 ${s.card} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-medium uppercase tracking-wide ${s.label}`}>{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>

      <p className={`mt-2 text-2xl font-semibold font-mono-nums ${s.value}`}>{value}</p>

      <div className="mt-1 flex items-center gap-2">
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-muted'
          }`}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend > 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
          </span>
        )}
        {subtext && <p className="text-xs text-muted">{subtext}</p>}
      </div>
    </div>
  )
}
