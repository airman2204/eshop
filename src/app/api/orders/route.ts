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

    // Mapear shipping_type a los valores admitidos por el CHECK constraint de la base de datos:
    // ('puebla_local', 'agreed_pickup', 'national_shipping')
    let validShippingType = "national_shipping";
    let isInternational = false;
    if (shippingType === "puebla_local") validShippingType = "puebla_local";
    else if (shippingType === "agreed_pickup") validShippingType = "agreed_pickup";
    else if (shippingType === "international_shipping") {
      validShippingType = "national_shipping";
      isInternational = true;
    }

    const orderNotes = isInternational ? "[IMPORTACION-INTERNACIONAL]" : null;

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
          shipping_type: validShippingType,
          pickup_point: pickupPoint || null,
          shipping_cost: Number(shippingCost) || 0,
          subtotal: Number(subtotal) || 0,
          total: Number(total) || 0,
          payment_method: paymentMethod || "spei",
          payment_status: "pending",
          shipping_address: shippingAddress || null,
          notes: orderNotes,
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
      const orderItems = items.map((item: any) => {
        const rawProdId = item.product?.id ? String(item.product.id).split("__")[0] : "";
        return {
          order_id: order.id,
          product_id: rawProdId && !rawProdId.startsWith("PROD-") ? rawProdId : null,
          product_title: item.product?.title || "Producto",
          quantity: Number(item.quantity) || 1,
          price_at_purchase: Number(item.product?.publicPrice) || 0,
          cost_at_purchase: Number(item.product?.totalCostMxn || item.product?.baseCostMxn) || 0,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.warn("Aviso al insertar items de orden:", itemsError);
      }

      // 3. Descontar inventario (solo si NO es Mercado Pago pendiente; en Mercado Pago se descuenta al acreditarse el pago)
      if (paymentMethod !== "mercadopago") {
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
    }

    // 4. Si el método de pago NO es Mercado Pago (ej. SPEI, efectivo o contra entrega), el carrito ya se convirtió en orden definitiva: borrar de carritos abandonados
    if (paymentMethod && paymentMethod !== "mercadopago") {
      try {
        let q = supabase.from("abandoned_carts").delete();
        if (clientPhone && clientEmail) {
          q = q.or(`client_phone.eq.${clientPhone},client_email.eq.${clientEmail}`);
        } else if (clientPhone) {
          q = q.eq("client_phone", clientPhone);
        } else if (clientEmail) {
          q = q.eq("client_email", clientEmail);
        } else if (userId) {
          q = q.eq("user_id", userId);
        }
        await q;
      } catch (cartCleanupErr) {
        console.warn("Aviso limpiando carrito abandonado tras crear orden:", cartCleanupErr);
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber requerido" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumber);

    let query = supabase.from("orders").select("*, order_items(*)");
    if (isUuid) {
      query = query.eq("id", orderNumber);
    } else {
      query = query.eq("order_number", orderNumber);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error consultando orden" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderNumber, status, paymentStatus, notes } = body;

    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber requerido" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumber);

    // Consultar estado previo para saber si debemos descontar stock al pasar a 'paid'
    let prevQuery = supabase.from("orders").select("id, payment_status, payment_method, order_items(*)");
    if (isUuid) {
      prevQuery = prevQuery.eq("id", orderNumber);
    } else {
      prevQuery = prevQuery.eq("order_number", orderNumber);
    }
    const { data: prevOrder } = await prevQuery.maybeSingle();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;

    let query = supabase.from("orders").update(updateData);
    if (isUuid) {
      query = query.eq("id", orderNumber);
    } else {
      query = query.eq("order_number", orderNumber);
    }

    const { data, error } = await query.select().maybeSingle();
    if (error) {
      console.error("Error al actualizar orden:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si la orden era de Mercado Pago y apenas acaba de acreditarse el pago ('paid'), descontar inventario ahora
    if (
      prevOrder &&
      prevOrder.payment_method === "mercadopago" &&
      prevOrder.payment_status !== "paid" &&
      paymentStatus === "paid" &&
      Array.isArray(prevOrder.order_items)
    ) {
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

    // Si el pago fue confirmado (paid) o la orden pasó a preparación/entregada, borrar carrito abandonado
    if (data && (paymentStatus === "paid" || status === "processing" || status === "delivered")) {
      let q = supabase.from("abandoned_carts").delete();
      if (data.client_phone && data.client_email) {
        q = q.or(`client_phone.eq.${data.client_phone},client_email.eq.${data.client_email}`);
      } else if (data.client_phone) {
        q = q.eq("client_phone", data.client_phone);
      } else if (data.client_email) {
        q = q.eq("client_email", data.client_email);
      } else if (data.user_id) {
        q = q.eq("user_id", data.user_id);
      }
      await q;
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error al actualizar orden" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber requerido" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumber);

    let realOrderId = orderNumber;
    if (!isUuid) {
      const { data: foundOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (foundOrder?.id) {
        realOrderId = foundOrder.id;
      }
    }

    // 1. Eliminar items asociados
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realOrderId)) {
      await supabase.from("order_items").delete().eq("order_id", realOrderId);
      await supabase.from("orders").delete().eq("id", realOrderId);
    }

    // 2. Asegurar borrado también por order_number si no era UUID
    if (!isUuid) {
      await supabase.from("orders").delete().eq("order_number", orderNumber);
    }

    return NextResponse.json({ success: true, deletedOrderId: orderNumber });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error al eliminar orden" }, { status: 500 });
  }
}
