export interface Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  baseCostUsd: number;
  baseCostMxn: number;
  shippingCostAllocated: number;
  totalCostMxn: number;
  publicPrice: number;
  profitUnit: number;
  marginPercent: number;
  stock: number;
  isSpecialOrder: boolean;
  images: string[];
  expirationDate?: string;
  daysInStock: number;
  batchId?: string;
  batchName?: string;
  discountPercent?: number;
}

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

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingType: 'puebla_local' | 'agreed_pickup' | 'national_shipping' | string;
  pickupPoint?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNumber?: string;
  createdAt: string;
  itemsCount: number;
  notes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order_items?: any[];
}

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
}

export interface CheckoutSettings {
  shippingMethods: ShippingMethodConfig[];
  bankTransfer: BankTransferConfig;
  allowCashOnDelivery: boolean;
  skydropxApiKey?: string;
}


