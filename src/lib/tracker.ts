/**
 * ============================================================================
 * FOXDROP — CLIENT-SIDE TRACKER & USER TRACEABILITY ENGINE
 * ============================================================================
 * Captura navegación, procedencia orgánica (SEO), campañas (SEM/UTMs),
 * búsquedas internas, fichas de producto y acciones en el carrito.
 * Utiliza navigator.sendBeacon para garantizar 0 latencia para el usuario.
 */

import { TrafficChannel, TrafficUtmData, AnalyticsEvent } from '@/types';

const VISITOR_KEY = 'foxdrop_visitor_id';
const SESSION_KEY = 'foxdrop_session_id';
const SESSION_TIME_KEY = 'foxdrop_session_time';
const UTM_STORE_KEY = 'foxdrop_first_utm';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad

// Generador de UUIDv4 ligero para cliente
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Obtener o inicializar ID permanente de visitante
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = 'vis_' + generateId();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

// Obtener o inicializar ID de sesión (expira tras 30 min de inactividad)
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const now = Date.now();
  const lastActive = parseInt(localStorage.getItem(SESSION_TIME_KEY) || '0', 10);
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId || (now - lastActive > SESSION_TIMEOUT_MS)) {
    sessionId = 'ses_' + generateId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  localStorage.setItem(SESSION_TIME_KEY, now.toString());
  return sessionId;
}

// Extraer parámetros UTM y clics publicitarios de la URL actual
export function extractUtmData(): TrafficUtmData {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  
  const utm: TrafficUtmData = {};
  if (params.get('utm_source')) utm.source = params.get('utm_source') || undefined;
  if (params.get('utm_medium')) utm.medium = params.get('utm_medium') || undefined;
  if (params.get('utm_campaign')) utm.campaign = params.get('utm_campaign') || undefined;
  if (params.get('utm_term')) utm.term = params.get('utm_term') || undefined;
  if (params.get('utm_content')) utm.content = params.get('utm_content') || undefined;
  
  // Parámetros de clics publicitarios Google / Meta / TikTok
  if (params.get('gclid')) utm.gclid = params.get('gclid') || undefined;
  if (params.get('fbclid')) utm.fbclid = params.get('fbclid') || undefined;
  if (params.get('ttclid')) utm.ttclid = params.get('ttclid') || undefined;
  
  // Campañas de cupones / Stickers FoxDrop
  if (params.get('qr')) utm.qrId = params.get('qr') || undefined;
  if (params.get('coupon')) utm.qrId = utm.qrId || params.get('coupon') || undefined;

  // Si tiene datos nuevos, actualizamos la memoria de la sesión
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_STORE_KEY, JSON.stringify(utm));
    return utm;
  }

  // De lo contrario recuperar la procedencia original de la sesión
  try {
    const saved = sessionStorage.getItem(UTM_STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  return {};
}

// Detectar canal de tráfico (SEO vs SEM vs Social vs Directo vs QR)
export function detectTrafficChannel(utm: TrafficUtmData, referrerUrl: string): TrafficChannel {
  if (utm.qrId) return 'physical_qr';

  // Si tiene gclid, fbclid, ttclid o medium cpc/paid/ads => SEM
  if (
    utm.gclid || 
    utm.fbclid || 
    utm.ttclid || 
    (utm.medium && /^(cpc|ppc|paid|ads|ad|sponsored)$/i.test(utm.medium))
  ) {
    return 'paid_sem';
  }

  const ref = referrerUrl.toLowerCase();
  
  // Redes sociales
  if (
    ref.includes('instagram.com') ||
    ref.includes('facebook.com') ||
    ref.includes('fb.me') ||
    ref.includes('tiktok.com') ||
    ref.includes('whatsapp') ||
    ref.includes('wa.me') ||
    utm.source?.toLowerCase().includes('instagram') ||
    utm.source?.toLowerCase().includes('facebook') ||
    utm.source?.toLowerCase().includes('tiktok') ||
    utm.source?.toLowerCase().includes('whatsapp')
  ) {
    return 'social';
  }

  // Buscadores Orgánicos (SEO)
  if (
    ref.includes('google.') ||
    ref.includes('bing.com') ||
    ref.includes('yahoo.com') ||
    ref.includes('duckduckgo.com') ||
    utm.medium === 'organic'
  ) {
    return 'organic_seo';
  }

  // Directo o interno
  if (!ref || ref.includes('foxdrop.mx') || ref.includes('localhost')) {
    return 'direct';
  }

  return 'referral';
}

// Detectar tipo de dispositivo
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Detectar Sistema Operativo
export function detectOS(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

// Detectar Navegador
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'Browser';
}

/**
 * Enviar evento al servidor de FoxDrop
 * Usa navigator.sendBeacon de forma totalmente asíncrona para no bloquear el render.
 */
export function trackFoxDropEvent(
  eventType: AnalyticsEvent['eventType'],
  details: Partial<Omit<AnalyticsEvent, 'id' | 'sessionId' | 'visitorId' | 'eventType' | 'timestamp' | 'channel'>> = {}
) {
  if (typeof window === 'undefined') return;

  try {
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const utm = extractUtmData();
    const referrer = document.referrer || '';
    const channel = detectTrafficChannel(utm, referrer);
    const deviceType = detectDeviceType();
    const os = detectOS();
    const browser = detectBrowser();

    const payload: AnalyticsEvent = {
      id: 'evt_' + generateId(),
      sessionId,
      visitorId,
      eventType,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      title: document.title,
      channel,
      utm: Object.keys(utm).length > 0 ? utm : undefined,
      referrer: referrer || undefined,
      deviceType,
      os,
      browser,
      ...details,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // Silencioso para no romper jamás la UI del cliente
  }
}
