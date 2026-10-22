import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    const body = await req.json().catch(() => ({}));
    const paymentId = id || body?.data?.id;

    if (!paymentId || (topic && topic !== "payment" && body?.type !== "payment")) {
      return NextResponse.json({ received: true });
    }

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

    const accessToken =
      customSettings?.mercadopago?.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken || accessToken.includes("TU_TOKEN_AQUI")) {
      return NextResponse.json({ error: "Token MP no configurado" }, { status: 400 });
    }

    const client = new MercadoPagoConfig({ accessToken: accessToken.trim() });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    if (!paymentData) {
      return NextResponse.json({ received: true });
    }

    const orderNumber = paymentData.external_reference || paymentData.metadata?.order_number;
    const status = paymentData.status; // 'approved', 'pending', 'in_process', 'rejected'

    if (orderNumber) {
      const isApproved = status === "approved";
      await supabase
        .from("orders")
        .update({
          payment_status: isApproved ? "paid" : status,
          status: isApproved ? "processing" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber);
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("Error procesando Webhook Mercado Pago:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
