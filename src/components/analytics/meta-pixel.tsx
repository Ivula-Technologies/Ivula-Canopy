'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { META_PIXEL_ID, isPixelPage, trackMetaEvent } from '@/lib/meta-pixel'

export function MetaPixel() {
  const pathname = usePathname()
  const firstLoad = useRef(true)
  const onPixelPage = isPixelPage(pathname)

  // The base snippet tracks the first PageView; track client-side navigations between
  // pixel pages after that (trackMetaEvent ignores every other page)
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return }
    trackMetaEvent('PageView')
  }, [pathname])

  if (!META_PIXEL_ID || !onPixelPage) return null

  // disablePushState stops the pixel from logging in-app navigations on its own, and
  // autoConfig=false stops it from reading buttons and form fields, so once loaded on a
  // public page it still sends nothing from the signed-in app.
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState=true;
fbq('set','autoConfig',false,${JSON.stringify(META_PIXEL_ID)});
fbq('init', ${JSON.stringify(META_PIXEL_ID)});
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}
