'use client';

import { useState } from 'react';
import { 
  Search, ShoppingCart, User, Menu, Star, ChevronLeft, ChevronRight, X, Truck, ShieldCheck, 
  ArrowRight, Plus, Minus, CreditCard, Sparkles, Send, CheckCircle2, Monitor, Shirt, Home as HomeIcon,
  Gamepad2, Heart, Phone, Mail, ArrowUpRight
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export default function TiendaFoxDrop() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Autenticación OTP al hacer checkout
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'details' | 'otp' | 'success'>('details');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Proceso de Checkout en la plataforma
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [shippingMethod, setShippingMethod] = useState<'puebla_local' | 'national'>('puebla_local');
  const [shippingAddress, setShippingAddress] = useState({ street: '', zip: '', city: 'Puebla' });
  const [paymentMethod, setPaymentMethod] = useState<'spei' | 'card'>('spei');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // Encargo especial modal
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customItemText, setCustomItemText] = useState('');

  // Hero carousel index
  const [heroSlide, setHeroSlide] = useState(0);

  const heroBanners = [
    {
      title: "Descubre Tesoros Globales.",
      subtitle: "Importación Directa, Calidad Garantizada.",
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&auto=format&fit=crop&q=80",
      tag: "Premium Leather Bag"
    },
    {
      title: "Precisión & Relojería Fina.",
      subtitle: "Mecanismos Japoneses de Alta Calidad.",
      image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&auto=format&fit=crop&q=80",
      tag: "Japanese Precision"
    },
    {
      title: "Cuidado Facial & Skincare.",
      subtitle: "Fórmulas Asiáticas para una Piel Radiante.",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&auto=format&fit=crop&q=80",
      tag: "South Korean Cosmetic"
    }
  ];

  const popularCategories = [
    { name: "Electrónica", icon: Monitor, count: "48 productos" },
    { name: "Moda", icon: Shirt, count: "62 productos" },
    { name: "Hogar", icon: HomeIcon, count: "35 productos" },
    { name: "Juguetes", icon: Gamepad2, count: "21 productos" },
  ];

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
    const newId = `FX-${Math.floor(100000 + Math.random() * 900000)}`;
    setConfirmedOrderId(newId);
    setCheckoutStep('success');
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const shippingFee = shippingMethod === 'puebla_local' ? 50.00 : 140.00;
  const cartTotal = cartSubtotal + shippingFee;
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#222E3C] flex flex-col font-sans selection:bg-[#E65F2B] selection:text-white pb-16 md:pb-0">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER (LOGO FOXDROP + BUSCADOR + MI CUENTA + CARRITO) */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* BRAND LOGO FOXDROP */}
          <div className="flex items-center space-x-2.5 cursor-pointer shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E65F2B] to-[#F28C38] flex items-center justify-center text-white font-black text-xl shadow-sm">
              🦊
            </div>
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="font-extrabold text-xl tracking-tight text-[#1F2D3D]">FOXDROP</span>
              </div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block -mt-1">
                Tu atajo al mundo
              </span>
            </div>
          </div>

          {/* BUSCADOR ESTILO FOXDROP CON TAGLINE INFERIOR */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Busca productos globales..."
                className="w-full bg-white text-gray-800 placeholder-gray-400 pl-4 pr-12 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:border-[#2D4A58] text-xs sm:text-sm"
              />
              <button className="bg-[#2D4A58] hover:bg-[#203641] text-white px-4 rounded-r-md flex items-center justify-center transition">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 pl-1">
              (Busca sobre: &quot;zapatillas de marca&quot;, &quot;electrónica japonesa&quot;)
            </p>
          </div>

          {/* ACCIONES TOP DERECHA */}
          <div className="flex items-center space-x-5 text-xs text-[#2D4A58] font-semibold">
            {/* CARRITO */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 flex items-center gap-1.5 hover:text-[#E65F2B] transition"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#E65F2B] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {cartItemCount}
                  </span>
                )}
              </div>
            </button>

            {/* MI CUENTA */}
            {user ? (
              <div className="flex items-center space-x-1.5 text-gray-700">
                <User className="w-4 h-4 text-[#E65F2B]" />
                <span className="font-bold">{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-1.5 hover:text-[#E65F2B] transition"
              >
                <User className="w-4 h-4" />
                <span>Mi Cuenta</span>
              </button>
            )}
          </div>
        </div>

        {/* BUSCADOR MÓVIL */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative flex">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Busca productos globales..."
              className="w-full bg-white border border-gray-300 rounded-l-md px-3 py-2 text-xs focus:outline-none"
            />
            <button className="bg-[#2D4A58] text-white px-3.5 rounded-r-md">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BARRA DE NAVEGACIÓN AZUL PETRÓLEO / FOXDROP NAV */}
        {/* ======================================================== */}
        <nav className="bg-[#2D4A58] text-white text-xs font-bold uppercase tracking-wider">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center overflow-x-auto no-scrollbar">
            
            {/* CATEGORÍAS GLOBALES */}
            <div className="bg-[#233B47] px-4 py-2.5 flex items-center space-x-2 shrink-0 cursor-pointer">
              <Menu className="w-4 h-4" />
              <span>CATEGORÍAS Globales</span>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => setSelectedCategory('Todas')}
                className={`px-4 py-2.5 hover:bg-[#243D49] transition shrink-0 ${selectedCategory === 'Todas' ? 'bg-[#3E6173]' : ''}`}
              >
                LO NUEVO
              </button>
              
              <button
                onClick={() => setShowCustomOrderModal(true)}
                className="bg-[#6B574B] px-4 py-2.5 hover:bg-[#5C493D] transition shrink-0 flex items-center gap-1.5"
              >
                OFERTAS DE DEALS
              </button>

              <button
                onClick={() => setSelectedCategory('Electrónica')}
                className="px-4 py-2.5 hover:bg-[#243D49] transition shrink-0"
              >
                MARCAS DESTACADAS
              </button>

              <button
                onClick={() => setShowCustomOrderModal(true)}
                className="px-4 py-2.5 hover:bg-[#243D49] transition shrink-0 ml-auto hidden md:block"
              >
                SOPORTE AL CLIENTE
              </button>
            </div>

          </div>
        </nav>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SLIDER BANNER ESTILO FOXDROP */}
      {/* ======================================================== */}
      <section className="bg-white border-b border-gray-200 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-xl overflow-hidden bg-[#2D4A58] text-white shadow-md">
            
            <div className="grid grid-cols-1 md:grid-cols-3 items-center min-h-[260px] sm:min-h-[320px]">
              
              {/* IMAGEN 1 */}
              <div className="relative h-48 sm:h-full bg-slate-900 overflow-hidden flex items-end p-4">
                <img
                  src={heroBanners[heroSlide].image}
                  alt="Feature"
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <span className="relative z-10 bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded">
                  {heroBanners[heroSlide].tag}
                </span>
              </div>

              {/* CONTENIDO TEXTUAL CENTRAL */}
              <div className="md:col-span-2 p-6 sm:p-10 space-y-3 bg-gradient-to-r from-[#2D4A58] via-[#2D4A58] to-[#203641] flex flex-col justify-center">
                <span className="text-[#E65F2B] font-bold text-xs uppercase tracking-widest">
                  Colección Global Seleccionada
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  {heroBanners[heroSlide].title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 max-w-md leading-relaxed">
                  {heroBanners[heroSlide].subtitle}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const el = document.getElementById('deals-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold px-6 py-2.5 rounded text-xs transition shadow-sm"
                  >
                    Ver Colección Global
                  </button>
                </div>
              </div>

            </div>

            {/* CONTROLES DE NAVEGACIÓN SLIDER */}
            <button
              onClick={() => setHeroSlide(prev => (prev === 0 ? heroBanners.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHeroSlide(prev => (prev === heroBanners.length - 1 ? 0 : prev + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. SECCIÓN: DEALS DEL MES (PRODUCT CARDS EXACTAS AL MOCKUP) */}
      {/* ======================================================== */}
      <section id="deals-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        
        <div>
          <h3 className="text-xl font-black text-[#1F2D3D] tracking-tight">Deals del Mes</h3>
          <p className="text-xs text-gray-400 font-medium">Trusted Deals & Calidad Internacional</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col justify-between hover:shadow-lg transition cursor-pointer group relative"
            >
              {/* BADGE DE DESCUENTO NARANJA (-15%) */}
              <div className="absolute top-2 left-2 z-10 bg-[#E65F2B] text-white font-extrabold text-[10px] px-2 py-0.5 rounded">
                -15%
              </div>

              {/* IMAGEN DE PRODUCTO */}
              <div className="aspect-square bg-white flex items-center justify-center p-2 mb-2">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="max-h-full object-contain group-hover:scale-105 transition duration-300"
                />
              </div>

              {/* DETALLES DE PRECIO Y VALORACIÓN ESTILO FOXDROP */}
              <div className="space-y-1 pt-1 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-[#E65F2B] transition">
                  {product.title}
                </h4>

                {/* PRECIO TACHADO */}
                <span className="text-[11px] text-gray-400 line-through block">
                  ${(product.publicPrice * 1.15).toFixed(0)} MXN
                </span>

                {/* PRECIO DESTACADO EN NEGRITA */}
                <span className="text-sm sm:text-base font-extrabold text-gray-900 block">
                  ${product.publicPrice.toFixed(0)} MXN
                </span>

                {/* ESTRELLAS Y REVIEWS */}
                <div className="flex items-center space-x-1 text-[11px] text-amber-500 pt-0.5">
                  <div className="flex text-amber-400">
                    {'★'.repeat(5)}
                  </div>
                  <span className="text-gray-400 text-[10px]">(5)</span>
                </div>
              </div>

              {/* BOTÓN AGREGAR */}
              <button
                onClick={(e) => addToCart(product, e)}
                className="w-full mt-3 bg-[#2D4A58] hover:bg-[#E65F2B] text-white font-bold py-1.5 rounded text-xs transition"
              >
                Agregar
              </button>
            </div>
          ))}
        </div>

      </section>

      {/* ======================================================== */}
      {/* 4. SECCIÓN: CATEGORÍAS POPULARES (ICONOS EN RECTÁNGULOS AZUL CLARO) */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <h3 className="text-xl font-black text-[#1F2D3D] tracking-tight">Categorías Populares</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                onClick={() => setSelectedCategory(cat.name)}
                className="bg-[#EDF5F7] hover:bg-[#E2EFF2] border border-[#D5E6EA] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#2D4A58] group-hover:scale-110 transition shadow-sm mb-2">
                  <Icon className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-sm text-[#2D4A58]">{cat.name}</h4>
                <span className="text-[11px] text-gray-500 mt-0.5">{cat.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. FOOTER AZUL PETRÓLEO EXACTO A FOXDROP */}
      {/* ======================================================== */}
      <footer className="bg-[#2D4A58] text-white mt-12 pt-10 pb-6 border-t border-slate-700 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* COL 1: SOBRE FOXDROP */}
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-200">Sobre Foxdrop</h4>
              <ul className="space-y-1.5 text-gray-300 text-xs">
                <li className="hover:text-white cursor-pointer">Nuestro Modelo</li>
                <li className="hover:text-white cursor-pointer">FAQ</li>
                <li className="hover:text-white cursor-pointer">Contacto</li>
              </ul>
            </div>

            {/* COL 2: CATEGORÍAS */}
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-200">Categorías</h4>
              <ul className="space-y-1.5 text-gray-300 text-xs">
                <li className="hover:text-white cursor-pointer">Asia</li>
                <li className="hover:text-white cursor-pointer">Europa</li>
                <li className="hover:text-white cursor-pointer">América</li>
              </ul>
            </div>

            {/* COL 3: INFORMACIÓN */}
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-200">Información</h4>
              <ul className="space-y-1.5 text-gray-300 text-xs">
                <li className="hover:text-white cursor-pointer">Envíos</li>
                <li className="hover:text-white cursor-pointer">Aduanas</li>
                <li className="hover:text-white cursor-pointer">Devoluciones</li>
                <li className="hover:text-white cursor-pointer">Privacidad</li>
              </ul>
            </div>

            {/* COL 4: NEWSLETTER & MÉTODOS DE PAGO */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-200">
                Suscríbete para ofertas exclusivas e internacional...
              </h4>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Entra para consultar..."
                  className="bg-white text-gray-800 placeholder-gray-400 px-3 py-2 text-xs rounded-l-md w-full focus:outline-none"
                />
                <button className="bg-[#E65F2B] hover:bg-[#D45321] text-white px-3.5 rounded-r-md">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-gray-400 block mb-1">Métodos de pago</span>
                <div className="flex items-center space-x-2 text-[10px] font-bold">
                  <span className="bg-white text-[#2D4A58] px-2 py-0.5 rounded font-black">VISA</span>
                  <span className="bg-white text-[#E65F2B] px-2 py-0.5 rounded font-black">MC</span>
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded font-black">PayPal</span>
                  <span className="bg-white text-emerald-600 px-2 py-0.5 rounded font-black">SPEI</span>
                </div>
              </div>
            </div>

          </div>

          {/* COPYRIGHT & REDES */}
          <div className="pt-6 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-4">
            <p>© 2026 - Foxdrop international design. Todos los derechos reservados.</p>
            <div className="flex items-center space-x-3 text-gray-300">
              <span className="w-6 h-6 rounded-full bg-[#203641] flex items-center justify-center font-bold text-[10px] hover:text-white cursor-pointer">f</span>
              <span className="w-6 h-6 rounded-full bg-[#203641] flex items-center justify-center font-bold text-[10px] hover:text-white cursor-pointer">𝕏</span>
              <span className="w-6 h-6 rounded-full bg-[#203641] flex items-center justify-center font-bold text-[10px] hover:text-white cursor-pointer">in</span>
              <span className="w-6 h-6 rounded-full bg-[#203641] flex items-center justify-center font-bold text-[10px] hover:text-white cursor-pointer">▶</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ======================================================== */}
      {/* 6. MODAL FICHA DE PRODUCTO */}
      {/* ======================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="aspect-square bg-gray-50 rounded-xl p-4 flex items-center justify-center border border-gray-100">
                <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="max-h-full object-contain" />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#E65F2B] uppercase font-bold tracking-wider">{selectedProduct.category}</span>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1F2D3D] leading-snug">{selectedProduct.title}</h3>
                  
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-gray-900">${selectedProduct.publicPrice.toFixed(0)} MXN</span>
                    <span className="text-xs text-gray-400 line-through">${(selectedProduct.publicPrice * 1.15).toFixed(0)} MXN</span>
                  </div>

                  <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3 rounded text-sm transition shadow-sm"
                  >
                    Agregar al carrito
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. DRAWER DEL CARRITO & CHECKOUT COMPLETO */}
      {/* ======================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-5 sm:p-6 space-y-4 overflow-y-auto shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-[#1F2D3D] flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#E65F2B]" /> Carrito de compras ({cartItemCount})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-gray-600">Tu carrito está vacío</p>
                    <p className="text-xs text-gray-400 mt-1">Explora los productos globales.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                          <img src={item.product.images[0]} alt={item.product.title} className="w-14 h-14 object-contain bg-white rounded p-1 border border-gray-200" />
                          <div className="flex-1 flex flex-col justify-between">
                            <p className="font-bold text-gray-800 line-clamp-1">{item.product.title}</p>
                            <p className="font-black text-gray-900 text-sm">${(item.product.publicPrice * item.quantity).toFixed(0)} MXN</p>
                            
                            <div className="flex items-center space-x-2 mt-1">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100">
                                <Minus className="w-3 h-3 text-gray-600" />
                              </button>
                              <span className="font-bold text-gray-800">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100">
                                <Plus className="w-3 h-3 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      <div className="flex justify-between text-base font-black text-gray-900">
                        <span>Subtotal:</span>
                        <span>${cartSubtotal.toFixed(0)} MXN</span>
                      </div>

                      <button
                        onClick={handleCheckoutInit}
                        className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3.5 rounded text-xs flex items-center justify-center gap-2 transition shadow"
                      >
                        Continuar compra <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SELECCIÓN DE ENVÍO */}
            {checkoutStep === 'shipping' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-bold text-sm text-[#1F2D3D] border-b border-gray-200 pb-2">Selecciona forma de entrega</h4>
                
                <div className="space-y-2">
                  <label
                    onClick={() => setShippingMethod('puebla_local')}
                    className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${shippingMethod === 'puebla_local' ? 'bg-[#EDF5F7] border-[#2D4A58] text-gray-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    <div>
                      <p className="font-bold text-gray-900">Envío Local (Puebla y alrededores)</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Entrega por mensajería local</p>
                    </div>
                    <span className="font-bold text-gray-900">$50.00 MXN</span>
                  </label>

                  <label
                    onClick={() => setShippingMethod('national')}
                    className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${shippingMethod === 'national' ? 'bg-[#EDF5F7] border-[#2D4A58] text-gray-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    <div>
                      <p className="font-bold text-gray-900">Envío Nacional por Paquetería</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Guía de rastreo nacional</p>
                    </div>
                    <span className="font-bold text-gray-900">$140.00 MXN</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-bold text-gray-700">Dirección de entrega:</label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, Número y Colonia..."
                    value={shippingAddress.street}
                    onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-800"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Código Postal..."
                    value={shippingAddress.zip}
                    onChange={e => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-800"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total con envío:</span>
                    <span className="text-[#E65F2B]">${cartTotal.toFixed(0)} MXN</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-[#2D4A58] hover:bg-[#203641] text-white font-bold py-3.5 rounded text-xs transition"
                  >
                    Continuar al pago
                  </button>
                </div>
              </div>
            )}

            {/* PAGO */}
            {checkoutStep === 'payment' && (
              <div className="space-y-4 flex-1 text-xs">
                <h4 className="font-bold text-sm text-[#1F2D3D] border-b border-gray-200 pb-2">Método de pago</h4>
                
                <div className="space-y-2">
                  <label onClick={() => setPaymentMethod('spei')} className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer ${paymentMethod === 'spei' ? 'bg-[#EDF5F7] border-[#2D4A58]' : 'border-gray-200'}`}>
                    <div>
                      <p className="font-bold text-gray-800">Transferencia bancaria SPEI</p>
                      <p className="text-[11px] text-gray-500">Datos bancarios al confirmar</p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">Sin Comisión</span>
                  </label>

                  <label onClick={() => setPaymentMethod('card')} className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer ${paymentMethod === 'card' ? 'bg-[#EDF5F7] border-[#2D4A58]' : 'border-gray-200'}`}>
                    <div>
                      <p className="font-bold text-gray-800">Tarjeta Débito / Crédito</p>
                      <p className="text-[11px] text-gray-500">Pasarela protegida</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleFinishOrder}
                    className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3.5 rounded text-xs transition shadow"
                  >
                    Confirmar pedido (${cartTotal.toFixed(0)} MXN)
                  </button>
                </div>
              </div>
            )}

            {/* ÉXITO */}
            {checkoutStep === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-[#1F2D3D]">¡Pedido confirmado!</h4>
                <p className="text-xs text-gray-500">Número de orden Foxdrop: <strong className="text-gray-900">{confirmedOrderId}</strong>.</p>
                <button
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                  className="w-full bg-[#2D4A58] text-white font-bold py-3 rounded text-xs"
                >
                  Seguir comprando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL REGISTRO OTP OBLIGATORIO */}
      {/* ======================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1F2D3D]">Ingresa tus datos para continuar</h3>
              <p className="text-xs text-gray-500">Te enviaremos un código de seguridad para confirmar tu cuenta.</p>
            </div>

            {authStep === 'details' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-700 font-semibold block mb-1">Nombre completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mario González"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <div>
                  <label className="text-gray-700 font-semibold block mb-1">Correo electrónico:</label>
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <div>
                  <label className="text-gray-700 font-semibold block mb-1">Teléfono WhatsApp:</label>
                  <input
                    type="tel"
                    required
                    placeholder="222 123 4567"
                    value={authPhone}
                    onChange={e => setAuthPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <button type="submit" className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3 rounded transition shadow">
                  Enviar código de seguridad
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="bg-orange-50 border border-orange-200 p-3 rounded text-center text-orange-900">
                  <p>Código de prueba: <strong className="font-bold">123456</strong></p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-3 text-center text-lg font-bold tracking-widest text-gray-900"
                />
                <button type="submit" className="w-full bg-[#2D4A58] hover:bg-[#203641] text-white font-bold py-3 rounded transition shadow">
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

      {/* ======================================================== */}
      {/* 9. MODAL ENCARGO ESPECIAL */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-3 relative shadow-2xl">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base text-[#1F2D3D]">Solicitar Encargo Especial</h3>
            <p className="text-xs text-gray-500">¿Buscas un artículo internacional que no ves en el catálogo? Dinos cuál y te lo cotizamos.</p>
            <textarea
              rows={4}
              placeholder="Nombre del producto, marca o descripción..."
              value={customItemText}
              onChange={e => setCustomItemText(e.target.value)}
              className="w-full border border-gray-300 bg-gray-50 rounded p-3 text-xs text-gray-800 focus:outline-none focus:border-[#2D4A58]"
            />
            <button
              onClick={() => { alert('Solicitud enviada con éxito.'); setShowCustomOrderModal(false); }}
              className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3 rounded text-xs shadow"
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
