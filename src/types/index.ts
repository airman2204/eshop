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
}

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingType: 'puebla_local' | 'agreed_pickup' | 'national_shipping';
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
  items: { title: string; quantity: number; price: number }[];
  total: number;
  lastActive: string;
  followedUp: boolean;
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

