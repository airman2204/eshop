'use client';

import { useState } from 'react';
import { 
  Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare, 
  Search, ShieldAlert, Sparkles, TrendingUp, Clock, CheckCircle2, User, RefreshCw, BarChart3, ChevronRight, X
} from 'lucide-react';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_ABANDONED_CARTS } from '@/data/mockData';
import { Product, Order, AbandonedCart } from '@/types';

export default function AdminCRM() {
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'finance' | 'orders' | 'carts' | 'ai'>('inventory');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(INITIAL_ABANDONED_CARTS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Alta de Producto y Prorrateo de Envíos USA
  const [showAddModal, setShowAddModal] = useState(false);
  const [usdRate, setUsdRate] = useState(20.00);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks & Botanas');
  const [newCostUsd, setNewCostUsd] = useState(5.00);
  const [batchShippingTotal, setBatchShippingTotal] = useState(600.00);
  const [batchUnitsTotal, setBatchUnitsTotal] = useState(30);
  const [newPublicPrice, setNewPublicPrice] = useState(230.00);
  const [newStock, setNewStock] = useState(15);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Cálculos automáticos de costeo
  const costMxn = newCostUsd * usdRate;
  const shippingPerUnit = batchUnitsTotal > 0 ? batchShippingTotal / batchUnitsTotal : 0;
  const totalCostUnitMxn = costMxn + shippingPerUnit;
  const profitUnit = newPublicPrice - totalCostUnitMxn;
  const marginPercent = newPublicPrice > 0 ? (profitUnit / newPublicPrice) * 100 : 0;

  // Filtrado de productos en inventario
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas financieras consolidadas
  const totalInventoryUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalInvestment = products.reduce((acc, p) => acc + (p.totalCostMxn * p.stock), 0);
  const totalExpectedRevenue = products.reduce((acc, p) => acc + (p.publicPrice * p.stock), 0);
  const totalExpectedProfit = totalExpectedRevenue - totalInvestment;
  const avgMargin = totalExpectedRevenue > 0 ? (totalExpectedProfit / totalExpectedRevenue) * 100 : 0;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: Date.now().toString(),
      sku: `USA-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle,
      description: 'Producto importado de EE.UU.',
      category: newCategory,
      baseCostUsd: newCostUsd,
      baseCostMxn: costMxn,
      shippingCostAllocated: shippingPerUnit,
      totalCostMxn: totalCostUnitMxn,
      publicPrice: newPublicPrice,
      profitUnit: profitUnit,
      marginPercent: marginPercent,
      stock: newStock,
      isSpecialOrder: false,
      images: [newImageUrl || 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=700&auto=format&fit=crop&q=80'],
      daysInStock: 0
    };
    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setNewTitle('');
    setNewImageUrl('');
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const sendWhatsAppNotification = (phone: string, text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* HEADER DEL CRM */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg shadow-lg shadow-indigo-600/10">
              ⚙️
            </div>
            <div>
              <h1 className="font-black text-lg text-white tracking-tight flex items-center gap-2">
                CONTROL CRM & ERP <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Admin Pro</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Gestión de Costos USA, Prorrateo de Lotes & Logística Puebla</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500 text-[10px]">T.C. USD:</span>
              <span className="font-extrabold text-emerald-400">${usdRate.toFixed(2)} MXN</span>
            </div>
            <a
              href="/tienda"
              target="_blank"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1.5 shadow"
            >
              Ver Tienda Cliente <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* SUB-NAVEGACIÓN CRM */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => setCrmSubTab('inventory')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> Inventario & Costeo Prorrateado
          </button>
          <button
            onClick={() => setCrmSubTab('finance')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'finance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Finanzas & Utilidad Neta
          </button>
          <button
            onClick={() => setCrmSubTab('orders')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" /> Pedidos & Envíos Puebla ({orders.length})
          </button>
          <button
            onClick={() => setCrmSubTab('carts')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'carts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Carritos Abandonados ({abandonedCarts.length})
          </button>
          <button
            onClick={() => setCrmSubTab('ai')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-rose-400" /> Inteligencia & Sugerencias IA
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL DEL CRM */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* 1. SECCIÓN INVENTARIO & PRORRATEO */}
        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Inventario Activo & Prorrateo USA</h2>
                <p className="text-xs text-slate-400">Control de costos de importación, margen por artículo y alertas de stock.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por SKU o producto..."
                    className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Dar de Alta Artículo
                </button>
              </div>
            </div>

            {/* TABLA PRINCIPAL DE COSTEO */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4">SKU / Producto</th>
                      <th className="p-4">Costo EE.UU.</th>
                      <th className="p-4">Costo MXN</th>
                      <th className="p-4 text-amber-400">Envío Prorrateado</th>
                      <th className="p-4 font-bold text-white">Costo Total Real</th>
                      <th className="p-4 text-indigo-400">Precio Público</th>
                      <th className="p-4 text-emerald-400">Ganancia Neta</th>
                      <th className="p-4">Margen %</th>
                      <th className="p-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={p.images[0]} alt={p.title} className="w-10 h-10 rounded-xl object-cover bg-slate-950" />
                            <div>
                              <p className="font-extrabold text-white text-xs">{p.title}</p>
                              <p className="text-[10px] text-slate-500">{p.sku} • {p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-300">${p.baseCostUsd.toFixed(2)} USD</td>
                        <td className="p-4 font-semibold text-slate-300">${p.baseCostMxn.toFixed(2)} MXN</td>
                        <td className="p-4 font-bold text-amber-400">+${p.shippingCostAllocated.toFixed(2)} MXN</td>
                        <td className="p-4 font-black text-slate-100">${p.totalCostMxn.toFixed(2)} MXN</td>
                        <td className="p-4 font-black text-indigo-400">${p.publicPrice.toFixed(2)} MXN</td>
                        <td className="p-4 font-black text-emerald-400">+${p.profitUnit.toFixed(2)} MXN</td>
                        <td className="p-4">
                          <span className="bg-emerald-950/80 text-emerald-400 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-800/60 text-[11px]">
                            {p.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            p.stock <= 5 
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/60' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {p.stock} uds
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. SECCIÓN FINANZAS Y RENTABILIDAD */}
        {crmSubTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <span className="text-slate-400 text-xs font-semibold">Inversión Total en Almacén</span>
                <p className="text-2xl font-black text-white mt-1.5">${totalInvestment.toFixed(2)} MXN</p>
                <span className="text-[11px] text-slate-500 mt-2 block">Costo producto + flete prorrateado</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <span className="text-slate-400 text-xs font-semibold">Ingresos Proyectados</span>
                <p className="text-2xl font-black text-indigo-400 mt-1.5">${totalExpectedRevenue.toFixed(2)} MXN</p>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Valor venta al público
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <span className="text-slate-400 text-xs font-semibold">Ganancia Neta Esperada</span>
                <p className="text-2xl font-black text-emerald-400 mt-1.5">${totalExpectedProfit.toFixed(2)} MXN</p>
                <span className="text-[11px] text-slate-500 mt-2 block">Utilidad libre de costos</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <span className="text-slate-400 text-xs font-semibold">Margen Promedio de Utilidad</span>
                <p className="text-2xl font-black text-rose-400 mt-1.5">{avgMargin.toFixed(1)}%</p>
                <span className="text-[11px] text-slate-500 mt-2 block">Rendimiento sobre venta</span>
              </div>
            </div>

            {/* DESGLOSE DE REGLAS DE NEGOCIO */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Fórmula de Rentabilidad por Lote
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada vez que ingresas un lote de importación enviado desde Estados Unidos (por ejemplo, flete de $600 MXN para 30 unidades), 
                el sistema divide automáticamente $20 MXN adicionales de costo por cada producto. De esta forma, 
                garantizas que el precio público final cubra el producto original en dólares, el flete de cruce y tu margen de ganancia neta.
              </p>
            </div>
          </div>
        )}

        {/* 3. SECCIÓN PEDIDOS & LOGÍSTICA PUEBLA */}
        {crmSubTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Pedidos & Logística</h2>
              <p className="text-xs text-slate-400">Seguimiento de entregas en Puebla y notificaciones por WhatsApp en 1 clic.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{order.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        order.status === 'delivered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                        order.status === 'shipped' ? 'bg-blue-950 text-blue-400 border border-blue-800/60' :
                        'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}>
                        {order.status === 'delivered' ? '✓ Entregado' : order.status === 'shipped' ? '🚚 En Camino' : '⏳ En Preparación'}
                      </span>
                    </div>
                    <p className="text-slate-300 font-bold">{order.clientName} • <span className="text-slate-400 font-normal">{order.clientPhone}</span></p>
                    {order.pickupPoint && (
                      <p className="text-indigo-400 font-semibold flex items-center gap-1">📍 {order.pickupPoint}</p>
                    )}
                    {order.trackingNumber && (
                      <p className="text-slate-400 text-[11px]">Guía Paquetería: <strong className="text-white">{order.trackingNumber}</strong></p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Monto Total</span>
                      <span className="text-base font-black text-emerald-400">${order.total.toFixed(2)} MXN</span>
                    </div>

                    {/* SELECTOR DE ESTADO */}
                    <select
                      value={order.status}
                      onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="processing">En Preparación</option>
                      <option value="shipped">En Camino / En Ruta</option>
                      <option value="delivered">Entregado</option>
                    </select>

                    {/* BOTÓN WHATSAPP NOTIFICADOR */}
                    <button
                      onClick={() => sendWhatsAppNotification(
                        order.clientPhone, 
                        `¡Hola ${order.clientName}! Te informamos que tu pedido ${order.id} de USA Store se encuentra: ${order.status.toUpperCase()}. Si tienes dudas o deseas acordar la entrega, estamos a tu disposición.`
                      )}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Notificar WA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN CARRITOS ABANDONADOS */}
        {crmSubTab === 'carts' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Carritos Abandonados</h2>
              <p className="text-xs text-slate-400">Clientes que agregaron productos y no terminaron el checkout. Recupéralos con cupones.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {abandonedCarts.map(cart => (
                <div key={cart.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{cart.clientName}</span>
                      <span className="text-slate-400 font-medium">({cart.clientPhone})</span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      Artículos: {cart.items.map(i => `${i.title} (x${i.quantity})`).join(', ')}
                    </p>
                    <span className="text-[10px] text-amber-400 block mt-1">Inactividad: {cart.lastActive}</span>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <span className="text-base font-black text-white">${cart.total.toFixed(2)} MXN</span>
                    <button
                      onClick={() => sendWhatsAppNotification(
                        cart.clientPhone,
                        `¡Hola ${cart.clientName}! Notamos que dejaste productos en tu carrito de USA Store. Te regalamos un 5% de descuento especial con el código USA5 para completar tu compra hoy.`
                      )}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Enviar Cupón WA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SECCIÓN INTELIGENCIA & RECOMENDACIONES IA */}
        {crmSubTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" /> Inteligencia Comercial & Tendencias de Compra
              </h2>
              <p className="text-xs text-slate-400">Algoritmo de aprendizaje de navegación para optimizar las compras de importación.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  🔥 Productos con Mayor Intención de Compra
                </h3>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span>1. Cheetos Flamin Hot Crunchy USA</span>
                    <span className="font-bold text-rose-400">84 visitas / 24 agregados</span>
                  </li>
                  <li className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span>2. Dr Pepper Cherry Vanilla 12 Pack</span>
                    <span className="font-bold text-rose-400">62 visitas / 12 agregados</span>
                  </li>
                  <li className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span>3. Takis Blue Heat USA Extreme</span>
                    <span className="font-bold text-rose-400">55 visitas / 18 agregados</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  💡 Recomendación de Reabastecimiento para el Próximo Lote
                </h3>
                <div className="bg-indigo-950/40 border border-indigo-800/60 p-3.5 rounded-2xl space-y-2">
                  <p className="text-indigo-200 font-bold">Aumentar 40% volumen de Bebidas Especiales</p>
                  <p className="text-slate-400 leading-relaxed">
                    Las latas de Dr Pepper y Monster importadas tienen un margen del 41.6% y un tiempo de venta inferior a 5 días en almacén.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ALTA DE ARTÍCULO & CALCULADORA DE PRORRATEO */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">Alta de Producto con Prorrateo de Envío</h3>
                <p className="text-[11px] text-slate-400">Calcula la ganancia exacta considerando el flete de la caja de importación.</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Título del Producto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cheetos Puffs USA 255g"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Categoría:</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option>Snacks & Botanas</option>
                      <option>Bebidas & Refrescos</option>
                      <option>Dulces & Chocolates</option>
                      <option>Cosméticos & Skincare</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Stock Inicial:</label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Costo en EE.UU. (USD):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCostUsd}
                      onChange={e => setNewCostUsd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Equivalente MXN: ${costMxn.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Precio Venta Público (MXN):</label>
                    <input
                      type="number"
                      value={newPublicPrice}
                      onChange={e => setNewPublicPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-black text-indigo-400"
                    />
                  </div>
                </div>

                {/* PRORRATEO DE ENVÍO DE LA CAJA O LOTE */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400 block text-[11px]">📦 Prorrateo del Flete de Importación (Lote USA):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Costo Envío Total Lote (MXN):</label>
                      <input
                        type="number"
                        value={batchShippingTotal}
                        onChange={e => setBatchShippingTotal(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Unidades del Lote:</label>
                      <input
                        type="number"
                        value={batchUnitsTotal}
                        onChange={e => setBatchUnitsTotal(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold block">
                    Costo Flete por Unidad Asignado: +${shippingPerUnit.toFixed(2)} MXN
                  </span>
                </div>

                {/* CÁLCULO DE RESULTADOS */}
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block">Costo Total Unitario: ${totalCostUnitMxn.toFixed(2)} MXN</span>
                    <span className="text-sm font-black text-emerald-400">Ganancia Neta: +${profitUnit.toFixed(2)} MXN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Margen Real:</span>
                    <span className="text-base font-black text-indigo-400">{marginPercent.toFixed(1)}%</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition"
                >
                  Registrar en Catálogo y CRM
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
