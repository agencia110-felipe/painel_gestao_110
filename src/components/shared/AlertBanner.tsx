import { useState } from 'react'
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertType = 'info' | 'warn' | 'danger' | 'success'

interface AlertBannerProps {
  type: AlertType
  message: string
  action?: { label: string; onClick: () => void }
  dismissible?: boolean
}

const styles: Record<AlertType, { bg: string; border: string; text: string; icon: ReactNode }> = {
  info:    { bg: 'bg-primary-bg',    border: 'border-primary/30',  text: 'text-primary', icon: <Info size={16} /> },
  warn:    { bg: 'bg-warning-bg',    border: 'border-warning/30',  text: 'text-warning', icon: <AlertTriangle size={16} /> },
  danger:  { bg: 'bg-danger-bg',     border: 'border-danger/30',   text: 'text-danger',  icon: <XCircle size={16} /> },
  success: { bg: 'bg-success-bg',    border: 'border-success/30',  text: 'text-success', icon: <CheckCircle size={16} /> },
}

export function AlertBanner({ type, message, action, dismissible = true }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const s = styles[type]
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm ${s.bg} ${s.border} ${s.text}`}>
      {s.icon}
      <span className="flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className={`underline text-xs font-medium ${s.text}`}
        >
          {action.label}
        </button>
      )}
      {dismissible && (
        <button onClick={() => setDismissed(true)} className={`${s.text} opacity-60 hover:opacity-100`}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
