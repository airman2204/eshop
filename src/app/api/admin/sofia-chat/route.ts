import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { AUTHORIZED_ADMIN_EMAILS } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const headerEmail = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
    const isAllowed = Boolean(headerEmail && AUTHORIZED_ADMIN_EMAILS.includes(headerEmail));

    if (!isAllowed) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { message, history = [] } = await req.json();
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: rawProducts } = await (supabase as any)
      .from("products")
      .select("title, sku, category, brand, public_price, base_cost_mxn, shipping_cost_allocated, stock, is_active")
      .gt("stock", 0)
      .limit(400);

    const physicalProducts = (Array.isArray(rawProducts) ? rawProducts : []).filter((p: any) => {
      if (p.is_active === false) return false;
      const skuUpper = String(p.sku || "").toUpperCase();
      return !skuUpper.startsWith("CJ") && !skuUpper.startsWith("JP-");
    });

    const catalogSummary = physicalProducts
      .map((p: any) => {
        const cost = Number(p.base_cost_mxn || 0) + Number(p.shipping_cost_allocated || 0);
        return `- ${p.title} | SKU: ${p.sku || "S/N"} | Cat: ${p.category || "General"} | Precio: $${Number(p.public_price || 0)} MXN | Costo: $${cost.toFixed(0)} MXN | Stock: ${p.stock}`;
      })
      .join("\n");

    const historyText = Array.isArray(history) && history.length > 0
      ? history
          .slice(-10)
          .map((m: { role: string; text: string }) => `${m.role === "user" ? "Mario/Admin" : "Sofía"}: ${m.text}`)
          .join("\n")
      : "";

    const systemPrompt = `Eres Sofía, asesora comercial interna y experta en merchandising de FoxDrop México. Estás hablando directamente en privado con Mario (el dueño de FoxDrop) dentro del panel Admin.

TU OBJETIVO:
Ayudarle a diseñar paquetes/combos rentables, sugerir combinaciones de fragancias/productos que combinen bien, proponer precios de paquete atractivos cuidando el margen, y responder cualquier duda sobre el inventario real.

REGLAS:
1. Usa EXCLUSIVAMENTE los productos, precios, costos y stocks reales del inventario listado abajo. NUNCA inventes productos que no estén en la lista.
2. Cuando sugieras paquetes o combos, incluye: nombre atractivo del paquete, qué artículos exactos lleva (con su precio individual y stock), suma normal vs. precio sugerido de paquete y ganancia estimada.
3. Habla natural, directo y práctico como socia/asesora en México.

INVENTARIO FÍSICO EN STOCK (${physicalProducts.length} artículos):
${catalogSummary || "Sin inventario físico disponible."}`;

    const fullPrompt = `${systemPrompt}\n\n${historyText ? `HISTORIAL RECIENTE:\n${historyText}\n\n` : ""}PREGUNTA DE MARIO:\n${String(message).trim()}`;

    let reply = "";
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();

    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );
      const json = await res.json();
      reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }

    if (!reply && groqKey) {
      for (const groqModel of ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]) {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "user", content: fullPrompt }],
            temperature: 0.7,
            max_tokens: 1200,
          }),
        });
        const gJson = await gRes.json();
        reply = gJson?.choices?.[0]?.message?.content?.trim() || "";
        if (reply) break;
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: "No se pudo obtener respuesta de Sofía en este momento." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en chat con Sofía" },
      { status: 500 }
    );
  }
}
