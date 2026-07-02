import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useSheetsStore } from '@/stores/sheetsStore'

export function Layout() {
  const error = useSheetsStore((s) => s.error)

  return (
    <div className="flex h-screen bg-bg-page">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
