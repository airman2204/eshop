import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";
import { MarketingCampaign } from "@/types";
import { decryptPromoToken } from "@/lib/campaignTokens";

const CAMPAIGNS_FILE = "_system/marketing_campaigns.json";

// Extrae el código limpio de cupón si el escáner leyó la URL completa o un parámetro
function extractCleanCouponCode(input: string): string {
  if (!input) return "";
  let clean = input.trim();

  // 1. Si es una URL completa (ej: https://foxdrop.mx/?promo=HAL-FOX-001)
  try {
    if (clean.includes("http://") || clean.includes("https://") || clean.includes("?promo=") || clean.includes("?cupon=")) {
      const url = new URL(clean.startsWith("http") ? clean : `https://foxdrop.mx/${clean}`);
      const param = url.searchParams.get("promo") || url.searchParams.get("cupon") || url.searchParams.get("code");
      if (param) return param.trim();
    }
  } catch {}

  // 2. Extraer mediante regex si viene formato promo=CODIGO o cupon=CODIGO
  const paramMatch = clean.match(/(?:promo|cupon|code)=([A-Za-z0-9\-_]+)/i);
  if (paramMatch) return paramMatch[1].trim();

  // 3. Extraer si contiene el patrón de prefijo (ej: HAL-FOX-001 o FOX-...)
  const prefixMatch = clean.match(/((?:HAL|FOX)-[A-Za-z0-9\-]+)/i);
  if (prefixMatch) return prefixMatch[1].trim();

  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`campaign_scan:${clientIp}`, 60, 60)) {
      return NextResponse.json({ error: "Demasiados escaneos. Espera un momento." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const rawInput = (body.code || "").trim();

    if (!rawInput) {
      return NextResponse.json({ error: "Código de cupón requerido" }, { status: 400 });
    }

    // Extraer código limpio de cupón (incluso si la cámara escaneó la URL completa)
    const cleanInput = extractCleanCouponCode(rawInput);

    // Intentar desencriptar en caso de que sea un token cifrado de URL
    const decryptedCode = decryptPromoToken(cleanInput);

    // Lista de candidatos para buscar coincidencia
    const candidateCodes = Array.from(
      new Set(
        [
          decryptedCode,
          cleanInput.toUpperCase(),
          rawInput.toUpperCase(),
        ].filter(Boolean) as string[]
      )
    );

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

    // Buscar en qué campaña está el cupón (probando candidateCodes)
    let foundCampaignIndex = -1;
    let foundCouponIndex = -1;

    for (let cIdx = 0; cIdx < campaigns.length; cIdx++) {
      const c = campaigns[cIdx];
      const couponIdx = (c.coupons || []).findIndex((cp) => candidateCodes.includes(cp.code.toUpperCase()));
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
        message: `El código promocional no existe o ya no es válido.`,
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

    // Determinar la variante del sticker (0: hechicero, 1: vampiro, 2: calabaza)
    const variants: Array<'hechicero' | 'vampiro' | 'calabaza'> = ['hechicero', 'vampiro', 'calabaza'];
    const variant = variants[foundCouponIndex % 3];
    const customDesign = campaign.couponDesigns?.[variant];
    const defaultDesign = `/campaigns/coupons/${variant}.png`;
    const couponImage = customDesign || defaultDesign;

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
      variant,
      couponImage,
    });
  } catch (err: any) {
    console.error("Error en /api/campaigns/scan:", err);
    return NextResponse.json({ error: err.message || "Error procesando escaneo" }, { status: 500 });
  }
}
