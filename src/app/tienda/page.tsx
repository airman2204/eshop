'use client';

import { useState } from 'react';
import { ShoppingBag, Package, ShoppingCart, MessageSquare, MapPin } from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaCliente() {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
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

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.publicPrice * item.quantity), 0);
  const shippingCostFinal = selectedShipping === 'delivery' ? 45.00 : selectedShipping === 'national' ? 140.00 : 0;
  const cartTotal = cartSubtotal + shippingCostFinal;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER TIENDA CLIENTE */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-xl font-bold">🇺🇸</span>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wide">USA STORE PUEBLA</h1>
              <p className="text-xs text-slate-400">Productos Americanos de Importación Directa</p>
            </div>
          </div>
          <span className="bg-blue-950 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-800 font-semibold flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Tienda Cliente
          </span>
        </div>
      </header>

      {/* CONTENIDO TIENDA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-slate-800 p-6 md:p-8">
          <div className="relative z-10 max-w-xl">
            <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-blue-500/30">
              📍 Entregas directas en Puebla & Envíos a todo México
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
              Tus Productos Americanos Favoritos al Mejor Precio
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CATÁLOGO */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" /> Catálogo Disponible
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
                  <div>
                    <div className="relative h-40 rounded-lg overflow-hidden bg-slate-800 mb-3">
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="font-bold text-white text-base line-clamp-1">{product.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-emerald-400">${product.publicPrice.toFixed(2)} MXN</span>
                    <button onClick={() => addToCart(product)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHECKOUT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit space-y-5 sticky top-20">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShoppingCart className="w-5 h-5 text-blue-400" /> Tu Carrito
            </h3>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Tu carrito está vacío.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex justify-between items-center bg-slate-950 p-2 rounded text-xs">
                      <span>{i.product.title} (x{i.quantity})</span>
                      <span className="font-bold text-emerald-400">${(i.product.publicPrice * i.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <label className="font-semibold text-slate-300 block">Opción de Entrega / Envío:</label>
                  <select value={selectedShipping} onChange={(e: any) => setSelectedShipping(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
                    <option value="pickup">📍 Punto de Encuentro Gratis en Puebla</option>
                    <option value="delivery">🚚 Envío Local Domicilio Puebla (+$45.00 MXN)</option>
                    <option value="national">📦 Paquetería Nacional (FedEx/Estafeta +$140.00 MXN)</option>
                  </select>
                  {selectedShipping === 'pickup' && (
                    <div className="mt-2 p-2 bg-blue-950/40 border border-blue-800 rounded text-xs text-blue-300">
                      <p className="font-semibold flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Punto Gratuito:</p>
                      <select value={selectedPickupPoint} onChange={e => setSelectedPickupPoint(e.target.value)} className="mt-1 w-full bg-slate-950 text-white rounded p-1 text-xs">
                        <option>Plaza Dorada (Puebla)</option>
                        <option>Angelópolis Mall</option>
                        <option>Zócalo de Puebla</option>
                        <option>CAPU Central</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>${cartSubtotal.toFixed(2)} MXN</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                    <span>Total:</span>
                    <span className="text-emerald-400">${cartTotal.toFixed(2)} MXN</span>
                  </div>
                </div>

                <button onClick={() => alert('¡Gracias por tu pedido! Solicitud enviada a WhatsApp.')} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Confirmar Pedido por WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
