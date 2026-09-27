'use client';

import { useState } from 'react';
import { ShoppingBag, LayoutDashboard, Package, DollarSign, ShoppingCart, MessageSquare, Plus, AlertTriangle, ArrowUpRight, Search, Truck, MapPin } from 'lucide-react';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_ABANDONED_CARTS } from '@/data/mockData';
import { Product, Order, AbandonedCart } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'store' | 'crm'>('store');
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'finance' | 'orders' | 'carts'>('inventory');
  
  // Estados para productos y formulario de alta
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(INITIAL_ABANDONED_CARTS);
  
  // Formulario nuevo producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [usdRate] = useState(20.00); // 1 USD = 20 MXN
  const [newTitle, setNewTitle] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks & Botanas');
  const [newCostUsd, setNewCostUsd] = useState(5.00);
  const [batchShippingTotal, setBatchShippingTotal] = useState(500.00);
  const [batchUnitsTotal, setBatchUnitsTotal] = useState(25);
  const [newPublicPrice, setNewPublicPrice] = useState(220.00);
  const [newStock, setNewStock] = useState(10);

  // Cálculos dinámicos
  const costMxn = newCostUsd * usdRate;
  const shippingPerUnit = batchUnitsTotal > 0 ? batchShippingTotal / batchUnitsTotal : 0;
  const totalCostUnitMxn = costMxn + shippingPerUnit;
  const profitUnit = newPublicPrice - totalCostUnitMxn;
  const marginPercent = newPublicPrice > 0 ? (profitUnit / newPublicPrice) * 100 : 0;

  // Carrito de cliente
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<'pickup' | 'delivery' | 'national'>('pickup');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState('Plaza Dorada (Puebla)');

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: Date.now().toString(),
      sku: newSku || `USA-SKU-${Math.floor(Math.random() * 1000)}`,
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
      images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60'],
      daysInStock: 0
    };
    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setNewTitle('');
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.publicPrice * item.quantity), 0);
  const shippingCostFinal = selectedShipping === 'delivery' ? 45.00 : selectedShipping === 'national' ? 140.00 : 0;
  const cartTotal = cartSubtotal + shippingCostFinal;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER PRINCIPAL */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-xl font-bold">🇺🇸</span>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wide">USA IMPORT STORE</h1>
              <p className="text-xs text-slate-400">Productos Americanos & CRM ERP Control</p>
            </div>
          </div>

          {/* SWITCHER DE VISTAS (TIENDA VS CRM) */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'store' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Tienda Cliente</span>
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'crm' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>CRM / ERP Control</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* ======================================================== */}
        {/* VISTA 1: TIENDA CLIENTE (WEB / MOBILE PWA) */}
        {/* ======================================================== */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-slate-800 p-6 md:p-8">
              <div className="relative z-10 max-w-xl">
                <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-blue-500/30">
                  📍 Entregas directas en Puebla & Envíos a todo México
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
                  Tus Productos Americanos Favoritos al Mejor Precio
                </h2>
                <p className="mt-2 text-slate-300 text-sm md:text-base">
                  Snacks, refrescos, cosméticos y encargos especiales traídos directamente de EE.UU.
                </p>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: CATÁLOGO + CARRITO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LISTA DE PRODUCTOS (2 COLS) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" /> Catálogo Disponible
                  </h3>
                  <span className="text-xs text-slate-400">{products.length} productos en stock</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="relative h-40 rounded-lg overflow-hidden bg-slate-800 mb-3">
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur text-blue-400 text-xs px-2 py-1 rounded-md font-medium border border-slate-800">
                            {product.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base line-clamp-1">{product.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block">Precio Público</span>
                          <span className="text-lg font-extrabold text-emerald-400">${product.publicPrice.toFixed(2)} MXN</span>
                        </div>
                        <button
                          onClick={() => addToCart(product)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition shadow"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARRITO Y CHECKOUT EN PUEBLA (1 COL) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit space-y-5 sticky top-20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShoppingCart className="w-5 h-5 text-blue-400" /> Resumen de Tu Compra
                </h3>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Tu carrito está vacío. Agrega productos del catálogo.</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg text-xs">
                          <div>
                            <p className="font-semibold text-slate-200 line-clamp-1">{item.product.title}</p>
                            <p className="text-slate-400">${item.product.publicPrice} x {item.quantity}</p>
                          </div>
                          <span className="font-bold text-emerald-400">${(item.product.publicPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* SELECCIÓN DE ENVÍO */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="text-xs font-semibold text-slate-300 block">Opción de Entrega / Envío:</label>
                      <select
                        value={selectedShipping}
                        onChange={(e: any) => setSelectedShipping(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="pickup">📍 Punto de Encuentro Gratis en Puebla</option>
                        <option value="delivery">🚚 Envío Local Domicilio Puebla (+$45.00 MXN)</option>
                        <option value="national">📦 Paquetería Nacional (FedEx/Estafeta +$140.00 MXN)</option>
                      </select>

                      {selectedShipping === 'pickup' && (
                        <div className="mt-2 p-2 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs text-blue-300">
                          <p className="font-semibold flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Punto Gratuito:</p>
                          <select
                            value={selectedPickupPoint}
                            onChange={e => setSelectedPickupPoint(e.target.value)}
                            className="mt-1 w-full bg-slate-950 text-white rounded p-1 text-xs border border-blue-700"
                          >
                            <option>Plaza Dorada (Puebla)</option>
                            <option>Angelópolis Mall</option>
                            <option>Zócalo de Puebla</option>
                            <option>CAPU Central</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* TOTALES */}
                    <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span>${cartSubtotal.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Envío:</span>
                        <span>{shippingCostFinal === 0 ? '¡GRATIS!' : `$${shippingCostFinal.toFixed(2)} MXN`}</span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                        <span>Total:</span>
                        <span className="text-emerald-400">${cartTotal.toFixed(2)} MXN</span>
                      </div>
                    </div>

                    <button
                      onClick={() => alert('¡Gracias por tu pedido! Se ha generado tu solicitud y puedes darle seguimiento por WhatsApp.')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Confirmar Pedido por WhatsApp
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 2: CRM / ERP ADMINISTRATIVO DE CONTROL */}
        {/* ======================================================== */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            {/* SUB-NAVEGACIÓN CRM */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setCrmSubTab('inventory')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  crmSubTab === 'inventory' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" /> Inventario & Prorrateo
              </button>
              <button
                onClick={() => setCrmSubTab('finance')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  crmSubTab === 'finance' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4" /> Finanzas & Utilidad
              </button>
              <button
                onClick={() => setCrmSubTab('orders')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  crmSubTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" /> Pedidos & Envíos
              </button>
              <button
                onClick={() => setCrmSubTab('carts')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  crmSubTab === 'carts' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Carritos Abandonados ({abandonedCarts.length})
              </button>
            </div>

            {/* TAB 1: INVENTARIO CON CALCULADORA Y PRORRATEO */}
            {crmSubTab === 'inventory' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Gestión de Inventario & Alta con Costeo Real</h3>
                    <p className="text-xs text-slate-400">Prorrateo de envío USA-MX y cálculo automático de ganancia neta.</p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow"
                  >
                    <Plus className="w-4 h-4" /> Dar de Alta Artículo
                  </button>
                </div>

                {/* TABLA DE PRODUCTOS Y MÁRGENES */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">SKU / Producto</th>
                          <th className="p-3.5">Costo USD</th>
                          <th className="p-3.5">Costo MXN</th>
                          <th className="p-3.5">Envío Prorrateado</th>
                          <th className="p-3.5">Costo Total</th>
                          <th className="p-3.5">Precio Público</th>
                          <th className="p-3.5">Ganancia Unit.</th>
                          <th className="p-3.5">Margen %</th>
                          <th className="p-3.5">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <p className="font-bold text-white">{p.title}</p>
                              <p className="text-[10px] text-slate-400">{p.sku} • {p.category}</p>
                            </td>
                            <td className="p-3.5 font-medium">${p.baseCostUsd.toFixed(2)} USD</td>
                            <td className="p-3.5 font-medium">${p.baseCostMxn.toFixed(2)} MXN</td>
                            <td className="p-3.5 font-medium text-amber-400">+${p.shippingCostAllocated.toFixed(2)} MXN</td>
                            <td className="p-3.5 font-bold text-slate-200">${p.totalCostMxn.toFixed(2)} MXN</td>
                            <td className="p-3.5 font-bold text-blue-400">${p.publicPrice.toFixed(2)} MXN</td>
                            <td className="p-3.5 font-extrabold text-emerald-400">+${p.profitUnit.toFixed(2)} MXN</td>
                            <td className="p-3.5 font-bold">
                              <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/50">
                                {p.marginPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${p.stock < 5 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'}`}>
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

            {/* TAB 2: FINANZAS Y MÁRGENES */}
            {crmSubTab === 'finance' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs text-slate-400 font-medium">Ingresos Proyectados</span>
                  <p className="text-2xl font-extrabold text-white mt-1">$18,450.00 MXN</p>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +15.4% este mes
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs text-slate-400 font-medium">Ganancia Neta Estimada</span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">$6,820.00 MXN</p>
                  <span className="text-[11px] text-slate-400 mt-2 block">Considerando flete prorrateado</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs text-slate-400 font-medium">Margen Promedio de Utilidad</span>
                  <p className="text-2xl font-extrabold text-blue-400 mt-1">38.5%</p>
                  <span className="text-[11px] text-slate-400 mt-2 block">Optimizado para productos USA</span>
                </div>
              </div>
            )}

            {/* TAB 3: PEDIDOS Y SEGUIMIENTO EN PUEBLA */}
            {crmSubTab === 'orders' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-bold text-white">Panel de Control de Pedidos y Envíos</h3>
                <div className="space-y-3">
                  {orders.map(order => (
                    <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{order.id}</span>
                          <span className="bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-semibold border border-blue-800">
                            {order.shippingType === 'puebla_local' ? '📍 Puebla Local' : '📦 Paquetería Nacional'}
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium mt-1">{order.clientName} • {order.clientPhone}</p>
                        {order.pickupPoint && <p className="text-blue-400 mt-0.5">{order.pickupPoint}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Monto Total</span>
                          <span className="text-sm font-extrabold text-emerald-400">${order.total.toFixed(2)} MXN</span>
                        </div>
                        <button
                          onClick={() => alert(`Enviando notificación por WhatsApp al cliente ${order.clientPhone}`)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Avisar por WA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CARRITOS ABANDONADOS */}
            {crmSubTab === 'carts' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Carritos Abandonados & Atención al Cliente
                  </h3>
                  <p className="text-xs text-slate-400">Clientes que agregaron productos y no finalizaron la compra.</p>
                </div>

                <div className="space-y-3">
                  {abandonedCarts.map(cartItem => (
                    <div key={cartItem.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">{cartItem.clientName} ({cartItem.clientPhone})</p>
                        <p className="text-slate-400 mt-1">
                          Items: {cartItem.items.map(i => `${i.title} (${i.quantity})`).join(', ')}
                        </p>
                        <span className="text-[10px] text-amber-400 mt-1 block">Inactivo: {cartItem.lastActive}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-sm">${cartItem.total.toFixed(2)} MXN</span>
                        <button
                          onClick={() => alert(`Enviando cupón de descuento por WhatsApp a ${cartItem.clientPhone}`)}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Enviar Cupón WA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODAL PARA DAR DE ALTA UN PRODUCTO CON PRORRATEO Y GANANCIA */}
            {showAddModal && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">Alta de Producto & Calculadora de Margen</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
                  </div>

                  <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Nombre del Producto:</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Ej. Cheetos Flamin Hot USA 250g"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Costo Producto (USD):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newCostUsd}
                          onChange={e => setNewCostUsd(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">En MXN (1 USD = 20.00): ${costMxn.toFixed(2)}</span>
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Precio Venta Público (MXN):</label>
                        <input
                          type="number"
                          step="1"
                          value={newPublicPrice}
                          onChange={e => setNewPublicPrice(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-emerald-400"
                        />
                      </div>
                    </div>

                    {/* SECCIÓN PRORRATEO DE ENVÍO LOTE USA */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <span className="font-bold text-blue-400 block">📦 Prorrateo Envío Lote EE.UU. -&gt; México:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Costo Envío Total Lote (MXN):</label>
                          <input
                            type="number"
                            value={batchShippingTotal}
                            onChange={e => setBatchShippingTotal(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Unidades Totales del Lote:</label>
                          <input
                            type="number"
                            value={batchUnitsTotal}
                            onChange={e => setBatchUnitsTotal(parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-amber-400 block font-medium">
                        Costo Envío Asignado por Unidad: +${shippingPerUnit.toFixed(2)} MXN
                      </span>
                    </div>

                    {/* RESUMEN DE MARGEN CALCULADO */}
                    <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-300 block">Costo Total Unitario: ${totalCostUnitMxn.toFixed(2)} MXN</span>
                        <span className="font-extrabold text-emerald-400 text-sm">Ganancia Neta: +${profitUnit.toFixed(2)} MXN</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Margen de Ganancia:</span>
                        <span className="font-extrabold text-blue-400 text-base">{marginPercent.toFixed(1)}%</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow"
                    >
                      Guardar Producto en Inventario
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
