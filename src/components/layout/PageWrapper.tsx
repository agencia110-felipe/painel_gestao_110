import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <main className={`flex-1 overflow-y-auto bg-bg-page p-6 ${className}`}>
      <div className="max-w-[1400px] mx-auto">
        {children}
      </div>
    </main>
  )
}
