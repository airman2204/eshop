# 📖 Manual Técnico de Arquitectura y Referencia de Código: FoxDrop

Este documento describe la arquitectura interna, flujo de datos, convenciones y funciones clave del sistema **FoxDrop E-Shop, CRM & WhatsApp Bot Engine**.

---

## 1. Módulos y Flujos de Datos

### 1.1 Catálogo y Sincronización de Productos
- **Ubicación clave:** `src/lib/products.ts`, `src/app/api/admin/route.ts`
- **Consulta Pública (`/tienda`):**
  - La función `getActiveProducts(false)` invoca `/api/admin` con `includeInactive: false`.
  - La API aplica `eq('is_active', true)`, asegurando que los productos apagados nunca se transmitan a clientes.
- **Consulta Administrativa (`/admin`):**
  - Invoca `getActiveProducts(true)` para cargar todos los productos (activos y apagados).
  - Los productos apagados se muestran con indicador visual y opacidad reducida.
- **Prorrateo de Costos:**
  - `total_cost_mxn = base_cost_mxn + shipping_cost_allocated`.
  - `profit_unit = public_price - total_cost_mxn`.
  - En la interfaz administrativa se calculan los márgenes comerciales en vivo antes de guardar en base de datos.

### 1.2 Punto de Venta POS Móvil y Emisión Automática de Tickets
- **Ubicación clave:** `src/app/admin/page.tsx` (sección POS), `src/lib/orders.ts` y `src/lib/orderNotifications.ts`.
- **Flujo de Venta Física con Disparo Automático:**
  1. El operador agrega productos escaneando con la cámara trasera o seleccionando en la grilla táctil.
  2. Al pulsar **"Cobrar y Generar Ticket"**:
     - Se descuenta el stock de Supabase de manera inmediata.
     - Se genera una orden con canal físico y estado `delivered`.
     - Se renderiza el componente del ticket térmico virtual (`ticketReceiptRef`).
     - Se utiliza `html-to-image` (`toPng`) en 2x (alta nitidez) para convertir el ticket en imagen PNG oficial.
     - **Envío 100% Automático por WhatsApp:** Se invoca `/api/whatsapp` (`status_update`), enviando la imagen del ticket, el mensaje oficial de agradecimiento y el Sticker ilustrado oficial de FoxDrop al cliente.
     - Queda registrado en tiempo real en la pestaña de WhatsApp del CRM.

### 1.3 Motor de Notificaciones Automáticas por Etapas (`src/lib/orderNotifications.ts`)
Diseñado para atender los 3 canales de venta de FoxDrop sin intervención manual:
- **Flujo A: Compra Presencial (POS / Mostrador):**
  - Al completar la venta, envía ticket digital con folio de venta, desglose, total liquidado, acumulación de estrellas del Club FoxDrop y el Sticker `¡Gracias por tu compra!`.
- **Flujo B: Compra en Línea con Contra-Entrega (Puebla):**
  - **`pending`**: Bienvenida y confirmación de punto/horario de entrega.
  - **`processing`**: Aviso de empaquetado + Sticker `¡Caja FoxDrop lista!`.
  - **`shipped`**: Aviso de repartidor en ruta al punto acordado + Sticker `¡Tu pedido va en camino!`.
  - **`delivered`**: Confirmación de entrega, liquidación y estrellas + Sticker `¡Gracias por tu compra!`.
- **Flujo C: Compra en Línea con Envío Nacional (Paquetería):**
  - **`processing`**: Notificación de pago acreditado + Sticker `¡Pago recibido!`.
  - **`shipped`**: Notificación de despacho con paquetería y número de guía + Sticker `¡Pedido enviado!`.
  - **`delivered`**: Confirmación de entrega por paquetería + Sticker `¡Gracias por tu compra!`.

### 1.4 Agente Híbrido de WhatsApp & Copiloto (`src/lib/whatsappAgent.ts`)
- **Arquitectura Híbrida:**
  - Cada chat en `AdminWhatsAppTab.tsx` cuenta con el interruptor **`[ 🤖 Agente Activo / 👤 Modo Manual ]`**.
  - Si el Agente está activo, responde automáticamente 24/7 consultas sobre compras, rastreo de pedidos en vivo con su folio, precios del catálogo y dudas generales.
  - Si Mario o Nydia intervienen manualmente enviando un mensaje, el Agente **se pausa automáticamente en esa conversación** para permitir atención personalizada.
- **Copiloto en 1 Clic (Sugerencias Rápidas):**
  - Barra de 3 sugerencias inteligentes generadas por Gemini justo encima del cuadro de texto. Al hacer clic, el texto se escribe listo para enviar.

### 1.5 Arquitectura de Seguridad del Administrador
- **Whitelist de Acceso:** Restringido a correos autorizados en `src/lib/adminAuth.ts`.
- **Cifrado de Credenciales:**
  - Las contraseñas administrativas se procesan y almacenan con **hash criptográfico SHA-256**.
  - Se eliminó el almacenamiento inseguro de contraseñas en texto plano en `localStorage`.
- **Aislamiento de Privilegios:**
### 1.6 Seguridad y Experiencia del Portal del Cliente (`/tienda?tab=cuenta` y `/perfil`)
- **Visualización Integrada de Tickets POS:**
  - Los clientes pueden consultar su historial de pedidos tanto online como de mostrador físico.
  - Si el pedido cuenta con comprobante de compra (`Ticket: https://...`), el portal muestra la vista previa del ticket oficial con opción de descarga y apertura directa.
- **Cumplimiento Estricto de Seguridad PCI-DSS:**
  - En la gestión de métodos de pago guardados (`/api/user/profile` acción `save_card`), el backend sanitiza los objetos entrantes eliminando de raíz CVVs y números de tarjeta completos. Solo se guardan los últimos 4 dígitos (`last4`), marca y vigencia.
- **Cancelación Segura con Notificación en Tiempo Real:**
  - Los clientes pueden cancelar pedidos en estado `pending` o `processing`.
  - La cancelación actualiza el inventario y dispara de inmediato un WhatsApp oficial al cliente confirmando la cancelación sin requerir intervención manual.

---

## 2. Convenciones de Código y Estado

1. **Gestión de Fechas y Moneda:**
   - Precios siempre formateados con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
   - Fechas locales usando `toLocaleDateString('es-MX')` y zonas horarias controladas.
2. **Optimistic Updates:**
   - Tanto el cambio de stock rápido (+1 / -1) como el encendido/apagado aplican cambios inmediatos en el estado local de React antes de completar la promesa HTTP hacia Supabase.
3. **Control de Errores y Resiliencia:**
   - Sincronización continua de estados en WhatsApp (1 palomita = enviado, 2 palomitas grises = entregado, 2 palomitas azules = leído).

---

## 3. Comandos Útiles

```bash
# Validar tipado y compilación
npm run build

# Analizar archivos modificados en Git
git status

# Ejecutar servidor de desarrollo local
npm run dev
```
