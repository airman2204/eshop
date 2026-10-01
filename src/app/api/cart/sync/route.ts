import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const isValidUuid = (str?: string | null): boolean => {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, userId, clientName, clientPhone, clientEmail, items, total } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // 1. Si el carrito está vacío o se vació
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (isValidUuid(cartId)) {
        await supabase.from("abandoned_carts").delete().eq("id", cartId);
      }
      return NextResponse.json({ success: true, cartId: null, message: "Carrito vaciado" });
    }

    // 2. Preparar datos limpios para persistencia
    const cleanUserId = isValidUuid(userId) ? userId.trim() : null;
    const cleanName = (clientName && typeof clientName === "string" && clientName.trim().length > 0)
      ? clientName.trim()
      : "Cliente en Tienda Web";
    const cleanPhone = (clientPhone && typeof clientPhone === "string") ? clientPhone.trim() : "";
    const cleanEmail = (clientEmail && typeof clientEmail === "string") ? clientEmail.trim() : null;
    const cleanTotal = Number(total) || items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

    // 3. Si ya tenemos un cartId válido en el cliente
    if (isValidUuid(cartId)) {
      const { data: existing } = await supabase
        .from("abandoned_carts")
        .select("id")
        .eq("id", cartId)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabase
          .from("abandoned_carts")
          .update({
            user_id: cleanUserId,
            client_name: cleanName,
            client_phone: cleanPhone,
            client_email: cleanEmail,
            items,
            total: cleanTotal,
            last_active: new Date().toISOString(),
          })
          .eq("id", cartId);

        if (!updateErr) {
          return NextResponse.json({ success: true, cartId });
        }
      }
    }

    // 4. Si el cliente tiene teléfono o correo, verificar si ya tenía un carrito previo
    if (cleanPhone || cleanEmail) {
      let query = supabase.from("abandoned_carts").select("id");
      if (cleanPhone && cleanEmail) {
        query = query.or(`client_phone.eq.${cleanPhone},client_email.eq.${cleanEmail}`);
      } else if (cleanPhone) {
        query = query.eq("client_phone", cleanPhone);
      } else if (cleanEmail) {
        query = query.eq("client_email", cleanEmail);
      }

      const { data: matched } = await query.order("last_active", { ascending: false }).limit(1);
      if (matched && matched.length > 0) {
        const matchedId = matched[0].id;
        await supabase
          .from("abandoned_carts")
          .update({
            user_id: cleanUserId,
            client_name: cleanName,
            client_phone: cleanPhone,
            client_email: cleanEmail,
            items,
            total: cleanTotal,
            last_active: new Date().toISOString(),
          })
          .eq("id", matchedId);

        return NextResponse.json({ success: true, cartId: matchedId });
      }
    }

    // 5. Crear nuevo registro en abandoned_carts
    const insertPayload: any = {
      user_id: cleanUserId,
      client_name: cleanName,
      client_phone: cleanPhone,
      client_email: cleanEmail,
      items,
      total: cleanTotal,
      followed_up: false,
      last_active: new Date().toISOString(),
    };

    if (isValidUuid(cartId)) {
      insertPayload.id = cartId;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("abandoned_carts")
      .insert([insertPayload])
      .select("id")
      .single();

    if (insertErr) {
      // Reintentar sin id forzado por si hubo colisión de clave
      delete insertPayload.id;
      const { data: retryData, error: retryErr } = await supabase
        .from("abandoned_carts")
        .insert([insertPayload])
        .select("id")
        .single();

      if (retryErr) {
        console.error("Error al persistir carrito abandonado:", retryErr);
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, cartId: retryData?.id });
    }

    return NextResponse.json({ success: true, cartId: inserted?.id });
  } catch (err: any) {
    console.error("Error en sincronización de carrito:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
