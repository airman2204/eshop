import { Product, Order, AbandonedCart } from '@/types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'USA-SNK-001',
    title: "Cheetos Flamin' Hot Crunch USA (Huge Size)",
    description: 'Sabores importados directamente de EE.UU. Fórmula original picante.',
    category: 'Snacks & Botanas',
    baseCostUsd: 4.50,
    baseCostMxn: 90.00,
    shippingCostAllocated: 15.00,
    totalCostMxn: 105.00,
    publicPrice: 165.00,
    profitUnit: 60.00,
    marginPercent: 36.36,
    stock: 24,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60'],
    daysInStock: 12
  },
  {
    id: '2',
    sku: 'USA-DRK-002',
    title: 'Dr Pepper Cream Soda (Pack 12 Latas)',
    description: 'Refresco clásico americano con toque de crema de vainilla.',
    category: 'Bebidas Importadas',
    baseCostUsd: 7.00,
    baseCostMxn: 140.00,
    shippingCostAllocated: 25.00,
    totalCostMxn: 165.00,
    publicPrice: 280.00,
    profitUnit: 115.00,
    marginPercent: 41.07,
    stock: 8,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60'],
    daysInStock: 5
  },
  {
    id: '3',
    sku: 'USA-CSM-003',
    title: 'CeraVe Hydrating Cleanser 16oz USA Edition',
    description: 'Limpiador facial hidratante formulado con ceramidas esenciales.',
    category: 'Cosméticos & Cuidado Personal',
    baseCostUsd: 12.00,
    baseCostMxn: 240.00,
    shippingCostAllocated: 20.00,
    totalCostMxn: 260.00,
    publicPrice: 420.00,
    profitUnit: 160.00,
    marginPercent: 38.09,
    stock: 3,
    isSpecialOrder: false,
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=60'],
    daysInStock: 48 // Alerta de stock estancado
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9021',
    clientName: 'María Fernanda López',
    clientPhone: '+52 222 345 6789',
    status: 'processing',
    shippingType: 'puebla_local',
    pickupPoint: 'Punto de Encuentro: Plaza Dorada',
    subtotal: 445.00,
    shippingCost: 0.00,
    total: 445.00,
    createdAt: '2026-09-26 18:30',
    itemsCount: 2
  },
  {
    id: 'ORD-9022',
    clientName: 'Carlos Mendoza',
    clientPhone: '+52 222 987 6543',
    status: 'shipped',
    shippingType: 'national_shipping',
    subtotal: 840.00,
    shippingCost: 120.00,
    total: 960.00,
    trackingNumber: 'FEDEX-MX-8839201',
    createdAt: '2026-09-26 15:10',
    itemsCount: 3
  }
];

export const INITIAL_ABANDONED_CARTS: AbandonedCart[] = [
  {
    id: 'CART-101',
    clientName: 'Sofía Gutiérrez',
    clientPhone: '+52 222 111 2233',
    items: [
      { title: "Cheetos Flamin' Hot Crunch USA", quantity: 2, price: 165.00 },
      { title: 'Dr Pepper Cream Soda Pack', quantity: 1, price: 280.00 }
    ],
    total: 610.00,
    lastActive: 'Hace 3 horas',
    followedUp: false
  }
];
