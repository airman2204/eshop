# 📖 Manual Técnico de Arquitectura y Referencia de Código: FoxDrop

Este documento describe la arquitectura interna, flujo de datos, convenciones y funciones clave del sistema **FoxDrop E-Shop & CRM**.

---

## 1. Módulos y Flujos de Datos

### 1.1 Catálogo y Sincronización de Productos
- **Ubicación clave:** `src/lib/products.ts`, `src/app/api/admin/route.ts`
- **Consulta Pública (`/tienda`):**
  - La función `getActiveProducts(false)` invoca `/api/admin` con `includeInactive: false`.
  - La API aplica `eq('is_active', true)`, asegurando que los productos apagados nunca se transmitan a clientes.
- **Consulta Administrativa (`/admin`):**
  - Invoca `getActiveProducts(true)` para cargar todos los productos (activos y apagados).
  - Los productos apagados se muestran con indicador visual rosado, opacidad reducida y el botón "Apagado".
- **Prorrateo de Costos:**
  - `total_cost_mxn = base_cost_mxn + shipping_cost_allocated`.
  - `profit_unit = public_price - total_cost_mxn`.
  - En la interfaz administrativa se calculan los márgenes comerciales en vivo antes de guardar en base de datos.

### 1.2 Punto de Venta POS Móvil y Emisión de Tickets
- **Ubicación clave:** `src/app/admin/page.tsx` (sección POS) y `src/lib/orders.ts`
- **Flujo de Venta Física:**
  1. El operador agrega productos escaneando con la cámara trasera o seleccionando en la grilla táctil.
  2. Al pulsar **"Completar Venta y Generar Ticket"**:
     - Se descuenta el stock de Supabase de manera inmediata.
     - Se genera una orden con canal físico y estado `delivered`.
     - Se renderiza el componente del ticket térmico virtual (`ticketReceiptRef`).
     - Se utiliza `html-to-image` (`toPng`) para convertir el ticket en imagen PNG de alta fidelidad.
     - Se almacena temporalmente y se habilita el botón para enviar el comprobante y desglose por WhatsApp.

### 1.3 Historial de Compras del Cliente
- **Ubicación clave:** `src/app/perfil/page.tsx`, `src/app/api/user/profile/route.ts`
- **Acceso:**
  - El cliente ingresa su número telefónico registrado a 10 dígitos.
  - La API busca en `public.orders` todas las órdenes donde `client_phone` coincida con el número sanitizado.
  - Retorna tanto pedidos generados en tienda web como tickets de compras físicas en el mostrador POS.
  - Muestra el desglose de productos, estados de paquetería y puntos ganados en el Club FoxDrop.

### 1.4 Notificaciones y Sonidos en Tiempo Real
- **Ubicación clave:** `src/lib/sounds.ts`
- Para evitar depender de archivos MP3 externos que puedan fallar en conexiones lentas, el sistema implementa la **Web Audio API**:
  - `playCashRegisterSound()`: Genera sintetizado un tono agudo y dos campanillas simulando una caja registradora.
  - `playNotificationSound()`: Tono sutil bifrecuencial para pedidos actualizados o alertas de inventario.

---

## 2. Convenciones de Código y Estado

1. **Gestión de Fechas y Moneda:**
   - Precios siempre formateados con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
   - Fechas locales usando `toLocaleDateString('es-MX')` y zonas horarias controladas.
2. **Optimistic Updates:**
   - Tanto el cambio de stock rápido (+1 / -1) como el encendido/apagado aplican cambios inmediatos en el estado local de React antes de completar la promesa HTTP hacia Supabase. Si la petición falla, revierten el estado al original y alertan al usuario.
3. **Control de Errores y Seguridad:**
   - La API administrativa valida todas las mutaciones mediante la clave de rol de servicio (`SUPABASE_SERVICE_ROLE_KEY`), restringiendo accesos anónimos.

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
