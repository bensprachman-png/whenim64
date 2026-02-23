'use client'

import { useEffect } from 'react'

export default function PortfolioConnectedPage() {
  useEffect(() => {
    // Close the popup window; if opened as a tab instead, redirect back to portfolio
    if (window.opener) {
      window.close()
    } else {
      window.location.href = '/portfolio'
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">Brokerage connected!</p>
        <p className="text-sm text-muted-foreground">You can close this window and return to WhenIm64.</p>
        <button
          className="mt-4 text-sm text-primary underline"
          onClick={() => {
            if (window.opener) window.close()
            else window.location.href = '/portfolio'
          }}
        >
          Close this window →
        </button>
      </div>
    </main>
  )
}
