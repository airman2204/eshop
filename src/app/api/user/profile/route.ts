import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, email, profileData, address, addressId, card, cardId } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    if (!userId && !email) {
      return NextResponse.json({ error: "Identificador de usuario requerido" }, { status: 400 });
    }

    // 1. OBTENER PERFIL COMPLETO (DATOS + DIRECCIONES + TARJETAS + PUNTOS)
    if (action === "get_profile") {
      let authUser = null;
      if (userId) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        authUser = data?.user;
      }
      if (!authUser && email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        authUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      }

      // Buscar en tabla profiles
      let dbProfile = null;
      if (authUser?.id || userId) {
        const targetId = authUser?.id || userId;
        const { data } = await supabase.from("profiles").select("*").eq("id", targetId).maybeSingle();
        dbProfile = data;
      } else if (email) {
        const { data } = await supabase.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
        dbProfile = data;
      }

      const meta = authUser?.user_metadata || {};
      const fullName = dbProfile?.full_name || meta.full_name || "";
      const phone = dbProfile?.phone || meta.phone || "";
      const loyaltyPoints = dbProfile?.loyalty_points ?? 0;
      const addresses = meta.addresses || [];
      const cards = meta.cards || [];

      return NextResponse.json({
        id: authUser?.id || dbProfile?.id || userId,
        email: authUser?.email || dbProfile?.email || email,
        fullName,
        phone,
        role: dbProfile?.role || "client",
        loyaltyPoints,
        addresses,
        cards,
        createdAt: authUser?.created_at || dbProfile?.created_at || null,
      });
    }

    // 2. ACTUALIZAR DATOS PERSONALES (NOMBRE Y TELÉFONO)
    if (action === "update_profile") {
      const { fullName, phone } = profileData || {};

      let targetId = userId;
      if (!targetId && email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const found = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        targetId = found?.id;
      }

      if (targetId) {
        // Actualizar user_metadata
        await supabase.auth.admin.updateUserById(targetId, {
          user_metadata: {
            full_name: fullName,
            phone: phone,
          },
        });

        // Actualizar tabla profiles
        await supabase.from("profiles").upsert({
          id: targetId,
          email: email || undefined,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ success: true });
    }

    // 3. GUARDAR / EDITAR DIRECCIÓN
    if (action === "save_address") {
      let targetUser = null;
      if (userId) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        targetUser = data?.user;
      } else if (email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        targetUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      }

      if (!targetUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      const existingAddresses = targetUser.user_metadata?.addresses || [];
      let updatedAddresses = [...existingAddresses];

      if (address.isDefault) {
        updatedAddresses = updatedAddresses.map((a: any) => ({ ...a, isDefault: false }));
      }

      const existingIndex = updatedAddresses.findIndex((a: any) => a.id === address.id);
      if (existingIndex >= 0) {
        updatedAddresses[existingIndex] = { ...updatedAddresses[existingIndex], ...address };
      } else {
        const newAddress = {
          ...address,
          id: address.id || `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          isDefault: updatedAddresses.length === 0 ? true : Boolean(address.isDefault),
        };
        updatedAddresses.push(newAddress);
      }

      await supabase.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...targetUser.user_metadata,
          addresses: updatedAddresses,
        },
      });

      return NextResponse.json({ success: true, addresses: updatedAddresses });
    }

    // 4. ELIMINAR DIRECCIÓN
    if (action === "delete_address") {
      let targetUser = null;
      if (userId) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        targetUser = data?.user;
      } else if (email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        targetUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      }

      if (!targetUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      const existingAddresses = targetUser.user_metadata?.addresses || [];
      let filtered = existingAddresses.filter((a: any) => a.id !== addressId);

      // Si eliminó la predeterminada y quedan otras, marcar la primera como default
      if (filtered.length > 0 && !filtered.some((a: any) => a.isDefault)) {
        filtered[0].isDefault = true;
      }

      await supabase.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...targetUser.user_metadata,
          addresses: filtered,
        },
      });

      return NextResponse.json({ success: true, addresses: filtered });
    }

    // 5. GUARDAR / EDITAR TARJETA
    if (action === "save_card") {
      let targetUser = null;
      if (userId) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        targetUser = data?.user;
      } else if (email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        targetUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      }

      if (!targetUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      const existingCards = targetUser.user_metadata?.cards || [];
      let updatedCards = [...existingCards];

      if (card.isDefault) {
        updatedCards = updatedCards.map((c: any) => ({ ...c, isDefault: false }));
      }

      const existingIndex = updatedCards.findIndex((c: any) => c.id === card.id);
      if (existingIndex >= 0) {
        updatedCards[existingIndex] = { ...updatedCards[existingIndex], ...card };
      } else {
        const newCard = {
          ...card,
          id: card.id || `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          isDefault: updatedCards.length === 0 ? true : Boolean(card.isDefault),
        };
        updatedCards.push(newCard);
      }

      await supabase.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...targetUser.user_metadata,
          cards: updatedCards,
        },
      });

      return NextResponse.json({ success: true, cards: updatedCards });
    }

    // 6. ELIMINAR TARJETA
    if (action === "delete_card") {
      let targetUser = null;
      if (userId) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        targetUser = data?.user;
      } else if (email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        targetUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      }

      if (!targetUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      const existingCards = targetUser.user_metadata?.cards || [];
      let filtered = existingCards.filter((c: any) => c.id !== cardId);

      if (filtered.length > 0 && !filtered.some((c: any) => c.isDefault)) {
        filtered[0].isDefault = true;
      }

      await supabase.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...targetUser.user_metadata,
          cards: filtered,
        },
      });

      return NextResponse.json({ success: true, cards: filtered });
    }

    // 7. OBTENER HISTORIAL DE PEDIDOS CON RASTREO
    if (action === "get_orders") {
      const orClauses: string[] = [];
      if (userId) orClauses.push(`user_id.eq.${userId}`);
      if (email) orClauses.push(`client_email.ilike.${email.trim().toLowerCase()}`);
      if (body.phone) {
        const rawPhone = String(body.phone).trim();
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        orClauses.push(`client_phone.eq.${rawPhone}`);
        if (cleanPhone && cleanPhone !== rawPhone) {
          orClauses.push(`client_phone.eq.${cleanPhone}`);
        }
      }

      // Si tenemos userId pero no teléfono en body, buscar el teléfono del perfil para incluir compras en mostrador
      if (userId && (!body.phone || !email)) {
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("phone, email")
            .eq("id", userId)
            .maybeSingle();

          if (userProfile?.phone && !body.phone) {
            const rawPhone = userProfile.phone.trim();
            const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
            orClauses.push(`client_phone.eq.${rawPhone}`);
            if (cleanPhone && cleanPhone !== rawPhone) {
              orClauses.push(`client_phone.eq.${cleanPhone}`);
            }
          }
          if (userProfile?.email && !email) {
            orClauses.push(`client_email.ilike.${userProfile.email.trim().toLowerCase()}`);
          }
        } catch (findProfErr) {
          console.warn("Aviso al consultar perfil para historial:", findProfErr);
        }
      }

      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data: orders, error: ordErr } = await query;
      if (ordErr) {
        console.error("Error fetching orders:", ordErr);
        return NextResponse.json({ error: ordErr.message }, { status: 500 });
      }

      return NextResponse.json({ orders: orders || [] });
    }

    // 8. CANCELAR PEDIDO POR PARTE DEL CLIENTE (FLUJO AMAZON / MERCADO LIBRE)
    if (action === "cancel_order") {
      const { orderId, reason } = body;
      if (!orderId) {
        return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
      }

      const cancelReason = reason && typeof reason === "string" && reason.trim().length > 0 
        ? reason.trim() 
        : "Cancelado por el cliente";

      // 1. Verificar el estado actual de la orden para garantizar que no esté ya enviada o entregada
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let fetchQuery = supabase.from("orders").select("id, order_number, status, total, client_phone, client_name");
      if (isUuid) {
        fetchQuery = fetchQuery.eq("id", orderId);
      } else {
        fetchQuery = fetchQuery.eq("order_number", orderId);
      }

      const { data: orderData, error: fetchErr } = await fetchQuery.maybeSingle();

      if (fetchErr || !orderData) {
        return NextResponse.json({ error: "No se encontró el pedido solicitado" }, { status: 404 });
      }

      if (orderData.status === "shipped" || orderData.status === "delivered") {
        return NextResponse.json({ 
          error: "El pedido ya está en camino o fue entregado. Para devoluciones, por favor contacta a soporte por WhatsApp." 
        }, { status: 400 });
      }

      if (orderData.status === "cancelled") {
        return NextResponse.json({ success: true, message: "El pedido ya se encontraba cancelado." });
      }

      // 2. Proceder con la cancelación
      const updatePayload = {
        status: "cancelled",
        notes: `Cancelado por el cliente: ${cancelReason}`,
        updated_at: new Date().toISOString()
      };

      const { data: updated, error: updateErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderData.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Error al cancelar orden:", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Pedido cancelado con éxito", 
        order: updated 
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/user/profile:", err);
    return NextResponse.json({ error: err?.message || "Error interno del servidor" }, { status: 500 });
  }
}
