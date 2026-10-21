'use client'

import { useEffect } from 'react'

// When a redirect URL isn't on Supabase's allow list, Supabase sends people to
// the site root instead. Pass those email links on to the pages that finish
// them, so a teammate's invite or a password reset never dead-ends here.
export function AuthLinkForwarder() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const type = hash.get('type')
    if (hash.get('access_token') && (type === 'invite' || type === 'recovery')) {
      window.location.replace(`/reset-password${window.location.hash}`)
      return
    }
    const search = new URLSearchParams(window.location.search)
    if (search.get('code')) window.location.replace(`/callback?code=${encodeURIComponent(search.get('code')!)}`)
  }, [])
  return null
}
