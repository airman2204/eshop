import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderNumber, items, total, shippingCost, clientName, clientEmail, clientPhone } = body;

    if (!orderNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Datos de orden incompletos" }, { status: 400 });
    }

    // 1. Obtener credenciales de Mercado Pago (desde configuración guardada o env)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    let customSettings: any = null;
    try {
      const { data: file } = await supabase.storage
        .from("product-images")
        .download("_system/checkout_settings.json");
      if (file) {
        customSettings = JSON.parse(await file.text());
      }
    } catch {}

    const mpConfig = customSettings?.mercadopago;
    const accessToken = mpConfig?.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken || accessToken.includes("TU_TOKEN_AQUI")) {
      return NextResponse.json(
        {
          error: "Mercado Pago aún no tiene un Access Token configurado. Configúralo en el panel de administración o variables de entorno.",
          notConfigured: true,
        },
        { status: 400 }
      );
    }

    // 2. Inicializar SDK de Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: accessToken.trim(),
      options: { timeout: 10000 },
    });
    const preference = new Preference(client);

    // 3. Mapear artículos al formato requerido por Mercado Pago
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mpItems: any[] = items.map((i: any) => {
      const prod = i.product || i;
      const unitPrice = Number(prod.publicPrice || prod.price || 0);
      return {
        id: String(prod.id || `ITEM-${Math.random()}`),
        title: String(prod.title || prod.name || "Producto FoxDrop").slice(0, 255),
        description: String(prod.description || "").slice(0, 255) || undefined,
        picture_url: Array.isArray(prod.images) && prod.images[0] ? prod.images[0] : (prod.image || undefined),
        quantity: Math.max(1, Number(i.quantity) || 1),
        unit_price: Math.max(1, Math.round(unitPrice)),
        currency_id: "MXN",
      };
    });

    // Si hay costo de envío, agregarlo como ítem o en shipment
    const numericShipping = Number(shippingCost) || 0;
    if (numericShipping > 0) {
      mpItems.push({
        id: "SHIPPING",
        title: "Envío a Domicilio FoxDrop",
        description: "Servicio de paquetería / mensajería",
        picture_url: undefined,
        quantity: 1,
        unit_price: Math.round(numericShipping),
        currency_id: "MXN",
      });
    }

    // Determinar la URL pública real del dominio (nunca enviar localhost a Mercado Pago)
    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    let appUrl = "https://tienda.foxdrop.mx";
    if (hostHeader && !hostHeader.includes("localhost") && !hostHeader.includes("127.0.0.1")) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      appUrl = `${proto}://${hostHeader}`.replace(/\/$/, "");
    } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
      appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }

    // 4. Crear la preferencia de pago
    const response = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: clientName || "Cliente FoxDrop",
          email: clientEmail || "cliente@foxdrop.mx",
          phone: clientPhone ? { number: clientPhone.replace(/\D/g, "") } : undefined,
        },
        external_reference: orderNumber,
        statement_descriptor: "FOXDROP",
        back_urls: {
          success: `${appUrl}/tienda?order_success=${encodeURIComponent(orderNumber)}&payment_status=approved`,
          pending: `${appUrl}/tienda?order_success=${encodeURIComponent(orderNumber)}&payment_status=pending`,
          failure: `${appUrl}/tienda?order_failure=${encodeURIComponent(orderNumber)}`,
        },
        auto_return: "approved",
        binary_mode: true,
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        metadata: {
          order_number: orderNumber,
        },
      },
    });

    // En Checkout Pro, la URL clásica de sandbox (sandbox.mercadopago.com.mx) tiene
    // incompatibilidades reportadas oficialmente por Mercado Pago que causan la pantalla roja.
    // La recomendación oficial de Mercado Pago para procesar pruebas con credenciales APP_USR-
    // es redirigir a `init_point` estándar.
    const initPoint = response.init_point || response.sandbox_init_point;

    return NextResponse.json({
      success: true,
      preferenceId: response.id,
      initPoint,
      sandboxInitPoint: response.sandbox_init_point,
    });
  } catch (err: any) {
    console.error("Error creando preferencia Mercado Pago:", err);
    return NextResponse.json(
      { error: err.message || "Error al conectar con Mercado Pago" },
      { status: 500 }
    );
  }
}
