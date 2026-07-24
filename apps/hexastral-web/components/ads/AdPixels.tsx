'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { newAdEventId, trackBrowserConversion } from '@/lib/ads/track'

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim()
const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID?.trim()

/**
 * Inject P0 ad pixels when public env IDs are set. Mount only on brand_acq / lp_acq.
 */
export function AdPixels() {
  const any =
    !!META_PIXEL_ID || !!GOOGLE_ADS_ID || !!TIKTOK_PIXEL_ID || !!REDDIT_PIXEL_ID

  useEffect(() => {
    if (!any) return
    const eventId = newAdEventId()
    // Delay slightly so pixel stubs exist
    const t = window.setTimeout(() => {
      trackBrowserConversion({ eventName: 'PageView', eventId })
    }, 200)
    return () => window.clearTimeout(t)
  }, [any])

  if (!any) return null

  return (
    <>
      {META_PIXEL_ID ? (
        <Script id='meta-pixel' strategy='afterInteractive'>{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');
        `}</Script>
      ) : null}

      {GOOGLE_ADS_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
            strategy='afterInteractive'
          />
          <Script id='google-ads' strategy='afterInteractive'>{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GOOGLE_ADS_ID}');
          `}</Script>
        </>
      ) : null}

      {TIKTOK_PIXEL_ID ? (
        <Script id='tiktok-pixel' strategy='afterInteractive'>{`
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${TIKTOK_PIXEL_ID}');ttq.page();}(window,document,'ttq');
        `}</Script>
      ) : null}

      {REDDIT_PIXEL_ID ? (
        <Script id='reddit-pixel' strategy='afterInteractive'>{`
!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};
p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js";t.async=!0;
var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}
rdt('init','${REDDIT_PIXEL_ID}');rdt('track','PageVisit');}(window,document);
        `}</Script>
      ) : null}
    </>
  )
}
