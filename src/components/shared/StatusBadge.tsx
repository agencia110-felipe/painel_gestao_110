import { STATUS_COLORS } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || {
    bg: '#F5F7FA', text: '#888888', border: '#E0E0E0',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {status}
    </span>
  )
}
