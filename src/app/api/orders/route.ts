import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`create_order:${clientIp}`, 30, 60)) {
      return NextResponse.json({ error: "Demasiados pedidos intentados. Por favor espera un momento." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      userId,
      clientName,
      clientPhone,
      clientEmail,
      shippingType,
      pickupPoint,
      shippingCost,
      subtotal,
      total,
      paymentMethod,
      shippingAddress,
      items,
    } = body;

    if (!clientName || !clientPhone || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios para procesar el pedido (nombre, teléfono y artículos)." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Generar folio de compra oficial FX-XXXXXX
    const orderNumber = `FX-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Insertar orden principal con Service Role (omite RLS para permitir checkout tanto de invitados como registrados)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          user_id: userId || null,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail || null,
          shipping_type: shippingType || "standard",
          pickup_point: pickupPoint || null,
          shipping_cost: Number(shippingCost) || 0,
          subtotal: Number(subtotal) || 0,
          total: Number(total) || 0,
          payment_method: paymentMethod || "spei",
          payment_status: "pending",
          shipping_address: shippingAddress || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Error al registrar pedido en Supabase:", orderError);
      return NextResponse.json({ error: orderError.message || "Error al crear orden" }, { status: 500 });
    }

    // 2. Insertar ítems del pedido
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product?.id && !String(item.product.id).startsWith("PROD-") ? item.product.id : null,
        product_title: item.product?.title || "Producto",
        quantity: Number(item.quantity) || 1,
        price_at_purchase: Number(item.product?.publicPrice) || 0,
        cost_at_purchase: Number(item.product?.totalCostMxn || item.product?.baseCostMxn) || 0,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.warn("Aviso al insertar items de orden:", itemsError);
      }

      // 3. Descontar inventario (tanto individual como componentes de combos)
      for (const item of items) {
        const prod = item.product;
        const qtyPurchased = Number(item.quantity) || 1;
        if (!prod) continue;

        // Si es combo
        if (prod.isCombo && Array.isArray(prod.comboProductIds) && prod.comboProductIds.length > 0) {
          for (const subProdId of prod.comboProductIds) {
            try {
              const { data: subData } = await supabase
                .from("products")
                .select("stock")
                .eq("id", subProdId)
                .maybeSingle();

              if (subData && typeof subData.stock === "number") {
                const updatedStock = Math.max(0, subData.stock - qtyPurchased);
                await supabase.from("products").update({ stock: updatedStock }).eq("id", subProdId);
              }
            } catch (comboErr) {
              console.warn(`Error descontando stock de combo ${subProdId}:`, comboErr);
            }
          }
        }

        // Descontar inventario del artículo en catálogo
        if (prod.id && !String(prod.id).startsWith("PROD-")) {
          try {
            const { data: pData } = await supabase
              .from("products")
              .select("stock")
              .eq("id", prod.id)
              .maybeSingle();

            if (pData && typeof pData.stock === "number") {
              const updatedStock = Math.max(0, pData.stock - qtyPurchased);
              await supabase.from("products").update({ stock: updatedStock }).eq("id", prod.id);
            }
          } catch (stockErr) {
            console.warn(`Error descontando stock de producto ${prod.id}:`, stockErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      order,
    });
  } catch (err: any) {
    console.error("Error en POST /api/orders:", err);
    return NextResponse.json({ error: err?.message || "Error interno al crear orden" }, { status: 500 });
  }
}
