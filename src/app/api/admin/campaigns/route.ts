import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/security";
import { MarketingCampaign, CampaignCoupon } from "@/types";

const CAMPAIGNS_FILE = "_system/marketing_campaigns.json";

async function loadCampaignsFromStorage(supabase: any): Promise<MarketingCampaign[]> {
  try {
    const { data: file } = await supabase.storage
      .from("product-images")
      .download(CAMPAIGNS_FILE);
    if (file) {
      const text = await file.text();
      return JSON.parse(text || "[]");
    }
  } catch (err) {
    console.warn("Aviso cargando campañas de storage:", err);
  }
  return [];
}

async function saveCampaignsToStorage(supabase: any, campaigns: MarketingCampaign[]): Promise<boolean> {
  try {
    const buffer = Buffer.from(JSON.stringify(campaigns, null, 2));
    await supabase.storage.from("product-images").upload(CAMPAIGNS_FILE, buffer, {
      contentType: "application/json",
      upsert: true,
    });
    return true;
  } catch (err) {
    console.error("Error guardando campañas en storage:", err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/campaigns — Listar campañas y estadísticas
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createServerClient() as any;
    const campaigns = await loadCampaignsFromStorage(supabase);

    // Calcular métricas agregadas por campaña
    const enriched = campaigns.map((c) => {
      const coupons = c.coupons || [];
      const totalQrs = coupons.length;
      const totalScans = coupons.reduce((sum, item) => sum + (item.scanCount || 0), 0);
      const totalRedemptions = coupons.filter((item) => item.redeemed).length;
      const activeCoupons = coupons.filter((item) => item.isActive && !item.redeemed).length;

      return {
        ...c,
        totalQrs,
        totalScans,
        totalRedemptions,
        activeCoupons,
      };
    });

    return NextResponse.json({ success: true, campaigns: enriched });
  } catch (err: any) {
    console.error("Error en GET /api/admin/campaigns:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/campaigns — Crear campaña y generar QRs
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      prefix = "HAL-FOX",
      quantity = 100,
      discountPercent = 15,
      expiresAt,
      bannerTitle = "🎃 ¡Dulce o Truco FoxDrop!",
      bannerMessage = "¡Felicidades! Escaneaste tu sticker exclusivo. Tienes descuento aplicado a tu compra.",
      ctaText = "¡Aprovechar Descuento!",
      singleUse = true,
      baseUrl = "https://foxdrop.mx",
    } = body;

    if (!name) {
      return NextResponse.json({ error: "El nombre de la campaña es requerido" }, { status: 400 });
    }

    const supabase = createServerClient() as any;
    const campaigns = await loadCampaignsFromStorage(supabase);

    const campaignId = `camp-${Date.now()}`;
    const cleanPrefix = (prefix || "PROMO").toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // Generar cupones únicos en lote (configurable libremente hasta 5,000 cupones)
    const coupons: CampaignCoupon[] = [];
    const count = Math.min(Math.max(1, parseInt(quantity, 10) || 100), 5000);

    for (let i = 1; i <= count; i++) {
      const paddedNum = i.toString().padStart(3, "0");
      const code = `${cleanPrefix}-${paddedNum}`;
      const qrPayloadUrl = `${baseUrl.replace(/\/+$/, "")}/?promo=${code}`;

      coupons.push({
        code,
        qrPayloadUrl,
        isActive: true,
        scanCount: 0,
        redeemed: false,
      });
    }

    // Fecha de expiración por defecto: 31 de octubre de 2026 a las 23:59:59 si no se especifica
    const defaultExp = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const newCampaign: MarketingCampaign = {
      id: campaignId,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      discountPercent: Number(discountPercent) || 15,
      discountType: "percentage",
      singleUse: Boolean(singleUse),
      expiresAt: expiresAt || defaultExp,
      isActive: true,
      bannerTitle,
      bannerMessage,
      ctaText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coupons,
    };

    campaigns.unshift(newCampaign);
    await saveCampaignsToStorage(supabase, campaigns);

    return NextResponse.json({
      success: true,
      campaign: {
        ...newCampaign,
        totalQrs: coupons.length,
        totalScans: 0,
        totalRedemptions: 0,
      },
    });
  } catch (err: any) {
    console.error("Error en POST /api/admin/campaigns:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/campaigns — Editar campaña o activar/desactivar cupones
// ──────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { campaignId, action, updates, couponCode, activeState } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
    }

    const supabase = createServerClient() as any;
    const campaigns = await loadCampaignsFromStorage(supabase);
    const campaignIndex = campaigns.findIndex((c) => c.id === campaignId);

    if (campaignIndex === -1) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    const target = campaigns[campaignIndex];

    // 1. Activar o Desactivar un cupón individual
    if (action === "toggle_coupon" && couponCode) {
      target.coupons = target.coupons.map((c) => {
        if (c.code === couponCode) {
          return {
            ...c,
            isActive: activeState !== undefined ? Boolean(activeState) : !c.isActive,
          };
        }
        return c;
      });
    }

    // 2. Activar o Desactivar TODOS los cupones en lote
    else if (action === "toggle_all_coupons") {
      const newStatus = Boolean(activeState);
      target.coupons = target.coupons.map((c) => ({
        ...c,
        isActive: newStatus,
      }));
    }

    // 3. Actualizar configuración general de la campaña
    else if (action === "update_settings" && updates) {
      if (updates.name !== undefined) target.name = String(updates.name).trim();
      if (updates.discountPercent !== undefined) target.discountPercent = Number(updates.discountPercent) || 10;
      if (updates.expiresAt !== undefined) target.expiresAt = updates.expiresAt;
      if (updates.isActive !== undefined) target.isActive = Boolean(updates.isActive);
      if (updates.bannerTitle !== undefined) target.bannerTitle = updates.bannerTitle;
      if (updates.bannerMessage !== undefined) target.bannerMessage = updates.bannerMessage;
      if (updates.ctaText !== undefined) target.ctaText = updates.ctaText;
      if (updates.singleUse !== undefined) target.singleUse = Boolean(updates.singleUse);
      if (updates.couponDesigns !== undefined) {
        target.couponDesigns = {
          ...target.couponDesigns,
          ...updates.couponDesigns,
        };
      }
    }

    target.updatedAt = new Date().toISOString();
    campaigns[campaignIndex] = target;

    await saveCampaignsToStorage(supabase, campaigns);

    return NextResponse.json({ success: true, campaign: target });
  } catch (err: any) {
    console.error("Error en PATCH /api/admin/campaigns:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/campaigns — Eliminar campaña
// ──────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("id");

    if (!campaignId) {
      return NextResponse.json({ error: "ID de campaña requerido" }, { status: 400 });
    }

    const supabase = createServerClient() as any;
    const campaigns = await loadCampaignsFromStorage(supabase);
    const filtered = campaigns.filter((c) => c.id !== campaignId);

    await saveCampaignsToStorage(supabase, filtered);

    return NextResponse.json({ success: true, deletedId: campaignId });
  } catch (err: any) {
    console.error("Error en DELETE /api/admin/campaigns:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
