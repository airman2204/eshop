# 📖 Manual Técnico de Arquitectura y Referencia de Código: FoxDrop

Este documento describe la arquitectura interna, flujo de datos, convenciones y funciones clave del sistema **FoxDrop E-Shop, CRM, Punto de Venta (POS) & Motor de Seguridad**.

---

## 1. Módulos y Flujos de Datos

### 1.1 Catálogo, Margen Dinámico y Sistema de Promociones
- **Ubicación clave:** `src/lib/products.ts`, `src/types/index.ts`, `src/app/api/admin/route.ts`
- **Consulta Pública (`/tienda`):**
  - La función `getActiveProducts(false)` invoca `/api/admin` con `includeInactive: false`.
  - La API aplica `eq('is_active', true)`, asegurando que los productos apagados nunca se transmitan a clientes.
- **Consulta Administrativa (`/admin`):**
  - Invoca `getActiveProducts(true)` para cargar todos los productos (activos y apagados).
  - Los productos apagados se muestran con indicador visual y opacidad reducida.
- **Slider de Markup Dinámico & Utilidad en Pesos:**
  - Slider interactivo configurable de **100% a 190%** sobre el costo total con preview en vivo de ganancia neta en Pesos MXN.
- **Sistema de Promociones & Descuentos Inteligentes:**
  - Descuentos del 15%, 20%, 30% o porcentaje personalizado con **Piso de Utilidad Protegido al 50%**.
  - Si un descuento compromete el margen mínimo de rentabilidad, la interfaz alerta al administrador y ajusta el tope máximo seguro.
  - Activación individual o masiva por lote. En el storefront, los productos en oferta se etiquetan dinámicamente con precio anterior tachado, porcentaje de ahorro y badge de promoción.

### 1.2 Punto de Venta POS Móvil y Emisión Automática de Tickets
- **Ubicación clave:** `src/app/admin/page.tsx` (sección POS), `src/lib/orders.ts` y `src/lib/orderNotifications.ts`.
- **Flujo de Venta Física con Disparo Automático:**
  1. El operador agrega productos escaneando con la cámara trasera o seleccionando en la grilla táctil.
  2. Al pulsar **"Cobrar y Generar Ticket"**:
     - Se descuenta el stock de Supabase de manera inmediata (soportando componentes de combos).
     - Se genera una orden con canal físico y estado `delivered`.
     - **Persistencia de Multimedia:** Se guarda `product_image` en cada ítem de `order_items` para preservar la foto en el historial.
     - Se renderiza el componente del ticket térmico virtual (`ticketReceiptRef`).
     - Se utiliza `html-to-image` (`toPng`) en 2x (alta nitidez) para convertir el ticket en imagen PNG oficial.
     - **Envío 100% Automático por WhatsApp:** Se invoca `/api/whatsapp` (`status_update`), enviando la imagen del ticket, el desglose, total liquidado y las estrellas del Club FoxDrop al cliente.

### 1.3 Experiencia de Compra E-Commerce Avanzada (`/tienda`)
- **Compra Rápida en 1 Clic (1-Click Checkout):**
  - Acceso directo para comprar inmediatamente sin pasar por múltiples pasos del carrito si ya se tienen datos registrados.
- **Buscador Predictivo en Tiempo Real:**
  - Sugerencias automáticas con debounce conforme el usuario escribe, búsqueda por categoría, título o SKU.
- **Cotizador de Envío por Código Postal (CP):**
  - Integrado en el carrito y ficha de producto, cotiza flete local en Puebla vs envío nacional y calcula el tiempo de entrega estimado.
- **Cupones de Descuento & Club FoxDrop:**
  - Validación dinámica de cupones con tope de descuento y canje de puntos/estrellas acumuladas.
- **Fallback Visual Elegante (`no-image.svg`):**
  - Se sustituyó el ícono de cámara rota por un badge minimalista de paquete 3D de FoxDrop con acabado comercial para artículos sin imagen.

### 1.4 Portal del Cliente y Gestión de Pedidos (`/tienda?tab=cuenta`)
- **Tipado Fuerte (`OrderItem`):**
  - Contrato formal en `src/types/index.ts` con retrocompatibilidad para `price_at_sale` y `product_cost`.
- **Enriquecimiento en Lote (Batch Image Enrichment):**
  - `/api/user/profile` (acción `get_orders`) detecta ítems de pedidos antiguos que no guardaban foto y consulta el catálogo en lote en una sola petición indexada (`IN (...)`).
- **Botón Re-comprar:**
  - Permite agregar artículos de pedidos pasados directamente al carrito actual con 1 clic.
- **Cancelación Segura (Flujo Amazon / Mercado Libre):**
  - Cancelación directa para órdenes en estado `pending` o `processing`, reposición automática de stock y notificación automática por WhatsApp.
- **Cumplimiento Estricto PCI-DSS:**
  - Sanitización en el guardado de tarjetas (`/api/user/profile` acción `save_card`), almacenando únicamente los últimos 4 dígitos (`last4`), vigencia y marca.

### 1.5 Arquitectura de Seguridad & Hardening API
- **Protección de Endpoints Críticos:**
  - `/api/admin`, `/api/admin/agent`, `/api/whatsapp/send`: Validación mediante Bearer token y tokens criptográficos en encabezados.
- **Limitación de Tasa (Rate Limiting en Memoria):**
  - Implementado en `src/lib/security.ts` con ventanas deslizantes de peticiones para prevenir abusos y ataques de fuerza bruta en autenticación, consultas de perfiles y generación TTS.
- **Validación de Webhooks:**
  - Verificación de tokens de firma y origen para peticiones entrantes de pasarelas de pago y proveedores de mensajería.
- **Whitelist y Cifrado:**
  - Cuentas administrativas validadas contra lista blanca y contraseñas hasheadas con SHA-256 (sin almacenamiento en texto plano).

---

## 2. Convenciones de Código y Estado

1. **Tipado Estricto con TypeScript:**
   - Cero uso de `any` no controlado en modelos troncales (`Product`, `Order`, `OrderItem`, `ClientProfile`).
2. **Conventional Commits:**
   - Todo cambio en el repositorio sigue el estándar `feat(...)`, `fix(...)`, `refactor(...)`, `security(...)` o `docs(...)`.
3. **Optimistic Updates:**
   - Tanto el cambio de stock rápido (+1 / -1) como el encendido/apagado aplican cambios inmediatos en el estado local de React antes de completar la promesa HTTP hacia Supabase.
4. **Formateo Monetario:**
   - Precios estandarizados con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.

---

## 3. Comandos Útiles

```bash
# Validar tipado y compilación completa de Next.js
npm run build

# Analizar estado del repositorio en Git
git status

# Ejecutar servidor de desarrollo local con Turbopack
npm run dev
```
