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
      .select("*")
      .gt("stock", 0)
      .limit(400);

    const physicalProducts = (Array.isArray(rawProducts) ? rawProducts : []).filter((p: any) => {
      if (p.is_active === false) return false;
      const skuUpper = String(p.sku || "").toUpperCase();
      return !skuUpper.startsWith("CJ") && !skuUpper.startsWith("JP-");
    });

    const catalogSummary = physicalProducts
      .slice(0, 140)
      .map((p: any) => `- ${p.title} | $${Number(p.public_price || 0)} | Stock:${p.stock}`)
      .join("\n");

    const historyText = Array.isArray(history) && history.length > 0
      ? history
          .slice(-10)
          .map((m: { role: string; text: string }) => `${m.role === "user" ? "Mario/Admin" : "Sofía"}: ${m.text}`)
          .join("\n")
      : "";

    const systemPrompt = `Eres Sofía, socia y asesora de confianza de FoxDrop México. Estás platicando en privado con Mario dentro del panel Admin.

CÓMO DEBES CONVERSAR:
- Sé 100% natural, fluida, cercana y humana, como una socia real platicando por chat en México.
- NO suenes a plantilla ni a bot corporativo, y NO fuerces el tema de paquetes o ventas si Mario solo te está saludando o hablando de otra cosa. Responde exactamente al tono y tema de lo que te diga.
- Pueden hablar de cualquier cosa: ideas del negocio, estrategia, clientes, metas, dudas del día a día, o armar paquetes/combos cuando él te lo pida.
- Tienes acceso en tiempo real al inventario físico de FoxDrop (listado abajo) por si en algún momento te pregunta por productos, precios, costos, márgenes o sugerencias; úsalo con precisión solo cuando haga falta y sin inventar datos.

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
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: 0 },
            },
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
