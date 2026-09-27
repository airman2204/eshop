import { Product, Order, AbandonedCart } from '@/types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'FX-WATCH-09',
    title: 'Apple Watch Series 9 GPS 45mm Midnight',
    description: 'Reloj inteligente con pantalla Retina siempre activa, chip S9 SiP y detección de caídas y accidentes.',
    category: 'Electrónica',
    baseCostUsd: 220.00,
    baseCostMxn: 4400.00,
    shippingCostAllocated: 200.00,
    totalCostMxn: 4600.00,
    publicPrice: 6890.00,
    profitUnit: 2290.00,
    marginPercent: 33.24,
    stock: 12,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 5
  },
  {
    id: '2',
    sku: 'FX-CAM-A7M4',
    title: 'Sony Alpha a7 IV Mirrorless Cámara 4K',
    description: 'Sensor full frame Exmor R CMOS de 33MP con procesador BIONZ XR y grabación de video 4K 60p profesional.',
    category: 'Electrónica',
    baseCostUsd: 1400.00,
    baseCostMxn: 28000.00,
    shippingCostAllocated: 800.00,
    totalCostMxn: 28800.00,
    publicPrice: 38900.00,
    profitUnit: 10100.00,
    marginPercent: 25.96,
    stock: 5,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 8
  },
  {
    id: '3',
    sku: 'FX-PHONE-S24U',
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium Black',
    description: 'Smartphone con Galaxy AI integrada, marco de titanio, cámara de 200MP y procesador Snapdragon 8 Gen 3.',
    category: 'Electrónica',
    baseCostUsd: 950.00,
    baseCostMxn: 19000.00,
    shippingCostAllocated: 500.00,
    totalCostMxn: 19500.00,
    publicPrice: 24900.00,
    profitUnit: 5400.00,
    marginPercent: 21.68,
    stock: 8,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 3
  },
  {
    id: '4',
    sku: 'FX-BAG-IT01',
    title: 'Maletín Ejecutivo de Cuero Italiano Hecho a Mano',
    description: 'Bolsa de cuero genuino vacuno curtido al vegetal con compartimento acolchado para laptop de 16 pulgadas.',
    category: 'Moda',
    baseCostUsd: 95.00,
    baseCostMxn: 1900.00,
    shippingCostAllocated: 180.00,
    totalCostMxn: 2080.00,
    publicPrice: 3450.00,
    profitUnit: 1370.00,
    marginPercent: 39.71,
    stock: 14,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 12
  },
  {
    id: '5',
    sku: 'FX-WATCH-JP02',
    title: 'Reloj Automático Cronógrafo Seiko Edición Tokio',
    description: 'Calibre automático 4R36 con caja de acero pulido y cristal de zafiro anti-reflejante.',
    category: 'Moda',
    baseCostUsd: 180.00,
    baseCostMxn: 3600.00,
    shippingCostAllocated: 150.00,
    totalCostMxn: 3750.00,
    publicPrice: 5600.00,
    profitUnit: 1850.00,
    marginPercent: 33.03,
    stock: 10,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 6
  },
  {
    id: '6',
    sku: 'FX-COSM-KR03',
    title: 'Serum Facial Hidratante Esencia Coreana de Arroz',
    description: 'Cuidado facial revitalizante con fermento de arroz y niacinamida para tono radiante y luminoso.',
    category: 'Hogar',
    baseCostUsd: 14.00,
    baseCostMxn: 280.00,
    shippingCostAllocated: 30.00,
    totalCostMxn: 310.00,
    publicPrice: 580.00,
    profitUnit: 270.00,
    marginPercent: 46.55,
    stock: 25,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 4
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'FX-ORD-8821',
    clientName: 'María Fernanda López',
    clientPhone: '+52 222 345 6789',
    status: 'processing',
    shippingType: 'puebla_local',
    subtotal: 6890.00,
    shippingCost: 50.00,
    total: 6940.00,
    createdAt: '2026-09-26 18:30',
    itemsCount: 1
  },
  {
    id: 'FX-ORD-8822',
    clientName: 'Carlos Mendoza',
    clientPhone: '+52 222 987 6543',
    status: 'shipped',
    shippingType: 'national_shipping',
    subtotal: 38900.00,
    shippingCost: 140.00,
    total: 39040.00,
    trackingNumber: 'ESTAFETA-MX-99201',
    createdAt: '2026-09-26 15:10',
    itemsCount: 1
  }
];

export const INITIAL_ABANDONED_CARTS: AbandonedCart[] = [
  {
    id: 'CART-101',
    clientName: 'Sofía Gutiérrez',
    clientPhone: '+52 222 111 2233',
    items: [
      { title: 'Apple Watch Series 9 GPS 45mm', quantity: 1, price: 6890.00 }
    ],
    total: 6890.00,
    lastActive: 'Hace 2 horas',
    followedUp: false
  }
];
