import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ className, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-card border border-border rounded-xl shadow-sm',
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-5': padding === 'md',
          'p-6': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-semibold text-neutral-900 mb-4', className)} {...props}>
      {children}
    </h2>
  )
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function StatCard({ label, value, sub, color = 'default', className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
      <p
        className={cn('text-2xl font-bold', {
          'text-neutral-900': color === 'default',
          'text-success': color === 'success',
          'text-warning': color === 'warning',
          'text-danger': color === 'danger',
        })}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Card>
  )
}
