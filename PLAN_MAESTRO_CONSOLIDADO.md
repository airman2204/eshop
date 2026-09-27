# 🚀 PLAN MAESTRO MEJORADO: E-COMMERCE & CRM/ERP DE PRODUCTOS AMERICANOS
> **Arquitectura:** Next.js 14 + Supabase PostgreSQL + Tailwind CSS + Meta WhatsApp Cloud API  
> **Costo Operativo Fijo:** $0 USD / mes (Infraestructura 100% Free Tier)

---

## 1. 🏗️ Arquitectura General del Sistema

```mermaid
flowchart TD
    subgraph ClientApp["🛍️ App Cliente (Web & Móvil PWA)"]
        Cat["📦 Catálogo & Búsqueda"]
        Cart["🛒 Carrito & Pedidos Especiales"]
        Checkout["💳 Checkout & Selección Envíos"]
        UserHub["👤 Mi Cuenta & Puntos Club USA"]
    end

    subgraph AdminCRM["⚙️ CRM / ERP Administrativo"]
        Inv["🧮 Alta de Productos & Prorrateo Envío USA"]
        FX["💵 Conversor USD -> MXN Tiempo Real"]
        Fin["📈 Finanzas & Margen Real de Ganancia"]
        Analytics["📊 Rastreo Carritos Abandonados & Visitas"]
        Orders["🚚 Panel de Pedidos & Envíos Puebla/Paqueterías"]
    end

    subgraph Backend["⚡ Backend & Base de Datos (Supabase - Gratis)"]
        DB[(🗄️ PostgreSQL + RLS Security)]
        Auth["🔐 Auth (Email/Pass + OTP + WhatsApp)"]
        Storage["🖼️ Hosting de Imágenes de Productos"]
    end

    subgraph ExternalServices["🌐 Integraciones Externas ($0 USD)"]
        WA["💬 WhatsApp Cloud API / Direct DeepLinks"]
        Shipping["📦 Envia.com API / Skydropx / Calculador Puebla"]
        FX_API["💱 ExchangeRate-API (Tipo de cambio gratis)"]
    end

    ClientApp --> Backend
    AdminCRM --> Backend
    Backend --> ExternalServices
```

---

## 2. 🧮 CRM / ERP ADMINISTRATIVO (Módulo Ampliado)

### A. Gestión de Productos, Costeos & Conversor Dólares-Pesos
1. **Conversor USD $\rightarrow$ MXN en Tiempo Real**: Consulta automática del tipo de cambio del día.
2. **Calculadora de Costo Real Prorrateado**:
   $$\text{Costo Unitario Total (MXN)} = (\text{Costo Producto USD} \times \text{Tipo Cambio}) + \left( \frac{\text{Costo Envío Lote USA-MX}}{\text{Cantidad Unidades Lote}} \right)$$
3. **Cálculo de Ganancia Neta & Margen**:
   $$\text{Ganancia Neta} = \text{Precio Público} - \text{Costo Unitario Total}$$
   $$\text{Margen \%} = \left( \frac{\text{Ganancia Neta}}{\text{Precio Público}} \right) \times 100$$
4. **Control de Lotes & Alertas de Caducidad**: Alertas para productos cercanos a fecha de vencimiento o con más de 45 días en stock para sugerir liquidaciones.

### B. Módulo Financiero
- Gráficas de ingresos vs. costos reales de importación, margen bruto, ganancia neta diaria/mensual y ticket promedio.

### C. Gestión de Pedidos & Logística en Puebla
- Estados del pedido: *Pendiente $\rightarrow$ En Preparación $\rightarrow$ En Ruta (Puebla) / Guía Asignada $\rightarrow$ Entregado*.
- Enlace automatizado en 1 clic para notificar al cliente vía WhatsApp con plantillas transaccionales.

### D. Panel de Analítica, Carritos Abandonados & Pedidos Especiales
- **Seguimiento de Carritos Abandonados**: Lista de usuarios que dejaron productos en carrito por más de 2h con botón para enviar **Cupón Dinámico de Descuento** por WhatsApp.
- **Gestión de Encargos / Pedidos Especiales**: Solicitudes de productos americanos que no están en inventario.

---

## 3. 🛍️ APLICATIVO CLIENTE (E-Commerce Web/Mobile)

1. **Catálogo Responsivo & Botón WhatsApp Directo**: Cada producto incluye el botón *"Preguntar por este producto en WhatsApp"* con SKU y nombre pre-llenados.
2. **Sección de Pedidos Bajo Demanda / Especiales**: Formulario para solicitar artículos de EE.UU. no presentes en el catálogo.
3. **Registro Seguro & OTP**: Inicio de sesión mediante Correo + Contraseña o Código OTP de 6 dígitos. Cumplimiento con ley de protección de datos personales.
4. **Checkout e Integración Logística (Puebla + Nacional)**:
   - *Opción A*: Punto de Entrega Gratuito en Puebla (Plaza Dorada, Angelópolis, CAPU, Zócalo).
   - *Opción B*: Envío a Domicilio Local Puebla (Costo según zona / C.P.).
   - *Opción C*: Paquetería Nacional (FedEx, Estafeta, DHL vía API).
5. **Club USA (Puntos de Fidelidad) & IA Recomendadora**:
   - Acumulación de puntos por compras.
   - Algoritmo de venta cruzada (*"Quienes compraron este snack también llevaron..."*).

---

## 4. 📅 PLAN DE IMPLEMENTACIÓN Y CRONOGRAMA

```mermaid
gantt
    title Cronograma Completo de Desarrollo
    dateFormat  YYYY-MM-DD
    section Fase 1: Arquitectura & BD
    Configuración Supabase, Next.js & Esquema SQL :active, f1, 2026-09-27, 2d
    section Fase 2: CRM Admin
    Alta Productos, Prorrateo, USD/MXN & Lotes  : f2, 2026-09-29, 4d
    Finanzas, Pedidos & Carritos Abandonados    : f3, 2026-10-03, 3d
    section Fase 3: App Cliente
    Catálogo, Registro OTP & Pedidos Especiales  : f4, 2026-10-06, 4d
    Checkout Puebla (Puntos Gratis) & API Envíos : f5, 2026-10-10, 3d
    section Fase 4: Analítica & Fidelización
    Club de Puntos, IA Recomendadora & Carritos  : f6, 2026-10-13, 3d
    section Fase 5: Integraciones & Lanzamiento
    Plantillas WhatsApp Cloud API & Launch Vercel : f7, 2026-10-16, 3d
```

---

## 🛠️ Resumen de Fases
- **Fase 1**: Base de Datos PostgreSQL en Supabase, Esquema SQL y Setup Next.js 14.
- **Fase 2**: CRM Administrativo completo (Calculadora USD/MXN, Prorrateo Lotes, Finanzas y Carritos Abandonados).
- **Fase 3**: Tienda Cliente Web/Móvil (Catálogo, Botón WhatsApp Directo, Checkout Puebla + Nacional).
- **Fase 4**: Sistema de Puntos, IA Recomendadora y Rastreo de Analítica.
- **Fase 5**: Integración WhatsApp Cloud API y despliegue final en Vercel ($0 USD).
