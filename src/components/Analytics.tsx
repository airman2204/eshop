'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { trackFoxDropEvent } from '@/lib/tracker';
import { AnalyticsSettings } from '@/types';

// Helper global para disparar eventos de ecommerce en FoxDrop, GA4 y Meta Pixel
export function trackEcommerceEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  // 1. Rastreo nativo en FoxDrop Analytics (Trazabilidad interna)
  try {
    if (eventName === 'view_item') {
      const items = (params?.items as any[]) || [];
      const first = items[0] || {};
      trackFoxDropEvent('view_item', {
        productId: first.item_id || String(params?.item_id || ''),
        productTitle: first.item_name || String(params?.item_name || ''),
        productPrice: Number(first.price || params?.value || 0),
        productCategory: first.item_category || undefined,
      });
    } else if (eventName === 'add_to_cart') {
      const items = (params?.items as any[]) || [];
      const first = items[0] || {};
      trackFoxDropEvent('add_to_cart', {
        productId: first.item_id || String(params?.item_id || ''),
        productTitle: first.item_name || String(params?.item_name || ''),
        productPrice: Number(first.price || params?.value || 0),
        cartTotal: Number(params?.value || 0),
      });
    } else if (eventName === 'begin_checkout') {
      trackFoxDropEvent('begin_checkout', {
        cartTotal: Number(params?.value || 0),
      });
    } else if (eventName === 'purchase') {
      trackFoxDropEvent('purchase', {
        orderId: String(params?.transaction_id || ''),
        orderTotal: Number(params?.value || 0),
      });
    } else if (eventName === 'search') {
      trackFoxDropEvent('search', {
        searchTerm: String(params?.search_term || ''),
      });
    }
  } catch (err) {
    // Silencioso
  }

  // 2. Google Analytics 4
  const win = window as unknown as { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
  if (win.gtag) {
    win.gtag('event', eventName, params || {});
  }

  // 3. Meta Pixel
  if (win.fbq) {
    const metaEventMap: Record<string, string> = {
      'view_item': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'begin_checkout': 'InitiateCheckout',
      'purchase': 'Purchase',
      'search': 'Search',
    };
    const metaEvent = metaEventMap[eventName] || 'Custom';
    win.fbq('track', metaEvent, params || {});
  }
}

export default function Analytics() {
  const [dynamicSettings, setDynamicSettings] = useState<AnalyticsSettings | null>(null);

  // Registrar automáticamente el PageView de llegada en FoxDrop
  useEffect(() => {
    trackFoxDropEvent('pageview');
  }, []);

  useEffect(() => {
    // Inicializar Google Consent Mode v2 por defecto
    if (typeof window !== 'undefined') {
      const win = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      win.dataLayer = win.dataLayer || [];
      if (!win.gtag) {
        win.gtag = function (...args: unknown[]) {
          win.dataLayer?.push(args);
        };
      }

      // Comprobar si ya existía consentimiento guardado
      const saved = localStorage.getItem('foxdrop_cookie_consent');
      const granted = saved === 'all';

      win.gtag('consent', 'default', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
        wait_for_update: 500,
      });

      // Cargar configuraciones dinámicas de pixels si las hay guardadas en localStorage
      try {
        const cached = localStorage.getItem('foxdrop_analytics_settings');
        if (cached) {
          setDynamicSettings(JSON.parse(cached));
        }
      } catch {}
    }
  }, []);

  const GA_ID = dynamicSettings?.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const GTM_ID = dynamicSettings?.gtmId || process.env.NEXT_PUBLIC_GTM_ID;
  const META_PIXEL_ID = dynamicSettings?.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {/* GOOGLE ANALYTICS 4 */}
      {GA_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}

      {/* GOOGLE TAG MANAGER */}
      {GTM_ID && (
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
      )}

      {/* META / FACEBOOK PIXEL */}
      {META_PIXEL_ID && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
