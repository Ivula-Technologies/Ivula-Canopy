'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// The church-wide sign-up link: every upcoming shift on one page, so the
// same link works in the bulletin, the church app and group texts all season.
export function VolunteerLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="mb-6 rounded-xl border border-canopy-200 bg-canopy-50 p-4">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-canopy-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-canopy-900">Your volunteer sign-up link</p>
          <p className="mt-0.5 text-xs text-canopy-800">
            One link for every upcoming shift. Volunteers can pick several at once, with no account. Share it once and
            it stays up to date as you add events.
          </p>
          <p className="mt-2 break-all font-mono text-xs text-canopy-900">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> Preview</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
