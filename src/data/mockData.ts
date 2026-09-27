import { Product, Order, AbandonedCart } from '@/types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'PROD-001',
    title: 'Papas Crunch Fuego Especial (Presentación Grande)',
    description: 'Textura crujiente artesanal con receta picante balanceada e intensa. Calidad gourmet de importación selecta.',
    category: 'Botanas & Snacks',
    baseCostUsd: 4.50,
    baseCostMxn: 90.00,
    shippingCostAllocated: 15.00,
    totalCostMxn: 105.00,
    publicPrice: 175.00,
    profitUnit: 70.00,
    marginPercent: 40.0,
    stock: 24,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 8
  },
  {
    id: '2',
    sku: 'PROD-002',
    title: 'Refresco Vainilla & Cereza Selección (12 Pack)',
    description: 'Bebida carbonatada de edición especial con infusión de vainilla suave y notas frutales de cereza silvestre.',
    category: 'Bebidas Selectas',
    baseCostUsd: 7.50,
    baseCostMxn: 150.00,
    shippingCostAllocated: 28.00,
    totalCostMxn: 178.00,
    publicPrice: 295.00,
    profitUnit: 117.00,
    marginPercent: 39.66,
    stock: 12,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 4
  },
  {
    id: '3',
    sku: 'PROD-003',
    title: 'Limpiador Facial Hidratante Esencial (473ml)',
    description: 'Loción limpiadora no espumosa con complejo de ceramidas y ácido hialurónico para barrera cutánea delicada.',
    category: 'Cuidado Facial & Skincare',
    baseCostUsd: 13.00,
    baseCostMxn: 260.00,
    shippingCostAllocated: 22.00,
    totalCostMxn: 282.00,
    publicPrice: 440.00,
    profitUnit: 158.00,
    marginPercent: 35.91,
    stock: 7,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 19
  },
  {
    id: '4',
    sku: 'PROD-004',
    title: 'Chocolate Relleno de Crema de Avellana y Maní (450g)',
    description: 'Copas de chocolate con leche rellenas de suave mantequilla cremosa tostada. Empaque de colección.',
    category: 'Chocolates & Confitería',
    baseCostUsd: 6.00,
    baseCostMxn: 120.00,
    shippingCostAllocated: 18.00,
    totalCostMxn: 138.00,
    publicPrice: 230.00,
    profitUnit: 92.00,
    marginPercent: 40.0,
    stock: 16,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 6
  },
  {
    id: '5',
    sku: 'PROD-005',
    title: 'Rollitos de Maíz Fuego Intenso (Edición Especial)',
    description: 'Tortilla enrollada con sazón picante intenso de toque cítrico y color distintivo.',
    category: 'Botanas & Snacks',
    baseCostUsd: 4.80,
    baseCostMxn: 96.00,
    shippingCostAllocated: 16.00,
    totalCostMxn: 112.00,
    publicPrice: 185.00,
    profitUnit: 73.00,
    marginPercent: 39.46,
    stock: 18,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 2
  },
  {
    id: '6',
    sku: 'PROD-006',
    title: 'Bebida Energizante Durazno Sin Azúcar (473ml)',
    description: 'Bebida energética ligera con cafeína natural y extracto de durazno suave. Cero calorías.',
    category: 'Bebidas Selectas',
    baseCostUsd: 2.80,
    baseCostMxn: 56.00,
    shippingCostAllocated: 14.00,
    totalCostMxn: 70.00,
    publicPrice: 120.00,
    profitUnit: 50.00,
    marginPercent: 41.67,
    stock: 20,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=700&auto=format&fit=crop&q=80'],
    daysInStock: 9
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9021',
    clientName: 'María Fernanda López',
    clientPhone: '+52 222 345 6789',
    status: 'processing',
    shippingType: 'puebla_local',
    pickupPoint: 'Punto de Entrega: Plaza Dorada',
    subtotal: 470.00,
    shippingCost: 0.00,
    total: 470.00,
    createdAt: '2026-09-26 18:30',
    itemsCount: 2
  },
  {
    id: 'ORD-9022',
    clientName: 'Carlos Mendoza',
    clientPhone: '+52 222 987 6543',
    status: 'shipped',
    shippingType: 'national_shipping',
    subtotal: 865.00,
    shippingCost: 140.00,
    total: 1005.00,
    trackingNumber: 'FEDEX-MX-8839201',
    createdAt: '2026-09-26 15:10',
    itemsCount: 3
  },
  {
    id: 'ORD-9023',
    clientName: 'Rodrigo Alarcón',
    clientPhone: '+52 222 654 3210',
    status: 'delivered',
    shippingType: 'puebla_local',
    pickupPoint: 'Punto de Entrega: Angelópolis',
    subtotal: 620.00,
    shippingCost: 0.00,
    total: 620.00,
    createdAt: '2026-09-25 12:45',
    itemsCount: 3
  }
];

export const INITIAL_ABANDONED_CARTS: AbandonedCart[] = [
  {
    id: 'CART-101',
    clientName: 'Sofía Gutiérrez',
    clientPhone: '+52 222 111 2233',
    items: [
      { title: 'Papas Crunch Fuego Especial', quantity: 2, price: 175.00 },
      { title: 'Refresco Vainilla & Cereza Selección', quantity: 1, price: 295.00 }
    ],
    total: 645.00,
    lastActive: 'Hace 2 horas',
    followedUp: false
  },
  {
    id: 'CART-102',
    clientName: 'Eduardo Valdés',
    clientPhone: '+52 222 777 8899',
    items: [
      { title: 'Limpiador Facial Hidratante Esencial', quantity: 1, price: 440.00 }
    ],
    total: 440.00,
    lastActive: 'Hace 4 horas',
    followedUp: true
  }
];
