'use client';

import { useState } from 'react';
import { 
  Search, ShoppingBag, ShoppingCart, Lock, CheckCircle2, User, Filter, ArrowRight, X, Phone, Mail, MapPin, Truck, 
  Heart, Star, ShieldCheck, RefreshCw, ChevronRight, Package, CreditCard, Sparkles, Check
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaCliente() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high'>('featured');
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  // Autenticación con Código de Verificación OTP
  const [user, setUser] = useState<{ email: string; phone: string; name: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Solicitud de Pedido Especial
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');

  // Checkout en Línea
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'confirmation'>('cart');
  const [shippingType, setShippingType] = useState<'puebla_pickup' | 'puebla_delivery' | 'national'>('puebla_pickup');
  const [pickupPoint, setPickupPoint] = useState('Plaza Dorada (Puebla)');
  const [shippingAddress, setShippingAddress] = useState({ street: '', zip: '', city: 'Puebla' });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'spei' | 'cash_pickup'>('spei');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price_low') return a.publicPrice - b.publicPrice;
    if (sortBy === 'price_high') return b.publicPrice - a.publicPrice;
    return 0;
  });

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleProceedToCheckout = () => {
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
      setUser({ email: authEmail, phone: authPhone, name: authName || 'Cliente' });
      setAuthStep('success');
      setTimeout(() => {
        setShowAuthModal(false);
        setCheckoutStep('shipping');
      }, 800);
    } else {
      alert('Código de prueba: 123456');
    }
  };

  const handleFinalizePurchase = () => {
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setCreatedOrderId(orderId);
    setCheckoutStep('confirmation');
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const shippingFee = shippingType === 'puebla_delivery' ? 45.00 : shippingType === 'national' ? 140.00 : 0;
  const cartTotal = cartSubtotal + shippingFee;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      
      {/* BANNER SUPERIOR MINIMALISTA */}
      <div className="bg-slate-900 text-white text-xs font-medium py-2 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <span>Entregas personales sin costo en Puebla (Puntos de Encuentro) & Envíos a todo el país</span>
      </div>

      {/* HEADER LIMPIO & MODERNO */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-6">
          
          {/* LOGO */}
          <div className="flex items-center space-x-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
              M
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900">
                MERKATO <span className="font-light text-slate-500">STUDIO</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Catálogo Selecto</p>
            </div>
          </div>

          {/* BUSCADOR */}
          <div className="flex-1 max-w-lg relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos, snacks, cuidado personal..."
              className="w-full bg-slate-100/80 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
            />
          </div>

          {/* ACCIONES */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCustomOrderModal(true)}
              className="hidden lg:inline-flex text-xs font-semibold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-full border border-slate-200 hover:border-slate-300 transition"
            >
              Pedido Especial
            </button>

            {user ? (
              <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-full text-xs font-medium text-slate-800">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-full border border-slate-200 hover:border-slate-300 transition"
              >
                Mi Cuenta
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-full transition flex items-center gap-2 text-xs font-semibold shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Bolsa</span>
              {cart.length > 0 && (
                <span className="bg-white text-slate-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
              placeholder="Buscar en el catálogo..."
              className="w-full bg-slate-100 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>
        </div>
      </header>

      {/* FILTROS Y CATEGORÍAS */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center space-x-2 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full font-medium transition whitespace-nowrap text-xs ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
            <span>Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              <option value="featured">Destacados</option>
              <option value="price_low">Precio: Menor a Mayor</option>
              <option value="price_high">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* HERO BANNER MINIMALISTA */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-slate-900 rounded-3xl text-white p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between">
          <div className="max-w-xl space-y-3 relative z-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Colección Selecta</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Calidad y originalidad en cada artículo.
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed pt-1">
              Catálogo de artículos especiales con entrega garantizada. Compra con total seguridad dentro de nuestra plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* CATÁLOGO DE PRODUCTOS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Artículos Disponibles ({filteredProducts.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => setSelectedProductModal(product)}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition cursor-pointer group relative"
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/80 backdrop-blur shadow-sm text-slate-400 hover:text-rose-500 transition"
              >
                <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>

              <div>
                <div className="relative h-52 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
                    {product.category}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-slate-700 transition">
                  {product.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Precio</span>
                  <span className="text-base font-extrabold text-slate-900">${product.publicPrice.toFixed(2)} MXN</span>
                </div>
                <button
                  onClick={(e) => addToCart(product, e)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-10 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-sm tracking-tight">MERKATO STUDIO</h4>
            <p className="text-slate-500">Tienda en línea especializada en productos selectos y atención personalizada.</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900">Entregas y Cobertura</h4>
            <p className="text-slate-500">Puntos de encuentro personales en Puebla y envíos por paquetería a todo México.</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900">Seguridad & Confianza</h4>
            <p className="text-slate-500">Validación de cuentas mediante código y estricta protección de datos personales.</p>
          </div>
        </div>
      </footer>

      {/* MODAL DETALLE DE PRODUCTO */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedProductModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <div className="h-60 rounded-2xl overflow-hidden bg-slate-100">
              <img src={selectedProductModal.images[0]} alt={selectedProductModal.title} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedProductModal.category}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedProductModal.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{selectedProductModal.description}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-2xl font-black text-slate-900">${selectedProductModal.publicPrice.toFixed(2)} MXN</span>
              <button
                onClick={() => { addToCart(selectedProductModal); setSelectedProductModal(null); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <ShoppingCart className="w-4 h-4" /> Agregar a la Bolsa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEDIDO ESPECIAL */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Solicitar Pedido Especial</h3>
              <p className="text-xs text-slate-500">¿Buscas un artículo en particular que no está en el catálogo? Lo conseguimos para ti.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert('Solicitud enviada con éxito. Te contactaremos con la cotización.'); setShowCustomOrderModal(false); }} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Nombre o descripción del producto deseado..."
                value={customItemName}
                onChange={e => setCustomItemName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
              <textarea
                placeholder="Detalles adicionales, tamaño, presentación o enlace..."
                value={customItemDesc}
                onChange={e => setCustomItemDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 h-24 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow">
                Enviar Solicitud
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER CARRITO Y CHECKOUT EN LA PLATAFORMA */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 space-y-4 overflow-y-auto shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700" /> Bolsa de Compras
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mb-2 stroke-1" />
                    <p className="text-sm">Tu bolsa de compras está vacía.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{item.product.title}</p>
                            <p className="text-slate-500">${item.product.publicPrice} MXN c/u</p>
                          </div>
                          <span className="font-extrabold text-slate-900">${(item.product.publicPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between text-sm font-bold text-slate-900">
                        <span>Subtotal:</span>
                        <span>${cartSubtotal.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={handleProceedToCheckout}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow"
                      >
                        Continuar al Checkout <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {checkoutStep === 'shipping' && (
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Selección de Entrega</h4>
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setShippingType('puebla_pickup')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_pickup' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-700" /> Punto de Encuentro Personal (Puebla)</p>
                      <p className="text-[10px] text-slate-500">Plaza Dorada, Angelópolis, Zócalo, CAPU</p>
                    </div>
                    <span className="font-bold text-emerald-600">GRATIS</span>
                  </label>

                  <label
                    onClick={() => setShippingType('puebla_delivery')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_delivery' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-700" /> Entrega Local a Domicilio Puebla</p>
                    </div>
                    <span className="font-bold text-slate-900">$45.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setShippingType('national')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'national' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-700" /> Envío por Paquetería Nacional</p>
                    </div>
                    <span className="font-bold text-slate-900">$140.00 MXN</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    Continuar al Pago <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Forma de Pago</h4>
                <div className="space-y-2 text-xs">
                  <label onClick={() => setPaymentMethod('spei')} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-slate-50 border-slate-900' : 'border-slate-200'}`}>
                    <span>🏦 Transferencia bancaria SPEI</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Sin Recargo</span>
                  </label>
                  <label onClick={() => setPaymentMethod('card')} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-slate-50 border-slate-900' : 'border-slate-200'}`}>
                    <span>💳 Tarjeta Débito / Crédito</span>
                  </label>
                  {shippingType === 'puebla_pickup' && (
                    <label onClick={() => setPaymentMethod('cash_pickup')} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'cash_pickup' ? 'bg-slate-50 border-slate-900' : 'border-slate-200'}`}>
                      <span>💵 Pago en efectivo al momento de la entrega</span>
                    </label>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleFinalizePurchase}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs shadow"
                  >
                    Pagar y Confirmar Pedido (${cartTotal.toFixed(2)} MXN)
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'confirmation' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                <h4 className="text-lg font-bold text-slate-900">¡Pedido Confirmado con Éxito!</h4>
                <p className="text-xs text-slate-500">Tu número de orden es <span className="font-bold text-slate-900">{createdOrderId}</span>.</p>
                <button
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Continuar Explorando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL REGISTRO OTP */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Iniciar Sesión / Registro</h3>
              <p className="text-xs text-slate-500">Verifica tu cuenta para completar tu orden.</p>
            </div>

            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nombre Completo..."
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
                <input
                  type="email"
                  required
                  placeholder="Correo Electrónico..."
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
                <input
                  type="tel"
                  required
                  placeholder="Número de WhatsApp..."
                  value={authPhone}
                  onChange={e => setAuthPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs shadow">
                  Enviar Código OTP
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                  <p className="text-slate-600 text-xs">Código de prueba: <strong className="text-slate-900">123456</strong></p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-lg font-bold tracking-widest text-slate-900"
                />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs shadow">
                  Verificar y Continuar
                </button>
              </form>
            )}

            {authStep === 'success' && (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">¡Cuenta Verificada!</h4>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
