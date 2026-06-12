'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <div className="flex gap-2 justify-center">
          <Button size="sm" onClick={reset}>Retry</Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  )
}
