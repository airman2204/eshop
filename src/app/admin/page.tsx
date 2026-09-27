'use client';

import { useState } from 'react';
import { Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare } from 'lucide-react';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_ABANDONED_CARTS } from '@/data/mockData';
import { Product, Order, AbandonedCart } from '@/types';

export default function AdminCRM() {
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'finance' | 'orders' | 'carts'>('inventory');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders] = useState<Order[]>(INITIAL_ORDERS);
  const [abandonedCarts] = useState<AbandonedCart[]>(INITIAL_ABANDONED_CARTS);
  
  // Alta de Producto y Prorrateo
  const [showAddModal, setShowAddModal] = useState(false);
  const [usdRate] = useState(20.00);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory] = useState('Snacks & Botanas');
  const [newCostUsd, setNewCostUsd] = useState(5.00);
  const [batchShippingTotal, setBatchShippingTotal] = useState(500.00);
  const [batchUnitsTotal, setBatchUnitsTotal] = useState(25);
  const [newPublicPrice, setNewPublicPrice] = useState(220.00);

  const costMxn = newCostUsd * usdRate;
  const shippingPerUnit = batchUnitsTotal > 0 ? batchShippingTotal / batchUnitsTotal : 0;
  const totalCostUnitMxn = costMxn + shippingPerUnit;
  const profitUnit = newPublicPrice - totalCostUnitMxn;
  const marginPercent = newPublicPrice > 0 ? (profitUnit / newPublicPrice) * 100 : 0;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: Date.now().toString(),
      sku: `USA-SKU-${Math.floor(Math.random() * 1000)}`,
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
      stock: 15,
      isSpecialOrder: false,
      images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60'],
      daysInStock: 0
    };
    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setNewTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER CRM */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-600 text-white p-2 rounded-xl text-xl font-bold">⚙️</span>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wide">CRM & ERP CONTROL ADMINISTRATIVO</h1>
              <p className="text-xs text-slate-400">Control de Inventario, Costeo Prorrateado y Envíos</p>
            </div>
          </div>
          <span className="bg-indigo-950 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-800 font-semibold">
            Modo Administrador
          </span>
        </div>
      </header>

      {/* CONTENIDO CRM */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setCrmSubTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              crmSubTab === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" /> Inventario & Prorrateo EE.UU.
          </button>
          <button
            onClick={() => setCrmSubTab('finance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              crmSubTab === 'finance' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Finanzas & Ganancias
          </button>
          <button
            onClick={() => setCrmSubTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              crmSubTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" /> Pedidos & Envíos Puebla
          </button>
          <button
            onClick={() => setCrmSubTab('carts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              crmSubTab === 'carts' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Carritos Abandonados ({abandonedCarts.length})
          </button>
        </div>

        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Inventario & Prorrateo de Importación</h3>
                <p className="text-xs text-slate-400">Calculadora de costo real por producto y margen neta de utilidad.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow"
              >
                <Plus className="w-4 h-4" /> Dar de Alta Artículo
              </button>
            </div>

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
                        <td className="p-3.5 font-bold text-indigo-400">${p.publicPrice.toFixed(2)} MXN</td>
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

        {crmSubTab === 'finance' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Ingresos Totales Proyectados</span>
              <p className="text-2xl font-extrabold text-white mt-1">$18,450.00 MXN</p>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-3.5 h-3.5" /> +15.4% este mes
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Ganancia Neta Real</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">$6,820.00 MXN</p>
              <span className="text-[11px] text-slate-400 mt-2 block">Deduciendo flete e importación</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Margen Promedio</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">38.5%</p>
            </div>
          </div>
        )}

        {crmSubTab === 'orders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">Pedidos Activos</h3>
            {orders.map(order => (
              <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-white text-sm">{order.id}</span>
                  <p className="text-slate-300">{order.clientName} • {order.clientPhone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-400">${order.total.toFixed(2)} MXN</span>
                  <button onClick={() => alert(`Notificando a ${order.clientPhone}`)} className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Enviar WA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {crmSubTab === 'carts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">Carritos Abandonados</h3>
            {abandonedCarts.map(c => (
              <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white">{c.clientName} ({c.clientPhone})</p>
                  <p className="text-slate-400">Total: ${c.total.toFixed(2)} MXN</p>
                </div>
                <button onClick={() => alert(`Enviando cupón WA a ${c.clientPhone}`)} className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Enviar Cupón WA
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">Alta de Producto CRM</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400">✕</button>
              </div>
              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Nombre del Producto:</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Costo USD:</label>
                    <input type="number" step="0.1" value={newCostUsd} onChange={e => setNewCostUsd(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Precio Venta MXN:</label>
                    <input type="number" value={newPublicPrice} onChange={e => setNewPublicPrice(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-bold text-emerald-400" />
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400 block">Prorrateo de Envío Lote USA:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={batchShippingTotal} onChange={e => setBatchShippingTotal(parseFloat(e.target.value) || 0)} placeholder="Envío Lote MXN" className="bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                    <input type="number" value={batchUnitsTotal} onChange={e => setBatchUnitsTotal(parseInt(e.target.value) || 1)} placeholder="Unidades Lote" className="bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                  </div>
                  <span className="text-[11px] text-amber-400 block">+${shippingPerUnit.toFixed(2)} MXN envío por unidad</span>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded flex justify-between text-xs">
                  <span className="font-extrabold text-emerald-400">Ganancia: +${profitUnit.toFixed(2)} MXN</span>
                  <span className="font-bold text-indigo-400">{marginPercent.toFixed(1)}% Margen</span>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded text-xs">Guardar en CRM</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
