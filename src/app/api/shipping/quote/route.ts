import { NextRequest, NextResponse } from "next/server";

// Cache en memoria para token OAuth de Skydropx PRO (evita pedir token en cada petición)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSkydropxToken(): Promise<string | null> {
  const clientId = process.env.SKYDROPX_CLIENT_ID || process.env.SKYDROPX_API_KEY || "rvrPR4GDQr69MJhNpNdOYHAzjHvjAJz5pBgEuU4V4pU";
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET || process.env.SKYDROPX_SECRET_KEY || "33c9G617T106HIIVXlZRON4imcR2JsBmLUQNejWYRRA";

  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  try {
    const res = await fetch("https://pro.skydropx.com/api/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cachedToken = data.access_token;
      tokenExpiresAt = now + (Number(data.expires_in) || 7200) * 1000;
      return cachedToken;
    } else {
      console.warn("Skydropx OAuth falló:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("Error conectando a Skydropx OAuth:", err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      zipTo,
      stateTo = "Ciudad de México",
      cityTo = "Ciudad de México",
      coloniaTo = "Centro",
      weight = 1,
      dimensions,
    } = await req.json();

    const cleanZip = String(zipTo || "").trim().slice(0, 5);

    if (!cleanZip || cleanZip.length !== 5) {
      return NextResponse.json({ error: "Código postal de 5 dígitos requerido" }, { status: 400 });
    }

    const token = await getSkydropxToken();

    if (token) {
      try {
        const quotePayload = {
          quotation: {
            address_from: {
              postal_code: "72760",
              area_level1: "Puebla",
              area_level2: "San Pedro Cholula",
              area_level3: "Centro",
              country_code: "MX",
            },
            address_to: {
              postal_code: cleanZip,
              area_level1: stateTo || "Ciudad de México",
              area_level2: cityTo || "Centro",
              area_level3: coloniaTo || "Centro",
              country_code: "MX",
            },
            parcels: [
              {
                weight: Math.max(0.5, Number(weight) || 1),
                distance_unit: "CM",
                mass_unit: "KG",
                height: dimensions?.height || 10,
                width: dimensions?.width || 15,
                length: dimensions?.length || 20,
              },
            ],
          },
        };

        const quoteRes = await fetch("https://pro.skydropx.com/api/v1/quotations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(quotePayload),
        });

        if (quoteRes.ok) {
          const qData = await quoteRes.json();
          const rawRates = qData.rates || [];

          // Filtrar y ordenar opciones válidas
          const validRates = rawRates
            .filter((r: any) => r.total && !isNaN(Number(r.total)))
            .map((r: any) => ({
              carrier: r.provider_display_name || r.provider_name?.toUpperCase() || "Paquetería Nacional",
              service: r.provider_service_name || "Servicio Estándar",
              price: Math.round(Number(r.total)),
              currency: r.currency_code || "MXN",
              days: r.days || 3,
              rateId: r.id,
            }))
            .sort((a: any, b: any) => a.price - b.price);

          if (validRates.length > 0) {
            return NextResponse.json({
              success: true,
              live: true,
              rates: validRates.slice(0, 4), // Top 4 mejores opciones económicas/rápidas
            });
          }
        }
      } catch (e) {
        console.warn("Aviso en cotización dinámica Skydropx:", e);
      }
    }

    // Tarifa plana garantizada de respaldo si la API tardara
    return NextResponse.json({
      success: true,
      live: false,
      rates: [
        {
          carrier: "Envío Nacional Estándar (FedEx / Paquetexpress / Estafeta)",
          service: "Terrestre Asegurado 3-5 días hábiles",
          price: 140,
          currency: "MXN",
          days: 4,
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cotizar envío" }, { status: 500 });
  }
}
