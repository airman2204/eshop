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
}

export interface ImportBatch {
  id: string;
  batchName: string;
  totalShippingCost: number;
  totalUnits: number;
  costPerUnit: number;
  receivedAt: string;
}

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingType: 'puebla_local' | 'agreed_pickup' | 'national_shipping';
  pickupPoint?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNumber?: string;
  createdAt: string;
  itemsCount: number;
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
