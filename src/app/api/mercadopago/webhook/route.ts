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
    const status = paymentData.status; // 'approved', 'pending', 'in_process', 'rejected', 'cancelled'

    if (orderNumber) {
      const isApproved = status === "approved";
      const isRejected = status === "rejected" || status === "cancelled" || status === "refunded";

      // Consultar estado previo para no descontar stock dos veces
      const { data: prevOrder } = await supabase
        .from("orders")
        .select("id, payment_status, order_items(*)")
        .eq("order_number", orderNumber)
        .maybeSingle();

      const { data: updatedOrder } = await supabase
        .from("orders")
        .update({
          payment_status: isApproved ? "paid" : isRejected ? "failed" : status,
          status: isApproved ? "processing" : isRejected ? "cancelled" : "pending",
          ...(isRejected ? { notes: "Pago rechazado o no completado en Mercado Pago" } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber)
        .select("client_phone, client_email, user_id")
        .maybeSingle();

      // Si el pago acaba de aprobarse y antes no estaba en 'paid', descontar stock de los productos
      if (isApproved && prevOrder && prevOrder.payment_status !== "paid" && Array.isArray(prevOrder.order_items)) {
        for (const item of prevOrder.order_items) {
          if (item.product_id) {
            try {
              const { data: pData } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .maybeSingle();
              if (pData && typeof pData.stock === "number") {
                const updatedStock = Math.max(0, pData.stock - (Number(item.quantity) || 1));
                await supabase.from("products").update({ stock: updatedStock }).eq("id", item.product_id);
              }
            } catch {}
          }
        }
      }

      // Si el pago fue aprobado, limpiar inmediatamente cualquier carrito abandonado asociado a este cliente
      if (isApproved && updatedOrder) {
        let q = supabase.from("abandoned_carts").delete();
        if (updatedOrder.client_phone && updatedOrder.client_email) {
          q = q.or(`client_phone.eq.${updatedOrder.client_phone},client_email.eq.${updatedOrder.client_email}`);
        } else if (updatedOrder.client_phone) {
          q = q.eq("client_phone", updatedOrder.client_phone);
        } else if (updatedOrder.client_email) {
          q = q.eq("client_email", updatedOrder.client_email);
        } else if (updatedOrder.user_id) {
          q = q.eq("user_id", updatedOrder.user_id);
        }
        await q;
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("Error procesando Webhook Mercado Pago:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
