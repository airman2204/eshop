import { getSupabaseBrowserClient } from "./supabase/client";
import { Product } from "@/types";

export interface CreateOrderInput {
  userId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  shippingType: 'puebla_local' | 'agreed_pickup' | 'national_shipping';
  pickupPoint?: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  paymentMethod: 'spei' | 'card' | 'cash' | 'mercadopago';
  shippingAddress?: {
    street?: string;
    zip?: string;
    city?: string;
    colonia?: string;
  };
  items: {
    product: Product;
    quantity: number;
  }[];
}

/**
 * Registra una orden y sus detalles en Supabase
 */
export async function createOrderInDb(input: CreateOrderInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;

  // Generar folio legible FX-XXXXXX
  const orderNumber = `FX-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Insertar orden principal
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        order_number: orderNumber,
        user_id: input.userId || null,
        client_name: input.clientName,
        client_phone: input.clientPhone,
        client_email: input.clientEmail || null,
        shipping_type: input.shippingType,
        pickup_point: input.pickupPoint || null,
        shipping_cost: input.shippingCost,
        subtotal: input.subtotal,
        total: input.total,
        payment_method: input.paymentMethod,
        payment_status: "pending",
        shipping_address: input.shippingAddress || null,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (orderError) {
    console.error("Error al registrar pedido en Supabase:", orderError);
    throw orderError;
  }

  // 2. Insertar ítems del pedido
  if (input.items && input.items.length > 0) {
    const orderItems = input.items.map(item => ({
      order_id: order.id,
      product_id: item.product.id && !item.product.id.startsWith("PROD-") ? item.product.id : null,
      product_title: item.product.title,
      quantity: item.quantity,
      price_at_purchase: item.product.publicPrice,
      cost_at_purchase: item.product.totalCostMxn,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.warn("Advertencia al insertar ítems del pedido:", itemsError);
    }
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
  };
}

/**
 * Registra una venta física en punto de venta (POS)
 * Descuenta el inventario de inmediato y registra la orden como entregada (delivered)
 */
export async function createPhysicalSaleOrder(sale: {
  clientName?: string;
  clientPhone?: string;
  items: { product: Product; quantity: number }[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'spei';
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const orderNumber = `FX-POS-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Descontar stock de cada producto vendido
  for (const item of sale.items) {
    if (item.product.id) {
      try {
        const newStock = Math.max(0, item.product.stock - item.quantity);
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product.id);
      } catch (err) {
        console.warn(`Error al descontar stock del producto ${item.product.id}:`, err);
      }
    }
  }

  // 2. Registrar orden en Supabase
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          client_name: sale.clientName || "Venta en Tienda Física",
          client_phone: sale.clientPhone || "Mostrador",
          shipping_type: "agreed_pickup",
          shipping_cost: 0,
          subtotal: sale.total,
          total: sale.total,
          payment_method: sale.paymentMethod,
          payment_status: "paid",
          status: "delivered",
          notes: "Venta física registrada con Escáner POS Móvil",
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn("Advertencia registrando orden POS en Supabase:", error);
    }

    if (order && sale.items.length > 0) {
      const orderItems = sale.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id && !item.product.id.startsWith("PROD-") ? item.product.id : null,
        product_title: item.product.title,
        quantity: item.quantity,
        price_at_purchase: item.product.publicPrice,
        cost_at_purchase: item.product.totalCostMxn,
      }));

      await supabase.from("order_items").insert(orderItems);
    }

    // 3. Si el cliente proporcionó teléfono, acumular sus puntos de Club FoxDrop
    if (sale.clientPhone && sale.clientPhone.trim() !== "" && sale.clientPhone !== "Mostrador") {
      try {
        const cleanPhone = sale.clientPhone.trim();
        const pointsEarned = Math.floor(sale.total / 10);

        // Buscar si existe un perfil con este teléfono
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, loyalty_points")
          .eq("phone", cleanPhone)
          .single();

        if (existingProfile) {
          const currentPoints = existingProfile.loyalty_points || 0;
          await supabase
            .from("profiles")
            .update({
              loyalty_points: currentPoints + pointsEarned,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingProfile.id);
        }
      } catch (profErr) {
        console.warn("Nota: puntos calculados para unificación posterior del cliente:", profErr);
      }
    }

    return {
      orderNumber,
      date: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Venta física procesada en contingencia local:", err);
    return {
      orderNumber,
      date: new Date().toISOString(),
    };
  }
}


/**
 * Obtener todos los pedidos para el panel de administración (sincronizado vía servidor)
 */
export async function getAdminOrders() {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_orders" }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }

    // Fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener pedidos de Supabase:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Fallo al consultar pedidos:", err);
    return [];
  }
}

export async function updateOrderStatusInDb(orderId: string, status: string, notes?: string) {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_order_status",
        orderId,
        status,
        notes,
      }),
    });

    if (res.ok) {
      return true;
    }
  } catch (apiErr) {
    console.warn("Fallo llamando /api/admin para actualizar orden, intentando cliente directo:", apiErr);
  }

  // Fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const updatePayload: Record<string, any> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }
  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .or(`id.eq.${orderId},order_number.eq.${orderId}`);

  if (error) {
    await supabase.from("orders").update(updatePayload).eq("order_number", orderId);
  }
  return true;
}

export async function cancelOrderAsClient(orderId: string, reason: string) {
  try {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel_order",
        orderId,
        reason,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "No se pudo cancelar el pedido");
    }
    return json;
  } catch (apiErr: any) {
    console.warn("Fallo llamando /api/user/profile para cancelar, intentando /api/admin:", apiErr);
    // Fallback vía /api/admin
    return await updateOrderStatusInDb(orderId, "cancelled", `Cancelado por el cliente: ${reason}`);
  }
}

export async function deleteOrderInDb(orderId: string) {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_order",
        orderId,
      }),
    });

    if (res.ok) {
      return true;
    }
  } catch (apiErr) {
    console.warn("Fallo llamando /api/admin para eliminar orden, intentando directo:", apiErr);
  }

  // Fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  await supabase.from("order_items").delete().or(`order_id.eq.${orderId}`);
  await supabase.from("orders").delete().or(`id.eq.${orderId},order_number.eq.${orderId}`);
  return true;
}


/**
 * Registrar o actualizar un carrito para seguimiento (recuperación de carritos abandonados)
 */
export async function trackAbandonedCart(cartData: {
  clientName?: string;
  clientPhone: string;
  clientEmail?: string;
  items: { title: string; quantity: number; price: number; image?: string }[];
  total: number;
}) {
  if (!cartData.clientPhone && !cartData.clientEmail) return;
  if (!cartData.items || cartData.items.length === 0) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;

    // Buscar si ya existe un carrito previo para este teléfono o correo
    let query = supabase.from("abandoned_carts").select("id");
    if (cartData.clientPhone && cartData.clientEmail) {
      query = query.or(`client_phone.eq.${cartData.clientPhone},client_email.eq.${cartData.clientEmail}`);
    } else if (cartData.clientPhone) {
      query = query.eq("client_phone", cartData.clientPhone);
    } else if (cartData.clientEmail) {
      query = query.eq("client_email", cartData.clientEmail);
    }

    const { data: existing } = await query.limit(1);

    if (existing && existing.length > 0) {
      // Actualizar el carrito existente
      await supabase
        .from("abandoned_carts")
        .update({
          client_name: cartData.clientName || null,
          client_phone: cartData.clientPhone || null,
          client_email: cartData.clientEmail || null,
          items: cartData.items,
          total: cartData.total,
          last_active: new Date().toISOString(),
          followed_up: false,
        })
        .eq("id", existing[0].id);
    } else {
      // Insertar nuevo registro
      await supabase.from("abandoned_carts").insert([
        {
          client_name: cartData.clientName || null,
          client_phone: cartData.clientPhone || null,
          client_email: cartData.clientEmail || null,
          items: cartData.items,
          total: cartData.total,
          followed_up: false,
          last_active: new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn("No se pudo registrar carrito abandonado:", err);
  }
}

/**
 * Elimina o resuelve el carrito abandonado tras completar la orden con éxito
 */
export async function resolveAbandonedCart(clientPhone?: string, clientEmail?: string) {
  if (!clientPhone && !clientEmail) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    let query = supabase.from("abandoned_carts").delete();
    if (clientPhone && clientEmail) {
      query = query.or(`client_phone.eq.${clientPhone},client_email.eq.${clientEmail}`);
    } else if (clientPhone) {
      query = query.eq("client_phone", clientPhone);
    } else if (clientEmail) {
      query = query.eq("client_email", clientEmail);
    }
    await query;
  } catch (err) {
    console.warn("No se pudo resolver el carrito abandonado tras compra:", err);
  }
}

/**
 * Registrar una solicitud de encargo especial de cliente
 */
export async function submitSpecialOrder(data: {
  clientName?: string;
  clientPhone: string;
  clientEmail?: string;
  description: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase.from("special_orders").insert([
    {
      client_name: data.clientName || null,
      client_phone: data.clientPhone,
      client_email: data.clientEmail || null,
      description: data.description,
      status: "pending",
    },
  ]);

  if (error) {
    console.error("Error al registrar encargo especial:", error);
    throw error;
  }
}

/**
 * Obtener historial de pedidos de un cliente específico (con rastreo y detalle completo)
 */
export async function getClientOrderHistory(identifier: string, options?: { email?: string; userId?: string }) {
  try {
    // 1. Intentar primero a través de la API protegida del servidor
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_orders",
        userId: options?.userId,
        email: options?.email || (identifier.includes("@") ? identifier : undefined),
        phone: !identifier.includes("@") ? identifier : undefined,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.orders)) return json.orders;
    }
  } catch (apiErr) {
    console.warn("Fallo llamando /api/user/profile para órdenes, recurriendo a cliente directo:", apiErr);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (options?.userId) {
      query = query.or(`user_id.eq.${options.userId},client_email.eq.${identifier},client_phone.eq.${identifier}`);
    } else {
      query = query.or(`client_email.eq.${identifier},client_phone.eq.${identifier}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al obtener historial:", err);
    return [];
  }
}

/**
 * Obtener encargos especiales registrados para el CRM Admin (sincronizado vía servidor)
 */
export async function getSpecialOrders() {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_special_orders" }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }

    return [];
  } catch (err) {
    console.warn("Fallo al consultar encargos especiales:", err);
    return [];
  }
}

/**
 * Actualizar estado de encargo especial
 */
export async function updateSpecialOrderStatus(id: string, status: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { error } = await supabase
      .from("special_orders")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error actualizando status de encargo:", err);
    return false;
  }
}

/**
 * Suscripción en Tiempo Real para el Panel Administrador
 * Notifica cualquier INSERT, UPDATE o DELETE en la tabla 'orders'
 */
export function subscribeToAllOrders(
  callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const channelName = `admin-orders-realtime-${Date.now()}-${Math.random()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload: any) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Suscripción en Tiempo Real para el Cliente en Tienda Web
 * Escucha cambios en sus pedidos por userId o teléfono/email
 */
export function subscribeToClientOrders(
  userIdentifier: { userId?: string; phone?: string; email?: string },
  callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const channelName = `client-orders-realtime-${Date.now()}-${Math.random()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload: any) => {
        const orderData = payload.new || payload.old;
        if (!orderData) return;

        // Comprobar si la orden pertenece al cliente
        const matchesUser = userIdentifier.userId && orderData.user_id === userIdentifier.userId;
        const matchesPhone = userIdentifier.phone && orderData.client_phone === userIdentifier.phone;
        const matchesEmail = userIdentifier.email && orderData.client_email === userIdentifier.email;

        if (matchesUser || matchesPhone || matchesEmail) {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


