import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";
import { MarketingCampaign } from "@/types";

const CAMPAIGNS_FILE = "_system/marketing_campaigns.json";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`campaign_scan:${clientIp}`, 60, 60)) {
      return NextResponse.json({ error: "Demasiados escaneos. Espera un momento." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = (body.code || "").trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json({ error: "Código de cupón requerido" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    let campaigns: MarketingCampaign[] = [];

    try {
      const { data: file } = await supabase.storage
        .from("product-images")
        .download(CAMPAIGNS_FILE);
      if (file) {
        campaigns = JSON.parse((await file.text()) || "[]");
      }
    } catch (err) {
      console.warn("Aviso leyendo campañas para escaneo:", err);
    }

    // Buscar en qué campaña está el cupón
    let foundCampaignIndex = -1;
    let foundCouponIndex = -1;

    for (let cIdx = 0; cIdx < campaigns.length; cIdx++) {
      const c = campaigns[cIdx];
      const couponIdx = (c.coupons || []).findIndex((cp) => cp.code === rawCode);
      if (couponIdx !== -1) {
        foundCampaignIndex = cIdx;
        foundCouponIndex = couponIdx;
        break;
      }
    }

    if (foundCampaignIndex === -1 || foundCouponIndex === -1) {
      return NextResponse.json({
        valid: false,
        reason: "not_found",
        message: `El código promocional "${rawCode}" no existe o ya no es válido.`,
      });
    }

    const campaign = campaigns[foundCampaignIndex];
    const coupon = campaign.coupons[foundCouponIndex];

    // Validar estado de la campaña
    if (!campaign.isActive) {
      return NextResponse.json({
        valid: false,
        reason: "campaign_inactive",
        message: `La campaña "${campaign.name}" no está activa en este momento.`,
      });
    }

    // Validar vigencia / fecha de vencimiento
    if (campaign.expiresAt) {
      const expDate = new Date(campaign.expiresAt);
      if (new Date() > expDate) {
        return NextResponse.json({
          valid: false,
          reason: "expired",
          message: `Esta promoción venció el ${expDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.`,
        });
      }
    }

    // Validar si ya fue redimido (de un solo uso)
    if (coupon.redeemed) {
      return NextResponse.json({
        valid: false,
        reason: "already_redeemed",
        message: `Este sticker exclusivo (${coupon.code}) ya fue utilizado en una compra anterior y no es transferible.`,
        redeemedAt: coupon.redeemedAt,
        orderNumber: coupon.orderNumber,
      });
    }

    // Validar si el cupón individual fue desactivado manualmente
    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        reason: "disabled",
        message: `El cupón "${coupon.code}" ha sido desactivado temporalmente.`,
      });
    }

    // Cupón válido: Incrementar contador de escaneos
    const nowIso = new Date().toISOString();
    coupon.scanCount = (coupon.scanCount || 0) + 1;
    coupon.lastScannedAt = nowIso;
    if (!coupon.firstScannedAt) coupon.firstScannedAt = nowIso;

    campaign.coupons[foundCouponIndex] = coupon;
    campaigns[foundCampaignIndex] = campaign;

    // Guardar cambios en storage asíncronamente
    try {
      const buffer = Buffer.from(JSON.stringify(campaigns, null, 2));
      await supabase.storage.from("product-images").upload(CAMPAIGNS_FILE, buffer, {
        contentType: "application/json",
        upsert: true,
      });
    } catch (saveErr) {
      console.warn("Aviso guardando conteo de escaneo:", saveErr);
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      campaignName: campaign.name,
      discountPercent: campaign.discountPercent,
      bannerTitle: campaign.bannerTitle || "🎃 ¡Dulce o Truco FoxDrop!",
      bannerMessage: campaign.bannerMessage || `¡Felicidades! Tienes un ${campaign.discountPercent}% de descuento exclusivo aplicado a tu compra.`,
      ctaText: campaign.ctaText || "¡Aprovechar Descuento!",
      expiresAt: campaign.expiresAt,
      scanCount: coupon.scanCount,
    });
  } catch (err: any) {
    console.error("Error en /api/campaigns/scan:", err);
    return NextResponse.json({ error: err.message || "Error procesando escaneo" }, { status: 500 });
  }
}
