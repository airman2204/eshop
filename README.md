# 🦊 FoxDrop E-Shop & CRM Administrativo

> **E-Commerce de Nueva Generación, Punto de Venta (POS) Móvil y Suite CRM** construido para **FoxDrop México**.  
> Desarrollado con **Next.js 16 (App Router + Turbopack)**, **TypeScript**, **Tailwind CSS**, **Supabase (PostgreSQL, Storage, Realtime)** y capacidades de **Progressive Web App (PWA)** instalable.

---

## 📑 Tabla de Contenidos
1. [Descripción General](#-descripción-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos Principales](#-módulos-principales)
   - [Tienda Pública & Experiencia de Compra (`/tienda`)](#1-tienda-pública--experiencia-de-compra-tienda)
   - [Panel de Control Administrativo & CRM (`/admin`)](#2-panel-de-control-administrativo--crm-admin)
   - [Punto de Venta Físico / Mostrador (POS)](#3-punto-de-venta-físico--mostrador-pos)
   - [Club FoxDrop (Fidelización & Gamificación)](#4-club-foxdrop-fidelización--gamificación)
   - [Historial & Portal del Cliente (`/perfil`)](#5-historial--portal-del-cliente-perfil)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Endpoints API & Rutas de Servidor](#-endpoints-api--rutas-de-servidor)
6. [Modelo de Base de Datos (Supabase / PostgreSQL)](#-modelo-de-base-de-datos-supabase--postgresql)
7. [PWA & Soporte Móvil](#-pwa--soporte-móvil)
8. [Configuración y Despliegue](#-configuración-y-despliegue)

---

## 🚀 Descripción General

FoxDrop integra en una sola plataforma monolítica y reactiva:
* **Catálogo de Comercio Electrónico:** Optimizado para conversión móvil y desktop, filtros reactivos, combos inteligentes, sincronización en vivo y carrito flotante con soporte para carritos abandonados.
* **Punto de Venta Móvil (POS):** Diseñado para operar en mostrador o ventas ambulantes desde cualquier celular o tablet con generación de **tickets térmicos virtuales estilo recibo** e integración directa con WhatsApp.
* **Gestión de Inventario Financiero:** Cálculo automático en tiempo real de flete prorrateado por lotes de importación, margen bruto comercial, utilidad neta unitaria y tipo de cambio USD/MXN en tiempo real.
* **Control de Disponibilidad:** Sistema de **Encendido / Apagado** de productos para pausar visibilidad sin perder historial de inventario ni reportes contables.
* **Notificaciones en Tiempo Real:** Sonidos de caja registradora, alertas de escritorio y toasts cuando entra un nuevo pedido.

---

## 🏗 Arquitectura del Sistema

```
[ Cliente Web / Móvil / PWA ]  <--->  [ Next.js 16 App Router (Vercel) ]
                                               |
                        +----------------------+----------------------+
                        |                                             |
             [ API Routes Internas ]                        [ Supabase Service ]
             - /api/admin                                   - PostgreSQL Database
             - /api/shipping/quote                          - Supabase Storage (Imágenes)
             - /api/cart/sync                               - Realtime Notifications
             - /api/auth/lookup                             - Row Level Security (RLS)
             - /api/user/profile
```

* **Frontend:** Next.js 16, React 19, Tailwind CSS, Lucide Icons, Canvas Confetti, HTML-to-Image.
* **Backend:** Next.js Server Route Handlers con autenticación segura `SUPABASE_SERVICE_ROLE_KEY`.
* **Base de Datos & Almacenamiento:** Supabase PostgreSQL con disparadores automáticos, vistas y bucket de almacenamiento para imágenes de catálogo y comprobantes.
* **Audio & Multimedia:** Generador Web Audio API sintético para alertas sonoras y generación de recibos en canvas/PNG.

---

## 📦 Módulos Principales

### 1. Tienda Pública & Experiencia de Compra (`/tienda`)
* **Hero Carrusel Dinámico:** Administrable desde el panel con llamada a la acción (CTA) vinculada a categorías específicas.
* **Buscador & Filtros Rápidos:** Búsqueda predictiva instantánea por título o SKU y filtrado por categoría y tipos de producto (Combos vs Individuales).
* **Fichas de Producto Enriquecidas:** Galería multi-imagen con zoom, selector de cantidad con límite de stock disponible en tiempo real, etiquetas de ahorro y disponibilidad.
* **Flujo de Checkout Transparente:**
  * Métodos de entrega: Envío local Puebla express, Punto de entrega acordado o Envío nacional estafeta/DHL.
  * Autocompletado de dirección y cálculo automático de costos.
  * Confirmación vía WhatsApp con mensaje preformateado y registro en base de datos.
  * Tracking de carritos abandonados para recuperación comercial.

### 2. Panel de Control Administrativo & CRM (`/admin`)
* **Métricas Clave (KPIs):** Total de ventas realizadas, utilidad neta real, margen porcentual promedio y valor del inventario en almacén.
* **Inventario Inteligente con Prorrateo de Costos:**
  * Asignación de **Lotes de Importación**: reparte el flete total entre las unidades del lote.
  * Tipo de cambio USD a MXN en tiempo real con proveedores de divisas automáticos.
  * Estado de artículos: **Encendido (Visible en tienda)** o **Apagado (Oculto a clientes)** con 1 solo clic.
  * Ajuste rápido de stock (+ / -) con actualización optimista y persistencia en base de datos.
  * Kardex / Historial de movimientos por producto.
  * Exportación completa del catálogo a formato CSV compatible con Microsoft Excel y Google Sheets.
* **Gestión de Pedidos:**
  * Vista kanban / tabla con estados: *Pendiente*, *En proceso*, *Enviado*, *Entregado*, *Cancelado*.
  * Historial de cancelaciones con motivo registrado.
  * Filtro por canal (Tienda Online vs Punto de Venta POS).
* **Gestión de Clientes (CRM):**
  * Directorio de clientes con compras acumuladas, tickets promedio y puntos del Club FoxDrop.

### 3. Punto de Venta Físico / Mostrador (POS)
* **Acceso Rápido Móvil:** Barra inferior accesible desde celulares con escáner de cámara integrado para códigos de barras y SKU.
* **Cobro Ágil:** Selección de efectivo, tarjeta o SPEI, cálculo de cambio y descuento de stock en tiempo real.
* **Ticket Térmico Virtual FoxDrop:**
  * Diseño réplica de recibo de caja térmica comercial con logotipo oficial de FoxDrop.
  * Animación fluida de impresión de abajo hacia arriba.
  * Botón para compartir comprobante directo a WhatsApp con imagen y texto formateado.

### 4. Club FoxDrop (Fidelización & Gamificación)
* Acumulación de puntos por compras físicas y online.
* Niveles de membresía configurables (Bronce, Plata, Oro, Platino) con beneficios dinámicos.
* Portal de consulta rápida para el cliente mediante su número telefónico.

### 5. Historial & Portal del Cliente (`/perfil`)
* Consulta segura de pedidos pasados mediante número telefónico.
* Estado de entrega, código de rastreo de paquetería y desglose de artículos comprados tanto en tienda online como en mostrador POS.

---

## 📁 Estructura del Proyecto

```
eshop/
├── public/                 # Recursos estáticos (iconos, manifest PWA, robots, logos)
├── src/
│   ├── app/                # Rutas de la aplicación (Next.js App Router)
│   │   ├── admin/          # Panel administrativo & suite CRM (/admin)
│   │   ├── api/            # Route handlers de servidor (REST API)
│   │   │   ├── admin/      # API central protegida de operaciones administrativas
│   │   │   ├── auth/       # Endpoints de consulta y sesión
│   │   │   ├── cart/       # Sincronización de carritos y carritos abandonados
│   │   │   ├── postal/     # Cotizador y validador de códigos postales
│   │   │   ├── shipping/   # Tarifas dinámicas de envío
│   │   │   ├── user/       # Perfil del cliente y puntos de fidelidad
│   │   │   └── whatsapp/   # Disparador de mensajes y webhooks
│   │   ├── perfil/         # Portal del cliente con historial de compras
│   │   ├── privacidad/     # Aviso de privacidad
│   │   ├── terminos/       # Términos y condiciones legales
│   │   ├── tienda/         # Tienda pública de cara al usuario
│   │   ├── layout.tsx      # Layout raíz y metaetiquetas PWA
│   │   └── page.tsx        # Redirección inteligente y landing principal
│   ├── components/         # Componentes reutilizables
│   │   ├── Analytics.tsx           # Telemetría y eventos
│   │   ├── CookieBanner.tsx        # Consentimiento GDPR / LFPDPPP
│   │   ├── FoxDropLogo.tsx         # Isotipo y logotipo oficial vectorial
│   │   ├── GoogleAddressInput.tsx  # Autocompletado de direcciones
│   │   └── MobileBarcodeScanner.tsx# Escáner táctil para cámara trasera
│   ├── data/               # Datos predeterminados, mockups y assets en base64
│   ├── lib/                # Utilidades, servicios y clientes de integración
│   │   ├── admin.ts        # Métodos del CRM, inventario, lotes y métricas
│   │   ├── adminAuth.ts    # Manejo de sesión y autenticación del admin
│   │   ├── clubFoxdrop.ts  # Lógica de fidelización y niveles de cliente
│   │   ├── orders.ts       # Procesamiento de órdenes y compras POS
│   │   ├── products.ts     # Mapeo y consultas de catálogo con Supabase
│   │   ├── sounds.ts       # Efectos de audio sintéticos con Web Audio API
│   │   ├── storage.ts      # Subida de imágenes a Supabase Storage
│   │   └── supabase/       # Clientes de Supabase (Client-side & Service Role Server-side)
│   ├── types/              # Definiciones completas de TypeScript
│   └── middleware.ts       # Protección perimetral de rutas
├── schema.sql              # Esquema de base de datos PostgreSQL para Supabase
├── DOCUMENTACION_TECNICA.md# Guía exhaustiva de arquitectura y mantenimiento
└── package.json            # Dependencias y scripts de construcción
```

---

## 🔌 Endpoints API & Rutas de Servidor

| Ruta | Método | Descripción |
| :--- | :--- | :--- |
| `/api/admin` | `POST` | Operaciones de backend administrativo (CRUD productos, toggle activo/apagado, lotes, órdenes, métricas, carrusel). |
| `/api/cart/sync` | `POST` | Sincroniza el carrito del cliente y registra carritos abandonados para remarketing. |
| `/api/auth/lookup` | `POST` | Valida credenciales administrativas y consulta perfiles. |
| `/api/user/profile` | `GET / POST` | Recupera el historial de pedidos y saldo de puntos de un cliente por teléfono. |
| `/api/shipping/quote` | `POST` | Calcula costos de flete según zona geográfica y tipo de entrega. |
| `/api/postal` | `GET` | Consulta colonias y municipios a partir del código postal mexicano. |
| `/api/whatsapp` | `POST` | Generación y registro de eventos de notificación hacia WhatsApp. |

---

## 🗄 Modelo de Base de Datos (Supabase / PostgreSQL)

Las tablas principales definidas en `schema.sql`:

1. **`products`**: Almacena el catálogo de artículos, SKU, precio de venta, costos unitarios en USD y MXN, flete prorrateado asignado, stock, combos y el flag `is_active` para encender o apagar productos.
2. **`import_batches`**: Lotes de mercancía importada para prorrateo centralizado de gastos de transporte.
3. **`orders` & `order_items`**: Cabecera y detalle de pedidos generados tanto online como en mostrador físico POS.
4. **`profiles`**: Registro de clientes, roles y puntos acumulados del Club FoxDrop.
5. **`abandoned_carts`**: Trazabilidad de compras inconclusas con teléfono y productos seleccionados.
6. **`carousel_slides`**: Banners del Hero administrables en tiempo real.
7. **`club_settings`**: Reglas dinámicas de gamificación, porcentaje de cashback y multiplicadores de puntos.

---

## 📱 PWA & Soporte Móvil

La aplicación está completamente optimizada para dispositivos móviles:
* Instalable en Android / iOS mediante el menú nativo o el botón integrado *"Instalar App"*.
* Barra de navegación inferior diseñada ergonómicamente para uso con una sola mano.
* Escaneo de códigos de barra directamente con la cámara trasera del dispositivo móvil sin aplicaciones externas.
* Modo offline resiliente gracias al Service Worker y caché estática de Next.js.

---

## 🛠 Configuración y Despliegue

### Requisitos Previos
* Node.js 18+ o superior
* Cuenta activa en [Supabase](https://supabase.com)
* Variables de entorno configuradas

### Variables de Entorno (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_SITE_URL=https://foxdrop.mx
```

### Comandos de Desarrollo y Compilación
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Turbopack
npm run dev

# Construcción de producción optimizada
npm run build

# Iniciar en modo producción
npm run start
```

---

© 2026 FoxDrop México. Todos los derechos reservados.
