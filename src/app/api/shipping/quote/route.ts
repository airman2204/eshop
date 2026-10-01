import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { zipTo, weight = 1, dimensions } = await req.json();

    if (!zipTo) {
      return NextResponse.json({ error: "Código postal de destino requerido" }, { status: 400 });
    }

    const apiKey = process.env.SKYDROPX_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API Key de Skydropx no configurada",
        rates: [],
      });
    }

    // Origen FoxDrop: Puebla (C.P. 72000)
    const quotePayload = {
      zip_from: "72000",
      zip_to: zipTo.toString().trim(),
      parcel: {
        weight: Number(weight) || 1,
        distance_unit: "CM",
        mass_unit: "KG",
        height: dimensions?.height || 10,
        width: dimensions?.width || 15,
        length: dimensions?.length || 20,
      },
    };

    try {
      const response = await fetch("https://api.skydropx.com/v1/quotations", {
        method: "POST",
        headers: {
          "Authorization": `Token token=${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quotePayload),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ success: true, rates: data });
      }
    } catch (e) {
      console.warn("Skydropx API error:", e);
    }

    // Tarifa base nacional garantizada
    return NextResponse.json({
      success: true,
      rates: [
        {
          carrier: "Envío Nacional Estándar (FedEx/Estafeta/DHL)",
          service: "Terrestre 3-5 días hábiles",
          price: 140,
          currency: "MXN",
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cotizar envío" }, { status: 500 });
  }
}
