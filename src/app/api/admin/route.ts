import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, table } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    if (action === "delete_product") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "delete_all_mock_products") {
      // Elimina todos los productos precargados por seed
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
        // Si la tabla no existe aún en supabase, retornamos []
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
