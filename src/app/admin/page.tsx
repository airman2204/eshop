'use client';

import { useState } from 'react';
import FoxDropLogo from '@/components/FoxDropLogo';
import { 
  Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare, 
  Search, ShieldAlert, Sparkles, TrendingUp, Clock, CheckCircle2, User, RefreshCw, BarChart3, ChevronRight, X
} from 'lucide-react';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_ABANDONED_CARTS } from '@/data/mockData';
import { Product, Order, AbandonedCart } from '@/types';

export default function AdminCRM() {
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'finance' | 'orders' | 'carts'>('inventory');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(INITIAL_ABANDONED_CARTS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Alta de Producto y Prorrateo de Envíos
  const [showAddModal, setShowAddModal] = useState(false);
  const [usdRate, setUsdRate] = useState(20.00);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Botanas & Snacks');
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

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInventoryUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalInvestment = products.reduce((acc, p) => acc + (p.totalCostMxn * p.stock), 0);
  const totalExpectedRevenue = products.reduce((acc, p) => acc + (p.publicPrice * p.stock), 0);
  const totalExpectedProfit = totalExpectedRevenue - totalInvestment;
  const avgMargin = totalExpectedRevenue > 0 ? (totalExpectedProfit / totalExpectedRevenue) * 100 : 0;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: Date.now().toString(),
      sku: `PROD-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle,
      description: 'Producto selecto del catálogo.',
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      
      {/* HEADER DEL CRM */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <FoxDropLogo size="sm" variant="light" showTagline={false} />
            <div className="border-l border-slate-200 pl-3">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-2">
                PANEL DE CONTROL <span className="bg-[#E65F2B] text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">CRM Admin</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Inventario, Prorrateo de Flete & Pedidos</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
              <span className="text-slate-500 text-[10px]">Tipo de Cambio:</span>
              <span className="font-bold text-slate-900">${usdRate.toFixed(2)} MXN</span>
            </div>
            <a
              href="/tienda"
              target="_blank"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              Ver Tienda <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* SUB-NAVEGACIÓN CRM */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => setCrmSubTab('inventory')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'inventory' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" /> Inventario & Prorrateo
          </button>
          <button
            onClick={() => setCrmSubTab('finance')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'finance' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Finanzas & Utilidad
          </button>
          <button
            onClick={() => setCrmSubTab('orders')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" /> Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setCrmSubTab('carts')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              crmSubTab === 'carts' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Carritos Inactivos ({abandonedCarts.length})
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* 1. SECCIÓN INVENTARIO & PRORRATEO */}
        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Control de Inventario y Costeo</h2>
                <p className="text-xs text-slate-500">Cálculo de costo prorrateado de flete y ganancia neta.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 w-48 sm:w-60"
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Dar de Alta Artículo
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">SKU / Producto</th>
                      <th className="p-4">Costo Base</th>
                      <th className="p-4 text-amber-600 font-bold">Flete Prorrateado</th>
                      <th className="p-4 font-bold text-slate-900">Costo Total</th>
                      <th className="p-4 font-bold text-slate-900">Precio Público</th>
                      <th className="p-4 font-bold text-emerald-600">Ganancia Neta</th>
                      <th className="p-4">Margen %</th>
                      <th className="p-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={p.images[0]} alt={p.title} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{p.title}</p>
                              <p className="text-[10px] text-slate-400">{p.sku} • {p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-600">${p.baseCostMxn.toFixed(2)} MXN</td>
                        <td className="p-4 font-bold text-amber-600">+${p.shippingCostAllocated.toFixed(2)} MXN</td>
                        <td className="p-4 font-bold text-slate-900">${p.totalCostMxn.toFixed(2)} MXN</td>
                        <td className="p-4 font-black text-slate-900">${p.publicPrice.toFixed(2)} MXN</td>
                        <td className="p-4 font-black text-emerald-600">+${p.profitUnit.toFixed(2)} MXN</td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                            {p.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {p.stock} pzas
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

        {/* 2. SECCIÓN FINANZAS */}
        {crmSubTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-slate-500 text-xs font-semibold">Inversión en Inventario</span>
                <p className="text-2xl font-black text-slate-900 mt-1.5">${totalInvestment.toFixed(2)} MXN</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Costo producto + flete prorrateado</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-slate-500 text-xs font-semibold">Ventas Proyectadas</span>
                <p className="text-2xl font-black text-slate-900 mt-1.5">${totalExpectedRevenue.toFixed(2)} MXN</p>
                <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Total inventario valorizado
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-slate-500 text-xs font-semibold">Ganancia Neta Estimada</span>
                <p className="text-2xl font-black text-emerald-600 mt-1.5">${totalExpectedProfit.toFixed(2)} MXN</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Utilidad libre deducida</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-slate-500 text-xs font-semibold">Margen Promedio</span>
                <p className="text-2xl font-black text-slate-900 mt-1.5">{avgMargin.toFixed(1)}%</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Rendimiento sobre venta</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-700" /> Prorrateo Automático de Envíos
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al recibir una remesa o caja con múltiples productos, ingresas el costo total del flete pagado y la cantidad de unidades. 
                El sistema divide el costo equitativamente y lo añade al costo base de cada pieza, protegiendo siempre tu margen de beneficio.
              </p>
            </div>
          </div>
        )}

        {/* 3. SECCIÓN PEDIDOS */}
        {crmSubTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Seguimiento de Pedidos</h2>
              <p className="text-xs text-slate-500">Actualiza estados y notifica al cliente por WhatsApp con un solo clic.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{order.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {order.status === 'delivered' ? '✓ Entregado' : order.status === 'shipped' ? '🚚 En Camino' : '⏳ En Preparación'}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{order.clientName} • <span className="text-slate-500">{order.clientPhone}</span></p>
                    <p className="text-slate-500 text-[11px]">Tipo de envío: {order.shippingType === 'puebla_local' ? 'Local Puebla' : 'Nacional'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Total</span>
                      <span className="text-base font-black text-slate-900">${order.total.toFixed(2)} MXN</span>
                    </div>

                    <select
                      value={order.status}
                      onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="processing">En Preparación</option>
                      <option value="shipped">En Camino</option>
                      <option value="delivered">Entregado</option>
                    </select>

                    <button
                      onClick={() => sendWhatsAppNotification(
                        order.clientPhone, 
                        `Hola ${order.clientName}, te informamos que tu pedido ${order.id} se encuentra: ${order.status.toUpperCase()}. Si deseas acordar los detalles de entrega, estamos a tu disposición.`
                      )}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Notificar WA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN CARRITOS INACTIVOS */}
        {crmSubTab === 'carts' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Carritos Inactivos</h2>
              <p className="text-xs text-slate-500">Contacta a los clientes que dejaron productos sin finalizar su orden.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {abandonedCarts.map(cart => (
                <div key={cart.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{cart.clientName}</span>
                    <span className="text-slate-500 ml-2">({cart.clientPhone})</span>
                    <p className="text-slate-500 mt-1">
                      Artículos: {cart.items.map(i => `${i.title} (x${i.quantity})`).join(', ')}
                    </p>
                    <span className="text-[10px] text-amber-600 block mt-0.5">Inactivo: {cart.lastActive}</span>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <span className="text-base font-black text-slate-900">${cart.total.toFixed(2)} MXN</span>
                    <button
                      onClick={() => sendWhatsAppNotification(
                        cart.clientPhone,
                        `Hola ${cart.clientName}, notamos que tienes artículos pendientes en tu bolsa de compra. Te ofrecemos un 5% de descuento especial con el código DESC5 para completar tu pedido hoy.`
                      )}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition text-xs shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Enviar Cupón WA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL ALTA DE ARTÍCULO */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Dar de Alta Producto con Prorrateo</h3>
                <p className="text-[11px] text-slate-500">Calcula la ganancia exacta considerando el costo del flete.</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Nombre del Producto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Papas Crunch Fuego 250g..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Categoría:</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    >
                      <option>Botanas & Snacks</option>
                      <option>Bebidas Selectas</option>
                      <option>Chocolates & Confitería</option>
                      <option>Cuidado Facial & Skincare</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Stock Inicial:</label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Costo Base Adquisición:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCostUsd}
                      onChange={e => setNewCostUsd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Equivalente MXN: ${costMxn.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Precio Venta Público:</label>
                    <input
                      type="number"
                      value={newPublicPrice}
                      onChange={e => setNewPublicPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block text-[11px]">📦 Prorrateo de Flete por Lote:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Costo Total Flete (MXN):</label>
                      <input
                        type="number"
                        value={batchShippingTotal}
                        onChange={e => setBatchShippingTotal(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Unidades del Lote:</label>
                      <input
                        type="number"
                        value={batchUnitsTotal}
                        onChange={e => setBatchUnitsTotal(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-700 font-bold block">
                    Costo Flete Asignado por Unidad: +${shippingPerUnit.toFixed(2)} MXN
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 block">Costo Total Unitario: ${totalCostUnitMxn.toFixed(2)} MXN</span>
                    <span className="text-sm font-black text-emerald-700">Ganancia Neta: +${profitUnit.toFixed(2)} MXN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Margen:</span>
                    <span className="text-base font-black text-slate-900">{marginPercent.toFixed(1)}%</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm transition"
                >
                  Guardar en Catálogo y CRM
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
