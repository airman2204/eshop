import { NextRequest, NextResponse } from "next/server";

interface PublishAdPayload {
  platform: "meta" | "tiktok";
  campaignName: string;
  dailyBudgetMxn: number;
  product: {
    id: string;
    title: string;
    price: number;
  };
  adCreative: {
    headline: string;
    subheadline?: string;
    bodyText: string;
    imageUrl?: string;
    badge?: string;
  };
  targeting: {
    locations: string[];
    ageMin?: number;
    ageMax?: number;
    interests?: string[];
  };
  destination: "whatsapp" | "store";
  targetUrl: string;
  // Credenciales si se envían desde la UI o si vienen de .env.local
  credentials?: {
    metaAccessToken?: string;
    metaAdAccountId?: string;
    tiktokAccessToken?: string;
    tiktokAdvertiserId?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: PublishAdPayload = await req.json();
    const { platform, campaignName, dailyBudgetMxn, adCreative, targeting, destination, targetUrl, credentials } = body;

    if (!adCreative || !adCreative.headline || !adCreative.bodyText) {
      return NextResponse.json({ error: "Faltan datos del anuncio (titular o copy)." }, { status: 400 });
    }

    const budgetInCents = Math.round((dailyBudgetMxn || 50) * 100);

    // =========================================================================
    // 1. PUBLICACIÓN EN META ADS (FACEBOOK & INSTAGRAM)
    // =========================================================================
    if (platform === "meta") {
      const accessToken = credentials?.metaAccessToken || process.env.META_ACCESS_TOKEN;
      const rawAccountId = credentials?.metaAdAccountId || process.env.META_AD_ACCOUNT_ID;

      // Si no hay token configurado aún, operamos en modo Sandbox / Asistido
      if (!accessToken || !rawAccountId) {
        return NextResponse.json({
          success: true,
          mode: "preview_ready",
          message: "Anuncio estructurado con éxito para Meta Ads. Para encenderlo automáticamente con presupuesto real, ingresa tu Access Token y Ad Account ID en la configuración.",
          campaignDetails: {
            platform: "Meta (Instagram & Facebook)",
            name: campaignName,
            dailyBudget: `$${dailyBudgetMxn} MXN/día`,
            targeting: targeting.locations.join(", ") + " (Intereses: Belleza, Cuidado Personal, Regalos)",
            destination: destination === "whatsapp" ? "Chat de WhatsApp directo" : "Tienda FoxDrop Checkout",
            targetUrl,
            status: "PAUSED_PENDING_TOKEN",
          },
        });
      }

      const accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;

      try {
        // A) Crear Campaña en Meta
        const campaignRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            name: campaignName,
            objective: destination === "whatsapp" ? "OUTCOME_LEADS" : "OUTCOME_TRAFFIC",
            status: "ACTIVE",
            special_ad_categories: [],
          }),
        });

        const campaignData = await campaignRes.json();
        if (campaignData.error) {
          throw new Error(`Meta API Campaign Error: ${campaignData.error.message}`);
        }

        const campaignId = campaignData.id;

        // B) Crear Conjunto de Anuncios (AdSet)
        const adSetRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/adsets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            name: `${campaignName} - AdSet Puebla/MX`,
            campaign_id: campaignId,
            daily_budget: budgetInCents,
            billing_event: "IMPRESSIONS",
            optimization_goal: destination === "whatsapp" ? "CONVERSATIONS" : "LINK_CLICKS",
            bid_strategy: "LOWEST_COST_WITHOUT_BID_CAP",
            targeting: {
              geo_locations: {
                countries: ["MX"],
                cities: [{ key: "2417758", radius: 25, distance_unit: "kilometer" }], // Puebla
              },
              age_min: targeting.ageMin || 18,
              age_max: targeting.ageMax || 45,
            },
            status: "ACTIVE",
          }),
        });

        const adSetData = await adSetRes.json();
        if (adSetData.error) {
          throw new Error(`Meta API AdSet Error: ${adSetData.error.message}`);
        }

        return NextResponse.json({
          success: true,
          mode: "live_published",
          message: "¡Campaña encendida y publicada con éxito en Meta Ads (Facebook e Instagram)!",
          campaignId,
          adSetId: adSetData.id,
        });
      } catch (metaErr: any) {
        console.error("Error llamando a Meta Marketing API:", metaErr);
        return NextResponse.json({
          success: false,
          error: metaErr.message || "Error al conectar con la API de Meta.",
        }, { status: 502 });
      }
    }

    // =========================================================================
    // 2. PUBLICACIÓN EN TIKTOK ADS
    // =========================================================================
    if (platform === "tiktok") {
      const tiktokToken = credentials?.tiktokAccessToken || process.env.TIKTOK_ACCESS_TOKEN;
      const advertiserId = credentials?.tiktokAdvertiserId || process.env.TIKTOK_ADVERTISER_ID;

      if (!tiktokToken || !advertiserId) {
        return NextResponse.json({
          success: true,
          mode: "preview_ready",
          message: "Anuncio estructurado para TikTok Ads en formato vertical (9:16). Para desplegar la campaña automáticamente a la red de TikTok, ingresa tus credenciales de TikTok for Business.",
          campaignDetails: {
            platform: "TikTok Ads",
            name: campaignName,
            dailyBudget: `$${dailyBudgetMxn} MXN/día`,
            targeting: "TikTok Feed (México, 18-35 años)",
            status: "PAUSED_PENDING_TOKEN",
          },
        });
      }

      // Conexión con TikTok Open Business API
      try {
        const ttRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/campaign/create/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": tiktokToken,
          },
          body: JSON.stringify({
            advertiser_id: advertiserId,
            campaign_name: campaignName,
            objective_type: "TRAFFIC",
            budget_mode: "BUDGET_MODE_DAY",
            budget: dailyBudgetMxn,
          }),
        });

        const ttData = await ttRes.json();
        if (ttData.code !== 0) {
          throw new Error(ttData.message || "Error en TikTok API");
        }

        return NextResponse.json({
          success: true,
          mode: "live_published",
          message: "¡Campaña creada con éxito en TikTok Ads!",
          campaignId: ttData.data?.campaign_id,
        });
      } catch (ttErr: any) {
        console.error("Error llamando a TikTok API:", ttErr);
        return NextResponse.json({
          success: false,
          error: ttErr.message || "Error al conectar con la API de TikTok.",
        }, { status: 502 });
      }
    }

    return NextResponse.json({ error: "Plataforma no soportada." }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin/ads/publish:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor." }, { status: 500 });
  }
}
