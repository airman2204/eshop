'use client';

import { useState } from 'react';
import { Search, ShoppingBag, ShoppingCart, Lock, CheckCircle2, User, Filter, ArrowRight, X, Phone, Mail, MapPin, Truck } from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaCliente() {
  // Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Productos y Carrito
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Usuario Autenticado / Registro OTP
  const [user, setUser] = useState<{ email: string; phone: string; name: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Flujo de Checkout en la App
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'confirmation'>('cart');
  const [shippingType, setShippingType] = useState<'puebla_pickup' | 'puebla_delivery' | 'national'>('puebla_pickup');
  const [pickupPoint, setPickupPoint] = useState('Plaza Dorada (Puebla)');
  const [shippingAddress, setShippingAddress] = useState({ street: '', zip: '', city: 'Puebla' });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'spei' | 'cash_pickup'>('spei');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Categorías Únicas
  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  // Productos Filtrados por búsqueda y categoría
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  // INTENTO DE COMPRA -> OBLIGA A REGISTRARSE/INICIAR SESIÓN
  const handleProceedToCheckout = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCheckoutStep('shipping');
  };

  // VERIFICACIÓN OTP REAL/SIMULADA
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPhone) return;
    setAuthStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length === 6 || otpCode === '123456') {
      setUser({ email: authEmail, phone: authPhone, name: authName || 'Cliente USA Store' });
      setAuthStep('success');
      setTimeout(() => {
        setShowAuthModal(false);
        setCheckoutStep('shipping');
      }, 1000);
    } else {
      alert('Código incorrecto. Ingresa 123456 para probar.');
    }
  };

  const handleFinalizePurchase = () => {
    const orderId = `USA-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setCreatedOrderId(orderId);
    setCheckoutStep('confirmation');
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const shippingFee = shippingType === 'puebla_delivery' ? 45.00 : shippingType === 'national' ? 140.00 : 0;
  const cartTotal = cartSubtotal + shippingFee;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. HEADER DE LA TIENDA DE COMERCIO ELECTRÓNICO */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-xl font-bold">🇺🇸</span>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wide">USA IMPORT STORE</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Productos Importados Directamente de EE.UU.</p>
            </div>
          </div>

          {/* BUSCADOR DE PRODUCTOS */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar snacks, refrescos, cosméticos de EE.UU..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* CUENTA Y CARRITO */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-200">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl border border-slate-700 transition"
              >
                Iniciar Sesión / Registro
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition shadow flex items-center gap-2 text-xs font-bold"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Carrito</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-950">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* BUSCADOR MÓVIL */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos americanos..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </header>

      {/* 2. BARRA DE CATEGORÍAS */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-blue-400 mr-1" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedCategory === cat ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENIDO PRINCIPAL: CATÁLOGO DE PRODUCTOS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-white">Catálogo de Productos Americanos</h2>
          <span className="text-xs text-slate-400">{filteredProducts.length} artículos encontrados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition group">
              <div>
                <div className="relative h-44 rounded-xl overflow-hidden bg-slate-800 mb-3">
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur text-blue-400 text-[10px] px-2 py-0.5 rounded-md font-semibold border border-slate-800">
                    {product.category}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-1">{product.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Precio Público</span>
                  <span className="text-base font-extrabold text-emerald-400">${product.publicPrice.toFixed(2)} MXN</span>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 4. MODAL/DRAWER DE CARRITO & CHECKOUT COMPLETO DENTRO DE LA WEB */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between p-5 space-y-4 overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" /> Carrito de Compras
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PASO 1: RESUMEN DEL CARRITO */}
            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <ShoppingBag className="w-12 h-12 mb-2 stroke-1" />
                    <p className="text-sm">Tu carrito está vacío.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                          <div>
                            <p className="font-bold text-white">{item.product.title}</p>
                            <p className="text-slate-400">${item.product.publicPrice} MXN c/u</p>
                          </div>
                          <span className="font-extrabold text-emerald-400">${(item.product.publicPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <div className="flex justify-between text-sm font-extrabold text-white">
                        <span>Subtotal:</span>
                        <span className="text-emerald-400">${cartSubtotal.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={handleProceedToCheckout}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow"
                      >
                        Continuar al Checkout <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO 2: SELECCIÓN DE ENVÍO */}
            {checkoutStep === 'shipping' && (
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Selecciona Método de Entrega</h4>
                
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setShippingType('puebla_pickup')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_pickup' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Punto de Encuentro Gratis (Puebla)</p>
                      <p className="text-[10px] text-slate-400">Plaza Dorada, Angelópolis, CAPU, Zócalo</p>
                    </div>
                    <span className="font-bold text-emerald-400">GRATIS</span>
                  </label>

                  <label
                    onClick={() => setShippingType('puebla_delivery')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_delivery' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-400" /> Envío Local a Domicilio (Puebla)</p>
                      <p className="text-[10px] text-slate-400">Entrega rápida en Puebla y Cholula</p>
                    </div>
                    <span className="font-bold text-white">$45.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setShippingType('national')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'national' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-400" /> Paquetería Nacional</p>
                      <p className="text-[10px] text-slate-400">FedEx, DHL, Estafeta (Cotizado por API)</p>
                    </div>
                    <span className="font-bold text-white">$140.00 MXN</span>
                  </label>
                </div>

                {shippingType === 'puebla_pickup' && (
                  <div className="space-y-1 text-xs">
                    <label className="text-slate-300 font-semibold block">Elige el Punto de Entrega en Puebla:</label>
                    <select
                      value={pickupPoint}
                      onChange={e => setPickupPoint(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    >
                      <option>Plaza Dorada (Puebla)</option>
                      <option>Angelópolis Mall</option>
                      <option>Zócalo de Puebla</option>
                      <option>CAPU Central</option>
                    </select>
                  </div>
                )}

                {(shippingType === 'puebla_delivery' || shippingType === 'national') && (
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Calle y Número Ext/Int..."
                      value={shippingAddress.street}
                      onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Código Postal..."
                      value={shippingAddress.zip}
                      onChange={e => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Total Pedido:</span>
                    <span className="text-emerald-400 font-extrabold text-sm">${cartTotal.toFixed(2)} MXN</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    Proceder al Pago <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: SELECCIÓN DE MÉTODO DE PAGO */}
            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Método de Pago Seguro</h4>
                
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setPaymentMethod('spei')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <span>🏦 Transferencia bancaria SPEI</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Sin Comisión</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <span>💳 Tarjeta Débito / Crédito</span>
                    <span className="text-[10px] text-slate-400">Stripe/MercadoPago</span>
                  </label>

                  {shippingType === 'puebla_pickup' && (
                    <label
                      onClick={() => setPaymentMethod('cash_pickup')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'cash_pickup' ? 'bg-blue-950/40 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span>💵 Pago en efectivo al entregar (Puebla)</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Contra Entrega</span>
                    </label>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    onClick={handleFinalizePurchase}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    Pagar y Confirmar Pedido (${cartTotal.toFixed(2)} MXN)
                  </button>
                </div>
              </div>
            )}

            {/* PASO 4: CONFIRMACIÓN DE PEDIDO & RASTREO */}
            {checkoutStep === 'confirmation' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                <h4 className="text-lg font-extrabold text-white">¡Pedido Registrado con Éxito!</h4>
                <p className="text-xs text-slate-400">
                  Tu número de pedido es <span className="text-blue-400 font-bold">{createdOrderId}</span>.
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left w-full space-y-1">
                  <p className="text-slate-300"><strong className="text-white">Cliente:</strong> {user?.name}</p>
                  <p className="text-slate-300"><strong className="text-white">Estatus:</strong> Procesando en Almacén</p>
                  <p className="text-slate-300"><strong className="text-white">Entrega:</strong> {shippingType === 'puebla_pickup' ? pickupPoint : 'Envío a Domicilio'}</p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('cart');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Seguir Comprando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 5. MODAL DE AUTENTICACIÓN / REGISTRO CON CÓDIGO OTP (REQUERIDO PARA COMPRAR) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Registro / Inicio de Sesión</h3>
              <p className="text-xs text-slate-400">Para completar tu compra requieres verificar tu cuenta.</p>
            </div>

            {/* PASO A: CORREO Y TELÉFONO */}
            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mario González"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Correo Electrónico:</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Número Celular (WhatsApp):</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+52 222 123 4567"
                      value={authPhone}
                      onChange={e => setAuthPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  Tus datos están protegidos bajo la Ley LFPDPPP. Te enviaremos un código OTP de 6 dígitos.
                </p>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition shadow"
                >
                  Enviar Código de Verificación OTP
                </button>
              </form>
            )}

            {/* PASO B: INGRESO CÓDIGO OTP */}
            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-xl text-center">
                  <p className="text-blue-300 text-xs font-semibold">Código de verificación enviado a:</p>
                  <p className="text-white font-extrabold">{authEmail}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Sugerencia de prueba: Ingresa <strong className="text-emerald-400">123456</strong></p>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block text-center mb-2">Código de 6 dígitos:</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-blue-500 rounded-xl p-3 text-center text-lg font-black tracking-widest text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow"
                >
                  Verificar y Continuar Compra
                </button>
              </form>
            )}

            {/* PASO C: ÉXITO */}
            {authStep === 'success' && (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">¡Cuenta Verificada Correctamente!</h4>
                <p className="text-xs text-slate-400">Redirigiendo al checkout...</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
