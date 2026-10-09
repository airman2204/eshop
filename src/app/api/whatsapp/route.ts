import { NextRequest, NextResponse } from "next/server";
import { notifyAbandonedCartRecovery } from "@/lib/whatsapp";
import { dispatchOrderStatusNotification } from "@/lib/orderNotifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderNumber, clientName, clientPhone, total, newStatus, discountCode } = body;

    if (!clientPhone) {
      return NextResponse.json({ error: "Número de teléfono requerido" }, { status: 400 });
    }

    let result;
    if (action === "order_confirmed") {
      result = await dispatchOrderStatusNotification({
        orderId: orderNumber,
        clientName: clientName || "Cliente",
        clientPhone,
        newStatus: "pending",
        shippingType: body.shippingType || "puebla_local",
        pickupPoint: body.pickupPoint,
        total: total || 0,
        notes: body.notes,
      });
    } else if (action === "status_update") {
      result = await dispatchOrderStatusNotification({
        orderId: orderNumber,
        clientName: clientName || "Cliente",
        clientPhone,
        newStatus,
        shippingType: body.shippingType,
        pickupPoint: body.pickupPoint,
        total: total || 0,
        trackingNumber: body.trackingNumber,
        shippingCompany: body.shippingCompany,
        notes: body.notes,
        loyaltyStars: body.loyaltyStars,
      });
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
