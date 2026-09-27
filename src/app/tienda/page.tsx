'use client';

import { useState } from 'react';
import { 
  Search, ShoppingBag, ShoppingCart, Lock, CheckCircle2, User, Filter, ArrowRight, X, Phone, Mail, MapPin, Truck, 
  Heart, Star, ShieldCheck, RefreshCw, ChevronRight, Package, CreditCard, Flame, Gift, Sparkles, MessageCircle 
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaCliente() {
  // Estado Búsqueda & Filtros Avanzados
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [priceRange, setPriceRange] = useState<number>(1000);
  const [onlyStock, setOnlyStock] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high'>('featured');

  // Favoritos
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Productos y Carrito
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Modal de Detalle de Producto
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  // Usuario Autenticado / Registro OTP
  const [user, setUser] = useState<{ email: string; phone: string; name: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Encargos Especiales / Pedidos bajo Demanda
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');

  // Checkout en App
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
    const matchesPrice = p.publicPrice <= priceRange;
    const matchesStock = !onlyStock || p.stock > 0;
    return matchesSearch && matchesCategory && matchesPrice && matchesStock;
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
      setUser({ email: authEmail, phone: authPhone, name: authName || 'Cliente USA Store' });
      setAuthStep('success');
      setTimeout(() => {
        setShowAuthModal(false);
        setCheckoutStep('shipping');
      }, 1000);
    } else {
      alert('Código de prueba: 123456');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      
      {/* BANNER SUPERIOR INFORMATIVO */}
      <div className="bg-gradient-to-r from-rose-600 via-indigo-600 to-blue-600 text-white text-[11px] font-bold py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>ENTREGAS GRATUITAS EN PUEBLA (Plaza Dorada, Angelópolis, Zócalo) | Envíos Express a Todo México</span>
      </div>

      {/* HEADER DE TIENDA PREMIUM */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          
          {/* BRAND LOGO */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-blue-600 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-lg font-black">
                🇺🇸
              </div>
            </div>
            <div>
              <h1 className="font-black text-lg text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                USA IMPORT <span className="text-rose-500">BOUTIQUE</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">PRODUCTOS ORIGINALES DE EE.UU.</p>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA PROFESIONAL */}
          <div className="flex-1 max-w-lg relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar marcas, snacks, refrescos o cosméticos de EE.UU..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition shadow-inner"
            />
          </div>

          {/* ACCIONES DEL USUARIO */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCustomOrderModal(true)}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/20 transition"
            >
              <Gift className="w-4 h-4" /> Encargo Especial
            </button>

            {user ? (
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-200 shadow-sm">
                <User className="w-4 h-4 text-rose-400" />
                <span className="font-bold">{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition shadow"
              >
                Mi Cuenta
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-4 py-2.5 rounded-xl transition shadow-lg shadow-rose-500/25 flex items-center gap-2 text-xs font-extrabold"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Carrito</span>
              {cart.length > 0 && (
                <span className="bg-white text-rose-600 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CATEGORÍAS & VENTA CRUZADA */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-rose-400 mr-1" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap text-xs ${
                  selectedCategory === cat 
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center space-x-3 text-xs text-slate-400">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
            >
              <option value="featured">Destacados</option>
              <option value="price_low">Precio: Menor a Mayor</option>
              <option value="price_high">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-8">
        
        {/* HERO SECTION DE PRODUCTOS DESTACADOS */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800/80 p-6 md:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 text-rose-500" /> IMPORTACIONES SEMANALES DIRECTAS
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              Los Dulces, Snacks y cosméticos que no encuentras en México
            </h2>
            <p className="text-slate-400 text-xs md:text-sm font-normal leading-relaxed">
              Ediciones limitadas USA, fórmulas originales y encargos especiales. Compra con total seguridad dentro de nuestra plataforma.
            </p>
          </div>
        </div>

        {/* CATÁLOGO DE PRODUCTOS */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-rose-500" /> Catálogo de Productos ({filteredProducts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProductModal(product)}
                className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/5 group cursor-pointer relative"
              >
                {/* LIKE BUTTON */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                  className="absolute top-6 right-6 z-10 p-2 rounded-full bg-slate-950/60 backdrop-blur border border-slate-800 text-slate-400 hover:text-rose-500 transition"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <div>
                  <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-950 mb-3">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-800 uppercase tracking-wider">
                      {product.category}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-rose-400 transition">
                    {product.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Precio Público</span>
                    <span className="text-base font-black text-emerald-400">${product.publicPrice.toFixed(2)} MXN</span>
                  </div>
                  <button
                    onClick={(e) => addToCart(product, e)}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* FOOTER PROFESIONAL */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 mt-12 py-8 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div>
            <h4 className="font-black text-white text-sm">USA IMPORT BOUTIQUE</h4>
            <p className="mt-1 text-slate-400">Tienda en línea de productos americanos de importación en Puebla.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Garantía & Seguridad</h4>
            <p className="mt-1 text-slate-400">Pagos protegidos, autenticación OTP y protección de datos ARCO.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Atención al Cliente</h4>
            <p className="mt-1 text-slate-400">Entregas en puntos seguros de Puebla (Plaza Dorada, Angelópolis, Zócalo).</p>
          </div>
        </div>
      </footer>

      {/* MODAL DETALLE DE PRODUCTO */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedProductModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="h-56 rounded-2xl overflow-hidden bg-slate-950">
              <img src={selectedProductModal.images[0]} alt={selectedProductModal.title} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{selectedProductModal.category}</span>
              <h3 className="text-xl font-black text-white mt-1">{selectedProductModal.title}</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedProductModal.description}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-2xl font-black text-emerald-400">${selectedProductModal.publicPrice.toFixed(2)} MXN</span>
              <button
                onClick={() => { addToCart(selectedProductModal); setSelectedProductModal(null); }}
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <ShoppingCart className="w-4 h-4" /> Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENCARGOS ESPECIALES */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Gift className="w-5 h-5 text-rose-500" /> Solicitar Encargo Especial de EE.UU.</h3>
              <p className="text-xs text-slate-400">¿Buscas un producto que no está en el catálogo? Lo traemos para ti.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert('¡Solicitud enviada! Nos pondremos en contacto.'); setShowCustomOrderModal(false); }} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Nombre del producto americano (ej. Reese's Peanut Butter Giant Size)..."
                value={customItemName}
                onChange={e => setCustomItemName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
              />
              <textarea
                placeholder="Detalles adicionales o link del producto..."
                value={customItemDesc}
                onChange={e => setCustomItemDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white h-24 focus:outline-none focus:border-rose-500"
              />
              <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-rose-500/20">
                Enviar Solicitud de Encargo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CARRITO & CHECKOUT */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between p-6 space-y-4 overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-500" /> Carrito de Compras
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                        <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                          <div>
                            <p className="font-bold text-white">{item.product.title}</p>
                            <p className="text-slate-400">${item.product.publicPrice} MXN c/u</p>
                          </div>
                          <span className="font-extrabold text-emerald-400">${(item.product.publicPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <div className="flex justify-between text-sm font-black text-white">
                        <span>Subtotal:</span>
                        <span className="text-emerald-400">${cartSubtotal.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={handleProceedToCheckout}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/25"
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
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Método de Entrega</h4>
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setShippingType('puebla_pickup')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_pickup' ? 'bg-rose-950/30 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold text-white flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> Punto de Encuentro Gratis (Puebla)</p>
                      <p className="text-[10px] text-slate-400">Plaza Dorada, Angelópolis, CAPU, Zócalo</p>
                    </div>
                    <span className="font-bold text-emerald-400">GRATIS</span>
                  </label>

                  <label
                    onClick={() => setShippingType('puebla_delivery')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'puebla_delivery' ? 'bg-rose-950/30 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold text-white flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-rose-400" /> Envío Local Domicilio Puebla</p>
                    </div>
                    <span className="font-bold text-white">$45.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setShippingType('national')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${shippingType === 'national' ? 'bg-rose-950/30 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <div>
                      <p className="font-bold text-white flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-rose-400" /> Paquetería Nacional</p>
                    </div>
                    <span className="font-bold text-white">$140.00 MXN</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    Proceder al Pago <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Método de Pago</h4>
                <div className="space-y-2 text-xs">
                  <label onClick={() => setPaymentMethod('spei')} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-rose-950/30 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                    <span>🏦 Transferencia bancaria SPEI</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Sin Comisión</span>
                  </label>
                  <label onClick={() => setPaymentMethod('card')} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-rose-950/30 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                    <span>💳 Tarjeta Débito / Crédito</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleFinalizePurchase}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs"
                  >
                    Pagar y Confirmar Pedido (${cartTotal.toFixed(2)} MXN)
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'confirmation' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                <h4 className="text-lg font-black text-white">¡Pedido Registrado con Éxito!</h4>
                <p className="text-xs text-slate-400">Tu número de pedido es <span className="text-rose-400 font-bold">{createdOrderId}</span>.</p>
                <button
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Seguir Comprando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL REGISTRO OTP */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-rose-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Registro / Inicio de Sesión</h3>
              <p className="text-xs text-slate-400">Verifica tu cuenta para completar tu pedido.</p>
            </div>

            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nombre Completo..."
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Correo Electrónico..."
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                />
                <input
                  type="tel"
                  required
                  placeholder="Teléfono Celular (WhatsApp)..."
                  value={authPhone}
                  onChange={e => setAuthPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                />
                <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg shadow-rose-500/20">
                  Enviar Código OTP
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-center">
                  <p className="text-rose-300 text-xs font-semibold">Código de prueba: <strong className="text-emerald-400">123456</strong></p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-950 border border-rose-500 rounded-xl p-3 text-center text-lg font-black tracking-widest text-white"
                />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg">
                  Verificar y Continuar
                </button>
              </form>
            )}

            {authStep === 'success' && (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">¡Cuenta Verificada!</h4>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
