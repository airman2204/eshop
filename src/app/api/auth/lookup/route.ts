import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // 1. Buscar primero en profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, loyalty_points")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profile) {
      return NextResponse.json({
        exists: true,
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        role: profile.role || "client",
      });
    }

    // 2. Si no está en profiles, verificar si existe en Supabase Auth
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );

      if (existingUser) {
        return NextResponse.json({
          exists: true,
          fullName: existingUser.user_metadata?.full_name || "",
          phone: existingUser.user_metadata?.phone || "",
          role: "client",
        });
      }
    } catch (authErr) {
      console.warn("Aviso verificando usuario en auth.admin:", authErr);
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (err: any) {
    console.error("Error en lookup de usuario:", err);
    return NextResponse.json(
      { error: err?.message || "Error al verificar usuario" },
      { status: 500 }
    );
  }
}
