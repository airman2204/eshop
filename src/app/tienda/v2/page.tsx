'use client';

import { useState } from 'react';
import { 
  Search, ShoppingBag, Heart, MapPin, Truck, Zap, ShieldCheck, ChevronRight, X, User,
  ArrowRight, Plus, Minus, CreditCard, Sparkles, Filter, Home, Layers, MessageSquare, CheckCircle2,
  SlidersHorizontal, ArrowLeft, Star, ShoppingCart, Send
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaNordicStudio() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Registro y verificación OTP
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Proceso de Checkout
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [deliveryType, setDeliveryType] = useState<'puebla_pickup' | 'puebla_delivery' | 'national'>('puebla_pickup');
  const [pickupPoint, setPickupPoint] = useState('Punto de Encuentro: Plaza Dorada');
  const [paymentMethod, setPaymentMethod] = useState<'spei' | 'card' | 'cash_delivery'>('spei');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // Navegación móvil
  const [mobileTab, setMobileTab] = useState<'catalog' | 'search' | 'orders' | 'profile'>('catalog');
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
  const shippingFee = deliveryType === 'puebla_delivery' ? 45.00 : deliveryType === 'national' ? 140.00 : 0;
  const cartTotal = cartSubtotal + shippingFee;
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col font-sans pb-20 md:pb-0 selection:bg-[#E8E2D5] selection:text-[#1A1A1A]">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#1A1A1A] text-white text-[11px] font-medium py-2 px-4 text-center tracking-widest uppercase flex items-center justify-center gap-2">
        <span>Puebla: Entregas personales sin costo en puntos seguros | Envíos a todo el país</span>
      </div>

      {/* 2. HEADER MINIMALISTA ESTILO ESTUDIO */}
      <header className="border-b border-[#EAE6DF] bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-6">
          
          {/* BRAND */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif text-sm font-bold shadow-xs">
              M
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl tracking-tight text-[#1A1A1A] font-bold">
                Maison
              </h1>
            </div>
          </div>

          {/* BUSCADOR ESTILO REVISTA */}
          <div className="flex-1 max-w-lg relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar en la colección..."
              className="w-full bg-[#F5F2EB] text-[#1A1A1A] placeholder-gray-400 pl-11 pr-4 py-2.5 rounded-full border border-transparent focus:outline-none focus:bg-white focus:border-[#1A1A1A] text-xs sm:text-sm transition"
            />
          </div>

          {/* ACCIONES */}
          <div className="flex items-center space-x-6 text-xs font-medium">
            <button
              onClick={() => setShowCustomOrderModal(true)}
              className="hidden lg:inline-flex text-[#1A1A1A] hover:opacity-70 transition underline underline-offset-4"
            >
              Pedido Especial
            </button>

            {user ? (
              <div className="flex items-center space-x-1.5 text-xs font-semibold">
                <User className="w-4 h-4 text-[#1A1A1A]" />
                <span>{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:inline-block hover:opacity-70 transition"
              >
                Cuenta
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#1A1A1A] hover:opacity-70 transition"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* BUSCADOR MÓVIL */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full bg-[#F5F2EB] text-[#1A1A1A] rounded-full pl-10 pr-4 py-2 text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>
        </div>
      </header>

      {/* 3. BARRA HORIZONTAL DE CATEGORÍAS */}
      <div className="border-b border-[#EAE6DF] bg-white py-3 px-4 sm:px-8 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center space-x-3 text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full font-medium transition text-xs shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-transparent text-gray-600 hover:text-black border border-[#EAE6DF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. CONTENIDO PRINCIPAL: CATÁLOGO ESTILO EDITORIAL */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1">
        
        {/* BANNER EDITORIAL */}
        <div className="bg-[#EFECE6] rounded-3xl p-6 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#E2DDD3]">
          <div className="max-w-xl space-y-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Curaduría Selecta</span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#1A1A1A] font-normal leading-tight">
              Diseño, sabor y cuidado diario.
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pt-1">
              Una selección exclusiva de artículos de alta demanda con entregas coordinadas en Puebla o envío a domicilio.
            </p>
          </div>
          <button
            onClick={() => setShowCustomOrderModal(true)}
            className="bg-[#1A1A1A] hover:bg-[#333] text-white font-medium px-6 py-3 rounded-full text-xs transition shadow-xs"
          >
            Hacer un Encargo Especial
          </button>
        </div>

        {/* LISTADO DE PRODUCTOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
              Colección ({filteredProducts.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-[#EAE6DF] hover:border-[#1A1A1A] transition duration-300 flex flex-col justify-between cursor-pointer group relative"
              >
                {/* FAVORITO */}
                <button
                  onClick={(e) => toggleFav(product.id, e)}
                  className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/80 backdrop-blur-xs text-gray-400 hover:text-black transition"
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(product.id) ? 'fill-black text-black' : ''}`} />
                </button>

                {/* IMAGEN */}
                <div className="aspect-square bg-[#F8F6F0] rounded-xl p-4 flex items-center justify-center overflow-hidden mb-3">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-500"
                  />
                </div>

                {/* INFO */}
                <div className="space-y-1.5 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      {product.category}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#1A1A1A] line-clamp-1 mt-0.5">
                      {product.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-1">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#F0ECE4] flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block">Precio</span>
                      <span className="text-base font-bold text-[#1A1A1A]">
                        ${product.publicPrice.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">MXN</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => addToCart(product, e)}
                      className="bg-[#1A1A1A] hover:bg-[#333] text-white p-2.5 rounded-full transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 5. EXPERIENCIA MÓVIL: BARRA INFERIOR MODERNA */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EAE6DF] z-50 flex items-center justify-around py-3 px-2 text-[10px] font-medium text-gray-500 shadow-sm">
        <button
          onClick={() => { setMobileTab('catalog'); setSelectedCategory('Todas'); }}
          className={`flex flex-col items-center space-y-1 ${mobileTab === 'catalog' ? 'text-[#1A1A1A] font-bold' : ''}`}
        >
          <Home className="w-4 h-4" />
          <span>Colección</span>
        </button>

        <button
          onClick={() => setShowCustomOrderModal(true)}
          className="flex flex-col items-center space-y-1 text-[#1A1A1A]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Encargo</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center space-y-1 relative text-[#1A1A1A]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Bolsa</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-1 right-2 bg-[#1A1A1A] text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { if (!user) setShowAuthModal(true); else alert(`Bienvenido ${user.name}`); }}
          className="flex flex-col items-center space-y-1"
        >
          <User className="w-4 h-4" />
          <span>{user ? 'Perfil' : 'Ingresar'}</span>
        </button>
      </nav>

      {/* 6. MODAL FICHA DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative shadow-xl border border-[#EAE6DF]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="aspect-square bg-[#F8F6F0] rounded-2xl p-6 flex items-center justify-center border border-[#EAE6DF]">
                <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="max-h-full object-contain" />
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{selectedProduct.category}</span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] mt-1">{selectedProduct.title}</h3>
                  
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-[#1A1A1A]">${selectedProduct.publicPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">MXN</span>
                  </div>

                  <p className="text-xs text-gray-600 mt-4 leading-relaxed border-t border-[#F0ECE4] pt-3">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3.5 rounded-full text-xs transition shadow-xs"
                  >
                    Añadir a la bolsa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DRAWER DE CARRITO & CHECKOUT */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 space-y-6 overflow-y-auto shadow-2xl border-l border-[#EAE6DF]">
            
            <div className="flex justify-between items-center border-b border-[#EAE6DF] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Bolsa de compras ({cartItemCount})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <ShoppingBag className="w-10 h-10 mb-3 stroke-1 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">Tu bolsa está vacía</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex gap-4 bg-[#FBF9F5] p-3.5 rounded-2xl border border-[#EAE6DF] text-xs">
                          <img src={item.product.images[0]} alt={item.product.title} className="w-14 h-14 object-contain bg-white rounded-xl p-1" />
                          <div className="flex-1 flex flex-col justify-between">
                            <p className="font-serif font-bold text-[#1A1A1A] line-clamp-1">{item.product.title}</p>
                            <p className="font-medium text-gray-600">${(item.product.publicPrice * item.quantity).toFixed(2)} MXN</p>
                            
                            <div className="flex items-center space-x-2 mt-2">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded-full bg-white border border-[#EAE6DF]">
                                <Minus className="w-3 h-3 text-gray-600" />
                              </button>
                              <span className="font-bold text-[#1A1A1A]">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded-full bg-white border border-[#EAE6DF]">
                                <Plus className="w-3 h-3 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-[#EAE6DF] space-y-3">
                      <div className="flex justify-between text-base font-bold text-[#1A1A1A]">
                        <span>Subtotal:</span>
                        <span>${cartSubtotal.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={handleCheckoutInit}
                        className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3.5 rounded-full text-xs transition"
                      >
                        Continuar al Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {checkoutStep === 'shipping' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-serif font-bold text-base text-[#1A1A1A] border-b border-[#EAE6DF] pb-2">Selección de Entrega</h4>
                <div className="space-y-2">
                  <label
                    onClick={() => setDeliveryType('puebla_pickup')}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${deliveryType === 'puebla_pickup' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}
                  >
                    <div>
                      <p className="font-bold text-[#1A1A1A]">Punto de Encuentro en Puebla</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Plaza Dorada, Angelópolis o Zócalo</p>
                    </div>
                    <span className="font-bold text-emerald-700">GRATIS</span>
                  </label>

                  <label
                    onClick={() => setDeliveryType('puebla_delivery')}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${deliveryType === 'puebla_delivery' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}
                  >
                    <div>
                      <p className="font-bold text-[#1A1A1A]">Envío Local a Domicilio Puebla</p>
                    </div>
                    <span className="font-bold text-[#1A1A1A]">$45.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setDeliveryType('national')}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${deliveryType === 'national' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}
                  >
                    <div>
                      <p className="font-bold text-[#1A1A1A]">Paquetería Nacional</p>
                    </div>
                    <span className="font-bold text-[#1A1A1A]">$140.00 MXN</span>
                  </label>
                </div>

                {deliveryType === 'puebla_pickup' && (
                  <div className="space-y-1 pt-2">
                    <label className="font-semibold text-gray-600">Elige el punto de entrega:</label>
                    <select
                      value={pickupPoint}
                      onChange={e => setPickupPoint(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#EAE6DF] rounded-xl p-2.5 text-xs text-[#1A1A1A]"
                    >
                      <option>Punto de Encuentro: Plaza Dorada</option>
                      <option>Punto de Encuentro: Angelópolis Mall</option>
                      <option>Punto de Encuentro: Zócalo de Puebla</option>
                      <option>Punto de Encuentro: Central CAPU</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t border-[#EAE6DF] space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total con entrega:</span>
                    <span className="text-[#1A1A1A]">${cartTotal.toFixed(2)} MXN</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3.5 rounded-full text-xs transition"
                  >
                    Proceder al Pago
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-serif font-bold text-base text-[#1A1A1A] border-b border-[#EAE6DF] pb-2">Forma de Pago</h4>
                <div className="space-y-2">
                  <label onClick={() => setPaymentMethod('spei')} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}>
                    <span className="font-bold text-[#1A1A1A]">Transferencia bancaria SPEI</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Sin Cargo Extra</span>
                  </label>

                  <label onClick={() => setPaymentMethod('card')} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}>
                    <span className="font-bold text-[#1A1A1A]">Tarjeta Débito / Crédito</span>
                  </label>

                  {deliveryType === 'puebla_pickup' && (
                    <label onClick={() => setPaymentMethod('cash_delivery')} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'cash_delivery' ? 'bg-[#FBF9F5] border-[#1A1A1A]' : 'border-[#EAE6DF]'}`}>
                      <span className="font-bold text-[#1A1A1A]">Efectivo contra entrega en Puebla</span>
                    </label>
                  )}
                </div>

                <div className="pt-4 border-t border-[#EAE6DF]">
                  <button
                    onClick={handleFinishOrder}
                    className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3.5 rounded-full text-xs transition"
                  >
                    Confirmar Pedido (${cartTotal.toFixed(2)} MXN)
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#1A1A1A]" />
                <h4 className="font-serif text-lg font-bold text-[#1A1A1A]">¡Pedido Confirmado!</h4>
                <p className="text-xs text-gray-500">Orden número <strong className="text-[#1A1A1A]">{confirmedOrderId}</strong>.</p>
                <button
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                  className="w-full bg-[#1A1A1A] text-white font-medium py-3 rounded-full text-xs"
                >
                  Regresar a la Colección
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 8. MODAL DE AUTENTICACIÓN OTP */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-xl border border-[#EAE6DF]">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">Crear Cuenta / Iniciar Sesión</h3>
              <p className="text-xs text-gray-500">Te enviaremos un código de acceso para confirmar tu compra.</p>
            </div>

            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellidos..."
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-[#F5F2EB] border border-transparent rounded-xl p-3 text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#1A1A1A]"
                />
                <input
                  type="email"
                  required
                  placeholder="Correo Electrónico..."
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-[#F5F2EB] border border-transparent rounded-xl p-3 text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#1A1A1A]"
                />
                <input
                  type="tel"
                  required
                  placeholder="Teléfono WhatsApp..."
                  value={authPhone}
                  onChange={e => setAuthPhone(e.target.value)}
                  className="w-full bg-[#F5F2EB] border border-transparent rounded-xl p-3 text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#1A1A1A]"
                />
                <button type="submit" className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3 rounded-full transition">
                  Enviar Código de Verificación
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="bg-[#F5F2EB] p-3 rounded-xl text-center text-gray-700">
                  <p>Código de prueba: <strong className="font-bold text-[#1A1A1A]">123456</strong></p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full bg-[#F5F2EB] border border-[#EAE6DF] rounded-xl p-3 text-center text-lg font-bold tracking-widest text-[#1A1A1A]"
                />
                <button type="submit" className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3 rounded-full transition">
                  Confirmar Acceso
                </button>
              </form>
            )}

            {authStep === 'success' && (
              <div className="text-center py-4 text-xs font-bold text-emerald-700">
                ¡Cuenta confirmada con éxito!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. MODAL ENCARGO ESPECIAL */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-xl border border-[#EAE6DF]">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif font-bold text-base text-[#1A1A1A]">Solicitud de Encargo Especial</h3>
            <p className="text-xs text-gray-500">¿Deseas un artículo que no está disponible en la colección? Podemos conseguirlo para ti.</p>
            <textarea
              rows={4}
              placeholder="Detalla el artículo, marca o presentación..."
              value={customItemText}
              onChange={e => setCustomItemText(e.target.value)}
              className="w-full border border-[#EAE6DF] bg-[#F5F2EB] rounded-2xl p-3 text-xs text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#1A1A1A]"
            />
            <button
              onClick={() => { alert('Solicitud registrada. Te responderemos pronto.'); setShowCustomOrderModal(false); }}
              className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-medium py-3 rounded-full text-xs"
            >
              Enviar Solicitud
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
