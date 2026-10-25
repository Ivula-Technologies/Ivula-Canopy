'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'canopy-install-dismissed'

// Shows "Put Canopy on your phone" on small screens until the app is installed
// or dismissed. Android/Chrome get a one-tap install button; iPhone gets the
// Share-sheet steps, since Safari has no install prompt.
export function InstallAppCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {}
    if (standalone || dismissed) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    // Deferred one frame so the first render matches the server's (no card).
    const frame = window.requestAnimationFrame(() => {
      setIsIos(ios)
      if (ios || window.matchMedia('(max-width: 1023px)').matches) setVisible(true)
    })

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {}
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-canopy-200 bg-white p-4 shadow-sm">
      <Image src="/icon-192.png" alt="" width={44} height={44} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900 sm:text-base">Put Canopy on your phone</p>
        {prompt ? (
          <p className="text-sm text-gray-600">Open your people, events and check-ins in one tap from your home screen, like any other app.</p>
        ) : isIos ? (
          <p className="text-sm text-gray-600">
            In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. Canopy opens full screen, straight to your dashboard.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            In your browser menu, tap <strong>Install app</strong> or <strong>Add to Home screen</strong>. Canopy opens full screen, straight to your dashboard.
          </p>
        )}
        <div className="flex items-center gap-3 pt-0.5">
          {prompt && (
            <Button size="sm" onClick={install}>
              Install app
            </Button>
          )}
          <button type="button" onClick={dismiss} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
