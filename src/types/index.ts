/**
 * ============================================================================
 * FOXDROP — MODELOS DE DATOS & TIPOS DE TYPESCRIPT
 * ============================================================================
 * Este archivo centraliza los contratos de datos utilizados en toda la
 * aplicación (Frontend, Backend, POS, Inventario y CRM).
 */

/**
 * Representa un artículo o combo en el catálogo de FoxDrop.
 * Incluye desglose de costos en USD y MXN, flete prorrateado y disponibilidad.
 */
export interface Product {
  /** Identificador único UUID de Supabase */
  id: string;
  /** Código único de inventario / código de barras (ej. FX-1029) */
  sku: string;
  /** Nombre comercial del producto */
  title: string;
  /** Descripción detallada o características del producto */
  description: string;
  /** Nombre de la categoría (ej. Cosmética, Electrónica, Hogar) */
  category: string;
  /** Marca o Tienda Oficial de origen (ej. Bath & Body Works, Victoria's Secret, Nike, FoxDrop) */
  brand?: string;
  /** Costo base de adquisición en Dólares USD */
  baseCostUsd: number;
  /** Costo base de adquisición convertido a Pesos MXN */
  baseCostMxn: number;
  /** Monto de flete/importación prorrateado asignado a cada unidad en MXN */
  shippingCostAllocated: number;
  /** Costo total unitario (baseCostMxn + shippingCostAllocated) */
  totalCostMxn: number;
  /** Precio final de venta al público en MXN */
  publicPrice: number;
  /** Ganancia o utilidad neta unitaria en MXN (publicPrice - totalCostMxn) */
  profitUnit: number;
  /** Margen porcentual de ganancia bruta */
  marginPercent: number;
  /** Unidades físicas disponibles para venta */
  stock: number;
  /** Si el producto es sobre pedido especial */
  isSpecialOrder: boolean;
  /** Lista de URLs de imágenes del producto */
  images: string[];
  /** Fecha de caducidad si aplica (ej. cosméticos o alimentos) */
  expirationDate?: string;
  /** Días que el artículo lleva en almacén */
  daysInStock: number;
  /** ID del lote de importación vinculado */
  createdAt?: string;
  batchId?: string;
  /** Nombre del lote de importación (ej. Lote Primavera 2026) */
  batchName?: string;
  /** Descuento promocional en porcentaje */
  discountPercent?: number;
  /** Indica si este producto es un paquete o kit compuesto por varios artículos */
  isCombo?: boolean;
  /** IDs de los productos individuales que conforman este combo */
  comboProductIds?: string[];
  /**
   * Interruptor de visibilidad:
   * - true: Encendido (visible para clientes en la tienda web).
   * - false: Apagado (oculto a clientes sin borrarlo del inventario).
   */
  isActive?: boolean;
  /** Origen del producto: 'stock_local' o 'cj_dropship' */
  fulfillmentType?: 'stock_local' | 'cj_dropship';
  /** ID de producto en CJ */
  cjProductId?: string;
  /** SKU original en CJ */
  cjSku?: string;
  /** Lista de URLs de videos del producto (MP4) */
  videos?: string[];
  /** Variantes disponibles para que el cliente elija en la tienda (color, tamaño, capacidad) con su precio individual */
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  image?: string;
  baseCostUsd?: number;
  costUsd?: number;
  costMxn?: number;
  publicPrice: number;
}

/**
 * Lote de importación para prorratear flete de forma masiva entre unidades.
 */
export interface ImportBatch {
  id: string;
  batchName: string;
  totalShippingCost: number;
  totalUnits: number;
  costPerUnit: number;
  receivedAt: string;
  notes?: string;
}

export interface UserAddress {
  id: string;
  name: string;
  street: string;
  colonia: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  references?: string;
  isDefault?: boolean;
}

export interface UserCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'other';
  last4: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  isDefault?: boolean;
}

/**
 * Perfil consolidado del cliente con métricas acumuladas de compra y puntos.
 */
export interface ClientProfile {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone: string;
  role: 'client' | 'admin' | 'repartidor';
  loyaltyPoints: number;
  loyalty_points?: number;
  created_at?: string;
  registeredAt?: string;
  ordersCount: number;
  totalSpent: number;
  addresses?: UserAddress[];
  cards?: UserCard[];
}

/**
 * Representa una orden de venta generada en la tienda online o en el mostrador POS.
 */
export interface Order {
  /** Folio único (ej. FX-293849 o FX-POS-1029) */
  id: string;
  /** UUID primario en base de datos */
  dbId?: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  /** Estado de preparación / logística del pedido */
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  /** Tipo de entrega acordado */
  shippingType: 'puebla_local' | 'agreed_pickup' | 'national_shipping' | 'international_shipping' | string;
  shippingAddress?: any;
  pickupPoint?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNumber?: string;
  createdAt: string;
  itemsCount: number;
  notes?: string;
  paymentMethod?: 'spei' | 'card' | 'cash' | 'mercadopago' | string;
  paymentStatus?: string;
  order_items?: OrderItem[];
}

/**
 * Representa cada artículo individual perteneciente a una orden de compra.
 */
export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string | null;
  product_title: string;
  product_image?: string | null;
  quantity: number;
  price_at_purchase: number;
  /** Alias para retrocompatibilidad con vistas previas */
  price_at_sale?: number;
  cost_at_purchase?: number;
  /** Alias para retrocompatibilidad en cortes de caja */
  product_cost?: number;
  created_at?: string;
}

/**
 * Carrito abandonado para seguimiento comercial y remarketing.
 */
export interface AbandonedCart {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  items: { title: string; quantity: number; price: number; image?: string }[];
  total: number;
  lastActive: string;
  followedUp: boolean;
  createdAt?: string;
}

export interface ClubFoxDropTier {
  name: string;
  minPoints: number;
  discountPercent: number;
  badge: string;
}

export interface ClubFoxDropSettings {
  currencyName: string; // 'Estrellas' | 'Puntos'
  currencySymbol: string; // '⭐' | '🦊'
  pesosPerPoint: number; // Ej. 10 ($10 MXN = 1 estrella) o 1 ($1 MXN = 1 estrella)
  pointMonetaryValueMxn: number; // Ej. 0.10 MXN por estrella/punto
  tiers: ClubFoxDropTier[];
}

export interface LoyaltyMetrics {
  totalClients: number;
  totalCirculatingPoints: number;
  totalLoyaltyDiscountGiven: number;
  pointMonetaryValueMxn?: number;
  circulatingLiabilityMxn?: number;
  tierCounts: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  totalOrdersAnalyzed: number;
}

export interface SpecialOrder {
  id: string;
  client_name?: string;
  client_phone: string;
  client_email?: string;
  description: string;
  status: 'pending' | 'quoted' | 'confirmed' | 'rejected';
  estimated_price?: number;
  created_at: string;
}

export interface ShippingMethodConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  requiresAddress: boolean;
  enabled: boolean;
}

export interface BankTransferConfig {
  bankName: string;
  accountHolder: string;
  clabe: string;
  accountNumber?: string;
  notes?: string;
  showHolder?: boolean;
  showClabe?: boolean;
  showCard?: boolean;
}

export interface CheckoutSettings {
  shippingMethods: ShippingMethodConfig[];
  bankTransfer: BankTransferConfig;
  allowCashOnDelivery: boolean;
  skydropxApiKey?: string;
  mercadopago?: {
    enabled: boolean;
    sandbox: boolean;
    publicKey?: string;
    accessToken?: string;
  };
}

export interface AgentActionExecution {
  type: 'update_stock' | 'update_price' | 'toggle_product' | 'create_coupon' | 'order_whatsapp' | 'cart_recovery';
  label: string;
  payload: any;
  status: 'pending' | 'executed' | 'cancelled';
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionSuggestions?: string[];
  actionExecution?: AgentActionExecution;
}

export interface AgentSocialPost {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'whatsapp';
  headline: string;
  body: string;
  hashtags: string[];
  callToAction: string;
  fullCopy: string;
}

export interface AgentWeeklyCalendarDay {
  id: string;
  dayName: string; // 'Lunes', 'Martes', etc.
  pillar: 'novedad' | 'educativo' | 'oferta' | 'confianza_local';
  pillarLabel: string;
  productId?: string;
  productTitle: string;
  productPrice: number;
  productImage?: string;
  headline: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
  fullCopy: string;
  suggestedTime: string; // '11:00 AM', '07:30 PM'
  suggestedNetwork: 'Instagram & Facebook' | 'TikTok & Reels' | 'WhatsApp Estados & Grupos';
  isCompleted?: boolean;
}

export interface AgentWeeklyPlan {
  id: string;
  weekLabel: string;
  theme: string;
  createdAt: string;
  days: AgentWeeklyCalendarDay[];
}

export interface WhatsAppChat {
  id: string;
  phone: string;
  clientName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  avatarUrl?: string;
  status: 'active' | 'archived';
  clientProfileId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  phone: string;
  sender: 'client' | 'admin';
  senderName?: string; // Ej: 'Mario', 'Socio', 'FoxBot' o nombre del cliente
  text: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  mediaType?: 'image' | 'sticker' | 'document' | 'audio';
  createdAt: string;
}

export interface WhatsAppStatusItem {
  id: string;
  authorName: string;
  authorPhone: string;
  authorAvatar?: string;
  isMyStatus?: boolean;
  mediaUrl: string;
  caption?: string;
  createdAt: string;
  viewed?: boolean;
}

export interface WhatsAppCallRecord {
  id: string;
  clientName: string;
  phone: string;
  avatarUrl?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  callType: 'voice' | 'video';
  timestamp: string;
  duration?: string;
}


// ============================================================================
// WEAVY AI STUDIO — LIENZO & NODOS CREATIVOS (IMAGEN & VIDEO)
// ============================================================================

export type WeavyNodeType = 
  | 'product_source'  // Nodo de producto de catálogo FoxDrop
  | 'external_upload' // Nodo de imagen subida desde PC o URL externa
  | 'prompt_script'   // Nodo de guion, estilo, ratio e instrucciones
  | 'image_generator' // Nodo generador de imágenes (Imagen 3 / Flux)
  | 'video_generator' // Nodo generador de video (Google Veo / Omni Flash)
  | 'media_viewer';   // Nodo visor de resultado / exportador

export interface WeavyNodeData {
  // Datos de Producto / Subida
  productId?: string;
  productTitle?: string;
  productSku?: string;
  sourceImageUrl?: string;
  
  // Imagen de referencia / respaldo para Prompt y generación
  referenceImageUrl?: string;

  // Prompt & Configuración de Escenario
  promptText?: string;
  negativePrompt?: string;
  aspectRatio?: '9:16' | '1:1' | '16:9';
  visualStyle?: 'cinematic' | 'commercial_studio' | 'aesthetic_lifestyle' | 'neon_night' | 'minimalist_clean';
  cameraMotion?: 'slow_zoom_in' | 'orbit_360' | 'dynamic_pan' | 'smoke_atmospheric' | 'static_studio';
  videoDurationSec?: number;

  // Resultados
  status?: 'idle' | 'generating' | 'success' | 'error';
  progress?: number;
  outputMediaUrl?: string;
  outputMediaType?: 'image' | 'video';
  errorMessage?: string;
  generatedAt?: string;
}

export interface WeavyNode {
  id: string;
  type: WeavyNodeType;
  title: string;
  position: { x: number; y: number };
  data: WeavyNodeData;
}

export interface WeavyConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;
  toPort?: string;
}

export interface WeavyProjectFlow {
  id: string;
  name: string;
  description?: string;
  productId?: string;
  createdAt: string;
  updatedAt: string;
  nodes: WeavyNode[];
  connections: WeavyConnection[];
}

// ============================================================================
// MÓDULO DE CAMPAÑAS Y CUPONES QR (FOXDROP PHYGITAL MARKETING)
// ============================================================================

export interface CampaignCoupon {
  code: string;
  qrPayloadUrl: string;
  isActive: boolean;
  scanCount: number;
  firstScannedAt?: string;
  lastScannedAt?: string;
  redeemed: boolean;
  redeemedAt?: string;
  orderNumber?: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  discountPercent: number; // Ej. 10 o 15
  discountType: 'percentage' | 'fixed_mxn';
  singleUse: boolean; // Si el cupón se desactiva permanentemente tras una compra
  expiresAt: string; // ISO datetime
  isActive: boolean;
  bannerTitle: string;
  bannerMessage: string;
  ctaText: string;
  createdAt: string;
  updatedAt: string;
  coupons: CampaignCoupon[];
  couponDesigns?: {
    calabaza?: string;
    vampiro?: string;
    hechicero?: string;
  };
  // Métricas calculadas o agregadas
  totalQrs?: number;
  totalScans?: number;
  totalRedemptions?: number;
}
