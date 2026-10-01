import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cp = searchParams.get("cp")?.trim();

    if (!cp || cp.length !== 5 || !/^\d{5}$/.test(cp)) {
      return NextResponse.json(
        { error: "Código postal inválido. Debe tener exactamente 5 dígitos numéricos." },
        { status: 400 }
      );
    }

    // Consulta a la base de datos abierta oficial de códigos postales de México (Zippopotam / Correos de México)
    const res = await fetch(`https://zippopotam.us/mx/${cp}`, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 86400 }, // Cache por 24 horas
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { found: false, message: "Código postal no encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Error consultando el servicio postal" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const places = data.places || [];

    if (places.length === 0) {
      return NextResponse.json({ found: false, message: "Sin colonias registradas" }, { status: 404 });
    }

    // Obtener Estado y Municipio/Ciudad
    const state = places[0]?.state || "";
    // Eliminar duplicados de nombres de colonias
    const colonias: string[] = Array.from(
      new Set(places.map((p: any) => p["place name"]?.trim()).filter(Boolean))
    );

    return NextResponse.json({
      found: true,
      cp,
      state,
      city: state, // En zippopotam us MX se mapea estado/región
      colonias,
    });
  } catch (error: any) {
    console.error("Error en API de código postal:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
