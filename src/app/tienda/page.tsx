'use client';

import { useState } from 'react';
import { 
  Search, ShoppingBag, ShoppingCart, Heart, Truck, ShieldCheck, ChevronRight, X, User,
  ArrowRight, Plus, Minus, CreditCard, Sparkles, Filter, Home, Grid, CheckCircle2, MapPin
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaCliente() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Registro y verificación OTP obligatoria al comprar
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Proceso de Checkout
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [shippingMethod, setShippingMethod] = useState<'puebla_local' | 'national'>('puebla_local');
  const [shippingAddress, setShippingAddress] = useState({ street: '', neighborhood: '', city: 'Puebla', zip: '' });
  const [paymentMethod, setPaymentMethod] = useState<'spei' | 'card'>('spei');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // Navegación móvil nativa (Bottom Bar)
  const [mobileTab, setMobileTab] = useState<'home' | 'categories' | 'custom' | 'profile'>('home');
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customItemText, setCustomItemText] = useState('');

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const toggleFav = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id);
      if (exists) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; quantity: number }[]);
  };

  const handleCheckoutInit = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCheckoutStep('shipping');
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPhone) return;
    setAuthStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length === 6 || otpCode === '123456') {
      setUser({ name: authName || 'Cliente', email: authEmail, phone: authPhone });
      setAuthStep('success');
      setTimeout(() => {
        setShowAuthModal(false);
        setCheckoutStep('shipping');
      }, 700);
    } else {
      alert('Ingresa el código 123456');
    }
  };

  const handleFinishOrder = () => {
    const newId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setConfirmedOrderId(newId);
    setCheckoutStep('success');
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const shippingFee = shippingMethod === 'puebla_local' ? 50.00 : 140.00;
  const cartTotal = cartSubtotal + shippingFee;
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-20 md:pb-0">
      
      {/* 1. HEADER LIMPIO */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
          
          <div className="flex items-center justify-between gap-4">
            
            {/* LOGOTIPO */}
            <div className="flex items-center space-x-2.5 cursor-pointer shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow">
                K
              </div>
              <div className="leading-tight">
                <span className="font-black text-base sm:text-lg tracking-tight block">KRONO</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block -mt-0.5">Tienda Selecta</span>
              </div>
            </div>

            {/* BUSCADOR */}
            <div className="flex-1 max-w-xl relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar en el catálogo..."
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 pl-4 pr-10 py-2 sm:py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500 focus:bg-slate-800 text-xs sm:text-sm transition"
              />
              <button className="absolute right-0 top-0 bottom-0 px-3.5 text-slate-400 hover:text-white flex items-center justify-center">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* ACCIONES DESKTOP */}
            <div className="hidden md:flex items-center space-x-5 text-xs font-semibold">
              <button
                onClick={() => setShowCustomOrderModal(true)}
                className="text-slate-300 hover:text-white transition"
              >
                Pedido Especial
              </button>

              {user ? (
                <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-200">{user.name}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Ingresar
                </button>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition shadow flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden lg:inline">Bolsa</span>
                {cartItemCount > 0 && (
                  <span className="bg-white text-blue-600 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>

            {/* CARRITO MÓVIL */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="md:hidden relative p-2 text-white bg-slate-800 rounded-xl"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* INFORMACIÓN SOBRE ENVÍOS */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Envíos locales en Puebla & paquetería a todo México</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. CARRUSEL HORIZONTAL DE CATEGORÍAS */}
      <div className="bg-white border-b border-slate-200 py-2.5 px-4 sm:px-6 overflow-x-auto no-scrollbar shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full font-semibold whitespace-nowrap transition text-xs shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENIDO PRINCIPAL: CATÁLOGO */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5 flex-1">

        {/* HERO BANNER SENCILLO */}
        <div className="bg-slate-900 rounded-2xl text-white p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 max-w-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Catálogo en línea</span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Artículos Selectos con Envío a Domicilio
            </h2>
            <p className="text-xs text-slate-300">
              Cotiza tu envío al momento del checkout y recibe tus productos de forma segura.
            </p>
          </div>
          <button
            onClick={() => setShowCustomOrderModal(true)}
            className="self-start sm:self-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition whitespace-nowrap"
          >
            Hacer Pedido Especial
          </button>
        </div>

        {/* PRODUCTOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
              Productos Disponibles ({filteredProducts.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-2xl border border-slate-200/90 product-card-shadow transition duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group relative"
              >
                {/* FAVORITO */}
                <button
                  onClick={(e) => toggleFav(product.id, e)}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-sm transition"
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                {/* IMAGEN */}
                <div className="aspect-square bg-slate-100/60 p-3 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                  />
                </div>

                {/* INFO */}
                <div className="p-3 space-y-1.5 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {product.category}
                    </span>

                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-lg sm:text-xl font-black text-slate-900">
                        ${product.publicPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">MXN</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-snug mt-1 group-hover:text-blue-600 transition">
                      {product.title}
                    </p>
                  </div>

                  <button
                    onClick={(e) => addToCart(product, e)}
                    className="w-full mt-2.5 bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white font-bold py-2 rounded-xl text-xs transition"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 4. EXPERIENCIA MÓVIL: BARRA INFERIOR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-around py-2 px-1 text-[10px] font-semibold text-slate-500 shadow-xl">
        <button
          onClick={() => { setMobileTab('home'); setSelectedCategory('Todas'); }}
          className={`flex flex-col items-center space-y-1 ${mobileTab === 'home' ? 'text-blue-600 font-black' : ''}`}
        >
          <Home className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setMobileTab('categories')}
          className={`flex flex-col items-center space-y-1 ${mobileTab === 'categories' ? 'text-blue-600 font-black' : ''}`}
        >
          <Grid className="w-5 h-5" />
          <span>Categorías</span>
        </button>

        <button
          onClick={() => setShowCustomOrderModal(true)}
          className="flex flex-col items-center space-y-1 text-indigo-600"
        >
          <Sparkles className="w-5 h-5" />
          <span>Encargo</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center space-y-1 relative"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Bolsa</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-1 right-2 bg-blue-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { if (!user) setShowAuthModal(true); else alert(`Usuario: ${user.name}`); }}
          className="flex flex-col items-center space-y-1"
        >
          <User className="w-5 h-5" />
          <span>{user ? 'Cuenta' : 'Ingresar'}</span>
        </button>
      </nav>

      {/* 5. MODAL DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="aspect-square bg-slate-100 rounded-2xl p-4 flex items-center justify-center border border-slate-200">
                <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="max-h-full object-contain" />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-blue-600 uppercase font-bold tracking-wider">{selectedProduct.category}</span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{selectedProduct.title}</h3>
                  
                  <div className="mt-2 flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-slate-900">${selectedProduct.publicPrice.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 font-semibold">MXN</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    Agregar a la bolsa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DRAWER DEL CARRITO & CHECKOUT */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-5 sm:p-6 space-y-4 overflow-y-auto shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" /> Bolsa de compras ({cartItemCount})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingCart className="w-12 h-12 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600">Tu bolsa está vacía</p>
                    <p className="text-xs text-slate-400 mt-1">Explora los artículos disponibles.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                          <img src={item.product.images[0]} alt={item.product.title} className="w-14 h-14 object-contain bg-white rounded-xl p-1 border border-slate-100" />
                          <div className="flex-1 flex flex-col justify-between">
                            <p className="font-bold text-slate-800 line-clamp-1">{item.product.title}</p>
                            <p className="font-black text-slate-900 text-sm">${(item.product.publicPrice * item.quantity).toFixed(2)} MXN</p>
                            
                            <div className="flex items-center space-x-2 mt-1">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">
                                <Minus className="w-3 h-3 text-slate-600" />
                              </button>
                              <span className="font-bold text-slate-800">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">
                                <Plus className="w-3 h-3 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between text-base font-black text-slate-900">
                        <span>Subtotal:</span>
                        <span>${cartSubtotal.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={handleCheckoutInit}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md"
                      >
                        Continuar al envío <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SELECCIÓN DE ENVÍO SENCILLA Y REALISTA */}
            {checkoutStep === 'shipping' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Selecciona la zona de entrega</h4>
                
                <div className="space-y-2">
                  <label
                    onClick={() => setShippingMethod('puebla_local')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${shippingMethod === 'puebla_local' ? 'bg-blue-50/50 border-blue-600 text-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">Envío Local (Puebla y alrededores)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Entrega a domicilio por mensajería local</p>
                    </div>
                    <span className="font-bold text-slate-900">$50.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setShippingMethod('national')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${shippingMethod === 'national' ? 'bg-blue-50/50 border-blue-600 text-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">Envío Nacional por Paquetería</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Guía con seguimiento en línea</p>
                    </div>
                    <span className="font-bold text-slate-900">$140.00 MXN</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-700">Dirección de entrega:</label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, Número y Colonia..."
                    value={shippingAddress.street}
                    onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Código Postal..."
                    value={shippingAddress.zip}
                    onChange={e => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total con envío:</span>
                    <span className="text-blue-600">${cartTotal.toFixed(2)} MXN</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs transition"
                  >
                    Continuar al pago
                  </button>
                </div>
              </div>
            )}

            {/* SELECCIÓN DE PAGO */}
            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Método de pago</h4>
                
                <div className="space-y-2">
                  <label onClick={() => setPaymentMethod('spei')} className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-blue-50/50 border-blue-600' : 'border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-slate-800">Transferencia bancaria SPEI</p>
                      <p className="text-[11px] text-slate-500">Datos bancarios al confirmar</p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">Sin Comisión</span>
                  </label>

                  <label onClick={() => setPaymentMethod('card')} className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-blue-50/50 border-blue-600' : 'border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-slate-800">Tarjeta Débito / Crédito</p>
                      <p className="text-[11px] text-slate-500">Pasarela en línea protegida</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleFinishOrder}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs transition shadow"
                  >
                    Confirmar pedido (${cartTotal.toFixed(2)} MXN)
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMACIÓN */}
            {checkoutStep === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900">¡Pedido recibido!</h4>
                <p className="text-xs text-slate-500">Número de orden: <strong className="text-slate-900">{confirmedOrderId}</strong>.</p>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-left w-full space-y-1">
                  <p><strong className="text-slate-700">Cliente:</strong> {user?.name}</p>
                  <p><strong className="text-slate-700">Envío:</strong> {shippingMethod === 'puebla_local' ? 'Local Puebla' : 'Nacional'}</p>
                  <p><strong className="text-slate-700">Pago:</strong> {paymentMethod.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs"
                >
                  Seguir comprando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 7. MODAL REGISTRO OTP OBLIGATORIO */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Ingresa tus datos para continuar</h3>
              <p className="text-xs text-slate-500">Te enviaremos un código de seguridad para confirmar tu cuenta.</p>
            </div>

            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Nombre completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mario González"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Correo electrónico:</label>
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Teléfono WhatsApp:</label>
                  <input
                    type="tel"
                    required
                    placeholder="222 123 4567"
                    value={authPhone}
                    onChange={e => setAuthPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow">
                  Enviar código de seguridad
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center text-blue-900">
                  <p>Código de verificación de prueba: <strong className="font-bold">123456</strong></p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-lg font-bold tracking-widest text-slate-900"
                />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow">
                  Verificar código
                </button>
              </form>
            )}

            {authStep === 'success' && (
              <div className="text-center py-4 text-xs font-bold text-emerald-600">
                ¡Cuenta confirmada con éxito!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. MODAL ENCARGO ESPECIAL */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-3 relative shadow-2xl">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base text-slate-900">Solicitar Pedido Especial</h3>
            <p className="text-xs text-slate-500">¿Buscas un artículo en particular que no ves en el catálogo? Dinos cuál y te lo conseguimos.</p>
            <textarea
              rows={4}
              placeholder="Nombre del producto, marca o descripción..."
              value={customItemText}
              onChange={e => setCustomItemText(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
            <button
              onClick={() => { alert('Solicitud enviada con éxito.'); setShowCustomOrderModal(false); }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs shadow"
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
