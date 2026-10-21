import { NextRequest, NextResponse } from "next/server";
import { searchCjProducts, getCjProductDetails } from "@/lib/cjdropshipping";
import { verifyAdminToken, checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`cj_api:${clientIp}`, 60, 60)) {
      return NextResponse.json({ error: "Límite de solicitudes de CJ excedido" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await req.json().catch(() => ({}));
    const resolvedToken = token || body.adminToken || null;

    if (!verifyAdminToken(resolvedToken).valid) {
      return NextResponse.json({ error: "No autorizado para consultar la API de CJ" }, { status: 401 });
    }

    const { action, query, page, size, pid } = body;

    if (action === "search_products") {
      const results = await searchCjProducts(query || "", Number(page) || 1, Number(size) || 20);
      return NextResponse.json({ success: true, ...results });
    }

    if (action === "get_product_detail") {
      if (!pid) {
        return NextResponse.json({ error: "pid requerido" }, { status: 400 });
      }
      const detail = await getCjProductDetails(pid);
      return NextResponse.json({ success: true, detail });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin/cj:", err);
    return NextResponse.json({ error: err.message || "Error al conectar con CJ Dropshipping" }, { status: 500 });
  }
}
