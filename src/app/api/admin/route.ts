import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, email, password } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    if (action === "update_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Guardamos la contraseña en la columna admin_password_hash del perfil en Supabase
      // Si el perfil no existe, lo insertamos
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            admin_password_hash: password,
            role: "admin",
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq("email", normalizedEmail);

        if (updateErr) {
          // Si la columna admin_password_hash no existe en la tabla profiles, no rompemos
          console.warn("Error al actualizar admin_password_hash en profiles:", updateErr);
        }
      }

      return NextResponse.json({ success: true, email: normalizedEmail });
    }

    if (action === "verify_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("admin_password_hash, must_change_password")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profile && profile.admin_password_hash) {
        if (profile.admin_password_hash === password) {
          return NextResponse.json({
            valid: true,
            mustChangePassword: profile.must_change_password ?? false,
          });
        }
        return NextResponse.json({ valid: false });
      }

      return NextResponse.json({ valid: null }); // No custom password found in DB yet
    }

    if (action === "delete_product") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "delete_all_mock_products") {
      const { error } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Todos los productos eliminados de la base de datos." });
    }

    if (action === "delete_slide") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_slide") {
      const { slide } = body;
      const { data, error } = await supabase.from("carousel_slides").insert([slide]).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "get_slides") {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: true, data: data || [] });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
