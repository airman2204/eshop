const sharp = require('sharp');
const fs = require('fs');

async function testTicketRender() {
  const width = 600;
  const items = [
    { qty: 1, title: 'Glade Aromatizante Auto / Hogar', price: 230 }
  ];
  const orderNumber = 'FX-POS-3443';
  const dateStr = '02/10/2026 11:07 AM';
  const clientName = 'Mario González';
  const clientPhone = '2221817807';
  const total = 230.00;
  const points = 230;
  const paymentMethod = 'Efectivo';

  const rowsSvg = items.map((it, idx) => `
    <g transform="translate(0, ${idx * 40})">
      <text x="50" y="20" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1e293b">${it.qty}x ${it.title.slice(0, 32)}</text>
      <text x="550" y="20" font-family="'Courier New', monospace" font-size="16" font-weight="900" fill="#0f172a" text-anchor="end">$${(it.price * it.qty).toFixed(2)}</text>
    </g>
  `).join('');

  const svg = `
  <svg width="${width}" height="760" viewBox="0 0 ${width} 760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F3E36"/>
        <stop offset="100%" stop-color="#1F2D3D"/>
      </linearGradient>
      <linearGradient id="orangeGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#E65F2B"/>
        <stop offset="100%" stop-color="#FF8C42"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.1"/>
      </filter>
    </defs>

    <!-- Fondo general -->
    <rect width="${width}" height="760" rx="32" fill="#F1F5F9"/>
    
    <!-- Encabezado con degradado FoxDrop -->
    <path d="M 0 32 Q 0 0 32 0 L ${width - 32} 0 Q ${width} 0 ${width} 32 L ${width} 150 L 0 150 Z" fill="url(#headerGrad)"/>
    <rect x="0" y="146" width="${width}" height="5" fill="url(#orangeGrad)"/>

    <!-- Títulos del encabezado -->
    <text x="340" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="950" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">FOXDROP</text>
    <text x="340" y="92" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#E6A76E" text-anchor="middle" letter-spacing="3">TU ATAJO AL MUNDO • PUEBLA</text>
    <text x="340" y="122" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94A3B8" text-anchor="middle">COMPROBANTE OFICIAL DE COMPRA</text>

    <!-- Tarjeta central de ticket -->
    <rect x="25" y="170" width="550" height="560" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)"/>

    <!-- Metadatos de la venta -->
    <text x="50" y="212" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">FOLIO DE ORDEN</text>
    <text x="550" y="212" font-family="'Courier New', monospace" font-size="18" font-weight="900" fill="#E65F2B" text-anchor="end">${orderNumber}</text>

    <text x="50" y="242" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">FECHA Y HORA</text>
    <text x="550" y="242" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#1E293B" text-anchor="end">${dateStr}</text>

    <text x="50" y="272" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">CLIENTE</text>
    <text x="550" y="272" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1E293B" text-anchor="end">${clientName}</text>

    <text x="50" y="302" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">TELÉFONO REGISTRADO</text>
    <text x="550" y="302" font-family="'Courier New', monospace" font-size="15" font-weight="800" fill="#0284C7" text-anchor="end">${clientPhone}</text>

    <!-- Línea divisoria picada tipo ticket -->
    <line x1="50" y1="326" x2="550" y2="326" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,6"/>

    <!-- Encabezado de artículos -->
    <text x="50" y="354" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#94A3B8" letter-spacing="1">PRODUCTO(S)</text>
    <text x="550" y="354" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#94A3B8" text-anchor="end" letter-spacing="1">SUBTOTAL</text>

    <!-- Lista de artículos -->
    <g transform="translate(0, 360)">
      ${rowsSvg}
    </g>

    <!-- Línea divisoria sólida -->
    <line x1="50" y1="465" x2="550" y2="465" stroke="#E2E8F0" stroke-width="2"/>

    <!-- Método de pago y Total -->
    <text x="50" y="500" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#64748B">MÉTODO DE PAGO</text>
    <text x="550" y="500" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1E293B" text-anchor="end">${paymentMethod}</text>

    <text x="50" y="545" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#0F172A">TOTAL PAGADO</text>
    <text x="550" y="545" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="950" fill="#0F3E36" text-anchor="end">$${total.toFixed(2)} MXN</text>

    <!-- Caja de Puntos Club FoxDrop -->
    <rect x="50" y="575" width="500" height="62" rx="16" fill="#FFF7ED" stroke="#FDBA74" stroke-width="1.5"/>
    <text x="75" y="613" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#9A3412">⭐ CLUB FOXDROP:</text>
    <text x="525" y="613" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="950" fill="#EA580C" text-anchor="end">+${points} Puntos Ganados</text>

    <!-- Footer de garantía y web -->
    <text x="${width / 2}" y="675" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748B" text-anchor="middle">Consulta tus puntos y catálogo completo en https://foxdrop.mx</text>
    <text x="${width / 2}" y="698" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94A3B8" text-anchor="middle">¡GRACIAS POR TU COMPRA EN FOXDROP PUEBLA! 🦊</text>
  </svg>
  `;

  const headBuf = await sharp('public/fox-logo-head-3d.png')
    .resize(90, 90, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp(Buffer.from(svg))
    .composite([
      { input: headBuf, top: 30, left: 45 }
    ])
    .png()
    .toFile('public/test_ticket.png');

  console.log('Ticket PNG generated successfully!');
}

testTicketRender().catch(console.error);
