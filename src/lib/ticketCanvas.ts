import { FOX_LOGO_BASE64 } from '@/data/foxLogoBase64';

export interface TicketRenderData {
  orderNumber: string;
  items: Array<{
    product?: {
      title?: string;
      publicPrice?: number;
    };
    title?: string;
    price?: number;
    quantity: number;
  }>;
  total: number;
  paymentMethod: string;
  clientPhone?: string;
  clientName?: string;
  pointsEarned: number;
  date: string;
}

/**
 * Genera un ticket gráfico de alta resolución (2x Retina) utilizando HTML5 Canvas 2D.
 * Es 100% inmune a crasheos de memoria DOM (a diferencia de html-to-image/toPng)
 * y garantiza renderizado de fuentes perfecto sin tofu/cuadros '□'.
 */
export async function generateTicketCanvasDataUrl(ticket: TicketRenderData): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Canvas solo se puede ejecutar en el navegador');
  }

  return new Promise((resolve, reject) => {
    try {
      const scale = 2;
      const logicalWidth = 600;
      const items = ticket.items || [];
      const itemsHeight = Math.max(60, items.length * 38);
      const logicalHeight = 690 + itemsHeight;

      const canvas = document.createElement('canvas');
      canvas.width = logicalWidth * scale;
      canvas.height = logicalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo obtener el contexto 2D del Canvas');
      }

      ctx.scale(scale, scale);

      // 1. Fondo suave
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // 2. Tarjeta principal blanca con bordes redondeados y sombra
      const cardX = 25;
      const cardY = 25;
      const cardWidth = logicalWidth - 50;
      const cardHeight = logicalHeight - 50;
      const cardRadius = 24;

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
      ctx.fill();
      ctx.restore();

      // Recorte para que el encabezado respete las esquinas superiores redondeadas
      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
      ctx.clip();

      // 3. Encabezado Verde Degradado FoxDrop
      const headerHeight = 140;
      const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + headerHeight);
      headerGrad.addColorStop(0, '#0F3E36');
      headerGrad.addColorStop(1, '#1A332C');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(cardX, cardY, cardWidth, headerHeight);

      // Franja naranja FoxDrop
      const orangeGrad = ctx.createLinearGradient(cardX, cardY + headerHeight - 4, cardX + cardWidth, cardY + headerHeight);
      orangeGrad.addColorStop(0, '#E65F2B');
      orangeGrad.addColorStop(1, '#FF8C42');
      ctx.fillStyle = orangeGrad;
      ctx.fillRect(cardX, cardY + headerHeight - 4, cardWidth, 4);

      // 4. Logo FoxDrop
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      const renderContent = () => {
        try {
          // Dibujar Logo
          ctx.drawImage(logoImg, cardX + 24, cardY + 28, 68, 68);

          // Títulos del Encabezado
          ctx.fillStyle = '#FFFFFF';
          ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('Foxdrop - Tu atajo al mundo', cardX + 105, cardY + 54);

          ctx.fillStyle = '#E6A76E';
          ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('PUEBLA • MÉXICO', cardX + 105, cardY + 74);

          ctx.fillStyle = '#94A3B8';
          ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('COMPROBANTE OFICIAL DE COMPRA', cardX + 105, cardY + 92);

          // 5. Metadatos de la Venta
          let currentY = cardY + headerHeight + 35;
          const leftX = cardX + 30;
          const rightX = cardX + cardWidth - 30;

          // Folio
          ctx.fillStyle = '#64748B';
          ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('FOLIO DE ORDEN', leftX, currentY);

          ctx.fillStyle = '#E65F2B';
          ctx.font = "900 17px 'Courier New', monospace";
          ctx.textAlign = 'right';
          ctx.fillText(ticket.orderNumber || 'FX-POS-0000', rightX, currentY);
          ctx.textAlign = 'left';

          // Fecha
          currentY += 28;
          ctx.fillStyle = '#64748B';
          ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('FECHA Y HORA', leftX, currentY);

          const formattedDate = ticket.date
            ? new Date(ticket.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
            : new Date().toLocaleString('es-MX');
          ctx.fillStyle = '#1E293B';
          ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'right';
          ctx.fillText(formattedDate, rightX, currentY);
          ctx.textAlign = 'left';

          // Cliente
          currentY += 28;
          ctx.fillStyle = '#64748B';
          ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('CLIENTE', leftX, currentY);

          ctx.fillStyle = '#1E293B';
          ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'right';
          ctx.fillText((ticket.clientName || 'Cliente FoxDrop').slice(0, 30), rightX, currentY);
          ctx.textAlign = 'left';

          // Teléfono
          currentY += 28;
          ctx.fillStyle = '#64748B';
          ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('TELÉFONO REGISTRADO', leftX, currentY);

          ctx.fillStyle = '#0284C7';
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.textAlign = 'right';
          ctx.fillText(ticket.clientPhone || 'Mostrador', rightX, currentY);
          ctx.textAlign = 'left';

          // 6. Línea divisoria picada (dashed)
          currentY += 22;
          ctx.save();
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(leftX, currentY);
          ctx.lineTo(rightX, currentY);
          ctx.stroke();
          ctx.restore();

          // 7. Encabezado de Artículos
          currentY += 24;
          ctx.fillStyle = '#94A3B8';
          ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('PRODUCTO(S)', leftX, currentY);
          ctx.textAlign = 'right';
          ctx.fillText('SUBTOTAL', rightX, currentY);
          ctx.textAlign = 'left';

          // 8. Lista de Artículos
          currentY += 10;
          items.forEach((item) => {
            currentY += 30;
            const qty = item.quantity || 1;
            const rawTitle = item.product?.title || item.title || 'Artículo';
            const displayTitle = rawTitle.length > 34 ? `${rawTitle.slice(0, 32)}...` : rawTitle;
            const price = (Number(item.product?.publicPrice || item.price || 0) * qty).toFixed(2);

            ctx.fillStyle = '#1E293B';
            ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillText(`${qty}x ${displayTitle}`, leftX, currentY);

            ctx.fillStyle = '#0F172A';
            ctx.font = "bold 14px 'Courier New', monospace";
            ctx.textAlign = 'right';
            ctx.fillText(`$${price}`, rightX, currentY);
            ctx.textAlign = 'left';
          });

          // 9. Línea divisoria sólida
          currentY += 25;
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(leftX, currentY);
          ctx.lineTo(rightX, currentY);
          ctx.stroke();

          // 10. Método de Pago
          currentY += 30;
          const methodMap: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta Débito/Crédito',
            spei: 'Transferencia SPEI',
          };
          const methodLabel = methodMap[ticket.paymentMethod] || ticket.paymentMethod || 'Efectivo';

          ctx.fillStyle = '#64748B';
          ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('MÉTODO DE PAGO', leftX, currentY);

          ctx.fillStyle = '#1E293B';
          ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'right';
          ctx.fillText(methodLabel, rightX, currentY);
          ctx.textAlign = 'left';

          // 11. TOTAL PAGADO
          currentY += 36;
          ctx.fillStyle = '#0F172A';
          ctx.font = "900 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('TOTAL PAGADO', leftX, currentY);

          ctx.fillStyle = '#0F3E36';
          ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'right';
          ctx.fillText(`$${Number(ticket.total || 0).toFixed(2)} MXN`, rightX, currentY);
          ctx.textAlign = 'left';

          // 12. Caja de Puntos Club FoxDrop
          currentY += 22;
          const boxY = currentY;
          const boxHeight = 52;
          const boxWidth = rightX - leftX;

          ctx.fillStyle = '#FFF7ED';
          ctx.strokeStyle = '#FDBA74';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, leftX, boxY, boxWidth, boxHeight, 14);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#9A3412';
          ctx.font = "900 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('⭐ CLUB FOXDROP:', leftX + 18, boxY + 32);

          ctx.fillStyle = '#EA580C';
          ctx.font = "900 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'right';
          ctx.fillText(`+${ticket.pointsEarned || 0} Puntos Ganados`, rightX - 18, boxY + 32);
          ctx.textAlign = 'left';

          // 13. Dientes de Sierra decorativos (borde picado de ticket)
          currentY = cardY + cardHeight - 48;
          ctx.fillStyle = '#F1F5F9';
          const toothWidth = 14;
          const toothHeight = 7;
          const teethCount = Math.floor(cardWidth / toothWidth);
          for (let i = 0; i < teethCount; i++) {
            const startX = cardX + (i * toothWidth);
            ctx.beginPath();
            ctx.moveTo(startX, currentY);
            ctx.lineTo(startX + (toothWidth / 2), currentY + toothHeight);
            ctx.lineTo(startX + toothWidth, currentY);
            ctx.closePath();
            ctx.fill();
          }

          // 14. Footer de cortesía
          ctx.fillStyle = '#64748B';
          ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText('Consulta tus puntos y catálogo completo en https://foxdrop.mx', logicalWidth / 2, cardY + cardHeight - 26);

          ctx.fillStyle = '#94A3B8';
          ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText('¡GRACIAS POR TU COMPRA EN FOXDROP PUEBLA! 🦊', logicalWidth / 2, cardY + cardHeight - 12);

          ctx.restore();

          // 15. Exportar Data URL PNG
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      logoImg.onload = () => renderContent();
      logoImg.onerror = () => renderContent(); // Fallback si la imagen no cargara
      logoImg.src = FOX_LOGO_BASE64;
    } catch (err) {
      reject(err);
    }
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
