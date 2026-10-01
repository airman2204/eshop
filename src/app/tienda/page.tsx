'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FoxDropLogo from '@/components/FoxDropLogo';
import { 
  Search, ShoppingCart, User, Menu, Star, ChevronLeft, ChevronRight, X, Truck, ShieldCheck, 
  ArrowRight, Plus, Minus, CreditCard, Sparkles, Send, CheckCircle2, Monitor, Shirt, Home as HomeIcon,
  Gamepad2, Heart, Phone, Mail, ArrowUpRight, Download, Sparkle, Tag, MessageSquare, RefreshCw,
  Package, MapPin, Award, Trash2, Edit3, ExternalLink, ArrowLeft, Check, ShoppingBag
} from 'lucide-react';
import { Product, UserAddress, UserCard } from '@/types';
import { getActiveProducts } from '@/lib/products';
import { 
  sendEmailOTP, verifyEmailOTP, upsertUserProfile, getCurrentUserProfile, signOut as authSignOut, 
  lookupUserByEmail, FullUserProfile, getUserFullProfile, saveUserAddress, deleteUserAddress, 
  saveUserCard, deleteUserCard, updateUserProfileData 
} from '@/lib/auth';
import { createOrderInDb, submitSpecialOrder, getClientOrderHistory, trackAbandonedCart, resolveAbandonedCart } from '@/lib/orders';
import { getCrossSellRecommendations, calculateEarnedPoints, getClubFoxDropTier, DEFAULT_CLUB_SETTINGS } from '@/lib/clubFoxdrop';
import { getCarouselSlides, CarouselSlide, getClubSettings } from '@/lib/admin';
import { ClubFoxDropSettings } from '@/types';
import { trackEcommerceEvent } from '@/components/Analytics';

// Normaliza texto eliminando acentos, caracteres especiales y mayúsculas
function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Búsqueda dinámica y flexible por palabras clave sin importar orden ni acentos
function matchesProductSearch(product: Product, query: string): boolean {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return true;

  const queryTokens = cleanQuery.split(' ').filter(token => token.length > 0);
  if (queryTokens.length === 0) return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTags = (product as any).tags;
  const tagsStr = Array.isArray(rawTags) ? rawTags.join(' ') : (typeof rawTags === 'string' ? rawTags : '');
  
  const searchableText = normalizeSearchText(`
    ${product.title || ''} 
    ${product.description || ''} 
    ${product.category || ''} 
    ${tagsStr}
    ${(product as any).sku || ''}
  `);

  return queryTokens.every(token => {
    if (searchableText.includes(token)) return true;

    // Reconocimiento de plurales/singulares comunes en español
    if (token.length > 3 && token.endsWith('es')) {
      const stem = token.slice(0, -2);
      if (searchableText.includes(stem)) return true;
    } else if (token.length > 3 && token.endsWith('s')) {
      const stem = token.slice(0, -1);
      if (searchableText.includes(stem)) return true;
    }

    return false;
  });
}

export default function TiendaFoxDrop() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'deals' | 'all'>('new');

  // Soporte PWA WebApp (Instalación en celular o escritorio)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("Para instalar FoxDrop en tu celular:\n\n• En Safari (iPhone): Toca el botón 'Compartir' ⎋ y elige 'Agregar al inicio' ⊞.\n• En Chrome (Android): Toca el menú (tres puntos ⋮) y selecciona 'Instalar aplicación'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const remoteProducts = await getActiveProducts();
        setProducts(remoteProducts ?? []);
      } catch (err) {
        console.error("Error loading products from Supabase:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadData();

    // Cargar sesión y puntos reales del usuario desde Supabase
    async function checkAuthSession() {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser({
            id: profile.id,
            name: profile.fullName || 'Cliente FoxDrop',
            email: profile.email,
            phone: profile.phone || '',
            points: profile.loyaltyPoints ?? 0,
          });
          loadUserAccount(profile.phone || '', profile.email);
        }
      } catch (err) {
        console.warn("No active session:", err);
      }
    }
    checkAuthSession();
  }, []);

  // Autenticación OTP inteligente al hacer checkout o Mi Cuenta
  const [user, setUser] = useState<{ id?: string; name: string; email: string; phone: string; points?: number } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'otp' | 'new_details' | 'success'>('email');
  const [authEmail, setAuthEmail] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [recognizedUser, setRecognizedUser] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  // VISTA INTEGRADA: Tienda ('store') o Mi Cuenta ('account')
  const [currentView, setCurrentView] = useState<'store' | 'account'>('store');
  const [accountTab, setAccountTab] = useState<'orders' | 'addresses' | 'cards' | 'club' | 'settings'>('orders');
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(null);
  const [loadingFullProfile, setLoadingFullProfile] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered'>('all');

  // Modales de dirección y tarjeta dentro de la tienda
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<UserAddress>>({
    name: '', street: '', colonia: '', city: '', state: '', zip: '', phone: '', references: '', isDefault: false,
  });

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardForm, setCardForm] = useState({
    holderName: '', cardNumber: '', expMonth: '01', expYear: '26', isDefault: false,
  });

  // Datos personales editables
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [infoModal, setInfoModal] = useState<'envios' | 'devoluciones' | 'privacidad' | null>(null);

  // Detectar ?tab=cuenta o ?view=cuenta en URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'cuenta' || params.get('view') === 'cuenta') {
        setCurrentView('account');
      }
    }
  }, []);

  // Mi Cuenta y Club Foxdrop
  const [showAccountModal, setShowAccountModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Proceso de Checkout en la plataforma
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [shippingMethod, setShippingMethod] = useState<'puebla_local' | 'national'>('puebla_local');
  const [shippingAddress, setShippingAddress] = useState({ street: '', zip: '', city: 'Puebla' });
  const [paymentMethod, setPaymentMethod] = useState<'spei' | 'card'>('spei');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // Encargo especial modal
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customItemText, setCustomItemText] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [submittingCustomOrder, setSubmittingCustomOrder] = useState(false);
  const [customOrderSent, setCustomOrderSent] = useState(false);

  // Panoramic Hero Carousel index
  const [activeSlide, setActiveSlide] = useState(0);

  // Carrusel hero — slides gestionados desde el panel admin (Supabase)
  const [slides, setSlides] = useState<CarouselSlide[]>([]);

  // Configuración dinámica del Club FoxDrop
  const [clubSettings, setClubSettings] = useState<ClubFoxDropSettings>(DEFAULT_CLUB_SETTINGS);

  useEffect(() => {
    getCarouselSlides().then(setSlides);
    getClubSettings().then(cfg => {
      if (cfg) setClubSettings(cfg);
    });
  }, []);

  // Sincronizar carrito abandonado en segundo plano cuando el cliente tiene artículos e información de contacto
  useEffect(() => {
    if (!cart || cart.length === 0) return;
    const phone = user?.phone;
    const email = user?.email;
    if (!phone && !email) return;

    const timer = setTimeout(() => {
      const currentTotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
      trackAbandonedCart({
        clientName: user?.name || 'Cliente Invitado',
        clientPhone: phone || '',
        clientEmail: email || undefined,
        items: cart.map(item => ({
          title: item.product.title,
          quantity: item.quantity,
          price: item.product.publicPrice,
          image: item.product.images?.[0] || undefined,
        })),
        total: currentTotal,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [cart, user]);


  // Categorías calculadas dinámicamente de los productos existentes en la tienda
  const categoryIconMap: Record<string, any> = {
    'cosmética': Sparkles,
    'cosmetica': Sparkles,
    'belleza': Sparkles,
    'electrónica': Monitor,
    'electronica': Monitor,
    'moda': Shirt,
    'ropa': Shirt,
    'hogar': HomeIcon,
    'juguetes': Gamepad2,
    'deportes': Heart,
  };

  // Categorías calculadas dinámicamente: SOLO categorías que contengan al menos 1 producto
  const dynamicCategories = Array.from(
    new Set(
      products
        .map(p => p.category?.trim())
        .filter((cat): cat is string => Boolean(cat && cat.length > 0))
    )
  );

  const popularCategories = dynamicCategories.map(catName => {
    const key = catName.toLowerCase();
    const icon = categoryIconMap[key] || Tag;
    return { name: catName, icon };
  });

  // Productos con descuento real o productos destacados para Deals del Mes
  const dealsProducts = (() => {
    const withRealDiscount = products.filter(p => Boolean(p.discountPercent && p.discountPercent > 0));
    if (withRealDiscount.length > 0) return withRealDiscount;
    // Si en base de datos no se ha asignado discountPercent aún, creamos ofertas promocionales automáticas con los primeros productos
    return products.slice(0, 4).map((p, idx) => ({
      ...p,
      discountPercent: idx % 2 === 0 ? 20 : 15,
    }));
  })();

  // Filtrado dinámico por búsqueda de palabras clave (sin acentos, flexible) y categoría
  const baseFilteredProducts = products.filter(p => {
    const matchSearch = matchesProductSearch(p, searchTerm);
    const matchCat = selectedCategory === 'Todas' || normalizeSearchText(p.category || '') === normalizeSearchText(selectedCategory);
    return matchSearch && matchCat;
  });

  // Productos mostrados según la pestaña activa:
  // - 'new': Los últimos productos dados de alta (hasta 8 más recientes)
  // - 'deals': Artículos con descuento real
  // - 'all': Todo el catálogo completo
  const displayedProducts = (() => {
    if (activeTab === 'deals') {
      return baseFilteredProducts.filter(p => Boolean(p.discountPercent && p.discountPercent > 0));
    }
    if (activeTab === 'new') {
      // Si seleccionó una categoría específica, mostramos los últimos de esa categoría (máx 6)
      return baseFilteredProducts.slice(0, 8);
    }
    return baseFilteredProducts;
  })();

  const filteredProducts = displayedProducts;

  const toggleFav = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const addToCart = (product: Product, e?: React.MouseEvent, quantityToAdd: number = 1) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id);
      if (exists) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantityToAdd } : i);
      return [...prev, { product, quantity: quantityToAdd }];
    });
    trackEcommerceEvent('add_to_cart', {
      item_id: product.id,
      item_name: product.title,
      price: product.publicPrice,
      quantity: quantityToAdd,
      currency: 'MXN',
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

  const openAuthModal = () => {
    setAuthStep('email');
    setOtpCode('');
    setAuthFirstName('');
    setAuthLastName('');
    setShowAuthModal(true);
  };

  const handleCheckoutInit = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setCheckoutStep('shipping');
  };

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Paso 1: Enviar OTP directamente al correo ingresado
  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    setIsCheckingUser(true);
    setIsSendingOtp(true);
    try {
      const lookup = await lookupUserByEmail(cleanEmail);
      if (lookup.exists && lookup.fullName) {
        setRecognizedUser(lookup.fullName);
        setAuthName(lookup.fullName);
        setAuthPhone(lookup.phone || '');
        const parts = lookup.fullName.split(' ');
        setAuthFirstName(parts[0] || '');
        setAuthLastName(parts.slice(1).join(' ') || '');
      } else {
        setRecognizedUser(null);
        setAuthName('');
        setAuthPhone('');
        setAuthFirstName('');
        setAuthLastName('');
      }

      await sendEmailOTP(cleanEmail);
      setAuthStep('otp');
    } catch (err: any) {
      console.error("Error al procesar correo:", err);
      alert(`No pudimos procesar tu correo: ${err?.message || 'Intenta de nuevo'}`);
    } finally {
      setIsCheckingUser(false);
      setIsSendingOtp(false);
    }
  };

  // Reenviar código OTP si el usuario lo solicita
  const handleResendOtp = async () => {
    if (!authEmail) return;
    setIsSendingOtp(true);
    try {
      await sendEmailOTP(authEmail.trim());
      alert(`Código reenviado con éxito a ${authEmail}`);
    } catch (err: any) {
      alert(`Error al reenviar: ${err?.message || 'Intenta nuevamente en un momento'}`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Paso 2: Verificar el código OTP de 6 dígitos
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);

    let verified = false;
    let authError = '';
    let loggedUserId = '';

    try {
      const res = await verifyEmailOTP(authEmail.trim(), otpCode.trim());
      if (res?.session?.user) {
        verified = true;
        loggedUserId = res.session.user.id;
        setAuthenticatedUserId(loggedUserId);
      }
    } catch (err: any) {
      authError = err?.message || 'Código inválido o expirado';
      console.error("Error en verificación OTP de Supabase:", err);
    } finally {
      setIsVerifyingOtp(false);
    }

    if (verified && loggedUserId) {
      // Verificar si ya tiene datos guardados en su perfil
      let existingFullName = authName || recognizedUser || '';
      let existingPhone = authPhone || '';
      let points = 0;

      try {
        const freshProfile = await getUserFullProfile();
        if (freshProfile?.fullName) {
          existingFullName = freshProfile.fullName;
          existingPhone = freshProfile.phone || existingPhone;
          points = freshProfile.loyaltyPoints ?? 0;
        }
      } catch (e) {
        console.warn("Error leyendo perfil en verificación:", e);
      }

      // SI ES USUARIO NUEVO (o no tiene nombre completo guardado):
      // Le pedimos Nombre(s), Apellido(s) y Teléfono en el siguiente paso
      if (!existingFullName || !existingFullName.trim()) {
        setAuthStep('new_details');
        return;
      }

      // SI YA ES USUARIO EXISTENTE:
      const activeUser = { 
        id: loggedUserId,
        name: existingFullName, 
        email: authEmail.trim(), 
        phone: existingPhone, 
        points 
      };
      setUser(activeUser);
      setAuthStep('success');
      loadUserAccount(activeUser.phone, activeUser.email);
      setTimeout(() => {
        setShowAuthModal(false);
        if (cart.length > 0) {
          setCheckoutStep('shipping');
        } else {
          loadFullProfileData();
          setCurrentView('account');
        }
      }, 700);
    } else {
      alert(`Error al verificar código: ${authError || 'El código ingresado no es válido o ya expiró'}.\n\nRevisa tu bandeja de entrada o spam en ${authEmail}.`);
    }
  };

  // Paso 3 (SOLO PARA USUARIOS NUEVOS TRAS METER EL CÓDIGO):
  // Capturar Nombre(s), Apellido(s) y Teléfono WhatsApp
  const handleNewDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFirstName.trim() || !authLastName.trim() || !authPhone.trim()) {
      alert("Por favor completa tu nombre, apellido y teléfono.");
      return;
    }

    const fullName = `${authFirstName.trim()} ${authLastName.trim()}`;
    const cleanPhone = authPhone.trim();
    setIsSavingProfile(true);

    try {
      const uid = authenticatedUserId;
      if (uid) {
        await upsertUserProfile({
          id: uid,
          email: authEmail.trim(),
          full_name: fullName,
          phone: cleanPhone,
        });
      }

      const activeUser = {
        id: uid || undefined,
        name: fullName,
        email: authEmail.trim(),
        phone: cleanPhone,
        points: 0,
      };

      setUser(activeUser);
      setAuthStep('success');
      loadUserAccount(cleanPhone, authEmail.trim());
      setTimeout(() => {
        setShowAuthModal(false);
        if (cart.length > 0) {
          setCheckoutStep('shipping');
        } else {
          loadFullProfileData();
          setCurrentView('account');
        }
      }, 700);
    } catch (err: any) {
      console.error("Error guardando datos del nuevo usuario:", err);
      alert(`No pudimos guardar tus datos: ${err?.message || 'Intenta de nuevo'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const loadUserAccount = async (phone: string, email: string) => {
    setLoadingOrders(true);
    try {
      const history = await getClientOrderHistory(phone);
      if (history && history.length > 0) {
        setUserOrders(history);
      } else if (email) {
        const historyEmail = await getClientOrderHistory(email);
        setUserOrders(historyEmail || []);
      }
    } catch (err) {
      console.warn("Error cargando historial de pedidos:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadFullProfileData = async () => {
    setLoadingFullProfile(true);
    try {
      const p = await getUserFullProfile();
      if (p) {
        setFullProfile(p);
        setEditName(p.fullName || '');
        setEditPhone(p.phone || '');
        loadUserAccount(p.phone || '', p.email);
      }
    } catch (e) {
      console.warn("Error cargando perfil completo:", e);
    } finally {
      setLoadingFullProfile(false);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      name: fullProfile?.fullName || user?.name || '',
      street: '',
      colonia: '',
      city: '',
      state: '',
      zip: '',
      phone: fullProfile?.phone || user?.phone || '',
      references: '',
      isDefault: (fullProfile?.addresses?.length || 0) === 0,
    });
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: UserAddress) => {
    setEditingAddress(addr);
    setAddressForm({ ...addr });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.city || !addressForm.zip) {
      alert("Por favor completa calle, ciudad y código postal.");
      return;
    }

    try {
      const addressPayload: UserAddress = {
        id: editingAddress?.id || `addr-${Date.now()}`,
        name: addressForm.name || fullProfile?.fullName || user?.name || '',
        street: addressForm.street || '',
        colonia: addressForm.colonia || '',
        city: addressForm.city || '',
        state: addressForm.state || '',
        zip: addressForm.zip || '',
        phone: addressForm.phone || fullProfile?.phone || user?.phone || '',
        references: addressForm.references || '',
        isDefault: Boolean(addressForm.isDefault),
      };

      const updated = await saveUserAddress(addressPayload);
      setFullProfile(prev => prev ? { ...prev, addresses: updated } : null);
      setShowAddressModal(false);
    } catch (err: any) {
      alert(`Error al guardar dirección: ${err?.message || 'Intenta de nuevo'}`);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("¿Eliminar esta dirección de entrega?")) return;
    try {
      const updated = await deleteUserAddress(id);
      setFullProfile(prev => prev ? { ...prev, addresses: updated } : null);
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    }
  };

  const detectBrand = (num: string): 'visa' | 'mastercard' | 'amex' | 'other' => {
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'other';
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cardForm.cardNumber.replace(/\s/g, '');
    if (clean.length < 15) {
      alert("Por favor ingresa un número de tarjeta válido (15 o 16 dígitos).");
      return;
    }
    if (!cardForm.holderName.trim()) {
      alert("Por favor ingresa el nombre del titular tal como aparece en la tarjeta.");
      return;
    }

    try {
      const last4 = clean.slice(-4);
      const brand = detectBrand(clean);
      const cardPayload: UserCard = {
        id: `card-${Date.now()}`,
        brand,
        last4,
        holderName: cardForm.holderName.trim().toUpperCase(),
        expMonth: cardForm.expMonth,
        expYear: cardForm.expYear,
        isDefault: (fullProfile?.cards?.length || 0) === 0 ? true : Boolean(cardForm.isDefault),
      };

      const updated = await saveUserCard(cardPayload);
      setFullProfile(prev => prev ? { ...prev, cards: updated } : null);
      setShowCardModal(false);
      setCardForm({ holderName: '', cardNumber: '', expMonth: '01', expYear: '26', isDefault: false });
    } catch (err: any) {
      alert(`Error al guardar tarjeta: ${err?.message || 'Intenta de nuevo'}`);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm("¿Eliminar este método de pago?")) return;
    try {
      const updated = await deleteUserCard(id);
      setFullProfile(prev => prev ? { ...prev, cards: updated } : null);
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    }
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUserProfileData({
        fullName: editName.trim(),
        phone: editPhone.trim(),
      });
      setFullProfile(prev => prev ? { ...prev, fullName: editName.trim(), phone: editPhone.trim() } : null);
      setUser(prev => prev ? { ...prev, name: editName.trim(), phone: editPhone.trim() } : null);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error al actualizar datos: ${err?.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCustomOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemText.trim() || !customPhone.trim()) return;

    setSubmittingCustomOrder(true);
    try {
      await submitSpecialOrder({
        clientName: customName || user?.name || 'Cliente',
        clientPhone: customPhone || user?.phone || '',
        clientEmail: customEmail || user?.email || '',
        description: customItemText,
      });
      setCustomOrderSent(true);
      setTimeout(() => {
        setCustomOrderSent(false);
        setShowCustomOrderModal(false);
        setCustomItemText('');
      }, 2000);
    } catch (err) {
      console.error("Error al enviar encargo especial:", err);
      alert("Hubo un inconveniente al enviar tu encargo. Intenta de nuevo.");
    } finally {
      setSubmittingCustomOrder(false);
    }
  };


  const handleFinishOrder = async () => {
    try {
      const created = await createOrderInDb({
        userId: user?.id,
        clientName: user?.name || '',
        clientPhone: user?.phone || '',
        clientEmail: user?.email,
        shippingType: shippingMethod === 'puebla_local' ? 'puebla_local' : 'national_shipping',
        shippingCost: shippingFee,
        subtotal: cartSubtotal,
        total: cartTotal,
        paymentMethod: paymentMethod === 'card' ? 'card' : 'spei',
        shippingAddress: {
          street: shippingAddress.street,
          zip: shippingAddress.zip,
          city: shippingAddress.city,
        },
        items: cart,
      });
      setConfirmedOrderId(created.orderNumber);

      // Enviar notificación automática por WhatsApp si tiene teléfono
      if (user?.phone) {
        fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "order_confirmed",
            orderNumber: created.orderNumber,
            clientName: user?.name || "Cliente",
            clientPhone: user?.phone,
            total: cartTotal,
          }),
        }).catch(err => console.warn("WhatsApp notification error:", err));
      }

      trackEcommerceEvent('purchase', {
        transaction_id: created.orderNumber,
        value: cartTotal,
        currency: 'MXN',
        items: cart.map(i => ({
          item_id: i.product.id,
          item_name: i.product.title,
          price: i.product.publicPrice,
          quantity: i.quantity,
        })),
      });
    } catch (err) {
      console.warn("Fallo guardando pedido en BD, usando id de contingencia:", err);
      const fallbackId = `FX-${Math.floor(100000 + Math.random() * 900000)}`;
      setConfirmedOrderId(fallbackId);
    }
    setCheckoutStep('success');
    resolveAbandonedCart(user?.phone, user?.email);
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const shippingFee = shippingMethod === 'puebla_local' ? 50.00 : 140.00;
  const cartTotal = cartSubtotal + shippingFee;
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#113B34] flex flex-col font-sans selection:bg-[#E65F2B] selection:text-white pb-20 md:pb-0">
      
      {/* ======================================================== */}
      {/* 1. HEADER VERDE BOSQUE (ESTILO PRESENTACIÓN FOXDROP) */}
      {/* ======================================================== */}
      <header className="bg-[#0F3E36] sticky top-0 z-40 shadow-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* LOGO FOXDROP NATIVO Y NÍTIDO */}
          <div 
            onClick={() => {
              setCurrentView('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer shrink-0 flex items-center"
            title="Ir al inicio de la tienda"
          >
            <FoxDropLogo size="md" variant="dark" />
          </div>

          {/* BUSCADOR PILL BEIGE CON BOTÓN ÁMBAR/NARANJA */}
          <div className="flex-1 max-w-xl relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                const val = e.target.value;
                setSearchTerm(val);
                if (val.trim() && selectedCategory !== 'Todas') {
                  setSelectedCategory('Todas');
                }
                if (currentView === 'account') setCurrentView('store');
              }}
              placeholder="Buscar productos, marcas o categorías..."
              className="w-full bg-[#FAF6F0] text-[#113B34] placeholder-[#7E9690] pl-4 pr-11 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition duration-200 outline-none shadow-inner border border-transparent focus:border-[#DF7F2D]"
            />
            {searchTerm ? (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0F3E36] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#DF7F2D] hover:bg-[#C96E24] text-white p-1.5 rounded-full transition shadow-sm cursor-pointer"
                title="Buscar"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ACCIONES: INSTALAR PWA + CARRITO + USUARIO */}
          <div className="flex items-center space-x-2 sm:space-x-4 text-xs font-semibold shrink-0">
            {/* BOTÓN INSTALAR PWA */}
            <button
              onClick={handleInstallApp}
              title="Instalar FoxDrop en tu dispositivo"
              className="hidden lg:flex items-center gap-1.5 bg-[#175248] hover:bg-[#1E6357] text-[#FAF6F0] px-3 py-1.5 rounded-full text-xs font-semibold transition border border-white/10"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Instalar App</span>
            </button>

            {/* CARRITO */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-white/10 text-white transition cursor-pointer flex items-center gap-1.5"
              title="Ver Carrito"
            >
              <ShoppingCart className="w-5 h-5 text-[#FAF6F0]" />
              <span className="hidden sm:inline text-xs font-medium text-white/90">Carrito</span>
              {cartItemCount > 0 && (
                <span className="bg-[#DF7F2D] text-white text-[10px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* USUARIO */}
            {user ? (
              <button
                onClick={() => {
                  if (currentView === 'account') {
                    setCurrentView('store');
                  } else {
                    loadFullProfileData();
                    setCurrentView('account');
                  }
                }}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition border cursor-pointer ${
                  currentView === 'account' 
                    ? 'bg-[#DF7F2D] text-white border-[#DF7F2D] shadow-xs' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                }`}
                title="Mi Cuenta, Rastreo y Tarjetas"
              >
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-xs truncate max-w-[100px]">
                  {user.name ? user.name.split(' ')[0] : 'Cuenta'}
                </span>
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="hidden sm:flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition border border-white/15 text-xs font-medium cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Mi Cuenta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {currentView === 'store' ? (
        <>
          {/* ======================================================== */}
          {/* 2. HERO SECTION CURVO CON ZORRITO 3D (MÓVIL & ESCRITORIO) */}
          {/* ======================================================== */}
      
      {/* ======================================================== */}
      {/* 2. HERO BANNER: COMPONENTE NATIVO VIBRANTE (SIN PIXELACIÓN) */}
      {/* ======================================================== */}
      
      {/* VERSIÓN MÓVIL (NATIVA 100% NÍTIDA) */}
      <section className="md:hidden pt-4 pb-2 px-4 w-full">
        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[#D5E0DD] bg-[#0E3D35] min-h-[190px] flex items-stretch">
          {/* Curva naranja cálida de fondo en el lado derecho */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-[45%] bg-[#DF7F2D]"
            style={{
              borderTopLeftRadius: '60% 100%',
              borderBottomLeftRadius: '30% 60%',
            }}
          />

          {/* Contenido izquierdo: Tag, Título y Botón */}
          <div className="relative z-10 w-[62%] p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-[#E3B888] uppercase block">
                TU ATAJO AL MUNDO
              </span>
              <h2 className="text-sm font-black text-white leading-tight">
                {user?.name 
                  ? `¡Hola, ${user.name.split(' ')[0]}! Descubre tesoros mundiales, calidad garantizada.`
                  : '¡Hola! Descubre tesoros, calidad garantizada.'}
              </h2>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setActiveTab('all');
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#DF7F2D] hover:bg-[#C96E24] text-white text-[11px] font-black px-3.5 py-1.5 rounded-full shadow-md transition transform active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Zorrito 3D HD Transparente en el lado derecho */}
          <div className="relative z-10 w-[38%] flex items-end justify-center pr-2 pb-1">
            <img
              src="/fox-mascot-hd-transparent.png"
              alt="Mascota FoxDrop"
              className="max-h-[175px] w-auto object-contain drop-shadow-xl"
            />
          </div>
        </div>

        {/* DOTS INDICADORES DE CARRUSEL DEBAJO DEL BANNER */}
        <div className="flex items-center justify-center gap-1.5 pt-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0F3E36] transition-all"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all"></span>
        </div>
      </section>

      {/* VERSIÓN ESCRITORIO (NATIVA 100% NÍTIDA) */}
      <section className="hidden md:block pt-6 pb-2 px-6 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#D5E0DD] bg-[#0E3D35] min-h-[300px] lg:min-h-[340px] flex items-stretch">
          {/* Curva naranja cálida de fondo en el cuadrante derecho */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-[42%] bg-[#DF7F2D]"
            style={{
              borderTopLeftRadius: '55% 100%',
              borderBottomLeftRadius: '25% 50%',
            }}
          />

          {/* Columna Izquierda: Tipografía nítida y botón CTA */}
          <div className="relative z-10 w-[60%] lg:w-[58%] p-8 lg:p-12 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs lg:text-sm font-black tracking-widest text-[#E3B888] uppercase block">
                TU ATAJO AL MUNDO
              </span>
              <h2 className="text-2xl lg:text-4xl font-black text-white leading-tight max-w-xl">
                {user?.name 
                  ? `¡Hola, ${user.name.split(' ')[0]}! Descubre tesoros mundiales, calidad garantizada.`
                  : '¡Hola! Descubre tesoros, calidad garantizada.'}
              </h2>
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setActiveTab('all');
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#DF7F2D] hover:bg-[#C96E24] text-white font-black px-6 py-2.5 rounded-full text-xs lg:text-sm shadow-md transition transform hover:scale-105 flex items-center gap-2 cursor-pointer w-fit"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Columna Derecha: Mascota FoxDrop 3D HD en gran detalle */}
          <div className="relative z-10 w-[40%] lg:w-[42%] flex items-end justify-center pr-6 pb-2">
            <img
              src="/fox-mascot-hd-transparent.png"
              alt="Mascota FoxDrop 3D"
              className="max-h-[290px] lg:max-h-[330px] w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>

        {/* DOTS INDICADORES DE CARRUSEL DEBAJO DEL BANNER */}
        <div className="flex items-center justify-center gap-2 pt-3.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0F3E36] shadow-xs"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all cursor-pointer"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all cursor-pointer"></span>
          <span className="w-2 h-2 rounded-full bg-[#CBD8D4] hover:bg-[#0F3E36] transition-all cursor-pointer"></span>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2.5 CATEGORÍAS EN PÍLDORAS REDONDEADAS (ESTILO PRESENTACIÓN) */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-black text-[#0F3E36] tracking-tight">
            Categorías
          </h2>
          {selectedCategory !== 'Todas' && (
            <button
              onClick={() => setSelectedCategory('Todas')}
              className="text-xs font-bold text-[#DF7F2D] hover:underline"
            >
              Ver todas ({products.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar pb-1">
          {/* BOTÓN TODAS */}
          <button
            onClick={() => {
              setSelectedCategory('Todas');
              setActiveTab('all');
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
              selectedCategory === 'Todas'
                ? 'bg-[#0F3E36] text-white'
                : 'bg-[#E1EBE8] hover:bg-[#D5E3DF] text-[#0F3E36] border border-[#CCDCD7]'
            }`}
          >
            <span className="text-base">🌍</span>
            <span>Todas</span>
          </button>

          {/* TARJETAS DE CATEGORÍA ESTILO PÍLDORA */}
          {popularCategories.map((cat) => {
            const isSelected = selectedCategory.trim().toLowerCase() === cat.name.trim().toLowerCase();
            const emojiMap: Record<string, string> = {
              'electrónica': '📱',
              'electronica': '📱',
              'moda': '👗',
              'hogar': '🏠',
              'juguetes': '🧸',
              'cosmética': '💄',
              'cosmetica': '💄',
              'belleza': '💄',
              'cuidado personal': '🧴',
            };
            const emoji = emojiMap[cat.name.toLowerCase()] || '📦';
            return (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setActiveTab('all');
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-[#0F3E36] text-white'
                    : 'bg-[#E1EBE8] hover:bg-[#D5E3DF] text-[#0F3E36] border border-[#CCDCD7]'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}

          {/* BOTÓN PEDIDOS ESPECIALES */}
          <button
            onClick={() => setShowCustomOrderModal(true)}
            className="px-4 py-2 rounded-2xl text-xs font-bold bg-[#E1EBE8] hover:bg-[#D5E3DF] text-[#0F3E36] border border-[#CCDCD7] transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs"
            title="¿Buscas un producto que no ves en el catálogo? Solicítalo aquí"
          >
            <span className="text-base">✨</span>
            <span>Pedidos Especiales</span>
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SECCIÓN PRINCIPAL: CATÁLOGO / LO NUEVO / TODOS */}
      {/* ======================================================== */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-xl font-black text-[#1F2D3D] tracking-tight">
              {activeTab === 'new' 
                ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo' : `Lo Nuevo en ${selectedCategory}`)
                : activeTab === 'deals'
                ? 'Ofertas Activas'
                : (selectedCategory === 'Todas' ? 'Catálogo Completo' : `Catálogo: ${selectedCategory}`)
              }
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {activeTab === 'new' 
                ? 'Últimos productos dados de alta en plataforma' 
                : `${filteredProducts.length} productos disponibles`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'new' && (
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategory('Todas');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-[#2D4A58] text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ver todo el catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {selectedCategory !== 'Todas' && (
              <button
                onClick={() => setSelectedCategory('Todas')}
                className="bg-orange-50 hover:bg-orange-100 text-[#E65F2B] text-xs font-bold px-3 py-1.5 rounded-lg transition border border-orange-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar filtro ({selectedCategory})</span>
              </button>
            )}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
            <p className="text-gray-500 font-medium text-sm">No se encontraron productos en esta categoría o selección.</p>
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('Todas');
                setSearchTerm('');
              }}
              className="bg-[#2D4A58] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1a2d36] transition cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {filteredProducts.map(product => {
              const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
              const originalPrice = hasDiscount 
                ? (product.publicPrice / (1 - (product.discountPercent! / 100))) 
                : product.publicPrice;
              const isFav = favorites.includes(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setModalQuantity(1);
                    setSelectedProduct(product);
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer group relative hover:-translate-y-0.5"
                >
                  {/* BADGES SUPERIORES: DESCUENTO / STOCK / FAVORITO */}
                  <div className="flex items-center justify-between absolute top-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
                    {hasDiscount ? (
                      <span className="bg-[#E65F2B] text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                        -{product.discountPercent}%
                      </span>
                    ) : product.stock === 1 ? (
                      <span className="bg-amber-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                        Último
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={(e) => toggleFav(product.id, e)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition pointer-events-auto backdrop-blur-md shadow-xs ${
                        isFav 
                          ? 'bg-rose-50 text-rose-500' 
                          : 'bg-white/80 text-gray-400 hover:text-rose-500 hover:bg-white'
                      }`}
                      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* IMAGEN DE PRODUCTO CON EFECTO SUAVE EN CONTENEDOR CREMA/MENTA */}
                  <div className="aspect-square bg-[#EAF1EF] rounded-2xl flex items-center justify-center p-3 mb-2.5 overflow-hidden group-hover:bg-[#E2ECE9] transition">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="max-h-full w-auto object-contain group-hover:scale-108 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* DETALLES DE PRECIO Y VALORACIÓN */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1 leading-snug group-hover:text-[#0F3E36] transition">
                        {product.title}
                      </h4>
                      {product.description && (
                        <p className="text-[10px] text-gray-400 line-clamp-1 font-medium mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm sm:text-base font-black text-[#0F3E36] font-mono tracking-tight">
                          ${product.publicPrice.toFixed(0)} <span className="text-[10px] font-normal text-gray-500">MXN</span>
                        </span>

                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                          <span className="text-amber-400 text-xs">★</span>
                          <span>4.8</span>
                        </div>
                      </div>

                      {hasDiscount && (
                        <span className="text-[10px] text-gray-400 line-through block font-medium">
                          ${originalPrice.toFixed(0)} MXN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BOTÓN AGREGAR EN VERDE BOSQUE EXACTO A LA PRESENTACIÓN */}
                  <button
                    onClick={(e) => addToCart(product, e)}
                    className="w-full mt-3 bg-[#11473E] hover:bg-[#0B332C] active:scale-98 text-white font-bold py-2 rounded-xl text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Agregar al Carrito</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
      ) : (
        /* ======================================================== */
        /* SECCIÓN INTEGRADA: MI CUENTA, RASTREO Y BENEFICIOS FOXDROP */
        /* ======================================================== */
        <div className="w-full flex-1 animate-in fade-in duration-200">
          
          {/* BARRA SUPERIOR DE REGRESO RÁPIDO */}
          <div className="bg-[#FAF6F0] border-b border-gray-200 px-4 sm:px-6 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={() => {
                  setCurrentView('store');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F3E36] hover:text-[#DF7F2D] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#DF7F2D]" />
                <span>← Volver al catálogo de productos</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>FoxDrop Tienda</span>
                <span>/</span>
                <strong className="text-[#0F3E36]">Mi Cuenta</strong>
              </div>
            </div>
          </div>

          {/* HERO BANNER DE USUARIO INTEGRADO */}
          <div className="bg-gradient-to-r from-[#0F3E36] via-[#164C42] to-[#0A2E28] text-white py-6 px-4 sm:px-6 shadow-inner">
            <div className="max-w-7xl mx-auto space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#DF7F2D] to-[#B85D14] text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : '🦊'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-white">
                        {user?.name || 'Mi Cuenta FoxDrop'}
                      </h1>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verificado
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/80 flex items-center gap-3">
                      <span>{user?.email}</span>
                      {user?.phone && <span>• 📞 {user.phone}</span>}
                    </p>
                  </div>
                </div>

                {/* Badge de Membresía Club Foxdrop */}
                {(() => {
                  const pts = user?.points ?? 0;
                  const tier = getClubFoxDropTier(pts, clubSettings?.tiers);
                  return (
                    <div className="bg-white/10 border border-white/15 backdrop-blur-xs rounded-2xl p-3 sm:px-4 flex items-center gap-3 shrink-0">
                      <div className="text-2xl">{tier.badge}</div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#E3B888] block">
                          Club Foxdrop
                        </span>
                        <span className="text-sm font-black text-white">{tier.name}</span>
                      </div>
                      <div className="border-l border-white/15 pl-3 text-right">
                        <span className="text-lg font-black text-[#DF7F2D] block leading-tight">
                          {pts}
                        </span>
                        <span className="text-[10px] text-white/70">Puntos</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 4 Cards de Resumen Rápido */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  onClick={() => setAccountTab('orders')}
                  className={`p-3.5 rounded-2xl text-left transition border cursor-pointer ${
                    accountTab === 'orders' 
                      ? 'bg-white text-[#0F3E36] border-white shadow-md' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Package className={`w-5 h-5 ${accountTab === 'orders' ? 'text-[#DF7F2D]' : 'text-[#E3B888]'}`} />
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/10">
                      {userOrders.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold block">Mis Pedidos</span>
                  <span className="text-[10px] opacity-80 block truncate">Rastreo e historial</span>
                </button>

                <button
                  onClick={() => setAccountTab('addresses')}
                  className={`p-3.5 rounded-2xl text-left transition border cursor-pointer ${
                    accountTab === 'addresses' 
                      ? 'bg-white text-[#0F3E36] border-white shadow-md' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <MapPin className={`w-5 h-5 ${accountTab === 'addresses' ? 'text-[#DF7F2D]' : 'text-[#E3B888]'}`} />
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/10">
                      {fullProfile?.addresses?.length || 0}
                    </span>
                  </div>
                  <span className="text-xs font-bold block">Direcciones</span>
                  <span className="text-[10px] opacity-80 block truncate">Lugares de entrega</span>
                </button>

                <button
                  onClick={() => setAccountTab('cards')}
                  className={`p-3.5 rounded-2xl text-left transition border cursor-pointer ${
                    accountTab === 'cards' 
                      ? 'bg-white text-[#0F3E36] border-white shadow-md' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <CreditCard className={`w-5 h-5 ${accountTab === 'cards' ? 'text-[#DF7F2D]' : 'text-[#E3B888]'}`} />
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/10">
                      {fullProfile?.cards?.length || 0}
                    </span>
                  </div>
                  <span className="text-xs font-bold block">Billetera</span>
                  <span className="text-[10px] opacity-80 block truncate">Tarjetas guardadas</span>
                </button>

                <button
                  onClick={() => setAccountTab('club')}
                  className={`p-3.5 rounded-2xl text-left transition border cursor-pointer ${
                    accountTab === 'club' 
                      ? 'bg-white text-[#0F3E36] border-white shadow-md' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Award className={`w-5 h-5 ${accountTab === 'club' ? 'text-[#DF7F2D]' : 'text-[#E3B888]'}`} />
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/10">
                      {getClubFoxDropTier(user?.points ?? 0, clubSettings?.tiers).discountPercent}%
                    </span>
                  </div>
                  <span className="text-xs font-bold block">Beneficios Club</span>
                  <span className="text-[10px] opacity-80 block truncate">Puntos y descuentos</span>
                </button>
              </div>

            </div>
          </div>

          {/* CONTENEDOR DE PESTAÑAS Y DETALLE */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            
            {/* Pestañas horizontales */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 overflow-x-auto gap-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {[
                  { id: 'orders', label: '📦 Pedidos y Rastreo' },
                  { id: 'addresses', label: '📍 Direcciones' },
                  { id: 'cards', label: '💳 Métodos de Pago' },
                  { id: 'club', label: '🦊 Club FoxDrop' },
                  { id: 'settings', label: '⚙️ Datos Personales' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAccountTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      accountTab === tab.id
                        ? 'bg-[#0F3E36] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  loadFullProfileData();
                  if (user) loadUserAccount(user.phone, user.email);
                }}
                className="text-xs font-bold text-[#0F3E36] hover:text-[#DF7F2D] flex items-center gap-1 shrink-0 p-1.5 cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders || loadingFullProfile ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>

            {/* TAB 1: MIS PEDIDOS Y RASTREO */}
            {accountTab === 'orders' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    {[
                      { id: 'all', label: `Todos (${userOrders.length})` },
                      { id: 'active', label: 'En Camino / Activos' },
                      { id: 'delivered', label: 'Entregados' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setOrderFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                          orderFilter === f.id
                            ? 'bg-[#DF7F2D] text-white shadow-xs'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {userOrders.length} pedido(s) registrados
                  </span>
                </div>

                {loadingOrders ? (
                  <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-100 shadow-sm">
                    <RefreshCw className="w-8 h-8 text-[#0F3E36] animate-spin mx-auto" />
                    <p className="text-sm font-bold text-gray-700">Consultando historial con el centro logístico...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-gray-100 shadow-sm max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-full bg-orange-50 text-[#DF7F2D] flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-gray-900">Aún no tienes pedidos registrados</h3>
                      <p className="text-xs text-gray-500">
                        Cuando realices compras en la tienda, aquí podrás ver el progreso de preparación y el rastreo de tu paquete en tiempo real.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView('store');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 bg-[#0F3E36] hover:bg-[#1A5248] text-white font-bold text-xs px-5 py-2.5 rounded-full transition shadow-md cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#DF7F2D]" />
                      <span>Explorar Catálogo de la Tienda</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userOrders
                      .filter(ord => {
                        if (orderFilter === 'active') return ord.status === 'pending' || ord.status === 'processing' || ord.status === 'shipped';
                        if (orderFilter === 'delivered') return ord.status === 'delivered';
                        return true;
                      })
                      .map(order => {
                        const statusStep = (() => {
                          switch (order.status) {
                            case 'pending': return 1;
                            case 'processing': return 2;
                            case 'shipped': return 3;
                            case 'delivered': return 4;
                            default: return 1;
                          }
                        })();

                        const statusBadge = (() => {
                          switch (order.status) {
                            case 'shipped': return { label: 'En Camino', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
                            case 'processing': return { label: 'En Preparación', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
                            case 'delivered': return { label: 'Entregado', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
                            case 'cancelled': return { label: 'Cancelado', bg: 'bg-red-100 text-red-800 border-red-300' };
                            default: return { label: 'Confirmado', bg: 'bg-gray-100 text-gray-800 border-gray-300' };
                          }
                        })();

                        return (
                          <div key={order.id} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition">
                            <div className="bg-[#FAF6F0] border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div>
                                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Fecha</span>
                                  <span className="font-bold text-gray-800">
                                    {new Date(order.created_at).toLocaleDateString('es-MX')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Total</span>
                                  <span className="font-extrabold text-[#DF7F2D] text-sm">
                                    ${Number(order.total).toFixed(2)} MXN
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${statusBadge.bg}`}>
                                  {statusBadge.label}
                                </span>
                                <span className="font-mono font-bold text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                                  {order.order_number || order.id}
                                </span>
                              </div>
                            </div>

                            {/* Tracker de 4 pasos */}
                            <div className="p-4 sm:p-6 space-y-4">
                              <div className="bg-[#FAF6F0]/70 rounded-2xl p-4 border border-gray-100">
                                <div className="relative flex items-center justify-between">
                                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0">
                                    <div 
                                      className="h-full bg-[#0F3E36] transition-all duration-500"
                                      style={{ width: `${((statusStep - 1) / 3) * 100}%` }}
                                    />
                                  </div>

                                  {[
                                    { step: 1, title: 'Confirmado', icon: CheckCircle2 },
                                    { step: 2, title: 'Empaque', icon: Package },
                                    { step: 3, title: 'En Camino', icon: Truck },
                                    { step: 4, title: 'Entregado', icon: Check },
                                  ].map(s => {
                                    const Icon = s.icon;
                                    const isPassed = statusStep >= s.step;
                                    const isCurrent = statusStep === s.step;

                                    return (
                                      <div key={s.step} className="relative z-10 flex flex-col items-center">
                                        <div 
                                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition ${
                                            isPassed 
                                              ? 'bg-[#0F3E36] text-white ring-4 ring-emerald-100' 
                                              : 'bg-white border-2 border-gray-300 text-gray-400'
                                          } ${isCurrent ? '!bg-[#DF7F2D] ring-4 ring-[#DF7F2D]/30' : ''}`}
                                        >
                                          <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={`text-[10px] mt-1 font-bold ${
                                          isCurrent ? 'text-[#DF7F2D]' : isPassed ? 'text-[#0F3E36]' : 'text-gray-400'
                                        }`}>
                                          {s.title}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Artículos */}
                              {order.order_items && order.order_items.length > 0 && (
                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
                                  {order.order_items.map((item: any, idx: number) => (
                                    <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-white">
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-lg">📦</span>
                                        <div>
                                          <p className="font-bold text-gray-900">{item.product_title}</p>
                                          <p className="text-[11px] text-gray-500">
                                            Cantidad: {item.quantity} • ${Number(item.price_at_purchase).toFixed(2)} MXN c/u
                                          </p>
                                        </div>
                                      </div>
                                      <span className="font-bold text-gray-800">
                                        ${(Number(item.price_at_purchase) * item.quantity).toFixed(2)} MXN
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DIRECCIONES */}
            {accountTab === 'addresses' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-900">Tus Direcciones de Entrega</h3>
                    <p className="text-xs text-gray-500">Para compras rápidas y entregas precisas.</p>
                  </div>
                  <button
                    onClick={handleOpenAddAddress}
                    className="bg-[#0F3E36] hover:bg-[#1A5248] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#DF7F2D]" />
                    <span>Agregar Dirección</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={handleOpenAddAddress}
                    className="border-2 border-dashed border-gray-300 hover:border-[#DF7F2D] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 transition bg-white/50 hover:bg-white min-h-[160px] cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-[#DF7F2D] flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-gray-800">Agregar nueva dirección</span>
                  </button>

                  {fullProfile?.addresses && fullProfile.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`bg-white rounded-2xl border p-4 space-y-2 relative shadow-xs transition flex flex-col justify-between ${
                        addr.isDefault ? 'border-[#0F3E36] ring-2 ring-[#0F3E36]/10' : 'border-gray-200'
                      }`}
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-gray-900">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 font-medium">{addr.street}</p>
                        {addr.colonia && <p className="text-gray-600">Col. {addr.colonia}</p>}
                        <p className="text-gray-600">{addr.city}, {addr.state} • C.P. {addr.zip}</p>
                        {addr.phone && <p className="text-[11px] text-gray-500">Tel: {addr.phone}</p>}
                        {addr.references && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg mt-1 border border-amber-100">
                            Ref: {addr.references}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleOpenEditAddress(addr)}
                          className="p-1 text-gray-500 hover:text-[#0F3E36] transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: MÉTODOS DE PAGO */}
            {accountTab === 'cards' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-900">Métodos de Pago</h3>
                    <p className="text-xs text-gray-500">Tarjetas de crédito o débito para compras con 1 clic.</p>
                  </div>
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="bg-[#0F3E36] hover:bg-[#1A5248] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#DF7F2D]" />
                    <span>Agregar Tarjeta</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="border-2 border-dashed border-gray-300 hover:border-[#DF7F2D] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 transition bg-white/50 hover:bg-white min-h-[160px] cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-[#DF7F2D] flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-gray-800">Agregar método de pago</span>
                  </button>

                  {fullProfile?.cards && fullProfile.cards.map((card) => (
                    <div
                      key={card.id}
                      className="relative rounded-2xl p-4 text-white flex flex-col justify-between shadow-md min-h-[160px]"
                      style={{
                        background: card.brand === 'visa' 
                          ? 'linear-gradient(135deg, #1A365D 0%, #0F172A 100%)' 
                          : card.brand === 'mastercard'
                          ? 'linear-gradient(135deg, #7C2D12 0%, #18181B 100%)'
                          : 'linear-gradient(135deg, #0F3E36 0%, #022c22 100%)'
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black uppercase tracking-widest opacity-80">{card.brand}</span>
                        {card.isDefault && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-base font-black tracking-widest text-center">
                        •••• •••• •••• {card.last4}
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/10">
                        <span className="uppercase font-bold truncate max-w-[130px]">{card.holderName}</span>
                        <span>{card.expMonth}/{card.expYear}</span>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="hover:text-red-300 transition cursor-pointer p-0.5"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-start gap-3 text-xs text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500">
                    Tus pagos viajan encriptados de extremo a extremo mediante certificación bancaria PCI-DSS y 3D Secure. FoxDrop nunca almacena tu código CVV.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: CLUB FOXDROP */}
            {accountTab === 'club' && (
              <div className="space-y-5">
                {(() => {
                  const pts = user?.points ?? 0;
                  const tier = getClubFoxDropTier(pts, clubSettings?.tiers);
                  return (
                    <div className="bg-gradient-to-br from-[#0F3E36] via-[#1E5D52] to-[#DF7F2D] rounded-3xl p-6 text-white shadow-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{tier.badge}</span>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#E3B888] tracking-widest block">
                              Membresía Exclusiva
                            </span>
                            <h3 className="text-xl font-black text-white">{tier.name}</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#E3B888] block leading-none">{pts}</span>
                          <span className="text-[11px] text-white/80">Puntos Club</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/80">
                        {tier.discountPercent > 0
                          ? `Tienes un ${tier.discountPercent}% de descuento permanente en toda la tienda.`
                          : 'Acumula 1 punto por cada $10 MXN gastados para desbloquear descuentos y envíos prioritarios.'}
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-900 tracking-wide">Niveles de Membresía</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {[
                      { name: 'Bronce 🥉', pts: '0 - 499 pts', desc: '1 punto por cada $10 MXN.' },
                      { name: 'Plata 🥈', pts: '500 - 1,499 pts', desc: '5% de descuento permanente.' },
                      { name: 'Oro 🥇', pts: '1,500 - 3,499 pts', desc: '10% de descuento + envíos locales gratis.' },
                      { name: 'Platino 💎', pts: '3,500+ pts', desc: '15% de descuento + atención VIP personalizada.' },
                    ].map((lvl, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                        <span className="font-bold text-gray-900 block">{lvl.name}</span>
                        <span className="text-[10px] text-gray-400 block">{lvl.pts}</span>
                        <p className="text-[11px] text-gray-600">{lvl.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DATOS PERSONALES */}
            {accountTab === 'settings' && (
              <div className="max-w-lg space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4 shadow-xs">
                  <h3 className="text-sm font-black text-gray-900">Tus Datos de Contacto</h3>

                  {profileSaveSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>¡Tus datos fueron guardados con éxito!</span>
                    </div>
                  )}

                  <form onSubmit={handleSavePersonalData} className="space-y-3 text-xs">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Nombre completo:</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold block mb-1">WhatsApp de contacto:</label>
                      <input
                        type="tel"
                        required
                        placeholder="10 dígitos"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Correo electrónico:</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-[#0F3E36] hover:bg-[#1A5248] disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs shadow cursor-pointer"
                    >
                      {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </form>
                </div>

                <div className="bg-red-50/60 rounded-2xl p-4 border border-red-200/60 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-red-900">Cerrar Sesión</p>
                    <p className="text-[11px] text-red-600">Finalizar tu sesión en este navegador.</p>
                  </div>
                  <button
                    onClick={async () => {
                      await authSignOut();
                      setUser(null);
                      setCurrentView('store');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Salir
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* MODAL AGREGAR / EDITAR DIRECCIÓN */}
          {showAddressModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-black text-base text-gray-900">
                    {editingAddress ? 'Editar Dirección' : 'Nueva Dirección de Entrega'}
                  </h3>
                  <p className="text-xs text-gray-500">Ingresa la ubicación donde recibirás tus pedidos.</p>
                </div>

                <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Nombre de quien recibe:</label>
                    <input
                      type="text"
                      required
                      value={addressForm.name || ''}
                      onChange={e => setAddressForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Calle y número (exterior/interior):</label>
                    <input
                      type="text"
                      required
                      value={addressForm.street || ''}
                      onChange={e => setAddressForm(p => ({ ...p, street: e.target.value }))}
                      className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Colonia:</label>
                      <input
                        type="text"
                        required
                        value={addressForm.colonia || ''}
                        onChange={e => setAddressForm(p => ({ ...p, colonia: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Código Postal:</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={addressForm.zip || ''}
                        onChange={e => setAddressForm(p => ({ ...p, zip: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Ciudad / Municipio:</label>
                      <input
                        type="text"
                        required
                        value={addressForm.city || ''}
                        onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Estado:</label>
                      <input
                        type="text"
                        required
                        value={addressForm.state || ''}
                        onChange={e => setAddressForm(p => ({ ...p, state: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Referencias de entrega (opcional):</label>
                    <textarea
                      rows={2}
                      value={addressForm.references || ''}
                      onChange={e => setAddressForm(p => ({ ...p, references: e.target.value }))}
                      className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0F3E36] hover:bg-[#1A5248] text-white font-bold py-2.5 rounded-xl transition text-xs shadow cursor-pointer mt-2"
                  >
                    {editingAddress ? 'Actualizar Dirección' : 'Guardar Dirección'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL AGREGAR TARJETA */}
          {showCardModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-black text-base text-gray-900">Agregar Método de Pago</h3>
                  <p className="text-xs text-gray-500">Guarda una tarjeta de crédito o débito para compras con 1 clic.</p>
                </div>

                <form onSubmit={handleSaveCard} className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Nombre en la tarjeta:</label>
                    <input
                      type="text"
                      required
                      value={cardForm.holderName}
                      onChange={e => setCardForm(p => ({ ...p, holderName: e.target.value }))}
                      className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Número de tarjeta:</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardForm.cardNumber}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardForm(p => ({ ...p, cardNumber: v }));
                      }}
                      className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 font-mono text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Mes:</label>
                      <select
                        value={cardForm.expMonth}
                        onChange={e => setCardForm(p => ({ ...p, expMonth: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-700 font-bold block mb-1">Año:</label>
                      <select
                        value={cardForm.expYear}
                        onChange={e => setCardForm(p => ({ ...p, expYear: e.target.value }))}
                        className="w-full bg-[#FAF6F0] border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D]"
                      >
                        {['25', '26', '27', '28', '29', '30', '31'].map(y => (
                          <option key={y} value={y}>20{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0F3E36] hover:bg-[#1A5248] text-white font-bold py-2.5 rounded-xl transition text-xs shadow cursor-pointer mt-2"
                  >
                    Guardar Tarjeta
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FOOTER UNIFICADO EN COLOR VERDE BOSQUE (#0F3E36) */}
      {/* ======================================================== */}
      <footer className="bg-[#0F3E36] text-white mt-12 pt-10 pb-6 border-t border-[#175248] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* COL 1: SOBRE FOXDROP */}
            <div className="space-y-3">
              <FoxDropLogo size="md" variant="dark" />
              <p className="text-[#D3E0DC] text-xs leading-relaxed max-w-sm">
                Curaduría global y productos de importación con entregas seguras en Puebla y envíos a todo México.
              </p>
              <div className="pt-1">
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '522221234567'}?text=${encodeURIComponent('Hola FoxDrop, tengo una duda sobre un producto.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#E3B888] hover:text-white font-bold transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Atención directa por WhatsApp</span>
                </a>
              </div>
            </div>

            {/* COL 2: INFORMACIÓN */}
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wider text-[#E3B888]">Información</h4>
              <ul className="space-y-2 text-[#D3E0DC] text-xs">
                <li>
                  <button 
                    onClick={() => setInfoModal('envios')}
                    className="hover:text-white transition text-left cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-[#DF7F2D] font-bold">•</span>
                    <span className="hover:underline">Envíos</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModal('devoluciones')}
                    className="hover:text-white transition text-left cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-[#DF7F2D] font-bold">•</span>
                    <span className="hover:underline">Devoluciones</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModal('privacidad')}
                    className="hover:text-white transition text-left cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-[#DF7F2D] font-bold">•</span>
                    <span className="hover:underline">Privacidad</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* COL 3: MÉTODOS DE PAGO */}
            <div className="space-y-3">
              <h4 className="font-black text-sm uppercase tracking-wider text-[#E3B888]">Métodos de Pago</h4>
              <p className="text-[#D3E0DC] text-xs">
                De momento recibimos tus compras de forma directa y sin comisiones:
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-3 bg-white/10 border border-white/15 px-3 py-2 rounded-xl">
                  <span className="text-lg">💵</span>
                  <div>
                    <span className="font-black text-white block text-xs">Efectivo</span>
                    <span className="text-[10px] text-white/70">Pago contra entrega en Puebla</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 border border-white/15 px-3 py-2 rounded-xl">
                  <span className="text-lg">🏦</span>
                  <div>
                    <span className="font-black text-white block text-xs">Transferencia SPEI</span>
                    <span className="text-[10px] text-white/70">Directo desde cualquier banco de México</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COPYRIGHT */}
          <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/75 gap-3">
            <p>© 2026 FoxDrop. Todos los derechos reservados.</p>
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Compra 100% segura y garantizada</span>
            </div>
          </div>

        </div>
      </footer>

      {/* MODAL INFORMATIVO (ENVÍOS / DEVOLUCIONES / PRIVACIDAD) */}
      {infoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setInfoModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {infoModal === 'envios' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0F3E36] flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#0F3E36]">Política de Envíos</h3>
                    <p className="text-xs text-gray-400 font-medium">Entregas locales y cobertura nacional</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-[#FAF6F0] p-4 rounded-2xl border border-gray-100">
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">📍 Entregas Locales en Puebla:</strong>
                    Coordinamos entregas directas y seguras en puntos céntricos o a domicilio. Puedes pagar en efectivo contra entrega o vía SPEI.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">📦 Envíos Nacionales:</strong>
                    Enviamos a cualquier código postal de la República Mexicana mediante paqueterías certificadas con número de rastreo.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">⏱️ Tiempos de Preparación:</strong>
                    Los pedidos se preparan e inspeccionan en un plazo de 24 a 48 horas hábiles.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/terminos"
                    onClick={() => setInfoModal(null)}
                    className="text-xs font-bold text-[#DF7F2D] hover:underline flex items-center gap-1"
                  >
                    <span>Ver Términos y Condiciones completos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {infoModal === 'devoluciones' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#DF7F2D] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#0F3E36]">Garantía y Devoluciones</h3>
                    <p className="text-xs text-gray-400 font-medium">Calidad asegurada en cada compra</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-[#FAF6F0] p-4 rounded-2xl border border-gray-100">
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">🛡️ Garantía de Calidad FoxDrop:</strong>
                    Cada producto es revisado minuciosamente antes de su entrega para asegurar su perfecto estado y autenticidad.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">🔄 Plazo de Reporte:</strong>
                    Si tu artículo presenta algún defecto de fábrica o daño de traslado, cuentas con 7 días naturales tras recibirlo para solicitar tu reemplazo o reembolso.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">💬 Atención Sin Complicaciones:</strong>
                    Solo escríbenos directamente por WhatsApp con fotos o video de tu paquete para una solución inmediata.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/terminos"
                    onClick={() => setInfoModal(null)}
                    className="text-xs font-bold text-[#DF7F2D] hover:underline flex items-center gap-1"
                  >
                    <span>Ver Políticas de Devolución completas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {infoModal === 'privacidad' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#0F3E36]">Aviso de Privacidad</h3>
                    <p className="text-xs text-gray-400 font-medium">Protección estricta de tu información</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-[#FAF6F0] p-4 rounded-2xl border border-gray-100">
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">🔒 Uso Exclusivo:</strong>
                    Tus datos (nombre, teléfono y correo electrónico) son utilizados únicamente para la confirmación y entrega de tus pedidos y la asignación de tus puntos FoxDrop.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">🚫 Cero Spam o Venta de Datos:</strong>
                    Nunca venderemos, rentaremos ni compartiremos tus datos con agencias de publicidad externas ni terceros.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/privacidad"
                    onClick={() => setInfoModal(null)}
                    className="text-xs font-bold text-[#DF7F2D] hover:underline flex items-center gap-1"
                  >
                    <span>Ver Aviso de Privacidad Integral completo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <button
              onClick={() => setInfoModal(null)}
              className="w-full bg-[#0F3E36] hover:bg-[#185348] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. FICHA DE PRODUCTO: BOTTOM SHEET TÁCTIL (MÓVIL) Y MODAL (PC) */}
      {/* ======================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4 relative shadow-2xl animate-in slide-in-from-bottom duration-200">
            
            {/* TIRADOR VISUAL PARA MÓVIL (BOTTOM SHEET HANDLE) */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto sm:hidden mb-2" />

            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div className="aspect-square bg-slate-50 rounded-2xl p-4 flex items-center justify-center border border-gray-100">
                <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="max-h-full object-contain" />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#E65F2B] uppercase font-bold tracking-wider">{selectedProduct.category}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#1F2D3D] leading-snug mt-1">{selectedProduct.title}</h3>
                  
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono">${selectedProduct.publicPrice.toFixed(0)} <span className="text-sm font-normal text-gray-400">MXN</span></span>
                    {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 ? (
                      <span className="text-xs text-gray-400 line-through">
                        ${(selectedProduct.publicPrice / (1 - (selectedProduct.discountPercent / 100))).toFixed(0)} MXN
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-600 mt-2.5 leading-relaxed border-t border-gray-100 pt-2.5">
                    {selectedProduct.description}
                  </p>

                  {/* CLUB FOXDROP PUNTOS */}
                  <div className="mt-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                    <Sparkles className="w-4 h-4 text-[#E65F2B] shrink-0" />
                    <span>Ganas <strong>+{calculateEarnedPoints(selectedProduct.publicPrice, clubSettings?.pesosPerPoint || 10)} {clubSettings?.currencySymbol || '⭐'} {clubSettings?.currencyName || 'puntos'}</strong> para tu <strong>Club Foxdrop</strong>.</span>
                  </div>

                  {/* DISPONIBILIDAD DE STOCK & BADGES */}
                  <div className="pt-2">
                    {selectedProduct.stock <= 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Agotado temporalmente
                      </span>
                    ) : selectedProduct.stock === 1 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        ¡Último disponible en stock!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {selectedProduct.stock} piezas listas para entrega
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* SELECTOR DE CANTIDAD A COMPRAR */}
                  {selectedProduct.stock > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Cantidad a llevar:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                          disabled={modalQuantity <= 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-black text-sm text-slate-900 font-mono">
                          {modalQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity(prev => Math.min(selectedProduct.stock, prev + 1))}
                          disabled={modalQuantity >= selectedProduct.stock}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOTÓN AGREGAR AL CARRITO */}
                  <button
                    disabled={selectedProduct.stock <= 0}
                    onClick={() => {
                      addToCart(selectedProduct, undefined, modalQuantity);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-[#E65F2B] hover:bg-[#D45321] active:scale-98 disabled:bg-gray-400 text-white font-black py-3 rounded-xl text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {selectedProduct.stock <= 0 
                        ? 'Agotado' 
                        : modalQuantity > 1 
                          ? `Agregar ${modalQuantity} al carrito • $${(selectedProduct.publicPrice * modalQuantity).toFixed(0)} MXN` 
                          : 'Agregar al carrito'}
                    </span>
                  </button>

                  {/* BOTÓN RÁPIDO: PEDIR DIRECTO POR WHATSAPP */}
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `¡Hola FoxDrop! Me interesa comprar este artículo visto en su tienda:\n\n• *${selectedProduct.title}*\n• Cantidad: ${modalQuantity}\n• Precio: $${(selectedProduct.publicPrice * modalQuantity).toFixed(0)} MXN\n• Enlace: https://foxdrop.mx/tienda\n\n¿Tienen entrega o envío disponible hoy?`;
                      const whatsappNum = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
                      const waUrl = whatsappNum 
                        ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`
                        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Pedir directamente por WhatsApp</span>
                  </button>

                  {/* RECOMENDACIONES DE PRODUCTOS RELACIONADOS */}
                  {getCrossSellRecommendations(selectedProduct, products, 2).length > 0 && (
                    <div className="border-t border-gray-100 pt-2.5">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#E65F2B]" /> Te podría interesar:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {getCrossSellRecommendations(selectedProduct, products, 2).map((rec) => (
                          <div
                            key={rec.id}
                            onClick={() => {
                              setModalQuantity(1);
                              setSelectedProduct(rec);
                            }}
                            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition flex items-center gap-2"
                          >
                            <img src={rec.images[0]} alt={rec.title} className="w-8 h-8 object-contain rounded" />
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-bold text-gray-800 truncate">{rec.title}</p>
                              <p className="text-[10px] font-black text-[#E65F2B]">${rec.publicPrice.toFixed(0)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
              <h3 className="text-base font-bold text-[#0F3E36]">Acceso Rápido a FoxDrop</h3>
              <p className="text-xs text-gray-500">Accede a tus pedidos, rastreo en vivo y puntos sin contraseñas.</p>
            </div>

            {/* PASO 1: SOLO CORREO ELECTRÓNICO */}
            {authStep === 'email' && (
              <form onSubmit={handleEmailCheck} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-gray-700 font-bold block mb-1">Correo electrónico:</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="cliente@ejemplo.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="w-full bg-[#FAF6F0] border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:border-[#DF7F2D] shadow-inner font-medium"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Te enviaremos un código de seguridad para acceder de inmediato.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isCheckingUser || isSendingOtp}
                  className="w-full bg-[#DF7F2D] hover:bg-[#C96E24] disabled:bg-gray-300 text-white font-black py-3 rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  {isCheckingUser || isSendingOtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Comprobando cuenta...</span>
                    </>
                  ) : (
                    <span>Continuar</span>
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: CÓDIGO OTP DE 6 DÍGITOS */}
            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 text-xs animate-in fade-in duration-200">
                <div className="bg-[#EDF5F7] border border-[#D5E6EA] p-3 rounded-2xl text-center text-[#0F3E36]">
                  {recognizedUser ? (
                    <p className="font-extrabold text-sm mb-0.5">¡Hola de nuevo, {recognizedUser}! 👋</p>
                  ) : null}
                  <p className="font-semibold text-gray-800">Ingresa el código numérico de 6 dígitos</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Enviado a: <strong>{authEmail}</strong></p>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="------"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl p-3 text-center text-xl font-mono font-bold tracking-[0.3em] text-gray-900 focus:outline-none focus:border-[#0F3E36]"
                />

                <button 
                  type="submit" 
                  disabled={isVerifyingOtp || otpCode.length < 6}
                  className="w-full bg-[#0F3E36] hover:bg-[#1A5248] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Entrar</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="text-[#DF7F2D] hover:underline font-semibold disabled:text-gray-400 cursor-pointer"
                  >
                    {isSendingOtp ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('email');
                      setOtpCode('');
                    }}
                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Cambiar correo
                  </button>
                </div>
              </form>
            )}

            {/* PASO 3: SI ES USUARIO NUEVO TRAS VALIDAR CÓDIGO, PEDIR NOMBRE(S), APELLIDO(S) Y TELÉFONO */}
            {authStep === 'new_details' && (
              <form onSubmit={handleNewDetailsSubmit} className="space-y-3.5 text-xs animate-in fade-in duration-200">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-emerald-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>¡Código verificado con éxito!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-tight">
                    Por favor completa tus datos personales para coordinar tus entregas y pedidos.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Nombre(s):</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Ej. Mario"
                      value={authFirstName}
                      onChange={e => setAuthFirstName(e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 font-bold block mb-1">Apellido(s):</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Gómez"
                      value={authLastName}
                      onChange={e => setAuthLastName(e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D] text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 font-bold block mb-1">Teléfono WhatsApp:</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 dígitos (ej. 2221234567)"
                    value={authPhone}
                    onChange={e => setAuthPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#FAF6F0] border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D] text-xs font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Lo usamos para la entrega y para enviarte tu número de guía.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingProfile || !authFirstName.trim() || !authLastName.trim() || !authPhone.trim()}
                  className="w-full bg-[#0F3E36] hover:bg-[#1A5248] disabled:bg-gray-300 text-white font-black py-3 rounded-xl transition shadow cursor-pointer text-xs flex items-center justify-center gap-2 mt-2"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando datos...</span>
                    </>
                  ) : (
                    <span>Guardar y Entrar a FoxDrop</span>
                  )}
                </button>
              </form>
            )}

            {authStep === 'success' && (
              <div className="text-center py-4 text-xs font-bold text-emerald-600 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
                <span>¡Bienvenido a FoxDrop! Accediendo a tu cuenta...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL ENCARGO ESPECIAL (CONECTADO A SUPABASE) */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowCustomOrderModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
            <div className="border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-base text-[#1F2D3D]">Solicitar Encargo Especial</h3>
              <p className="text-[11px] text-gray-500">¿Buscas un artículo internacional no listado? Dinos cuál y te lo conseguimos.</p>
            </div>

            {customOrderSent ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">¡Solicitud recibida con éxito!</p>
                <p className="text-xs text-emerald-700">Te contactaremos por WhatsApp con la cotización en minutos.</p>
              </div>
            ) : (
              <form onSubmit={handleCustomOrderSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-700 font-bold block mb-1">Artículo deseado o link:</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ej. Tenis Nike x Travis Scott talla 27mx, reloj específico, accesorio..."
                    value={customItemText}
                    onChange={e => setCustomItemText(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <div>
                  <label className="text-gray-700 font-bold block mb-1">Tu Nombre:</label>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={customName || user?.name || ''}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2 text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <div>
                  <label className="text-gray-700 font-bold block mb-1">WhatsApp de contacto:</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 dígitos para cotizarte"
                    value={customPhone || user?.phone || ''}
                    onChange={e => setCustomPhone(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2 text-gray-900 focus:outline-none focus:border-[#2D4A58]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingCustomOrder}
                  className="w-full bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingCustomOrder ? 'Enviando solicitud...' : 'Enviar Encargo Especial'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. MODAL MI CUENTA & CLUB FOXDROP */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAccountModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado Perfil */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-full bg-[#2D4A58] text-white flex items-center justify-center font-black text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'F'}
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-base text-gray-900">{user?.name || 'Cliente FoxDrop'}</h3>
                <p className="text-xs text-gray-500">{user?.phone} • {user?.email}</p>
              </div>
            </div>

            {/* Tarjeta de Lealtad: Club Foxdrop */}
            {(() => {
              const points = user?.points ?? 0;
              const tier = getClubFoxDropTier(points, clubSettings?.tiers);
              return (
                <div className="bg-gradient-to-br from-[#2D4A58] to-[#1F2D3D] text-white p-4 rounded-xl space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                      Membresía Exclusiva
                    </span>
                    <span className="text-lg">{tier.badge}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h4 className="text-sm font-black">{tier.name}</h4>
                      <p className="text-[11px] text-gray-300">
                        {tier.discountPercent > 0 ? `${tier.discountPercent}% de descuento permanente` : 'Acumula puntos con cada compra'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#E65F2B]">{points}</span>
                      <span className="text-[10px] text-gray-300 block">Puntos Club</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-300 border-t border-white/10 pt-2 flex items-center justify-between">
                    <span>1 punto por cada $10 MXN gastados</span>
                    <span className="text-orange-300 font-bold">🦊 Club Foxdrop</span>
                  </div>
                </div>
              );
            })()}

            {/* Historial de Compras Real */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Mis Pedidos Realizados
              </h4>

              {loadingOrders ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Cargando tus compras...
                </div>
              ) : userOrders.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-500 border border-gray-100">
                  Aún no tienes pedidos registrados con este número.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{ord.order_number || ord.id}</span>
                        <span className="font-extrabold text-[#E65F2B]">${Number(ord.total).toFixed(2)} MXN</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Estado: <strong className="capitalize text-gray-700">{ord.status}</strong></span>
                        <span>{new Date(ord.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await authSignOut();
                setUser(null);
                setShowAccountModal(false);
              }}
              className="w-full text-center text-xs text-red-600 hover:text-red-700 font-bold pt-2 block cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER LATERAL DE CATEGORÍAS (SLIDE-OVER MENU) */}
      {/* ======================================================== */}
      {isCategoryDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex">
          {/* Backdrop con desenfoque suave */}
          <div 
            onClick={() => setIsCategoryDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Panel lateral */}
          <div className="relative w-full max-w-xs bg-white text-gray-900 shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div>
              {/* Header del drawer */}
              <div className="bg-[#2D4A58] text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Menu className="w-5 h-5 text-[#E65F2B]" />
                  <span className="font-extrabold text-sm tracking-wide">CATEGORÍAS</span>
                </div>
                <button 
                  onClick={() => setIsCategoryDrawerOpen(false)}
                  className="text-gray-300 hover:text-white p-1 rounded-md transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de categorías */}
              <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Opción todas */}
                <button
                  onClick={() => {
                    setSelectedCategory('Todas');
                    setActiveTab('all');
                    setIsCategoryDrawerOpen(false);
                    const el = document.getElementById('catalog-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left font-bold text-xs transition ${
                    selectedCategory === 'Todas' ? 'bg-[#EDF5F7] text-[#2D4A58] border border-[#D5E6EA]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#E65F2B] flex items-center justify-center">
                      <Sparkle className="w-4 h-4" />
                    </div>
                    <span>Todas las categorías</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {products.length}
                  </span>
                </button>

                {popularCategories.map((cat, idx) => {
                  const Icon = cat.icon;
                  const count = products.filter(p => p.category?.trim().toLowerCase() === cat.name.trim().toLowerCase()).length;
                  const isSelected = selectedCategory.trim().toLowerCase() === cat.name.trim().toLowerCase();

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setActiveTab('all');
                        setIsCategoryDrawerOpen(false);
                        const el = document.getElementById('catalog-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left font-bold text-xs transition ${
                        isSelected ? 'bg-[#EDF5F7] text-[#2D4A58] border border-[#D5E6EA]' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EDF5F7] text-[#2D4A58] flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{cat.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer del drawer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  setIsCategoryDrawerOpen(false);
                  setShowCustomOrderModal(true);
                }}
                className="w-full bg-[#2D4A58] hover:bg-[#1a2d36] text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>¿No encuentras algo? Haz un encargo</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 11. BOTTOM NAVIGATION BAR MÓVIL (VERDE BOSQUE & ÁMBAR) */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F3E36] border-t border-white/10 z-40 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setCurrentView('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'store' ? 'text-[#DF7F2D]' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold">Inicio</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('store');
            setTimeout(() => {
              const el = document.getElementById('catalog-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          className="flex flex-col items-center gap-1 text-gray-300 hover:text-white"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">Catálogo</span>
        </button>

        <button
          onClick={() => setShowCustomOrderModal(true)}
          className="flex flex-col items-center gap-1 text-gray-300 hover:text-white"
        >
          <Send className="w-5 h-5" />
          <span className="text-[10px] font-medium">Encargo</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-300 hover:text-white relative"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-[#DF7F2D] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
              {cartItemCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Carrito</span>
        </button>

        {user ? (
          <button
            onClick={() => {
              if (currentView === 'account') {
                setCurrentView('store');
              } else {
                loadFullProfileData();
                setCurrentView('account');
              }
            }}
            className={`flex flex-col items-center gap-1 transition ${
              currentView === 'account' ? 'text-[#DF7F2D]' : 'text-gray-300 hover:text-white'
            }`}
          >
            <User className="w-5 h-5 text-amber-300" />
            <span className="text-[10px] font-medium">{user.name ? user.name.split(' ')[0] : 'Cuenta'}</span>
          </button>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-white cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Entrar</span>
          </button>
        )}
      </nav>

    </div>
  );
}

