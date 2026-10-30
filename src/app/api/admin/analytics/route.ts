import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/security";
import { 
  AnalyticsEvent, 
  AnalyticsSettings, 
  AnalyticsMetricsSummary, 
  TrafficChannel, 
  UserSessionSummary 
} from "@/types";

const ANALYTICS_BUFFER_FILE = "_system/site_analytics.json";
const ANALYTICS_SETTINGS_FILE = "_system/analytics_settings.json";

// Cargar configuración de pixels y SEO
async function loadAnalyticsSettings(supabase: any): Promise<AnalyticsSettings> {
  try {
    const { data: file } = await supabase.storage
      .from("product-images")
      .download(ANALYTICS_SETTINGS_FILE);
    if (file) {
      const text = await file.text();
      return JSON.parse(text || "{}");
    }
  } catch {}
  return {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    tiktokPixelId: "",
    googleSearchConsoleTag: "",
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics — Obtener métricas calculadas y sesiones
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d"; // 24h, 7d, 30d, all

    const supabase = createServerClient() as any;
    const settings = await loadAnalyticsSettings(supabase);

    // Cargar eventos del buffer
    let rawEvents: AnalyticsEvent[] = [];
    try {
      const { data: file } = await supabase.storage
        .from("product-images")
        .download(ANALYTICS_BUFFER_FILE);
      if (file) {
        const text = await file.text();
        rawEvents = JSON.parse(text || "[]");
      }
    } catch {
      rawEvents = [];
    }

    // Filtrar por rango temporal
    const now = new Date();
    let cutoff = new Date(0);
    if (range === "24h") cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (range === "7d") cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filteredEvents = rawEvents.filter(e => new Date(e.timestamp) >= cutoff);

    // Agrupar eventos por sesión
    const sessionsMap = new Map<string, UserSessionSummary>();
    const visitorSet = new Set<string>();

    for (const evt of filteredEvents) {
      visitorSet.add(evt.visitorId);

      if (!sessionsMap.has(evt.sessionId)) {
        sessionsMap.set(evt.sessionId, {
          sessionId: evt.sessionId,
          visitorId: evt.visitorId,
          startedAt: evt.timestamp,
          lastActiveAt: evt.timestamp,
          channel: evt.channel || 'direct',
          utm: evt.utm,
          landingPage: evt.path || '/',
          referrer: evt.referrer,
          deviceType: evt.deviceType || 'mobile',
          os: evt.os,
          browser: evt.browser,
          country: evt.country,
          pageviewsCount: 0,
          productsViewed: [],
          searchTerms: [],
          addedToCart: false,
          beganCheckout: false,
          purchased: false,
          revenue: 0,
          events: [],
        });
      }

      const s = sessionsMap.get(evt.sessionId)!;
      s.events.push(evt);

      // Mantener orden temporal
      if (new Date(evt.timestamp) < new Date(s.startedAt)) s.startedAt = evt.timestamp;
      if (new Date(evt.timestamp) > new Date(s.lastActiveAt)) s.lastActiveAt = evt.timestamp;

      if (evt.eventType === 'pageview') {
        s.pageviewsCount++;
      } else if (evt.eventType === 'view_item' && evt.productTitle) {
        if (!s.productsViewed.includes(evt.productTitle)) s.productsViewed.push(evt.productTitle);
      } else if (evt.eventType === 'search' && evt.searchTerm) {
        if (!s.searchTerms.includes(evt.searchTerm)) s.searchTerms.push(evt.searchTerm);
      } else if (evt.eventType === 'add_to_cart') {
        s.addedToCart = true;
      } else if (evt.eventType === 'begin_checkout') {
        s.beganCheckout = true;
      } else if (evt.eventType === 'purchase') {
        s.purchased = true;
        s.revenue += Number(evt.orderTotal || 0);
      }
    }

    const sessions = Array.from(sessionsMap.values()).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );

    // Métricas del Funnel
    const totalSessions = sessions.length;
    const viewedItemSessions = sessions.filter(s => s.productsViewed.length > 0).length;
    const cartSessions = sessions.filter(s => s.addedToCart).length;
    const checkoutSessions = sessions.filter(s => s.beganCheckout).length;
    const purchaseSessions = sessions.filter(s => s.purchased).length;

    // Desglose de Canales (SEO vs SEM vs Social vs Directo vs QR)
    const channels: Record<TrafficChannel, { visits: number; conversions: number; revenue: number }> = {
      organic_seo: { visits: 0, conversions: 0, revenue: 0 },
      paid_sem: { visits: 0, conversions: 0, revenue: 0 },
      social: { visits: 0, conversions: 0, revenue: 0 },
      direct: { visits: 0, conversions: 0, revenue: 0 },
      physical_qr: { visits: 0, conversions: 0, revenue: 0 },
      referral: { visits: 0, conversions: 0, revenue: 0 },
    };

    // Desglose de Campañas UTM
    const campaignMap = new Map<string, { campaign: string; source: string; visits: number; conversions: number; revenue: number }>();
    
    // Dispositivos
    const devices = { mobile: 0, desktop: 0, tablet: 0 };

    for (const s of sessions) {
      const ch = s.channel || 'direct';
      if (channels[ch]) {
        channels[ch].visits++;
        if (s.purchased) {
          channels[ch].conversions++;
          channels[ch].revenue += s.revenue;
        }
      }

      if (s.utm?.campaign) {
        const campKey = `${s.utm.campaign}__${s.utm.source || 'ad'}`;
        if (!campaignMap.has(campKey)) {
          campaignMap.set(campKey, {
            campaign: s.utm.campaign,
            source: s.utm.source || 'ads',
            visits: 0,
            conversions: 0,
            revenue: 0,
          });
        }
        const cEntry = campaignMap.get(campKey)!;
        cEntry.visits++;
        if (s.purchased) {
          cEntry.conversions++;
          cEntry.revenue += s.revenue;
        }
      }

      if (s.deviceType === 'desktop') devices.desktop++;
      else if (s.deviceType === 'tablet') devices.tablet++;
      else devices.mobile++;
    }

    // Top productos más vistos
    const productViewsMap = new Map<string, { id: string; title: string; views: number; addToCartCount: number }>();
    for (const evt of filteredEvents) {
      if (evt.eventType === 'view_item' && evt.productTitle) {
        const key = evt.productId || evt.productTitle;
        if (!productViewsMap.has(key)) {
          productViewsMap.set(key, { id: evt.productId || key, title: evt.productTitle, views: 0, addToCartCount: 0 });
        }
        productViewsMap.get(key)!.views++;
      } else if (evt.eventType === 'add_to_cart' && evt.productTitle) {
        const key = evt.productId || evt.productTitle;
        if (!productViewsMap.has(key)) {
          productViewsMap.set(key, { id: evt.productId || key, title: evt.productTitle, views: 0, addToCartCount: 0 });
        }
        productViewsMap.get(key)!.addToCartCount++;
      }
    }
    const topProductsViewed = Array.from(productViewsMap.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top búsquedas
    const searchMap = new Map<string, number>();
    for (const evt of filteredEvents) {
      if (evt.eventType === 'search' && evt.searchTerm) {
        const clean = evt.searchTerm.trim().toLowerCase();
        searchMap.set(clean, (searchMap.get(clean) || 0) + 1);
      }
    }
    const topSearchTerms = Array.from(searchMap.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Tendencia Diaria (Últimos días)
    const dailyMap = new Map<string, { visits: number; visitors: Set<string>; purchases: number; revenue: number }>();
    for (const s of sessions) {
      const dateStr = s.startedAt.slice(0, 10);
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { visits: 0, visitors: new Set(), purchases: 0, revenue: 0 });
      }
      const d = dailyMap.get(dateStr)!;
      d.visits++;
      d.visitors.add(s.visitorId);
      if (s.purchased) {
        d.purchases++;
        d.revenue += s.revenue;
      }
    }

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, val]) => ({
        date,
        visits: val.visits,
        uniqueVisitors: val.visitors.size,
        purchases: val.purchases,
        revenue: val.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalPageviews = filteredEvents.filter(e => e.eventType === 'pageview').length;

    const summary: AnalyticsMetricsSummary = {
      totalVisits: totalSessions,
      uniqueVisitors: visitorSet.size,
      pageviews: totalPageviews,
      avgPagesPerVisit: totalSessions > 0 ? Number((totalPageviews / totalSessions).toFixed(1)) : 0,
      totalSearches: filteredEvents.filter(e => e.eventType === 'search').length,
      funnel: {
        totalSessions,
        viewedItemSessions,
        cartSessions,
        checkoutSessions,
        purchaseSessions,
        viewItemRate: totalSessions > 0 ? Number(((viewedItemSessions / totalSessions) * 100).toFixed(1)) : 0,
        cartRate: totalSessions > 0 ? Number(((cartSessions / totalSessions) * 100).toFixed(1)) : 0,
        checkoutRate: totalSessions > 0 ? Number(((checkoutSessions / totalSessions) * 100).toFixed(1)) : 0,
        conversionRate: totalSessions > 0 ? Number(((purchaseSessions / totalSessions) * 100).toFixed(1)) : 0,
      },
      channels,
      topCampaigns: Array.from(campaignMap.values()).sort((a, b) => b.visits - a.visits).slice(0, 10),
      topProductsViewed,
      topSearchTerms,
      devices,
      dailyTrend,
      recentSessions: sessions.slice(0, 40), // Las 40 sesiones más recientes con trazabilidad
      settings,
    };

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("Error al obtener estadísticas de analíticas:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/analytics — Guardar configuraciones de Pixels y SEO
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body: Partial<AnalyticsSettings> = await req.json();
    const supabase = createServerClient() as any;

    const current = await loadAnalyticsSettings(supabase);
    const updated: AnalyticsSettings = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const buffer = Buffer.from(JSON.stringify(updated, null, 2));
    await supabase.storage
      .from("product-images")
      .upload(ANALYTICS_SETTINGS_FILE, buffer, {
        contentType: "application/json",
        upsert: true,
      });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al guardar" }, { status: 500 });
  }
}
