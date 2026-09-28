import { NextRequest, NextResponse } from "next/server";
import { notifyOrderConfirmed, notifyOrderStatusUpdate, notifyAbandonedCartRecovery } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderNumber, clientName, clientPhone, total, newStatus, discountCode } = body;

    if (!clientPhone) {
      return NextResponse.json({ error: "Número de teléfono requerido" }, { status: 400 });
    }

    let result;
    if (action === "order_confirmed") {
      result = await notifyOrderConfirmed(orderNumber, clientName || "Cliente", clientPhone, total || 0);
    } else if (action === "status_update") {
      result = await notifyOrderStatusUpdate(orderNumber, clientName || "Cliente", clientPhone, newStatus);
    } else if (action === "cart_recovery") {
      result = await notifyAbandonedCartRecovery(clientName || "Cliente", clientPhone, discountCode);
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en endpoint /api/whatsapp:", error);
    return NextResponse.json({ error: "Error procesando solicitud" }, { status: 500 });
  }
}
