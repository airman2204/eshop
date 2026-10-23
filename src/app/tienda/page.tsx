'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FoxDropLogo from '@/components/FoxDropLogo';
import { 
  Search, ShoppingCart, User, Menu, Star, ChevronLeft, ChevronRight, X, Truck, ShieldCheck, 
  ArrowRight, Plus, Minus, CreditCard, Sparkles, Send, CheckCircle2, Monitor, Shirt, Home as HomeIcon,
  Gamepad2, Heart, Phone, Mail, ArrowUpRight, Download, Sparkle, Tag, MessageSquare, RefreshCw,
  Package, MapPin, Award, Trash2, Edit3, ExternalLink, ArrowLeft, Check, ShoppingBag, Copy,
  Clock, AlertTriangle, Ban, Bell, BellRing, Volume2, Zap, Share2, ThumbsUp, TrendingUp, Coins, Loader2,
  ChevronDown
} from 'lucide-react';
import { Product, UserAddress, UserCard, CheckoutSettings, ShippingMethodConfig } from '@/types';
import GoogleAddressInput from '@/components/GoogleAddressInput';
import { getCheckoutSettings, DEFAULT_CHECKOUT_SETTINGS } from '@/lib/checkoutSettings';
import { getActiveProducts, getClientBootstrap } from '@/lib/products';
import { 
  sendEmailOTP, verifyEmailOTP, upsertUserProfile, getCurrentUserProfile, signOut as authSignOut, 
  lookupUserByEmail, FullUserProfile, getUserFullProfile, saveUserAddress, deleteUserAddress, 
  saveUserCard, deleteUserCard, updateUserProfileData 
} from '@/lib/auth';
import { createOrderInDb, submitSpecialOrder, getClientOrderHistory, trackAbandonedCart, resolveAbandonedCart, cancelOrderAsClient, subscribeToClientOrders } from '@/lib/orders';
import { getCrossSellRecommendations, calculateEarnedPoints, getClubFoxDropTier, DEFAULT_CLUB_SETTINGS } from '@/lib/clubFoxdrop';
import { getCarouselSlides, CarouselSlide, getClubSettings, getStoreSettings, StoreSettings, DEFAULT_STORE_SETTINGS } from '@/lib/admin';
import { getCategoryIconEmoji } from '@/lib/constants';
import { ClubFoxDropSettings } from '@/types';
import { trackEcommerceEvent } from '@/components/Analytics';
import { soundManager } from '@/lib/sounds';

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

// Normalizador seguro de imagenes (evita caidas por hotlink / CDN de proveedores externos como CJ Dropshipping)
function getSafeProductImage(url: string | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '/no-image.svg';
  let clean = url.trim();
  if (clean.startsWith('//')) clean = 'https:' + clean;
  if (clean.includes('cjdropshipping.com') || clean.includes('aliyuncs.com')) {
    return '/api/whatsapp/image-proxy?url=' + encodeURIComponent(clean);
  }
  return clean;
}

export default function TiendaFoxDrop() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [storeBrands, setStoreBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [activeModalImageIndex, setActiveModalImageIndex] = useState(0);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'deals' | 'all'>('new');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount_desc' | 'name_asc' | 'name_desc'>('default');
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Filtros avanzados: Rango de precio
  const [priceFilter, setPriceFilter] = useState<'all' | 'under150' | '150to350' | 'above350'>('all');

  // Segmentación exclusiva Mario & Nydia: 'boutique' (FoxDrop local/física) vs 'import' (CJ Directo a domicilio)
  const [catalogSegment, setCatalogSegment] = useState<'all' | 'boutique' | 'import'>('all');

  // Búsqueda predictiva con historial y búsquedas populares
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const POPULAR_SEARCHES = ['Difusores', 'Aromatizantes', 'Apple Watch', 'Skincare', 'Perfumes', 'Combos'];

  // Cargar historial de búsquedas de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('foxdrop_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
    } catch {}
  }, []);

  const saveSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try { localStorage.setItem('foxdrop_recent_searches', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try { localStorage.removeItem('foxdrop_recent_searches'); } catch {}
  };

  // Zoom interactivo en modal de producto
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [zoomCoords, setZoomCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Cupones de descuento promocionales en checkout
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number; description: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Estimador de envío por Código Postal en ficha de producto
  const [modalZipCode, setModalZipCode] = useState('');
  const [modalShippingEstimate, setModalShippingEstimate] = useState<{ zip: string; cost: number; time: string; label: string } | null>(null);

  // Estado visual al compartir producto
  const [shareCopied, setShareCopied] = useState(false);

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
        // Carga bootstrap consolidada en 1 sola petición paralela
        const bootstrap = await getClientBootstrap();
        const remoteProducts = bootstrap?.products || [];
        setProducts(remoteProducts);

        if (bootstrap?.storeSettings) setStoreSettings(bootstrap.storeSettings);
        if (bootstrap?.checkoutSettings) {
          setCheckoutSettings(bootstrap.checkoutSettings);
          const firstActive = bootstrap.checkoutSettings.shippingMethods?.find((m: any) => m.enabled);
          if (firstActive) setSelectedShippingId(firstActive.id);
        }
        if (bootstrap?.slides && Array.isArray(bootstrap.slides) && bootstrap.slides.length > 0) {
          setSlides(bootstrap.slides);
        }
        if (bootstrap?.clubSettings) setClubSettings(bootstrap.clubSettings);
        if (bootstrap?.brands && Array.isArray(bootstrap.brands)) {
          setStoreBrands(bootstrap.brands);
        }

        // Si viene con parámetro ?highlight=[id] desde redes sociales, abrir el producto de inmediato
        if (typeof window !== 'undefined' && remoteProducts && remoteProducts.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const brandParam = urlParams.get('brand') || urlParams.get('tienda');
          if (brandParam) {
            setSelectedBrand(brandParam);
          }
          const highlightId = urlParams.get('highlight');
          if (highlightId) {
            const found = remoteProducts.find(p => p.id === highlightId);
            if (found) {
              setSelectedProduct(found);
            }
          }

          // Detección de retorno de pasarela de pago (Mercado Pago)
          const orderSuccess = urlParams.get('order_success');
          const orderFailure = urlParams.get('order_failure');
          const paymentStatus = urlParams.get('payment_status');

          if (orderSuccess && paymentStatus === 'approved') {
            // Pago exitoso en Mercado Pago: vaciamos carrito y mostramos éxito
            try {
              localStorage.removeItem('foxdrop_cart_id');
              localStorage.removeItem('foxdrop_cart_items_v1');
            } catch {}
            setCart([]);
            setPaymentNotice({
              type: 'success',
              message: `Pago confirmado con éxito. Tu pedido ${orderSuccess} ha sido procesado.`
            });
            // Limpiar query params de la URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (orderFailure || paymentStatus === 'rejected' || paymentStatus === 'null') {
            // Pago no completado o rechazado: MANTENER CARRITO INTACTO y mostrar error formal
            setPaymentNotice({
              type: 'error',
              message: 'Tu pago no fue completado o fue rechazado por el banco. Tus productos siguen seguros en tu carrito para que puedas verificar los datos de tu tarjeta o intentar con otro método de pago.'
            });
            setIsCartOpen(true);
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
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
          loadFullProfileData();
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

  // Persistencia y Sincronización Automática de Carritos (Admin & Carritos Abandonados)
  const [isCartHydrated, setIsCartHydrated] = useState(false);

  // 1. Cargar el carrito guardado en localStorage únicamente una vez en el cliente
  useEffect(() => {
    try {
      const saved = localStorage.getItem('foxdrop_cart_items_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {
      console.warn('Error al leer carrito persistido:', e);
    } finally {
      setIsCartHydrated(true);
    }
  }, []);

  // 2. Sincronizar hacia localStorage y servidor SOLO después de que el carrito fue hidratado
  useEffect(() => {
    if (!isCartHydrated) return;

    try {
      localStorage.setItem('foxdrop_cart_items_v1', JSON.stringify(cart));
    } catch {}

    const timer = setTimeout(async () => {
      try {
        const savedCartId = typeof window !== 'undefined' ? localStorage.getItem('foxdrop_cart_id') : null;
        const syncItems = cart.map(i => ({
          id: i.product.id,
          title: i.product.title,
          quantity: i.quantity,
          price: i.product.publicPrice,
          image: i.product.images?.[0] || '',
        }));

        const total = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);

        const res = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: savedCartId,
            userId: user?.id || null,
            clientName: user?.name || 'Cliente en Tienda Web',
            clientPhone: user?.phone || '',
            clientEmail: user?.email || '',
            items: syncItems,
            total,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.cartId) {
            localStorage.setItem('foxdrop_cart_id', data.cartId);
          } else if (cart.length === 0) {
            localStorage.removeItem('foxdrop_cart_id');
            localStorage.removeItem('foxdrop_cart_items_v1');
          }
        }
      } catch (err) {
        console.warn('Error sincronizando carrito con backend:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cart, user, isCartHydrated]);

  // VISTA INTEGRADA: Tienda ('store'), Mi Cuenta ('account') o Pantalla Completa de Checkout ('checkout')
  const [currentView, setCurrentView] = useState<'store' | 'account' | 'checkout'>('store');
  const [accountTab, setAccountTab] = useState<'orders' | 'favorites' | 'addresses' | 'cards' | 'club' | 'settings'>('orders');
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(null);
  const [loadingFullProfile, setLoadingFullProfile] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'pos' | 'cancelled'>('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Modal de Cancelación de Pedido estilo Amazon / Mercado Libre
  const [showClientCancelModal, setShowClientCancelModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cancellingClientOrder, setCancellingClientOrder] = useState<any | null>(null);
  const [clientCancelReason, setClientCancelReason] = useState('Encontré un mejor precio / Ya no lo necesito');
  const [clientCancelNotes, setClientCancelNotes] = useState('');
  const [clientCancellingLoading, setClientCancellingLoading] = useState(false);

  // Notificación flotante en tiempo real para el cliente
  const [clientRealtimeToast, setClientRealtimeToast] = useState<{
    id: string;
    type: 'status_update' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed';
    title: string;
    message: string;
    orderId?: string;
  } | null>(null);

  // Modales de dirección y tarjeta dentro de la tienda
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<UserAddress>>({
    name: '', street: '', colonia: '', city: '', state: '', zip: '', phone: '', references: '', isDefault: false,
  });

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardForm, setCardForm] = useState({
    holderName: '', cardNumber: '', expDate: '', cvc: '', expMonth: '01', expYear: '26', isDefault: false,
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSuccessNotice, setCardSuccessNotice] = useState<string | null>(null);

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

  // Restaurar y mantener categoría, pestaña activa, vista y posición exacta de scroll al recargar
  useEffect(() => {
    try {
      const savedCat = sessionStorage.getItem('foxdrop_selected_category');
      if (savedCat) setSelectedCategory(savedCat);

      const savedTab = sessionStorage.getItem('foxdrop_active_tab') as 'new' | 'deals' | 'all';
      if (savedTab && ['new', 'deals', 'all'].includes(savedTab)) setActiveTab(savedTab);

      const savedView = sessionStorage.getItem('foxdrop_current_view') as 'store' | 'account' | 'checkout';
      if (savedView && ['store', 'account', 'checkout'].includes(savedView)) {
        setCurrentView(savedView);
      }

      const savedCheckoutStep = sessionStorage.getItem('foxdrop_checkout_step') as 'cart' | 'shipping' | 'payment' | 'success';
      if (savedCheckoutStep && ['cart', 'shipping', 'payment', 'success'].includes(savedCheckoutStep)) {
        setCheckoutStep(savedCheckoutStep);
      }

      try {
        const savedSummary = sessionStorage.getItem('foxdrop_confirmed_order_summary');
        if (savedSummary) {
          setConfirmedOrderSummary(JSON.parse(savedSummary));
        }
      } catch {}

      const savedAccountTab = sessionStorage.getItem('foxdrop_account_tab') as any;
      if (savedAccountTab && ['orders', 'favorites', 'addresses', 'cards', 'club', 'settings'].includes(savedAccountTab)) {
        setAccountTab(savedAccountTab);
      }

      const savedCatalogSegment = sessionStorage.getItem('foxdrop_catalog_segment') as 'all' | 'boutique' | 'import';
      if (savedCatalogSegment && ['all', 'boutique', 'import'].includes(savedCatalogSegment)) {
        setCatalogSegment(savedCatalogSegment);
      }

      // Restaurar perfil completo desde cache local de inmediato para que nunca parpadee vacío
      try {
        const cachedProfile = localStorage.getItem('foxdrop_cached_full_profile');
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (parsed && Array.isArray(parsed.cards)) {
            setFullProfile(parsed);
          }
        }
      } catch {}

      // Si estaba en la vista de cuenta, disparar sincronización de inmediato
      if (savedView === 'account') {
        loadFullProfileData();
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_selected_category', selectedCategory);
    } catch {}
  }, [selectedCategory]);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_current_view', currentView);
    } catch {}
  }, [currentView]);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_account_tab', accountTab);
    } catch {}
  }, [accountTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_catalog_segment', catalogSegment);
    } catch {}
  }, [catalogSegment]);

  // Guardar posición de scroll al desplazarse
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        sessionStorage.setItem('foxdrop_scroll_y', window.scrollY.toString());
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Restaurar scroll una vez que los productos y layout estén listos
  useEffect(() => {
    if (!loadingProducts) {
      const savedY = sessionStorage.getItem('foxdrop_scroll_y');
      if (savedY) {
        const top = parseInt(savedY, 10);
        if (!isNaN(top) && top > 0) {
          setTimeout(() => {
            window.scrollTo({ top, behavior: 'instant' });
          }, 80);
          setTimeout(() => {
            window.scrollTo({ top, behavior: 'instant' });
          }, 250);
        }
      }
    }
  }, [loadingProducts]);

  // Mi Cuenta y Club Foxdrop
  const [showAccountModal, setShowAccountModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Proceso de Checkout en la plataforma
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings>(DEFAULT_CHECKOUT_SETTINGS);
  const [selectedShippingId, setSelectedShippingId] = useState<string>('pickup');
  const [shippingAddress, setShippingAddress] = useState({ street: '', zip: '', city: '', colonia: '', state: '' });
  const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'spei' | 'cash' | 'mercadopago'>('mercadopago');

  // Identificar si el usuario actual es Mario o Nydia (vía sesión Admin o cuenta de usuario)
  const isPrivilegedPartner = (() => {
    // 1. Verificar si tiene sesión activa de administrador en localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedAdmin = localStorage.getItem('foxdrop_admin_session');
        if (storedAdmin) {
          const parsed = JSON.parse(storedAdmin);
          const email = (parsed?.email || '').toLowerCase().trim();
          if (email.includes('magc2204') || email.includes('nydia') || email.includes('mario')) {
            return true;
          }
        }
      } catch {}
    }
    // 2. Verificar cuenta de usuario registrada en tienda
    const uEmail = (user?.email || fullProfile?.email || '').toLowerCase().trim();
    const uName = (user?.name || fullProfile?.fullName || '').toLowerCase().trim();
    if (
      uEmail.includes('magc2204') ||
      uEmail.includes('nydia') ||
      uEmail.includes('mario') ||
      uName.includes('mario') ||
      uName.includes('nydia') ||
      uName.includes('gonzalez cervantes') ||
      uName.includes('villarce')
    ) {
      return true;
    }
    return false;
  })();
  const [redirectingToMp, setRedirectingToMp] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [clabeCopied, setClabeCopied] = useState(false);
  const [cardCopied, setCardCopied] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [confirmedOrderSummary, setConfirmedOrderSummary] = useState<any | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('foxdrop_checkout_step', checkoutStep);
    } catch {}
  }, [checkoutStep]);

  useEffect(() => {
    try {
      if (confirmedOrderSummary) {
        sessionStorage.setItem('foxdrop_confirmed_order_summary', JSON.stringify(confirmedOrderSummary));
      } else {
        sessionStorage.removeItem('foxdrop_confirmed_order_summary');
      }
    } catch {}
  }, [confirmedOrderSummary]);

  // Cargar configuración de envíos y pagos
  useEffect(() => {
    getCheckoutSettings().then(settings => {
      if (settings) {
        setCheckoutSettings(settings);
        const firstActive = settings.shippingMethods.find(m => m.enabled);
        if (firstActive) setSelectedShippingId(firstActive.id);
      }
    });
  }, []);

  // Pre-cargar dirección guardada del cliente si existe
  useEffect(() => {
    if (fullProfile?.addresses && fullProfile.addresses.length > 0 && !shippingAddress.street) {
      const defaultAddr = fullProfile.addresses.find(a => a.isDefault) || fullProfile.addresses[0];
      if (defaultAddr) {
        setShippingAddress({
          street: defaultAddr.street,
          colonia: defaultAddr.colonia || '',
          zip: defaultAddr.zip,
          city: defaultAddr.city || '',
          state: defaultAddr.state || '',
        });
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [fullProfile]);

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
    // Fallback diferido solo si el bootstrap inicial no trajo slides
    if (slides.length === 0) {
      getCarouselSlides().then(s => { if (s && s.length > 0) setSlides(s); });
    }
  }, []);

  // Lista total de slides: El slide de bienvenida oficial SIEMPRE es el primero, seguido de los slides activos adicionales
  const defaultWelcomeSlide: CarouselSlide = {
    id: 'default-welcome',
    title: user?.name 
      ? `¡Hola, ${user.name.split(' ')[0]}! El mundo, directo a tu puerta.`
      : '¡Hola! El mundo, directo a tu puerta.',
    subtitle: 'TU ATAJO AL MUNDO',
    image_url: '/banner-bg-official.png',
    cta_text: 'Ver Catálogo Completo',
    cta_category: 'Todas',
    sort_order: 0,
    is_active: true,
  };

  const totalHeroSlides: CarouselSlide[] = [
    defaultWelcomeSlide,
    ...slides.filter(s => s.is_active && s.id !== 'default-welcome')
  ];

  // Avance automático suave de slides con tiempo configurable desde el Admin (por defecto 8 segundos)
  useEffect(() => {
    if (totalHeroSlides.length <= 1) return;

    const intervalSeconds = (storeSettings?.carouselIntervalSeconds && storeSettings.carouselIntervalSeconds >= 3)
      ? storeSettings.carouselIntervalSeconds
      : 8;

    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % totalHeroSlides.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [totalHeroSlides.length, storeSettings?.carouselIntervalSeconds]);

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

  // Productos con descuento real para Promociones / Deals
  const dealsProducts = products.filter(p => Boolean(p.discountPercent && p.discountPercent > 0));

  // Filtrado dinámico por búsqueda de palabras clave (sin acentos, flexible) y categoría
  const baseFilteredProducts = products.filter(p => {
    const matchSearch = matchesProductSearch(p, searchTerm);
    const matchBrand = selectedBrand === 'Todas' || (p.brand || 'FoxDrop Oficial') === selectedBrand;
    const matchCat = selectedCategory === 'Todas' || normalizeSearchText(p.category || '') === normalizeSearchText(selectedCategory);
    
    // Si el producto es de importación CJ Dropshipping recién dado de alta, solo mostrarlo a Mario y Nydia
    const isCjProduct = (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'));
    if (isCjProduct && !isPrivilegedPartner) {
      return false;
    }


    // Filtro por stock: Solo mostrar productos disponibles para compra inmediata o por encargo especial
    const matchStock = p.stock > 0 || p.isSpecialOrder;

    // Filtro por rango de precio
    let matchPrice = true;
    if (priceFilter === 'under150') matchPrice = p.publicPrice < 150;
    else if (priceFilter === '150to350') matchPrice = p.publicPrice >= 150 && p.publicPrice <= 350;
    else if (priceFilter === 'above350') matchPrice = p.publicPrice > 350;

    return matchSearch && matchBrand && matchCat && matchStock && matchPrice;
  });

  // Sugerencias rápidas para el buscador predictivo (máximo 5 productos)
  const searchSuggestions = searchTerm.trim().length >= 2 
    ? products.filter(p => matchesProductSearch(p, searchTerm)).slice(0, 5)
    : [];

  // Productos mostrados según la pestaña activa y ordenados según selección:
  // - 'new': Los últimos productos dados de alta (hasta 8 más recientes)
  // - 'deals': Artículos con descuento real
  // - 'all': Todo el catálogo completo
  const displayedProducts = (() => {
    let prods = baseFilteredProducts;
    if (activeTab === 'deals') {
      prods = baseFilteredProducts.filter(p => Boolean(p.discountPercent && p.discountPercent > 0));
    } else if (activeTab === 'new') {
      prods = baseFilteredProducts.slice(0, 8);
    }

    // Ordenamiento por precio, descuento y A-Z
    const sorted = [...prods];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.publicPrice - b.publicPrice);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.publicPrice - a.publicPrice);
    } else if (sortBy === 'discount_desc') {
      sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    } else if (sortBy === 'name_asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
    } else if (sortBy === 'name_desc') {
      sorted.sort((a, b) => b.title.localeCompare(a.title, 'es', { sensitivity: 'base' }));
    }
    return sorted;
  })();

  const filteredProducts = displayedProducts;

  const toggleFav = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const addToCart = (product: Product, e?: React.MouseEvent, quantityToAdd: number = 1) => {
    if (e) e.stopPropagation();
    try {
      soundManager.playAddToCart();
    } catch {}
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
    setIsCartOpen(false);
    if (!user) {
      openAuthModal();
      return;
    }
    setCheckoutStep('shipping');
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const currentUserId = user?.id || fullProfile?.id;
      const history = await getClientOrderHistory(phone || email || '', {
        userId: currentUserId,
        phone: phone || undefined,
        email: email || undefined,
      });
      if (history && history.length > 0) {
        setUserOrders(history);
      } else if (email && email !== phone) {
        const historyEmail = await getClientOrderHistory(email, {
          userId: currentUserId,
          email,
          phone: phone || undefined,
        });
        setUserOrders(historyEmail || []);
      } else {
        setUserOrders(history || []);
      }
    } catch (err) {
      console.warn("Error cargando historial de pedidos:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Suscripción Realtime a Pedidos para el Cliente
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user && !fullProfile) return;

    const userPhone = user?.phone || fullProfile?.phone;
    const userEmail = user?.email || fullProfile?.email;
    const userId = user?.id || fullProfile?.id;

    if (!userPhone && !userEmail && !userId) return;

    const unsubscribe = subscribeToClientOrders(
      { userId, phone: userPhone, email: userEmail },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'INSERT' && newRecord) {
          // El cliente completó un pedido o se le asignó uno
          setUserOrders(prev => {
            const exists = prev.some(o => (o.id === newRecord.id || o.order_number === newRecord.order_number));
            if (exists) return prev;
            return [newRecord, ...prev];
          });
        } else if (eventType === 'UPDATE' && newRecord) {
          const orderNum = newRecord.order_number || newRecord.id;
          const newStatus = newRecord.status;

          setUserOrders(prev => prev.map(o => {
            if (o.id === newRecord.id || o.order_number === newRecord.order_number) {
              return { ...o, ...newRecord };
            }
            return o;
          }));

          // Si el modal de detalle del pedido está abierto con este pedido, actualizarlo
          setSelectedOrderForDetail((current: any) => {
            if (current && (current.id === newRecord.id || current.order_number === newRecord.order_number)) {
              return { ...current, ...newRecord };
            }
            return current;
          });

          // Textos y sonidos amigables según status estilo Mercado Libre / Amazon
          if (newStatus === 'processing') {
            soundManager.playStatusUpdated();
            setClientRealtimeToast({
              id: `toast-${Date.now()}`,
              type: 'confirmed',
              title: '¡Tu pedido fue confirmado!',
              message: `El pedido ${orderNum} ya está siendo preparado en almacén.`,
              orderId: orderNum,
            });
          } else if (newStatus === 'shipped') {
            soundManager.playStatusUpdated();
            setClientRealtimeToast({
              id: `toast-${Date.now()}`,
              type: 'shipped',
              title: '📦 ¡Tu pedido está en camino!',
              message: `El pedido ${orderNum} ya salió a reparto.${newRecord.tracking_number ? ` Guía: ${newRecord.tracking_number}` : ''}`,
              orderId: orderNum,
            });
          } else if (newStatus === 'delivered') {
            soundManager.playOrderDelivered();
            setClientRealtimeToast({
              id: `toast-${Date.now()}`,
              type: 'delivered',
              title: '🎉 ¡Pedido Entregado!',
              message: `Tu pedido ${orderNum} ha sido entregado exitosamente. ¡Gracias por tu compra!`,
              orderId: orderNum,
            });
          } else if (newStatus === 'cancelled') {
            soundManager.playOrderCancelled();
            setClientRealtimeToast({
              id: `toast-${Date.now()}`,
              type: 'cancelled',
              title: 'Pedido Cancelado',
              message: `El pedido ${orderNum} ha sido cancelado.`,
              orderId: orderNum,
            });
          } else {
            soundManager.playStatusUpdated();
            setClientRealtimeToast({
              id: `toast-${Date.now()}`,
              type: 'status_update',
              title: 'Actualización en tu pedido',
              message: `El pedido ${orderNum} se actualizó a estado: ${newStatus}`,
              orderId: orderNum,
            });
          }
        } else if (eventType === 'DELETE' && oldRecord) {
          const delId = oldRecord.order_number || oldRecord.id;
          setUserOrders(prev => prev.filter(o => o.id !== delId && o.order_number !== delId && o.id !== oldRecord.id));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, fullProfile]);

  // Manejador de cancelación al estilo Amazon / Mercado Libre
  const handleExecuteClientCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingClientOrder) return;

    setClientCancellingLoading(true);
    const targetOrderId = cancellingClientOrder.order_number || cancellingClientOrder.id;
    const finalReason = clientCancelNotes.trim()
      ? `${clientCancelReason} - ${clientCancelNotes.trim()}`
      : clientCancelReason;

    try {
      await cancelOrderAsClient(targetOrderId, finalReason);

      // Actualizar estado local inmediatamente
      setUserOrders(prev => prev.map(o => {
        const matches = o.id === targetOrderId || o.order_number === targetOrderId;
        if (matches) {
          return {
            ...o,
            status: 'cancelled',
            notes: `Cancelado por el cliente: ${finalReason}`
          };
        }
        return o;
      }));

      // Si el detalle del pedido estaba abierto, actualizarlo también
      if (selectedOrderForDetail && (selectedOrderForDetail.id === targetOrderId || selectedOrderForDetail.order_number === targetOrderId)) {
        setSelectedOrderForDetail((prev: any) => ({
          ...prev,
          status: 'cancelled',
          notes: `Cancelado por el cliente: ${finalReason}`
        }));
      }

      setShowClientCancelModal(false);
      setCancellingClientOrder(null);
      setClientCancelNotes('');
      alert("✅ Tu pedido ha sido cancelado con éxito.");
    } catch (err: any) {
      console.error("Error al cancelar pedido:", err);
      alert(`No pudimos cancelar el pedido: ${err.message || 'Por favor contacta a soporte'}`);
    } finally {
      setClientCancellingLoading(false);
    }
  };

  const loadFullProfileData = async () => {
    setLoadingFullProfile(true);
    try {
      const p = await getUserFullProfile();
      if (p) {
        setFullProfile(p);
        try {
          localStorage.setItem('foxdrop_cached_full_profile', JSON.stringify(p));
        } catch {}
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
    setCardError(null);
    const clean = cardForm.cardNumber.replace(/\s/g, '');
    if (clean.length < 15) {
      setCardError("Por favor ingresa un número de tarjeta válido (15 o 16 dígitos).");
      return;
    }
    if (!cardForm.holderName.trim()) {
      setCardError("Por favor ingresa el nombre del titular tal como aparece en la tarjeta.");
      return;
    }
    if (cardForm.expDate && cardForm.expDate.length < 5) {
      setCardError("Por favor ingresa la fecha de vencimiento completa en formato MM/AA.");
      return;
    }

    setCardSaving(true);
    try {
      const last4 = clean.slice(-4);
      const brand = detectBrand(clean);
      
      // Extraer mes y año desde el formato estándar MM/AA
      let parsedMonth = cardForm.expMonth;
      let parsedYear = cardForm.expYear;
      if (cardForm.expDate && cardForm.expDate.includes('/')) {
        const [m, y] = cardForm.expDate.split('/');
        if (m) parsedMonth = m.trim().padStart(2, '0');
        if (y) parsedYear = y.trim().length === 2 ? y.trim() : y.trim().slice(-2);
      }

      const cardPayload: UserCard = {
        id: `card-${Date.now()}`,
        brand,
        last4,
        holderName: cardForm.holderName.trim().toUpperCase(),
        expMonth: parsedMonth,
        expYear: parsedYear,
        isDefault: (fullProfile?.cards?.length || 0) === 0 ? true : Boolean(cardForm.isDefault),
      };

      const updated = await saveUserCard(cardPayload);
      setFullProfile(prev => {
        const next = prev ? { ...prev, cards: updated } : null;
        if (next) {
          try { localStorage.setItem('foxdrop_cached_full_profile', JSON.stringify(next)); } catch {}
        }
        return next;
      });
      setCardSuccessNotice(`Tarjeta ${brand.toUpperCase()} terminada en •••• ${last4} guardada con éxito`);
      setTimeout(() => {
        setCardSuccessNotice(null);
        setShowCardModal(false);
        setCardForm({ holderName: '', cardNumber: '', expDate: '', cvc: '', expMonth: '01', expYear: '26', isDefault: false });
      }, 1200);
    } catch (err: any) {
      setCardError(err?.message || "Error al guardar tarjeta. Intenta nuevamente.");
    } finally {
      setCardSaving(false);
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


  const isImportProdItem = (p: Product) => {
    if (!p) return false;
    const sku = (p.sku || '').toUpperCase();
    const brand = (p.brand || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    return sku.startsWith('CJ') || brand.includes('cj dropshipping') || title.includes('humidifier') || title.includes('magic shadow');
  };
  const cartHasImportItems = cart.some(i => isImportProdItem(i.product));
  const cartHasBoutiqueItems = cart.some(i => !isImportProdItem(i.product));
  const isMixedCart = cartHasImportItems && cartHasBoutiqueItems;

  const cartSubtotal = cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0);
  const activeShippingMethod = checkoutSettings.shippingMethods.find(m => m.id === selectedShippingId && m.enabled)
    || checkoutSettings.shippingMethods.find(m => m.enabled)
    || checkoutSettings.shippingMethods[0];
  
  // Si contiene productos de importación (o carrito mixto), el envío a domicilio físico es obligatorio
  const isPersonalDelivery = cartHasImportItems ? false : (activeShippingMethod ? !activeShippingMethod.requiresAddress : true);
  // En carrito exclusivo internacional el envío es gratis ($0). En carrito mixto o boutique, se cobra el método de entrega de boutique seleccionado
  const shippingFee = cartHasImportItems && !cartHasBoutiqueItems ? 0 : (activeShippingMethod ? activeShippingMethod.price : 0);
  
  // Descuento por cupón activo
  const couponDiscountAmount = appliedCoupon ? Math.round((cartSubtotal * appliedCoupon.discountPercent) / 100) : 0;
  const cartTotal = Math.max(0, cartSubtotal - couponDiscountAmount + shippingFee);
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  const handleFinishOrder = async () => {
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      // 1. Si el método es Mercado Pago, procesamos la orden y redirigimos a la pasarela
      if (paymentMethod === 'mercadopago') {
        setRedirectingToMp(true);
      }

      const created = await createOrderInDb({
        userId: user?.id,
        clientName: user?.name || '',
        clientPhone: user?.phone || '',
        clientEmail: user?.email,
        shippingType: isPersonalDelivery ? 'agreed_pickup' : (cartHasImportItems ? 'international_shipping' : (selectedShippingId === 'national' ? 'national_shipping' : 'local_delivery')),
        shippingCost: shippingFee,
        subtotal: cartSubtotal,
        total: cartTotal,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : (paymentMethod === 'mercadopago' ? 'mercadopago' : 'spei'),
        shippingAddress: isPersonalDelivery ? {
          street: 'Entrega personal / Acordar con vendedor',
          zip: shippingAddress.zip || '',
          city: shippingAddress.city || '',
        } : {
          street: `${shippingAddress.street}${shippingAddress.colonia ? ', ' + shippingAddress.colonia : ''}`,
          zip: shippingAddress.zip,
          city: shippingAddress.city || '',
        },
        items: cart,
      });
      setConfirmedOrderId(created.orderNumber);
      setConfirmedOrderSummary({
        orderNumber: created.orderNumber,
        items: [...cart],
        subtotal: cartSubtotal,
        shippingFee,
        total: cartTotal,
        shippingMethodName: isMixedCart 
          ? `Envío Dividido (Boutique 24-48 hrs + Internacional 10-15 días)` 
          : (cartHasImportItems ? 'Paquetería Internacional Directa' : (activeShippingMethod?.name || 'Entrega Acordada')),
        isPersonalDelivery,
        isMixedCart,
        cartHasImportItems,
        cartHasBoutiqueItems,
        shippingAddress: isPersonalDelivery ? 'Entrega personal / Acordar con vendedor' : `${shippingAddress.street}${shippingAddress.colonia ? ', ' + shippingAddress.colonia : ''}, C.P. ${shippingAddress.zip}, ${shippingAddress.city}`,
        paymentMethod,
        date: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });

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
            shippingType: isPersonalDelivery ? "agreed_pickup" : (cartHasImportItems ? "international_shipping" : "puebla_local"),
            pickupPoint: isPersonalDelivery ? "Entrega personal / Acordar punto" : `${shippingAddress.street}, ${shippingAddress.city}`,
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

      // Si el cliente eligió Mercado Pago, invocamos la preferencia y redirigimos
      // IMPORTANTE: NO vaciamos el carrito aquí. El carrito se mantiene intacto hasta que Mercado Pago confirme el pago aprobado.
      if (paymentMethod === 'mercadopago') {
        try {
          const mpRes = await fetch('/api/mercadopago/preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: created.orderNumber,
              items: cart,
              total: cartTotal,
              shippingCost: shippingFee,
              clientName: user?.name || shippingAddress.street || 'Cliente',
              clientEmail: user?.email,
              clientPhone: user?.phone,
            }),
          });
          const mpData = await mpRes.json();
          if (mpRes.ok && mpData.initPoint) {
            // Guardamos temporalmente el pedido pendiente para asociarlo cuando vuelva
            try {
              sessionStorage.setItem('foxdrop_pending_mp_order', created.orderNumber);
            } catch {}
            // Redirigir al Checkout Pro oficial de Mercado Pago
            window.location.href = mpData.initPoint;
            return;
          } else {
            alert(mpData.error || 'No fue posible iniciar el proceso de cobro en este momento. Por favor intenta de nuevo.');
            setRedirectingToMp(false);
            setIsSubmittingOrder(false);
            return;
          }
        } catch (mpErr: any) {
          alert('Hubo un inconveniente al conectar con el servicio de cobro. Por favor verifica tu conexión o intenta nuevamente.');
          setRedirectingToMp(false);
          setIsSubmittingOrder(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Fallo guardando pedido en BD, usando id de contingencia:", err);
      const fallbackId = `FX-${Math.floor(100000 + Math.random() * 900000)}`;
      setConfirmedOrderId(fallbackId);
      setConfirmedOrderSummary({
        orderNumber: fallbackId,
        items: [...cart],
        subtotal: cartSubtotal,
        shippingFee,
        total: cartTotal,
        shippingMethodName: isMixedCart 
          ? `Envío Dividido (Boutique 24-48 hrs + Internacional 10-15 días)` 
          : (cartHasImportItems ? 'Paquetería Internacional Directa' : (activeShippingMethod?.name || 'Entrega Acordada')),
        isPersonalDelivery,
        isMixedCart,
        cartHasImportItems,
        cartHasBoutiqueItems,
        shippingAddress: isPersonalDelivery ? 'Entrega personal / Acordar con vendedor' : `${shippingAddress.street}, C.P. ${shippingAddress.zip}`,
        paymentMethod,
        date: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
    }
    setCheckoutStep('success');
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resolveAbandonedCart(user?.phone, user?.email);
    if (user) {
      loadUserAccount(user.phone, user.email);
    }
    try {
      const currentCartId = typeof window !== 'undefined' ? localStorage.getItem('foxdrop_cart_id') : null;
      if (currentCartId) {
        fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: currentCartId, items: [] }),
        });
      }
      localStorage.removeItem('foxdrop_cart_id');
      localStorage.removeItem('foxdrop_cart_items_v1');
    } catch {}
    setCart([]);
    setIsSubmittingOrder(false);
  };

  // Cupones válidos predeterminados
  const VALID_COUPONS: Record<string, { discountPercent: number; description: string }> = {
    'FOXDROP10': { discountPercent: 10, description: '10% OFF en toda tu compra' },
    'BIENVENIDA': { discountPercent: 15, description: '15% OFF de Bienvenida' },
    'FOXDROP50': { discountPercent: 20, description: '20% OFF especial' },
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;
    if (VALID_COUPONS[cleanCode]) {
      setAppliedCoupon({
        code: cleanCode,
        ...VALID_COUPONS[cleanCode],
      });
      setCouponError(null);
    } else {
      setCouponError(`El cupón "${cleanCode}" no es válido o ha expirado.`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#113B34] flex flex-col font-sans selection:bg-[#E65F2B] selection:text-white pb-20 md:pb-0">
      
      {/* ======================================================== */}
      {/* 0. TICKER SUPERIOR DE ANUNCIOS & ENVÍOS (ESTILO TJ MAXX) */}
      {/* ======================================================== */}
      <aside aria-label="Aviso de beneficios FoxDrop" className="bg-[#FAF6F0] text-[#0F3E36] text-[11px] font-bold py-1.5 px-4 border-b border-[#E8DFC8]/60 tracking-tight text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="font-extrabold text-[#0F3E36]">envíos seguros a todo México</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600 font-medium">pagos protegidos vía transferencia SPEI y entrega garantizada</span>
          <span className="text-gray-400 hidden sm:inline">|</span>
          <button 
            type="button" 
            onClick={() => setInfoModal('envios')}
            className="text-[#DF7F2D] hover:underline font-bold hidden sm:inline cursor-pointer"
          >
            ver detalles ›
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 1. HEADER PRINCIPAL ESTILO TJ MAXX (CON FONDO VERDE BOSQUE EMBLEMÁTICO DE FOXDROP) */}
      {/* ======================================================== */}
      <header className="bg-[#0F3E36] sticky top-0 z-40 shadow-md text-white border-b border-[#0B332C]">
        
        {/* FILA SUPERIOR (DESKTOP): UTILIDADES (Sign In, Rewards, Favoritos, Carrito) */}
        <div className="hidden md:block border-b border-white/10 bg-[#0B332C]/70">
          <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-end gap-6 text-[11px] font-semibold text-white/80">
            {/* MI CUENTA / INICIAR SESIÓN */}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  if (currentView === 'account') {
                    setCurrentView('store');
                  } else {
                    loadFullProfileData();
                    setCurrentView('account');
                  }
                }}
                className="flex items-center gap-1.5 hover:text-white transition cursor-pointer text-amber-300 font-bold"
              >
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span>hola, {user.name ? user.name.split(' ')[0] : 'mi cuenta'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 hover:text-white transition cursor-pointer text-white/80"
              >
                <User className="w-3.5 h-3.5 text-[#DF7F2D]" />
                <span>iniciar sesión</span>
              </button>
            )}

            {/* REWARDS / CLUB FOXDROP */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal();
                } else {
                  setAccountTab('club');
                  setCurrentView('account');
                }
              }}
              className="flex items-center gap-1.5 hover:text-white transition cursor-pointer text-white/80"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>club fox rewards</span>
            </button>

            {/* FAVORITOS */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal();
                } else {
                  setAccountTab('favorites');
                  setCurrentView('account');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-1.5 hover:text-white transition cursor-pointer relative text-white/80"
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? 'text-rose-400 fill-rose-400' : 'text-[#DF7F2D]'}`} />
              <span>favoritos {favorites.length > 0 && `(${favorites.length})`}</span>
            </button>
          </div>
        </div>

        {/* FILA CENTRAL TIPO AMAZON / MERCADO LIBRE: LOGO IZQUIERDA + BUSCADOR PROTAGÓNICO CENTRADO + ACCIONES DERECHA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* LADO IZQUIERDO: LOGO DE FOXDROP */}
          <div 
            onClick={() => {
              setCurrentView('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer shrink-0 transition-transform hover:scale-102 flex items-center gap-2"
            title="Ir al inicio de FoxDrop"
          >
            <FoxDropLogo size="lg" variant="dark" />
          </div>

          {/* CENTRO: BARRA DE BÚSQUEDA PROTAGÓNICA (AMAZON / MERCADO LIBRE STYLE) */}
          <div className="flex-1 max-w-2xl relative">
            <div className="flex items-center w-full bg-white rounded-xl shadow-xs overflow-hidden border-2 border-transparent focus-within:border-[#DF7F2D] transition">
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onChange={e => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val.trim() && selectedCategory !== 'Todas') {
                    setSelectedCategory('Todas');
                  }
                  if (currentView === 'account') setCurrentView('store');
                }}
                placeholder="Buscar productos, marcas y tesoros en FoxDrop..."
                className="w-full bg-white text-gray-900 placeholder-gray-400 pl-4 pr-10 py-2.5 text-xs sm:text-sm font-medium outline-none"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  setIsSearchFocused(false);
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#DF7F2D] hover:bg-[#C96E24] text-white px-4 sm:px-5 py-2.5 flex items-center justify-center transition cursor-pointer shrink-0 font-bold"
                title="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* DESPLEGABLE DE BÚSQUEDA PREDICTIVA CON HISTORIAL Y POPULARES */}
            {isSearchFocused && (
              <div 
                onMouseDown={(e) => e.preventDefault()} 
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1"
              >
                {searchTerm.trim().length >= 2 ? (
                  searchSuggestions.length > 0 ? (
                    <>
                      <div className="p-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span>Sugerencias rápidas</span>
                        <span className="text-[#DF7F2D] font-mono">{searchSuggestions.length} encontrados</span>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                        {searchSuggestions.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              saveSearchTerm(item.title);
                              setSelectedProduct(item);
                              setModalQuantity(1);
                              setIsSearchFocused(false);
                            }}
                            className="p-2.5 flex items-center gap-2.5 hover:bg-orange-50/60 cursor-pointer transition text-left"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gray-50 p-1 border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                              <img src={item.images?.[0] || '/no-image.svg'} alt={item.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] text-gray-400 capitalize">{item.category}</span>
                                <span className="text-xs font-black text-[#DF7F2D]">${item.publicPrice.toFixed(0)} MXN</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          saveSearchTerm(searchTerm);
                          setIsSearchFocused(false);
                          const el = document.getElementById('catalog-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-center text-[11px] font-bold text-[#0F3E36] border-t border-gray-100 transition"
                      >
                        Ver todos los resultados en el catálogo →
                      </button>
                    </>
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500 space-y-1">
                      <p className="font-semibold text-gray-700">Sin coincidencias exactas</p>
                      <p className="text-[11px] text-gray-400">Intenta buscar por categoría o palabra clave.</p>
                    </div>
                  )
                ) : (
                  /* HISTORIAL RECIENTE Y BÚSQUEDAS POPULARES */
                  <div className="p-3 space-y-3 text-xs">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" /> Búsquedas recientes
                          </span>
                          <button 
                            onClick={clearRecentSearches}
                            className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Borrar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSearchTerm(s);
                                setSelectedCategory('Todas');
                                setIsSearchFocused(false);
                                const el = document.getElementById('catalog-section');
                                el?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              <span>{s}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[11px] font-bold text-gray-500 block mb-1.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#DF7F2D]" /> Más buscados
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SEARCHES.map((tag, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(tag);
                              setSelectedCategory('Todas');
                              setIsSearchFocused(false);
                              const el = document.getElementById('catalog-section');
                              el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 bg-[#FAF6F0] hover:bg-orange-100/70 border border-orange-200/60 rounded-lg text-gray-800 text-[11px] font-semibold transition cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LADO DERECHO: ACCIONES RÁPIDAS (CUENTA, FAVORITOS Y CARRITO) */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* MI CUENTA */}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  if (currentView === 'account') {
                    setCurrentView('store');
                  } else {
                    loadFullProfileData();
                    setCurrentView('account');
                  }
                }}
                className="hidden sm:flex flex-col text-left hover:text-amber-300 transition cursor-pointer"
              >
                <span className="text-[10px] text-white/70 leading-tight">Hola, {user.name ? user.name.split(' ')[0] : 'Cliente'}</span>
                <span className="text-xs font-black text-amber-300 flex items-center gap-0.5">Mi Cuenta</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="hidden sm:flex flex-col text-left hover:text-white transition cursor-pointer"
              >
                <span className="text-[10px] text-white/70 leading-tight">Bienvenido</span>
                <span className="text-xs font-black text-white flex items-center gap-0.5">Iniciar Sesión</span>
              </button>
            )}

            {/* CARRITO PRINCIPAL DESTACADO */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer border border-white/15"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-amber-300" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#DF7F2D] text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-white/75 leading-tight">Carrito</span>
                <span className="text-xs font-black text-white">
                  ${cart.reduce((acc, i) => acc + (i.product.publicPrice * i.quantity), 0).toFixed(0)} MXN
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* FILA INFERIOR: BARRA DE DEPARTAMENTOS EN PLECA TRANSPARENTE CON HOVER Y ACTIVO */}
        <div className="border-t border-white/10 bg-[#0B332C]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-start md:justify-center gap-4 sm:gap-7 overflow-x-auto no-scrollbar py-2 text-xs sm:text-[13px] font-extrabold tracking-tight overscroll-x-contain touch-pan-x">
            
            {/* NUEVOS INGRESOS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('new');
                setSelectedCategory('Todas');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`transition shrink-0 cursor-pointer ${
                activeTab === 'new' && selectedCategory === 'Todas'
                  ? 'text-white underline underline-offset-4 decoration-2 decoration-[#DF7F2D] font-black'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Lo Nuevo
            </button>

            {/* CATEGORÍAS POPULARES DE FOXDROP */}
            {popularCategories.map((cat) => {
              const isSelected = selectedCategory.trim().toLowerCase() === cat.name.trim().toLowerCase();

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setActiveTab('all');
                    if (currentView === 'account') setCurrentView('store');
                    const el = document.getElementById('catalog-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`transition shrink-0 cursor-pointer capitalize ${
                    isSelected
                      ? 'text-white underline underline-offset-4 decoration-2 decoration-[#DF7F2D] font-black'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}

            {/* SECCIÓN TRENDING / MÁS VENDIDO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('Todas');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-white/80 hover:text-white transition shrink-0 cursor-pointer"
            >
              Tendencias
            </button>

            {/* SECCIÓN PEDIDOS ESPECIALES */}
            <button
              type="button"
              onClick={() => setShowCustomOrderModal(true)}
              className="text-[#E3B888] hover:text-white transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Encargos Especiales</span>
            </button>

            {/* LIQUIDACIÓN CONDICIONAL (SOLO SI ESTÁ ACTIVADA DESDE EL ADMIN) */}
            {storeSettings.showClearanceBanner && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('deals');
                  setSelectedCategory('Todas');
                  if (currentView === 'account') setCurrentView('store');
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`transition shrink-0 cursor-pointer font-black ${
                  activeTab === 'deals'
                    ? 'text-[#DF7F2D] underline underline-offset-4 decoration-2'
                    : 'text-[#DF7F2D] hover:text-amber-300'
                }`}
              >
                Liquidación 🔥
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BANNER FLOTANTE DE NOTIFICACIÓN DE PEDIDO EN TIEMPO REAL */}
      {clientRealtimeToast && (
        <div className="bg-gradient-to-r from-[#0F3E36] to-[#1A5248] text-white px-4 py-2.5 shadow-lg border-b border-white/10 flex items-center justify-between sticky top-[61px] z-30 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              clientRealtimeToast.type === 'delivered' ? 'bg-emerald-500 text-white animate-bounce' :
              clientRealtimeToast.type === 'cancelled' ? 'bg-rose-500 text-white' : 'bg-[#DF7F2D] text-white'
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-extrabold block text-amber-300">{clientRealtimeToast.title}</span>
              <span className="text-white/90">{clientRealtimeToast.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAccountTab('orders');
                setCurrentView('account');
                setClientRealtimeToast(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer"
            >
              Ver Detalle
            </button>
            <button
              onClick={() => setClientRealtimeToast(null)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {currentView === 'store' ? (
        <>
          {/* ======================================================== */}
          {/* 2. HERO BANNER REDISEÑADO: ELEGANTE, PREMIUM & LIMPIO */}
          {/* ======================================================== */}
          
          {/* VERSIÓN MÓVIL (NATIVA 100% NÍTIDA, PREMIUM & SOFISTICADA) */}
          <section className="md:hidden pt-4 pb-2 px-4 w-full">
            {(() => {
              const currentSlide = totalHeroSlides[activeSlide % totalHeroSlides.length] || defaultWelcomeSlide;
              const isDefaultSlide = currentSlide.id === 'default-welcome';

              return (
                <div>
                  <div className="relative rounded-2xl overflow-hidden shadow-md border border-emerald-950/40 bg-[#0E3D35] h-[140px] sm:h-[155px] w-full flex items-stretch">
                    {/* FONDO LIMPIO: Banner oficial si es default o imagen personalizada limpia de slide */}
                    <img 
                      src={isDefaultSlide ? '/banner-bg-official.png' : (currentSlide.image_url || '/banner-bg-official.png')} 
                      alt="FoxDrop Banner" 
                      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
                    />

                    {/* Zorrito oficial solo en slide por defecto */}
                    {isDefaultSlide && (
                      <div className="absolute right-[2%] bottom-0 w-[44%] h-[96%] pointer-events-none z-10 flex items-end justify-center">
                        <img 
                          src="/fox-mascot-tight.png" 
                          alt="FoxDrop Mascot" 
                          className="max-h-full max-w-full object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                        />
                      </div>
                    )}

                    {/* CONTENIDO TIPOGRÁFICO DINÁMICO */}
                    {Boolean(isDefaultSlide || (currentSlide.title && currentSlide.title.trim()) || (currentSlide.subtitle && currentSlide.subtitle.trim()) || (currentSlide.cta_text && currentSlide.cta_text.trim())) && (
                      <div className="relative z-20 w-[58%] p-3 sm:p-4 flex flex-col justify-between pointer-events-none">
                        <div className="space-y-0.5 max-w-[210px]">
                          {(currentSlide.subtitle || isDefaultSlide) && (
                            <span className="inline-block text-[7.5px] font-black tracking-widest text-[#E3B888] uppercase drop-shadow-xs">
                              {currentSlide.subtitle || 'TU ATAJO AL MUNDO'}
                            </span>
                          )}
                          <h2 className="text-[12px] sm:text-[13px] font-black text-white leading-tight drop-shadow-sm line-clamp-2">
                            {isDefaultSlide 
                              ? (user?.name 
                                  ? `¡Hola, ${user.name.split(' ')[0]}! El mundo, directo a tu puerta.` 
                                  : '¡Hola! El mundo, directo a tu puerta.')
                              : currentSlide.title}
                          </h2>
                          {isDefaultSlide && (
                            <p className="text-[8px] sm:text-[9.5px] text-emerald-100/90 leading-tight font-medium hidden xs:block line-clamp-2 drop-shadow-xs pt-0.5">
                              Descubre tesoros mundiales con envío de 24 a 48 hrs y calidad garantizada.
                            </p>
                          )}
                        </div>

                        {Boolean(currentSlide.cta_text && currentSlide.cta_text.trim()) && (
                          <div className="pt-1 pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategory(currentSlide.cta_category || 'Todas');
                                setActiveTab('all');
                                const el = document.getElementById('catalog-section');
                                el?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-gradient-to-r from-[#FF7A1A] to-[#E65200] hover:from-[#FF8C33] hover:to-[#F06000] text-white text-[8.5px] sm:text-[9.5px] font-black px-2.5 sm:px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(230,82,0,0.6)] border border-amber-200/40 transition transform active:scale-95 flex items-center gap-1 cursor-pointer w-fit"
                            >
                              <span>{currentSlide.cta_text}</span>
                              <ArrowRight className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DOTS INDICADORES DINÁMICOS DEBAJO DEL BANNER */}
                  {totalHeroSlides.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-2">
                      {totalHeroSlides.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setActiveSlide(dotIdx)}
                          className={`transition-all rounded-full cursor-pointer ${
                            activeSlide % totalHeroSlides.length === dotIdx
                              ? 'w-4 h-1.5 bg-[#0F3E36] rounded-full'
                              : 'w-1.5 h-1.5 bg-[#CBD8D4] hover:bg-[#0F3E36]'
                          }`}
                          title={`Slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* VERSIÓN ESCRITORIO (A LO LARGO DEL TAMAÑO DE LA TIENDA max-w-7xl, ESTILO CORPORATIVO MINIMALISTA) */}
          <section className="hidden md:block pt-3 pb-2 px-4 sm:px-6 max-w-7xl mx-auto w-full">
            {(() => {
              const currentSlide = totalHeroSlides[activeSlide % totalHeroSlides.length] || defaultWelcomeSlide;
              const isDefaultSlide = currentSlide.id === 'default-welcome';

              return (
                <div>
                  <div className="relative rounded-2xl overflow-hidden shadow-lg border border-emerald-950/40 bg-[#0E3D35] h-[190px] lg:h-[220px] w-full flex items-stretch">
                    {/* FONDO LIMPIO: Banner oficial si es default o imagen personalizada limpia de slide */}
                    <img 
                      src={isDefaultSlide ? '/banner-bg-official.png' : (currentSlide.image_url || '/banner-bg-official.png')} 
                      alt="FoxDrop Banner" 
                      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
                    />

                    {/* Zorrito oficial solo en slide por defecto */}
                    {isDefaultSlide && (
                      <div className="absolute right-[3%] bottom-0 w-[42%] h-[98%] pointer-events-none z-10 flex items-end justify-center">
                        <img 
                          src="/fox-mascot-tight.png" 
                          alt="FoxDrop Mascot" 
                          className="max-h-full max-w-full object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                        />
                      </div>
                    )}

                    {/* CONTENIDO TIPOGRÁFICO DINÁMICO */}
                    {Boolean(isDefaultSlide || (currentSlide.title && currentSlide.title.trim()) || (currentSlide.subtitle && currentSlide.subtitle.trim()) || (currentSlide.cta_text && currentSlide.cta_text.trim())) && (
                      <div className="relative z-20 w-[52%] p-5 lg:p-7 xl:p-8 flex flex-col justify-between pointer-events-none">
                        <div className="space-y-1.5 max-w-[340px]">
                          {(currentSlide.subtitle || isDefaultSlide) && (
                            <span className="inline-block text-[9.5px] font-black tracking-widest text-[#E3B888] uppercase drop-shadow-xs">
                              {currentSlide.subtitle || 'TU ATAJO AL MUNDO'}
                            </span>
                          )}
                          <h1 className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight drop-shadow-sm">
                            {isDefaultSlide 
                              ? (user?.name 
                                  ? `¡Hola, ${user.name.split(' ')[0]}! El mundo, directo a tu puerta.` 
                                  : '¡Hola! El mundo, directo a tu puerta.')
                              : currentSlide.title}
                          </h1>
                          {isDefaultSlide && (
                            <p className="text-xs sm:text-[13px] text-emerald-100/90 leading-snug font-medium drop-shadow-xs max-w-[320px]">
                              Descubre tesoros mundiales con envío de 24 a 48 hrs y calidad garantizada.
                            </p>
                          )}
                        </div>

                        {Boolean(currentSlide.cta_text && currentSlide.cta_text.trim()) && (
                          <div className="pt-2 pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategory(currentSlide.cta_category || 'Todas');
                                setActiveTab('all');
                                const el = document.getElementById('catalog-section');
                                el?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-gradient-to-r from-[#FF7A1A] to-[#E65200] hover:from-[#FF8C33] hover:to-[#F05E00] text-white font-black px-4.5 py-2 rounded-full text-xs shadow-[0_4px_16px_rgba(230,82,0,0.55)] border border-amber-200/40 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer w-fit group"
                            >
                              <span>{currentSlide.cta_text}</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DOTS INDICADORES DINÁMICOS DEBAJO DEL BANNER */}
                  {totalHeroSlides.length > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-3">
                      {totalHeroSlides.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setActiveSlide(dotIdx)}
                          className={`transition-all rounded-full cursor-pointer ${
                            activeSlide % totalHeroSlides.length === dotIdx
                              ? 'w-7 h-2.5 bg-[#0F3E36] rounded-full shadow-xs'
                              : 'w-2.5 h-2.5 bg-[#CBD8D4] hover:bg-[#0F3E36]'
                          }`}
                          title={`Slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* CINTILLO DE CONFIANZA TIPO AMAZON / MERCADO LIBRE */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs text-gray-700">
              <div className="flex items-center gap-2.5 px-2">
                <Truck className="w-5 h-5 text-[#DF7F2D] shrink-0" />
                <div>
                  <p className="text-xs font-black text-gray-900 leading-tight">Envíos Rápidos</p>
                  <p className="text-[10px] text-gray-400">Cobertura a todo México</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 border-l border-gray-100">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-gray-900 leading-tight">Compra Protegida</p>
                  <p className="text-[10px] text-gray-400">Garantía en cada pedido</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 border-l border-gray-100">
                <Coins className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-black text-gray-900 leading-tight">Puntos Fox Rewards</p>
                  <p className="text-[10px] text-gray-400">Canjeables por dinero</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 border-l border-gray-100">
                <Send className="w-5 h-5 text-[#0F3E36] shrink-0" />
                <div>
                  <p className="text-xs font-black text-gray-900 leading-tight">Pedidos Especiales</p>
                  <p className="text-[10px] text-gray-400">Traemos lo que busques</p>
                </div>
              </div>
            </div>
          </section>


      {/* ======================================================== */}
      {/* 4. SECCIÓN PRINCIPAL: CATÁLOGO / LO NUEVO / TODOS */}
      {/* ======================================================== */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/90 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DF7F2D] animate-pulse" />
              <h3 className="text-xl sm:text-2xl font-black text-[#0F3E36] tracking-tight">
                {activeTab === 'new' 
                  ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo en FoxDrop' : `Lo Nuevo en ${selectedCategory}`)
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos'
                  : (selectedCategory === 'Todas' ? 'Catálogo Completo' : `Departamento: ${selectedCategory}`)
                }
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {activeTab === 'new' 
                ? 'Últimos productos dados de alta con disponibilidad inmediata' 
                : `${filteredProducts.length} artículos encontrados para entrega`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* PESTAÑAS DE VISTA RÁPIDA ESTILO TJ MAXX */}
            <div className="bg-[#EAE5DC] p-1 rounded-xl flex items-center text-xs font-bold text-gray-700">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('new');
                  setSelectedCategory('Todas');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'new' ? 'bg-[#0F3E36] text-white shadow-xs' : 'hover:text-[#0F3E36]'
                }`}
              >
                Lo Nuevo
              </button>
              {dealsProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('deals');
                    setSelectedCategory('Todas');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'deals' ? 'bg-[#DF7F2D] text-white shadow-xs' : 'hover:text-[#0F3E36]'
                  }`}
                >
                  Ofertas 🔥
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategory('Todas');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all' && selectedCategory === 'Todas' ? 'bg-white text-[#0F3E36] shadow-xs' : 'hover:text-[#0F3E36]'
                }`}
              >
                Todo
              </button>
            </div>

            {/* SELECTOR DE FILTRO DE ORDENAMIENTO (PRECIO / A-Z) */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 hidden sm:inline">Ordenar:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="default">Recomendados / Novedades</option>
                <option value="discount_desc">Mayor Descuento (% OFF 🔥)</option>
                <option value="price_asc">Precio: Menor a Mayor ($ ↑)</option>
                <option value="price_desc">Precio: Mayor a Menor ($ ↓)</option>
                <option value="name_asc">Nombre: A - Z</option>
                <option value="name_desc">Nombre: Z - A</option>
              </select>
            </div>

            {/* FILTRO POR RANGO DE PRECIO */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 hidden sm:inline">Presupuesto:</span>
              <select
                value={priceFilter}
                onChange={e => setPriceFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Cualquier Precio</option>
                <option value="under150">Menos de $150 MXN</option>
                <option value="150to350">$150 - $350 MXN</option>
                <option value="above350">Más de $350 MXN</option>
              </select>
            </div>


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

        {loadingProducts ? (
          /* SKELETON SCREENS DURANTE CARGA DE PRODUCTOS */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-3.5 space-y-3">
                <div className="aspect-square bg-slate-100 rounded-2xl w-full" />
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <div className="h-5 bg-slate-100 rounded-md w-16" />
                  <div className="h-7 w-7 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
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
              const isImportItem = (product.sku && product.sku.startsWith("CJ")) || (product.brand && product.brand.toLowerCase().includes("cj dropshipping"));

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setModalQuantity(1);
                    setSelectedProduct(product);
                  }}
                  className={`bg-white rounded-xl p-2.5 sm:p-3 flex flex-col justify-between hover:shadow-lg transition-all duration-200 cursor-pointer group relative border ${isImportItem ? "border-indigo-200/90 shadow-2xs" : "border-gray-200/80 shadow-2xs"}`}
                >
                  {/* BADGES SUPERIORES: DESCUENTO / STOCK / COMBO / FAVORITO */}
                  <div className="flex items-center justify-between absolute top-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
                    <div className="flex flex-wrap items-center gap-1">
                      {product.isCombo && (
                        <span className="bg-[#E65F2B] text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> COMBO
                        </span>
                      )}
                      {hasDiscount ? (
                        <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                          -{product.discountPercent}%
                        </span>
                      ) : product.stock === 1 ? (
                        <span className="bg-amber-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                          Último
                        </span>
                      ) : null}
                    </div>

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

                  {/* IMAGEN DE PRODUCTO SOBRE FONDO BLANCO / GRIS ULTRA LIMPIO ESTILO AMAZON */}
                  <div className="aspect-square bg-[#EAF1EF] rounded-2xl flex items-center justify-center p-3 overflow-hidden group-hover:bg-[#E2ECE9] transition relative">
                    <img
                      src={getSafeProductImage(product.images?.[0])}
                      alt={product.title}
                      className="max-h-full w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/no-image.svg';
                      }}
                    />

                    {/* Pleca de logística sutil en la parte inferior izquierda */}
                    <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
                      {product.brand === 'CJ Dropshipping' || product.sku?.startsWith('CJ-') ? (
                        <span className="bg-indigo-950/85 backdrop-blur-xs text-indigo-100 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-xs border border-indigo-400/20">
                          ✈️ Internacional
                        </span>
                      ) : (
                        <span className="bg-[#072520]/85 backdrop-blur-xs text-emerald-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-xs border border-emerald-400/20">
                          ⚡ 24-48 hrs
                        </span>
                      )}
                    </div>

                    {/* Botón amarillo '+' circular flotante como en Amazon */}
                    <div className="absolute bottom-1.5 right-1.5 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalQuantity(1);
                          setSelectedProduct(product);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] active:scale-95 text-gray-900 flex items-center justify-center shadow-md transition cursor-pointer border border-[#FCD200]"
                        title="Ver producto y comprar"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* DETALLES DE PRECIO Y PROMOCIÓN ESTILO AMAZON */}
                  <div className="pt-2 flex-1 flex flex-col justify-between">


                    {/* PRECIO ACTUAL Y VALOR DE REFERENCIA DE ANTES (VERDE #0F3E36) */}
                    <div className="pt-1.5 space-y-1">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base sm:text-lg font-black text-[#0F3E36] tracking-tight">
                            ${product.publicPrice.toFixed(0)} <span className="text-[10px] font-bold text-gray-500">MXN</span>
                          </span>
                          {hasDiscount ? (
                            <span className="text-[11px] text-gray-400 line-through font-medium">
                              ${originalPrice.toFixed(0)}
                            </span>
                          ) : null}
                        </div>
                        {hasDiscount && (
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            Ahorras ${(originalPrice - product.publicPrice).toFixed(0)} MXN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Título del producto limpio en 2 líneas */}
                    <div className="pt-1.5">
                      <h4 className="text-xs sm:text-[13px] font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#0F3E36] transition">
                        {product.title}
                      </h4>
                      {/* Descripción breve del artículo */}
                      {product.description && (
                        <p className="text-[10.5px] text-gray-500 line-clamp-2 leading-snug mt-1 font-normal">
                          {product.description || (isImportItem ? 'Producto de importación directa a tu domicilio.' : '')}
                        </p>
                      )}
                    </div>

                    {/* Procedencia / Marca / Calificación con avioncito y colores de antes */}
                    <div className="pt-2 flex items-center justify-between text-[11px] border-t border-gray-100 mt-2">
                      <span className="text-[10px] font-semibold text-[#0F3E36] hover:underline uppercase tracking-wider truncate flex items-center gap-1">
                        {isImportItem ? (
                          <>
                            <span>✈️</span>
                            <span>Internacional</span>
                          </>
                        ) : (
                          <span>{product.brand && !product.brand.toLowerCase().includes('cj dropshipping') ? product.brand : product.category}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-gray-700 shrink-0">
                        <span className="text-amber-400 text-xs">★</span>
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
      ) : currentView === 'account' ? (
        /* ======================================================== */
        /* SECCIÓN INTEGRADA: MI CUENTA, RASTREO Y BENEFICIOS FOXDROP */
        /* ======================================================== */
        <div className="w-full flex-1 animate-in fade-in duration-200 bg-[#F5F6F8]">
          
          {/* BARRA SUPERIOR DE NAVEGACIÓN LIMPIA Y PROFESIONAL (ESTILO MERCADO LIBRE / AMAZON) */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentView('store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#0F3E36] transition cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                  <span>Volver a la Tienda</span>
                </button>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>Inicio</span>
                  <span>›</span>
                  <span className="font-bold text-slate-900">Mi Cuenta</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    loadFullProfileData();
                    if (user) loadUserAccount(user.phone, user.email);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                  title="Sincronizar información"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingOrders || loadingFullProfile ? 'animate-spin text-[#0F3E36]' : ''}`} />
                  <span className="hidden sm:inline">Sincronizar</span>
                </button>
              </div>
            </div>
          </div>

          {/* CABECERA PRINCIPAL ELEGANTE CON CREDENCIALES DE SEGURIDAD (ESTILO AMAZON / MERCADO LIBRE) */}
          <div className="bg-white border-b border-slate-200 py-6 sm:py-7 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center shadow-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {user?.name || 'Mi Cuenta FoxDrop'}
                    </h1>
                    <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0F3E36]" /> Cuenta Verificada
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span>{user?.email}</span>
                    {user?.phone && <span>• Tel: {user.phone}</span>}
                  </p>
                </div>
              </div>

              {/* TIER DEL CLUB Y PUNTOS CON ESTILO SOBRIO CORPORATIVO */}
              {(() => {
                const pts = user?.points ?? 0;
                const tier = getClubFoxDropTier(pts, clubSettings?.tiers);
                return (
                  <div 
                    onClick={() => setAccountTab('club')}
                    className="bg-slate-50 rounded-xl p-3.5 sm:px-4 border border-slate-200 shadow-2xs flex items-center gap-4 shrink-0 cursor-pointer hover:border-slate-300 transition group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
                      {tier.badge}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        FoxDrop Club
                      </span>
                      <span className="text-xs font-black text-slate-900">{tier.name}</span>
                      <span className="text-[11px] text-slate-600 font-bold block">{tier.discountPercent}% OFF Permanente</span>
                    </div>
                    <div className="border-l border-slate-200 pl-3.5 text-right">
                      <span className="text-base font-black text-slate-900 block font-mono leading-tight">
                        {pts}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">Puntos</span>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL CON DISEÑO DE CENTRO DE GESTIÓN (HUB AMAZON / MERCADO LIBRE) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* BARRA DE ACCESOS RÁPIDOS PRINCIPALES CON ESTILO HUB EJECUTIVO */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { id: 'orders', label: 'Mis Pedidos', sub: `${userOrders.length} pedido(s)`, icon: Package },
                { id: 'favorites', label: 'Favoritos', sub: `${favorites.length} guardado(s)`, icon: Heart },
                { id: 'addresses', label: 'Direcciones', sub: `${fullProfile?.addresses?.length || 0} registrada(s)`, icon: MapPin },
                { id: 'cards', label: 'Billetera & Tarjetas', sub: `${fullProfile?.cards?.length || 0} guardada(s)`, icon: CreditCard },
                { id: 'club', label: 'Nivel & Puntos', sub: 'Beneficios del club', icon: Award },
                { id: 'settings', label: 'Seguridad y Datos', sub: 'Datos de contacto', icon: ShieldCheck },
              ].map(tab => {
                const Icon = tab.icon;
                const active = accountTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAccountTab(tab.id as any)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-[#0F3E36] border-[#0F3E36] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs font-bold block truncate ${active ? 'text-white' : 'text-slate-900'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[10px] block truncate font-medium ${active ? 'text-white/70' : 'text-slate-500'}`}>
                        {tab.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: MIS PEDIDOS Y RASTREO */}
            {accountTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {[
                      { id: 'all', label: `Todos (${userOrders.length})` },
                      { id: 'active', label: 'En Proceso' },
                      { id: 'delivered', label: 'Entregados' },
                      { id: 'pos', label: `🏪 Tienda Física (${userOrders.filter(o => o.order_number?.startsWith('FX-POS') || o.id?.startsWith('FX-POS') || (o.notes && o.notes.includes('POS'))).length})` },
                      { id: 'cancelled', label: 'Cancelados' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setOrderFilter(f.id as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          orderFilter === f.id
                            ? 'bg-[#0F3E36] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-500 hidden sm:inline font-medium">
                    {userOrders.length} pedido(s) registrados
                  </span>
                </div>

                {loadingOrders ? (
                  <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200 shadow-2xs">
                    <RefreshCw className="w-6 h-6 text-[#0F3E36] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Consultando historial con el centro logístico...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center space-y-4 border border-slate-200 shadow-2xs max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">Aún no tienes pedidos registrados</h3>
                      <p className="text-xs text-slate-500">
                        Cuando realices compras en la tienda web o en nuestro mostrador físico, aquí podrás consultar tu historial, boletos y tickets en tiempo real.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView('store');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 bg-[#0F3E36] hover:bg-[#154E45] text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Explorar Catálogo de la Tienda</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userOrders
                      .filter(ord => {
                        const isPosOrder = ord.order_number?.startsWith('FX-POS') || ord.id?.startsWith('FX-POS') || (ord.notes && ord.notes.includes('POS'));
                        if (orderFilter === 'pos') return isPosOrder;
                        if (orderFilter === 'active') return !isPosOrder && (ord.status === 'pending' || ord.status === 'processing' || ord.status === 'shipped');
                        if (orderFilter === 'delivered') return ord.status === 'delivered';
                        if (orderFilter === 'cancelled') return ord.status === 'cancelled';
                        return true;
                      })
                      .map(order => {
                        const isCancelled = order.status === 'cancelled';
                        const isPos = order.order_number?.startsWith('FX-POS') || order.id?.startsWith('FX-POS') || (order.notes && order.notes?.includes('POS'));
                        const ticketUrlMatch = order.notes && order.notes.match(/Ticket:\s*(https?:\/\/[^\s]+|data:image\/[a-zA-Z]+;base64,[^\s]+)/);
                        const ticketUrl = ticketUrlMatch ? ticketUrlMatch[1] : null;

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
                          if (isPos) {
                            return { label: 'Entregado en Mostrador', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
                          }
                          switch (order.status) {
                            case 'shipped': return { label: 'En Camino', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
                            case 'processing': return { label: 'Confirmado por Tienda', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
                            case 'delivered': return { label: 'Entregado', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
                            case 'cancelled': return { label: 'Cancelado', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
                            case 'pending':
                            default:
                              return { label: 'Pendiente de Confirmación', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
                          }
                        })();

                        return (
                          <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Fecha</span>
                                  <span className="font-bold text-slate-800">
                                    {new Date(order.created_at).toLocaleDateString('es-MX')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total</span>
                                  <span className="font-extrabold text-slate-900 text-sm">
                                    ${Number(order.total).toFixed(2)} MXN
                                  </span>
                                </div>
                                {isPos && (
                                  <span className="hidden sm:inline-flex items-center gap-1 bg-slate-200/80 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    🏪 Mostrador
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${statusBadge.bg}`}>
                                  {statusBadge.label}
                                </span>
                                <span className="font-bold text-xs text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                                  {order.order_number || order.id}
                                </span>
                              </div>
                            </div>

                            {/* Alerta de Cancelación si la orden fue dada de baja */}
                            {isCancelled ? (
                              <div className="p-4 sm:p-5">
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs space-y-1 text-rose-900">
                                  <div className="flex items-center gap-2 font-bold text-rose-800">
                                    <Ban className="w-4 h-4 text-rose-600" />
                                    <span>Pedido cancelado</span>
                                  </div>
                                  <p className="text-rose-700 text-[11px]">
                                    <strong>Motivo:</strong> {order.notes || 'Cancelado por administración.'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* Tracker de 4 pasos sobrio y uniforme */
                              <div className="p-4 sm:p-5 pb-0">
                                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                                  <div className="relative flex items-center justify-between">
                                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0">
                                      <div 
                                        className="h-full bg-[#0F3E36] transition-all duration-500"
                                        style={{ width: `${((statusStep - 1) / 3) * 100}%` }}
                                      />
                                    </div>

                                    {[
                                      { step: 1, title: 'Por Confirmar', icon: Clock },
                                      { step: 2, title: 'Confirmado', icon: CheckCircle2 },
                                      { step: 3, title: 'En Camino', icon: Truck },
                                      { step: 4, title: 'Entregado', icon: Check },
                                    ].map(s => {
                                      const Icon = s.icon;
                                      const isPassed = statusStep >= s.step;
                                      const isCurrent = statusStep === s.step;

                                      return (
                                        <div key={s.step} className="relative z-10 flex flex-col items-center">
                                          <div 
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition text-xs ${
                                              isPassed 
                                                ? 'bg-[#0F3E36] text-white' 
                                                : 'bg-white border border-slate-300 text-slate-400'
                                            } ${isCurrent ? 'ring-2 ring-[#0F3E36]/30' : ''}`}
                                          >
                                            <Icon className="w-3.5 h-3.5" />
                                          </div>
                                          <span className={`text-[10px] mt-1 font-bold ${
                                            isCurrent ? 'text-[#0F3E36]' : isPassed ? 'text-slate-800' : 'text-slate-400'
                                          }`}>
                                            {s.title}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="p-4 sm:p-5 pt-3 space-y-3">
                              {/* Artículos */}
                              {order.order_items && order.order_items.length > 0 && (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                                   {order.order_items.map((item: any, idx: number) => {
                                    const cleanItemTitle = (item.product_title || "").trim().toLowerCase();
                                    const matchedProd = products.find(p => {
                                      if (p.id && item.product_id && p.id === item.product_id) return true;
                                      const pTitle = (p.title || "").trim().toLowerCase();
                                      return pTitle === cleanItemTitle || (cleanItemTitle.length > 5 && pTitle.includes(cleanItemTitle));
                                    });
                                    const prodImg = (item.product_image && !item.product_image.includes("no-image.svg"))
                                      ? item.product_image
                                      : (matchedProd?.images?.[0] && !matchedProd.images[0].includes("no-image.svg") ? matchedProd.images[0] : '/no-image.svg');

                                    return (
                                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-lg bg-slate-50 p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                                            <img
                                              src={prodImg}
                                              alt={item.product_title}
                                              className="w-full h-full object-contain"
                                              onError={(e: any) => { e.currentTarget.src = '/no-image.svg'; }}
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">{item.product_title}</p>
                                            <p className="text-[11px] text-slate-500">
                                              Cant: <strong className="text-slate-800">{item.quantity}</strong> • ${Number(item.price_at_purchase).toFixed(2)} MXN c/u
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                                            ${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}
                                          </span>
                                          {matchedProd && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(matchedProd, e, item.quantity || 1);
                                              }}
                                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                              title="Volver a comprar este producto"
                                            >
                                              <ShoppingCart className="w-3.5 h-3.5" />
                                              <span className="hidden sm:inline">Reordenar</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Botones de acción */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {order.order_items?.length || 0} producto(s) en este pedido
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Botón Re-ordenar pedido completo */}
                                  {order.order_items && order.order_items.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        let addedCount = 0;
                                        order.order_items.forEach((item: any) => {
                                          const matched = products.find(p => p.id === item.product_id || p.title.toLowerCase() === item.product_title?.toLowerCase());
                                          if (matched) {
                                            addToCart(matched, undefined, item.quantity || 1);
                                            addedCount++;
                                          }
                                        });
                                        if (addedCount === 0) {
                                          alert("Los productos de este pedido ya no se encuentran en el catálogo actual.");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                                      title="Agregar todos los productos de este pedido al carrito"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5 text-slate-600" />
                                      <span>Comprar de nuevo</span>
                                    </button>
                                  )}

                                  {/* Botón WhatsApp con Folio */}
                                  <a
                                    href={`https://wa.me/522221234567?text=${encodeURIComponent(`Hola FoxDrop 🦊, tengo una duda sobre mi pedido *${order.order_number || order.id}* por *$${Number(order.total).toFixed(2)} MXN*.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                                    title="Contactar soporte por WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Soporte</span>
                                  </a>

                                  {ticketUrl && (
                                    <a
                                      href={ticketUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                                    >
                                      <span>🧾 Ticket</span>
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {(order.status === 'pending' || order.status === 'processing') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancellingClientOrder(order);
                                        setClientCancelReason('Encontré un mejor precio / Ya no lo necesito');
                                        setClientCancelNotes('');
                                        setShowClientCancelModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Cancelar</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedOrderIds(prev => {
                                        const next = new Set(prev);
                                        const ordKey = order.id || order.order_number;
                                        if (next.has(ordKey)) next.delete(ordKey);
                                        else next.add(ordKey);
                                        return next;
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F3E36] hover:bg-[#154E45] text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                                  >
                                    <span>{expandedOrderIds.has(order.id || order.order_number) ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedOrderIds.has(order.id || order.order_number) ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* DROP ACORDEÓN: DETALLE INTEGRADO ESTILO MERCADO LIBRE / AMAZON (SIN MODALES) */}
                              {expandedOrderIds.has(order.id || order.order_number) && (() => {
                                const isInternational = order.shipping_type === 'international_shipping' || 
                                  (order.notes && (order.notes.includes('[IMPORTACION') || order.notes.includes('[CJ-ORDER:')));

                                // Resolver tarjeta y terminación seria
                                const cardMatch = order.notes && order.notes.match(/\[CARD:([^\]]+)\]/);
                                const cardDesc = cardMatch ? cardMatch[1] : (order.payment_method === 'card' || order.payment_method === 'mercadopago' ? 'Tarjeta terminada en 3764' : 'Efectivo');

                                const addr = typeof order.shipping_address === 'object' && order.shipping_address !== null ? order.shipping_address : {};
                                const formattedAddress = [addr.street, addr.colonia, addr.city, addr.zip ? `C.P. ${addr.zip}` : ''].filter(Boolean).join(', ');

                                return (
                                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
                                    {/* Dirección de Entrega */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                                      <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <MapPin className="w-4 h-4 text-[#0F3E36]" />
                                        <span>Dirección de Entrega:</span>
                                      </div>
                                      <div className="text-slate-700 pl-6 space-y-0.5 leading-relaxed">
                                        <p className="font-bold text-slate-900">{formattedAddress || order.pickup_point || 'Domicilio registrado'}</p>
                                        {addr.references && (
                                          <p className="text-[11px] text-slate-500 italic">Ref: {addr.references}</p>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 pl-6">
                                        {isInternational ? '✈️ Paquetería Internacional directa a tu domicilio (10-15 días)' : '🚚 Entrega local express (24-48 hrs)'}
                                      </p>
                                    </div>

                                    {/* Guía de Rastreo si existe */}
                                    {(order.tracking_number || order.trackingNumber) && (
                                      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 font-bold text-sky-950">
                                          <Truck className="w-4 h-4 text-sky-600" />
                                          <span>Guía de rastreo:</span>
                                          <span className="font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200">
                                            {order.tracking_number || order.trackingNumber}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const tr = order.tracking_number || order.trackingNumber;
                                            if (navigator?.clipboard && tr) {
                                              navigator.clipboard.writeText(tr);
                                              alert("Guía copiada: " + tr);
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-sky-600 text-white font-bold rounded-lg text-[11px]"
                                        >
                                          Copiar
                                        </button>
                                      </div>
                                    )}

                                    {/* Desglose de Pago Limpio */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                                      <div className="flex justify-between text-slate-600">
                                        <span>Método de pago:</span>
                                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                          <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                                          <span>{cardDesc}</span>
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-slate-600">
                                        <span>Subtotal artículos:</span>
                                        <span className="font-semibold text-slate-900">${Number(order.subtotal || order.total).toFixed(2)} MXN</span>
                                      </div>
                                      <div className="flex justify-between text-slate-600">
                                        <span>Costo de envío:</span>
                                        <span className="font-bold text-emerald-600">
                                          {Number(order.shipping_cost) > 0 ? `${Number(order.shipping_cost).toFixed(2)} MXN` : 'Gratis'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-100">
                                        <span>Total Pagado:</span>
                                        <span className="text-[#DF7F2D] text-base font-extrabold">${Number(order.total).toFixed(2)} MXN</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* TAB FAVORITOS (ARTÍCULOS GUARDADOS POR EL USUARIO) */}
            {accountTab === 'favorites' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-slate-700 fill-slate-700" />
                      <span>Mis Artículos Favoritos</span>
                    </h3>
                    <p className="text-xs text-slate-500">Productos que guardaste para comprar más tarde.</p>
                  </div>
                  {favorites.length > 0 && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {favorites.length} guardado(s)
                    </span>
                  )}
                </div>

                {favorites.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center space-y-4 border border-slate-200 shadow-2xs max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                      <Heart className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">Aún no tienes favoritos</h4>
                      <p className="text-xs text-slate-500">
                        Explora la tienda y presiona el ícono del corazón en cualquier producto para guardarlo aquí.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView('store');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 bg-[#0F3E36] hover:bg-[#154E45] text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Explorar Catálogo</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {products
                      .filter(p => favorites.includes(p.id))
                      .map(favProduct => (
                        <div
                          key={favProduct.id}
                          onClick={() => {
                            setModalQuantity(1);
                            setSelectedProduct(favProduct);
                          }}
                          className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between hover:shadow-sm transition cursor-pointer group relative"
                        >
                          <button
                            onClick={(e) => toggleFav(favProduct.id, e)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-xs flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-110 transition z-10 border border-slate-100"
                            title="Quitar de favoritos"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          </button>

                          <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-100">
                            <img
                              src={favProduct.images[0]}
                              alt={favProduct.title}
                              className="max-h-full w-auto object-contain group-hover:scale-105 transition duration-200"
                            />
                          </div>

                          <div className="space-y-1 flex-1 flex flex-col justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{favProduct.title}</h5>
                              <p className="text-[10px] text-slate-400">{favProduct.category}</p>
                            </div>
                            <div className="pt-1 flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                                ${favProduct.publicPrice.toFixed(0)} MXN
                              </span>
                              <button
                                onClick={(e) => addToCart(favProduct, e)}
                                className="p-1.5 rounded-lg bg-[#0F3E36] hover:bg-[#154E45] text-white transition shadow-2xs"
                                title="Agregar al carrito"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DIRECCIONES */}
            {accountTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tus Direcciones de Entrega</h3>
                    <p className="text-xs text-slate-500">Para compras rápidas y entregas precisas.</p>
                  </div>
                  <button
                    onClick={handleOpenAddAddress}
                    className="bg-[#0F3E36] hover:bg-[#154E45] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Dirección</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button
                    onClick={handleOpenAddAddress}
                    className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2 transition bg-white min-h-[140px] cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-800">Agregar nueva dirección</span>
                  </button>

                  {fullProfile?.addresses && fullProfile.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`bg-white rounded-xl border p-4 space-y-2 relative shadow-2xs transition flex flex-col justify-between ${
                        addr.isDefault ? 'border-[#0F3E36] ring-1 ring-[#0F3E36]' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 font-medium">{addr.street}</p>
                        {addr.colonia && <p className="text-slate-600">Col. {addr.colonia}</p>}
                        <p className="text-slate-600">{addr.city}, {addr.state} • C.P. {addr.zip}</p>
                        {addr.phone && <p className="text-[11px] text-slate-500">Tel: {addr.phone}</p>}
                        {addr.references && (
                          <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                            Ref: {addr.references}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenEditAddress(addr)}
                          className="p-1 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: BILLETERA Y MÉTODOS DE PAGO (REDISEÑO SOBRIO EJECUTIVO) */}
            {accountTab === 'cards' && (
              <div className="space-y-4">
                
                {/* ENCABEZADO DE BILLETERA */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-700" />
                      <span>Billetera & Medios de Pago</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tus tarjetas guardadas están encriptadas bajo el estándar bancario PCI-DSS para compras rápidas.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCardError(null);
                      setCardSuccessNotice(null);
                      setShowCardModal(true);
                    }}
                    className="bg-[#0F3E36] hover:bg-[#154E45] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Nueva Tarjeta</span>
                  </button>
                </div>

                {/* LISTADO DE TARJETAS CON DISEÑO EJECUTIVO UNIFORME */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Tarjetas existentes con diseño sobrio slate/navy */}
                  {fullProfile?.cards && fullProfile.cards.map((card) => {
                    return (
                      <div
                        key={card.id}
                        className="relative rounded-2xl p-4 text-white flex flex-col justify-between shadow-xs min-h-[175px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 overflow-hidden"
                      >
                        {/* Brillo tenue */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

                        {/* Top de la Tarjeta */}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-6 rounded bg-amber-400/90 shadow-2xs border border-amber-300/40"></div>
                            <span className="text-[9px] text-slate-400 tracking-widest font-mono">CHIP</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {card.isDefault && (
                              <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider">
                                Predeterminada
                              </span>
                            )}
                            <span className="font-mono text-xs font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded border border-white/10 text-slate-200">
                              {card.brand || 'Tarjeta'}
                            </span>
                          </div>
                        </div>

                        {/* Número en relieve */}
                        <div className="font-mono text-lg font-bold tracking-[0.25em] text-slate-100 text-center py-2 relative z-10">
                          •••• •••• •••• {card.last4}
                        </div>

                        {/* Datos del titular y vencimiento */}
                        <div className="flex items-end justify-between pt-2 border-t border-white/10 relative z-10">
                          <div className="min-w-0 pr-2">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Titular</span>
                            <span className="text-xs font-bold uppercase truncate block max-w-[140px] tracking-wide text-slate-200">
                              {card.holderName || user?.name || 'TITULAR'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Expira</span>
                            <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
                              {card.expMonth}/{card.expYear}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-slate-400 hover:text-rose-400 p-1.5 hover:bg-white/10 rounded-md transition cursor-pointer ml-1 shrink-0"
                            title="Eliminar tarjeta guardada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tarjeta vacía para agregar nueva */}
                  <div
                    onClick={() => {
                      setCardError(null);
                      setCardSuccessNotice(null);
                      setShowCardModal(true);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 transition bg-white min-h-[175px] cursor-pointer group shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-600 transition flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 transition block">
                        + Agregar Tarjeta
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Guarda Visa, Mastercard o AMEX para comprar en 1 clic
                      </span>
                    </div>
                  </div>

                </div>

                {/* BANNER DE SEGURIDAD PCI-DSS BANCARIA */}
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#0F3E36]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Seguridad Bancaria Garantizada</h4>
                      <p className="text-[11px] text-slate-500">
                        FoxDrop nunca almacena tu código CVV ni números completos de tarjeta. Los cobros son procesados mediante cifrado tokenizado TLS 1.3.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-slate-500 shrink-0">
                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">256-BIT ENCRYPTION</span>
                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">PCI-DSS COMPLIANT</span>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: CLUB FOXDROP */}
            {accountTab === 'club' && (
              <div className="space-y-4">
                {(() => {
                  const pts = user?.points ?? 0;
                  const tier = getClubFoxDropTier(pts, clubSettings?.tiers);
                  const tiersList = (clubSettings?.tiers && clubSettings.tiers.length > 0)
                    ? clubSettings.tiers
                    : DEFAULT_CLUB_SETTINGS.tiers;
                  const sortedTiers = [...tiersList].sort((a, b) => a.minPoints - b.minPoints);
                  const currentTierIndex = sortedTiers.findIndex(t => t.name === tier.name);
                  const nextTier = currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1
                    ? sortedTiers[currentTierIndex + 1]
                    : null;
                  const prevPoints = sortedTiers[currentTierIndex]?.minPoints ?? 0;
                  const nextMinPoints = nextTier ? nextTier.minPoints : prevPoints;
                  const pointsNeeded = nextTier ? Math.max(0, nextMinPoints - pts) : 0;
                  const rangeSpan = Math.max(1, nextMinPoints - prevPoints);
                  const progressPct = nextTier 
                    ? Math.min(100, Math.max(5, Math.round(((pts - prevPoints) / rangeSpan) * 100)))
                    : 100;

                  return (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200">
                            {tier.badge}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                              Membresía Activa
                            </span>
                            <h3 className="text-lg font-black text-slate-900">{tier.name}</h3>
                          </div>
                        </div>
                        <div className="text-right bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-xl font-black text-slate-900 block font-mono leading-none">{pts}</span>
                          <span className="text-[10px] text-slate-500 font-bold">Puntos Club</span>
                        </div>
                      </div>

                      {/* Barra de progreso sobria */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Sparkle className="w-3.5 h-3.5 text-[#0F3E36]" />
                            {nextTier ? `Próximo Nivel: ${nextTier.name} ${nextTier.badge}` : '¡Has alcanzado el Nivel Máximo! 💎'}
                          </span>
                          <span className="text-slate-900 font-mono">{progressPct}%</span>
                        </div>
                        
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0F3E36] rounded-full transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>{pts} pts acumulados</span>
                          <span>
                            {nextTier 
                              ? `Faltan ${pointsNeeded} pts para ${nextTier.discountPercent}% OFF`
                              : 'Beneficios VIP activados'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {tier.discountPercent > 0
                          ? `🎉 Cuentas con un ${tier.discountPercent}% de descuento permanente en tus compras en FoxDrop.`
                          : 'Acumula 1 punto por cada $10 MXN gastados para desbloquear descuentos automáticos y beneficios exclusivos.'}
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider">Niveles de Membresía</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    {[
                      { name: 'Bronce 🥉', pts: '0 - 499 pts', desc: '1 punto por cada $10 MXN.' },
                      { name: 'Plata 🥈', pts: '500 - 1,499 pts', desc: '5% de descuento permanente.' },
                      { name: 'Oro 🥇', pts: '1,500 - 3,499 pts', desc: '10% de descuento permanente.' },
                      { name: 'Platino 💎', pts: '3,500+ pts', desc: '15% de descuento + atención prioritaria.' },
                    ].map((lvl, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                        <span className="font-bold text-slate-900 block">{lvl.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{lvl.pts}</span>
                        <p className="text-[11px] text-slate-600">{lvl.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DATOS PERSONALES */}
            {accountTab === 'settings' && (
              <div className="max-w-lg space-y-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900">Tus Datos de Contacto</h3>

                  {profileSaveSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>¡Tus datos fueron guardados con éxito!</span>
                    </div>
                  )}

                  <form onSubmit={handleSavePersonalData} className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Nombre completo:</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1">WhatsApp de contacto:</label>
                      <input
                        type="tel"
                        required
                        placeholder="10 dígitos"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Correo electrónico:</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-[#0F3E36] hover:bg-[#154E45] disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-lg transition text-xs shadow-2xs cursor-pointer"
                    >
                      {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">Cerrar Sesión</p>
                    <p className="text-[11px] text-slate-500">Finalizar tu sesión en este navegador.</p>
                  </div>
                  <button
                    onClick={async () => {
                      await authSignOut();
                      setUser(null);
                      setCurrentView('store');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    Salir de la cuenta
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* MODAL AGREGAR / EDITAR DIRECCIÓN */}
          {showAddressModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingAddress ? 'Editar Dirección' : 'Nueva Dirección de Entrega'}
                  </h3>
                  <p className="text-xs text-slate-500">Ingresa la ubicación donde recibirás tus pedidos.</p>
                </div>

                <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Nombre de quien recibe:</label>
                    <input
                      type="text"
                      required
                      value={addressForm.name || ''}
                      onChange={e => setAddressForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                    />
                  </div>

                  {/* Dirección de entrega */}
                  <div className="pt-1">
                    <label className="text-slate-700 font-bold block mb-1">
                      Dirección de entrega:
                    </label>
                    <GoogleAddressInput
                      key={editingAddress ? editingAddress.id : 'new-address-modal'}
                      initialStreet={addressForm.street || ''}
                      initialColonia={addressForm.colonia || ''}
                      initialZip={addressForm.zip || ''}
                      initialCity={addressForm.city || ''}
                      initialState={addressForm.state || ''}
                      onAddressChange={(parsed) => {
                        setAddressForm(prev => ({
                          ...prev,
                          street: parsed.street,
                          colonia: parsed.colonia || '',
                          zip: parsed.zip,
                          city: parsed.city,
                          state: parsed.state,
                        }));
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Referencias de entrega (opcional):</label>
                    <textarea
                      rows={2}
                      value={addressForm.references || ''}
                      onChange={e => setAddressForm(p => ({ ...p, references: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0F3E36] hover:bg-[#154E45] text-white font-bold py-2.5 rounded-lg transition text-xs shadow-2xs cursor-pointer mt-2"
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
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl border border-slate-200">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-base text-slate-900">Agregar Método de Pago</h3>
                  <p className="text-xs text-slate-500">Guarda una tarjeta de crédito o débito para compras con 1 clic.</p>
                </div>

                <form onSubmit={handleSaveCard} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Nombre en la tarjeta:</label>
                    <input
                      type="text"
                      required
                      value={cardForm.holderName}
                      onChange={e => setCardForm(p => ({ ...p, holderName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Número de tarjeta:</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardForm.cardNumber}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardForm(p => ({ ...p, cardNumber: v }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                    />
                  </div>

                  {/* Visual de Tarjeta Estilo Pasarela */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs space-y-3 relative overflow-hidden border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-6 bg-amber-400/90 rounded shadow-2xs"></div>
                      <span className="font-mono text-xs uppercase tracking-wider text-slate-300 font-bold">
                        {detectBrand(cardForm.cardNumber.replace(/\s/g, '')) || 'Tarjeta'}
                      </span>
                    </div>
                    <div className="font-mono text-base tracking-widest text-slate-100 font-bold">
                      {cardForm.cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Titular</span>
                        <span className="font-bold truncate block max-w-[170px] uppercase">
                          {cardForm.holderName || 'NOMBRE COMPLETO'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase">Vence</span>
                        <span className="font-mono font-bold">{cardForm.expDate || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Vencimiento (MM/AA):</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/AA"
                        maxLength={5}
                        value={cardForm.expDate}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length >= 2) {
                            v = v.slice(0, 2) + '/' + v.slice(2, 4);
                          }
                          setCardForm(p => ({ ...p, expDate: v }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-center text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">CVV / CVC:</label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardForm.cvc}
                        onChange={e => setCardForm(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '') }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-center text-slate-900 focus:outline-none focus:border-[#0F3E36] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* MENSAJES SUTILES INTEGRADOS EN LA INTERFAZ */}
                  {cardError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[11px] text-rose-700 font-medium flex items-center gap-1.5 animate-in fade-in">
                      <span>⚠️</span>
                      <span>{cardError}</span>
                    </div>
                  )}

                  {cardSuccessNotice && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{cardSuccessNotice}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cardSaving || Boolean(cardSuccessNotice)}
                    className="w-full bg-[#0F3E36] hover:bg-[#154E45] disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg transition text-xs shadow-2xs cursor-pointer mt-2 flex items-center justify-center gap-2"
                  >
                    {cardSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando en tu cuenta...</span>
                      </>
                    ) : cardSuccessNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Guardada!</span>
                      </>
                    ) : (
                      <span>Guardar Tarjeta</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      ) : currentView === 'checkout' ? (
        /* ======================================================== */
        /* SECCIÓN INTEGRADA: CHECKOUT EN PANTALLA COMPLETA & COMPROBANTE */
        /* ======================================================== */
        <div className="w-full flex-1 animate-in fade-in duration-200 bg-[#F5F2EC] py-6 sm:py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

            {/* AVISO DE PAGO FALLIDO O EXITOSO RETORNADO POR MERCADO PAGO */}
            {paymentNotice && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                paymentNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className={`p-2 rounded-xl shrink-0 ${
                  paymentNotice.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {paymentNotice.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 text-xs sm:text-sm">
                  <p className="font-extrabold">{paymentNotice.type === 'error' ? 'Pago no procesado' : 'Pago confirmado'}</p>
                  <p className="mt-0.5 opacity-90 leading-relaxed">{paymentNotice.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentNotice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Barra superior de navegación dentro de checkout */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <button
                onClick={() => {
                  if (checkoutStep === 'payment') {
                    setCheckoutStep('shipping');
                  } else {
                    setCurrentView('store');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F3E36] hover:text-[#DF7F2D] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#DF7F2D]" />
                <span>{checkoutStep === 'payment' ? '← Regresar a métodos de entrega' : '← Volver al catálogo'}</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <span className={checkoutStep === 'shipping' ? 'text-[#0F3E36] font-black' : ''}>1. Entrega</span>
                <span>•</span>
                <span className={checkoutStep === 'payment' ? 'text-[#0F3E36] font-black' : ''}>2. Pago</span>
                <span>•</span>
                <span className={checkoutStep === 'success' ? 'text-emerald-600 font-black' : ''}>3. Comprobante</span>
              </div>
            </div>

            {/* PASO 1: SELECCIÓN DE FORMA DE ENTREGA */}
            {checkoutStep === 'shipping' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                {isMixedCart ? (
                  /* VISTA CARRITO MIXTO: SE ENVIARÁN 2 PAQUETES POR ORIGEN DE ALMACÉN */
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-300/60 p-4 rounded-2xl flex items-start gap-3">
                      <span className="text-2xl shrink-0">📦✈️</span>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-gray-900">
                          Tu pedido se enviará en 2 entregas independientes
                        </h2>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          Has combinado artículos de nuestra <strong className="text-[#0F3E36]">Boutique FoxDrop (Almacén Puebla)</strong> con artículos de <strong className="text-indigo-800">FoxDrop Internacional (Fábrica Directa)</strong>. Pagas todo junto en una sola transacción con tu misma tarjeta, y recibirás ambos paquetes en tu domicilio.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Paquete 1: Boutique FoxDrop */}
                      <div className="p-4 rounded-2xl border-2 border-emerald-600/40 bg-emerald-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            📦 Paquete 1 • Boutique FoxDrop
                          </span>
                          <span className="text-[11px] font-extrabold text-emerald-700">Almacén Local</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            ⚡ Entrega rápida estimada: 24 a 48 hrs hábiles
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {cart.filter(i => !isImportProdItem(i.product)).reduce((sum, i) => sum + i.quantity, 0)} artículo(s) preparados y despachados desde nuestro centro de distribución nacional.
                          </p>
                        </div>
                        {/* Selector de paquetería / envío de Boutique */}
                        <div className="pt-2 border-t border-emerald-100">
                          <label className="text-[11px] font-bold text-gray-700 block mb-1">
                            Método de entrega local:
                          </label>
                          <select 
                            value={selectedShippingId} 
                            onChange={(e) => setSelectedShippingId(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#0F3E36]"
                          >
                            {checkoutSettings.shippingMethods
                              .filter(m => m.enabled)
                              .map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.price === 0 ? '(Sin costo)' : `(+$${m.price.toFixed(0)} MXN)`}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Paquete 2: FoxDrop Internacional */}
                      <div className="p-4 rounded-2xl border-2 border-indigo-600/40 bg-indigo-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                            ✈️ Paquete 2 • FoxDrop Internacional
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                            ¡Envío Gratis!
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            🌍 Entrega internacional: 10 a 15 días hábiles
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {cart.filter(i => isImportProdItem(i.product)).reduce((sum, i) => sum + i.quantity, 0)} artículo(s) importados directo de fábrica con número de guía independiente para rastreo en tiempo real.
                          </p>
                        </div>
                        <div className="pt-2 border-t border-indigo-100">
                          <span className="text-[11px] text-indigo-900 font-semibold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                            <span>Envío Internacional Gratis</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : cartHasImportItems ? (
                  /* VISTA EXCLUSIVA: ENTREGA INTERNACIONAL DIRECTA A DOMICILIO CON ENVÍO GRATIS YA INCLUIDO */
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">✈️</span>
                        <span>Envío Internacional Directo a Domicilio</span>
                      </h2>
                    </div>

                    {/* Tarjeta de Paquetería Internacional con Envío Gratis */}
                    <div className="p-5 rounded-2xl border-2 border-indigo-600/70 bg-gradient-to-r from-indigo-50/60 via-white to-indigo-50/30 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block">
                              Paquetería Internacional con Guía de Rastreo
                            </span>
                            <span className="text-xs text-indigo-700 font-semibold block mt-0.5">
                              ⚡ Tiempo estimado de entrega: 10 a 15 días hábiles
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            ¡Envío Gratis!
                          </span>
                        </div>
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed pt-1">
                        📦 <strong>Guía y seguimiento garantizado:</strong> Una vez despachado tu pedido, recibirás tu número de guía de seguimiento por correo electrónico y podrás monitorear el estatus en tiempo real en todo momento desde el apartado de <strong>Órdenes en proceso</strong> en tu cuenta.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* VISTA TRADICIONAL PARA PRODUCTOS LOCALES DE BOUTIQUE */
                  <>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-[#DF7F2D]" />
                        <span>Selecciona tu Método de Entrega</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Elige si deseas coordinar una entrega personal sin costo o envío paquetería a tu domicilio.
                      </p>
                    </div>

                    {/* Métodos de Entrega Activos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {checkoutSettings.shippingMethods
                        .filter(m => m.enabled)
                        .map((method) => {
                          const isSelected = selectedShippingId === method.id;
                          return (
                            <div
                              key={method.id}
                              onClick={() => {
                                setSelectedShippingId(method.id);
                                setAddressError(null);
                              }}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                                isSelected
                                  ? 'border-[#0F3E36] bg-[#EDF5F7]/50 shadow-xs'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    isSelected ? 'border-[#0F3E36] bg-[#0F3E36]' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                  </div>
                                  <span className="font-extrabold text-sm text-gray-900">{method.name}</span>
                                </div>
                                <span className="font-black text-sm text-[#0F3E36]">
                                  {method.price === 0 ? 'Sin costo' : `${method.price.toFixed(0)} MXN`}
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 leading-relaxed">{method.description}</p>

                              {!method.requiresAddress ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md self-start">
                                  🤝 Entrega acordada (no requiere dirección)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md self-start">
                                  📦 Envío a domicilio
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}

                {/* Formulario de Dirección Física (Siempre obligatorio para Importación Directa, opcional para boutique según método) */}
                {(!cartHasImportItems && isPersonalDelivery) ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Entrega personal o a acordar seleccionada</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      No es necesario ingresar dirección física en este momento. Al confirmar la compra, coordinaremos el punto de encuentro o detalles de entrega directamente por WhatsApp con el equipo FoxDrop.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-sm text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#DF7F2D]" />
                        <span>Dirección de Entrega para el Paquete:</span>
                      </label>
                      {fullProfile?.addresses && fullProfile.addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setUseNewAddress(!useNewAddress)}
                          className="text-[#DF7F2D] text-xs font-bold hover:underline cursor-pointer"
                        >
                          {useNewAddress ? 'Usar dirección guardada' : '+ Usar otra dirección'}
                        </button>
                      )}
                    </div>

                    {fullProfile?.addresses && fullProfile.addresses.length > 0 && !useNewAddress ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fullProfile.addresses.map((addr) => {
                          const isSel = selectedAddressId === addr.id;
                          return (
                            <div
                              key={addr.id}
                                onClick={() => {
                                setSelectedAddressId(addr.id);
                                setShippingAddress({
                                  street: addr.street,
                                  colonia: addr.colonia || '',
                                  zip: addr.zip,
                                  city: addr.city || '',
                                  state: addr.state || '',
                                });
                                setAddressError(null);
                              }}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition text-xs ${
                                isSel ? 'border-[#0F3E36] bg-[#EDF5F7]/40' : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-gray-900">
                                <span>{addr.name || 'Mi Dirección'}</span>
                                {addr.isDefault && (
                                  <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded">
                                    Predeterminada
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-[11px] mt-1">
                                {addr.street}{addr.colonia ? `, Col. ${addr.colonia}` : ''}, C.P. {addr.zip}, {addr.city}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-gray-200">
                        <GoogleAddressInput
                          initialStreet={shippingAddress.street}
                          initialColonia={shippingAddress.colonia}
                          initialZip={shippingAddress.zip}
                          initialCity={shippingAddress.city}
                          initialState={shippingAddress.state}
                          onAddressChange={(parsed) => {
                            setShippingAddress({
                              street: parsed.street,
                              colonia: parsed.colonia || '',
                              zip: parsed.zip,
                              city: parsed.city || '',
                              state: parsed.state || '',
                            });
                            if (parsed.street && parsed.zip) {
                              setAddressError(null);
                            }
                          }}
                        />
                      </div>
                    )}

                    {addressError && (
                      <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl animate-in fade-in">
                        ⚠️ {addressError}
                      </p>
                    )}
                  </div>
                )}

                {/* Resumen de Total y Botón Siguiente */}
                <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Artículos ({cartItemCount}): <strong className="text-gray-900 font-bold">${cartSubtotal.toFixed(0)} MXN</strong></div>
                    <div>Costo de entrega: <strong className="text-gray-900 font-bold">{shippingFee === 0 ? <span className="text-emerald-600 font-black">Gratis</span> : `$${shippingFee.toFixed(0)} MXN`}</strong></div>
                    <div className="text-sm font-black text-gray-900 pt-1">
                      Total a pagar: <span className="text-[#DF7F2D] text-lg">${cartTotal.toFixed(0)} MXN</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isPersonalDelivery) {
                        if (!shippingAddress.street.trim() || !shippingAddress.zip.trim()) {
                          setAddressError('Debes ingresar tu calle, número y código postal completos para el envío.');
                          return;
                        }
                      }
                      setAddressError(null);
                      setCheckoutStep('payment');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-[#0F3E36] hover:bg-[#1A5248] text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continuar al Pago</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: SELECCIÓN DE PAGO (SPEI O EFECTIVO O MERCADO PAGO / TARJETAS) */}
            {checkoutStep === 'payment' && (() => {
              const hasImportItemsInCart = cart.some(i => isImportProdItem(i.product));

              return (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-[#0F3E36]" />
                    <span>Medios de pago</span>
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* Opción Tarjeta (Mercado Pago / Visa / Mastercard / AMEX) */}
                  {checkoutSettings.mercadopago?.enabled !== false && (
                    <div
                      onClick={() => setPaymentMethod('mercadopago')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                        paymentMethod === 'mercadopago' ? 'border-[#009EE3] bg-[#009EE3]/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentMethod === 'mercadopago' ? 'border-[#009EE3] bg-[#009EE3]' : 'border-gray-300'
                      }`}
                      >
                        {paymentMethod === 'mercadopago' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                            <span>Tarjeta de Crédito / Débito</span>
                          </span>

                          {/* Logos Oficiales: Mercado Pago, Visa, Mastercard, AMEX */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Logo Mercado Pago */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#009EE3]/10 border border-[#009EE3]/30 text-[#009EE3] font-bold text-[10px]">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.5v-1.63c2.39-.37 4-2.18 4-4.87 0-2.85-2.02-4.14-4.52-4.75-2.14-.52-2.73-.97-2.73-1.84 0-.82.68-1.46 2.05-1.46 1.34 0 2.21.57 2.37 1.73l1.83-.55c-.32-1.64-1.6-2.67-3.4-2.92V3.5h-2v1.65c-2.03.35-3.65 1.93-3.65 4.39 0 2.74 1.83 4.09 4.41 4.71 2.25.54 2.84 1.14 2.84 2.01 0 .99-.87 1.63-2.25 1.63-1.63 0-2.59-.76-2.8-2.05l-1.9.52c.38 1.88 1.81 2.99 3.75 3.27V18.5h2z"/>
                              </svg>
                              <span>Mercado Pago</span>
                            </span>

                            {/* Badge Visa */}
                            <span className="inline-block px-1.5 py-0.5 rounded bg-[#1A1F71] text-white font-black text-[9px] tracking-wider italic">
                              VISA
                            </span>

                            {/* Badge Mastercard */}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#EB001B] -mr-1 inline-block opacity-95"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] inline-block opacity-95"></span>
                            </span>

                            {/* Badge AMEX */}
                            <span className="inline-block px-1.5 py-0.5 rounded bg-[#006FCF] text-white font-black text-[9px] tracking-tighter">
                              AMEX
                            </span>
                          </div>
                        </div>

                        {/* Explicación Checkout Pro transparente */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Al confirmar tu pedido, se abrirá la plataforma de cobro seguro de <strong className="text-slate-800">Mercado Pago</strong> para pagar directamente con tu tarjeta, con cifrado bancario y protección al comprador.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Opción SPEI (Oculta si hay productos de importación que requieren solo tarjeta/Mercado Pago) */}
                  {!hasImportItemsInCart && (
                    <div
                      onClick={() => setPaymentMethod('spei')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                        paymentMethod === 'spei' ? 'border-[#0F3E36] bg-[#EDF5F7]/40' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentMethod === 'spei' ? 'border-[#0F3E36] bg-[#0F3E36]' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'spei' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-gray-900">Transferencia Bancaria SPEI</span>
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                            Sin comisión
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Transfiere desde tu app bancaria a nuestra cuenta oficial FoxDrop.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cuadro de datos SPEI */}
                  {!hasImportItemsInCart && paymentMethod === 'spei' && (
                    <div className="bg-[#0F3E36] text-white rounded-3xl p-6 space-y-4 shadow-md border border-emerald-950 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-white/15 pb-3">
                        <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
                          Datos Oficiales para Transferencia FoxDrop
                        </span>
                        <span className="text-sm font-black text-amber-400">
                          Monto exacto: ${cartTotal.toFixed(0)} MXN
                        </span>
                      </div>

                      <div className={`grid grid-cols-1 ${checkoutSettings.bankTransfer.showHolder !== false && checkoutSettings.bankTransfer.accountHolder ? 'sm:grid-cols-2' : ''} gap-4 text-xs`}>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <span className="text-white/60 block text-[11px]">Banco Destino:</span>
                          <span className="font-black text-sm text-white">{checkoutSettings.bankTransfer.bankName || 'BBVA México'}</span>
                        </div>
                        {checkoutSettings.bankTransfer.showHolder !== false && checkoutSettings.bankTransfer.accountHolder && (
                          <div className="bg-white/5 p-3 rounded-xl">
                            <span className="text-white/60 block text-[11px]">Beneficiario:</span>
                            <span className="font-black text-sm text-white truncate block">{checkoutSettings.bankTransfer.accountHolder}</span>
                          </div>
                        )}
                      </div>

                      {/* CLABE Interbancaria (si está habilitada para mostrarse) */}
                      {checkoutSettings.bankTransfer.showClabe !== false && checkoutSettings.bankTransfer.clabe && (
                        <div>
                          <div className="flex justify-between items-center mb-1 text-xs">
                            <span className="text-white/80 font-bold">CLABE Interbancaria (18 dígitos):</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator?.clipboard) {
                                  navigator.clipboard.writeText(checkoutSettings.bankTransfer.clabe);
                                  setClabeCopied(true);
                                  setTimeout(() => setClabeCopied(false), 3000);
                                }
                              }}
                              className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              {clabeCopied ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> ¡CLABE Copiada!
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="w-3.5 h-3.5" /> Copiar CLABE
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="bg-black/40 border border-white/15 rounded-2xl p-3 font-mono text-center font-black tracking-widest text-amber-300 text-base sm:text-lg">
                            {checkoutSettings.bankTransfer.clabe}
                          </div>
                        </div>
                      )}

                      {/* Número de Tarjeta / Cuenta (si está habilitada para mostrarse) */}
                      {checkoutSettings.bankTransfer.showCard !== false && checkoutSettings.bankTransfer.accountNumber && (
                        <div>
                          <div className="flex justify-between items-center mb-1 text-xs">
                            <span className="text-white/80 font-bold">Número de Tarjeta / Cuenta:</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator?.clipboard && checkoutSettings.bankTransfer.accountNumber) {
                                  navigator.clipboard.writeText(checkoutSettings.bankTransfer.accountNumber);
                                  setCardCopied(true);
                                  setTimeout(() => setCardCopied(false), 3000);
                                }
                              }}
                              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              {cardCopied ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> ¡Tarjeta Copiada!
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="w-3.5 h-3.5" /> Copiar Tarjeta
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="bg-black/40 border border-white/15 rounded-2xl p-3 font-mono text-center font-black tracking-widest text-emerald-300 text-base sm:text-lg">
                            {checkoutSettings.bankTransfer.accountNumber}
                          </div>
                        </div>
                      )}

                      {checkoutSettings.bankTransfer.notes && (
                        <p className="text-[11px] text-white/80 bg-white/5 p-3 rounded-xl leading-relaxed">
                          💡 {checkoutSettings.bankTransfer.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Opción Efectivo (Solo disponible para pedidos regulares de boutique, no para importación internacional) */}
                  {checkoutSettings.allowCashOnDelivery && !hasImportItemsInCart && (
                    <div
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                        paymentMethod === 'cash' ? 'border-[#0F3E36] bg-[#EDF5F7]/40' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentMethod === 'cash' ? 'border-[#0F3E36] bg-[#0F3E36]' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'cash' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-gray-900">Efectivo contra Entrega</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Paga en efectivo al recibir tu producto o en el punto de entrega acordado.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECCIÓN DE CUPÓN DE DESCUENTO */}
                <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-gray-200 space-y-2.5">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#DF7F2D]" />
                    <span>¿Tienes un cupón de descuento?</span>
                  </span>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-mono font-black text-emerald-800">{appliedCoupon.code}</span>
                          <span className="text-emerald-700 ml-2">({appliedCoupon.discountPercent}% OFF aplicado)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. FOXDROP10, BIENVENIDA"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider outline-none focus:border-[#DF7F2D]"
                      />
                      <button
                        type="submit"
                        className="bg-[#0F3E36] hover:bg-[#1A5248] text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
                      >
                        Aplicar
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-[11px] font-bold text-rose-600 animate-in fade-in">
                      ⚠️ {couponError}
                    </p>
                  )}
                </div>

                {/* Confirmación y Botón Final */}
                <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Artículos ({cartItemCount}): <strong className="text-gray-900">${cartSubtotal.toFixed(0)} MXN</strong></div>
                    {appliedCoupon && (
                      <div className="text-emerald-700 font-bold">
                        Cupón {appliedCoupon.code}: -${couponDiscountAmount.toFixed(0)} MXN
                      </div>
                    )}
                    <div>Entrega: <strong className="text-gray-900">{shippingFee === 0 ? <span className="text-emerald-600 font-black">Gratis</span> : `$${shippingFee.toFixed(0)} MXN`}</strong></div>
                    <div className="text-sm font-black text-gray-900 pt-1">
                      Total a pagar: <span className="text-2xl font-black text-[#DF7F2D]">${cartTotal.toFixed(0)} MXN</span>
                    </div>
                  </div>

                  {/* BOTÓN DE CONFIRMACIÓN CON LOADER Y ESTADO VISUAL CLARO */}
                  <div className="flex flex-col items-center sm:items-end select-none">
                    <button
                      type="button"
                      disabled={isSubmittingOrder || holdProgress >= 100}
                      onClick={() => {
                        if (!isSubmittingOrder) {
                          handleFinishOrder();
                        }
                      }}
                      onMouseDown={() => {
                        if (isSubmittingOrder) return;
                        setIsHolding(true);
                        setHoldProgress(0);
                        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                        const startTime = Date.now();
                        const duration = 1100;
                        holdIntervalRef.current = setInterval(() => {
                          const elapsed = Date.now() - startTime;
                          const progress = Math.min(100, Math.round((elapsed / duration) * 100));
                          setHoldProgress(progress);
                          if (progress >= 100) {
                            if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                            setIsHolding(false);
                            handleFinishOrder();
                          }
                        }, 25);
                      }}
                      onMouseUp={() => {
                        setIsHolding(false);
                        setHoldProgress(0);
                        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                      }}
                      onMouseLeave={() => {
                        setIsHolding(false);
                        setHoldProgress(0);
                        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                      }}
                      onTouchStart={() => {
                        if (isSubmittingOrder) return;
                        setIsHolding(true);
                        setHoldProgress(0);
                        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                        const startTime = Date.now();
                        const duration = 1100;
                        holdIntervalRef.current = setInterval(() => {
                          const elapsed = Date.now() - startTime;
                          const progress = Math.min(100, Math.round((elapsed / duration) * 100));
                          setHoldProgress(progress);
                          if (progress >= 100) {
                            if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                            setIsHolding(false);
                            handleFinishOrder();
                          }
                        }, 25);
                      }}
                      onTouchEnd={() => {
                        setIsHolding(false);
                        setHoldProgress(0);
                        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                      }}
                      className={`relative overflow-hidden w-full sm:w-auto text-white font-bold px-10 py-3.5 rounded-xl text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2 select-none tracking-tight ${
                        isSubmittingOrder || holdProgress >= 100
                          ? 'bg-[#1F62C7] opacity-90 cursor-wait'
                          : 'bg-[#3483FA] hover:bg-[#2968C8] cursor-pointer active:scale-98'
                      }`}
                    >
                      {/* Barra de progreso de llenado que crece hacia la derecha */}
                      <div
                        className="absolute inset-y-0 left-0 bg-[#1F62C7] transition-all ease-linear"
                        style={{ width: isSubmittingOrder ? '100%' : `${holdProgress}%` }}
                      />

                      {/* Contenido del botón */}
                      <span className="relative z-10 flex items-center gap-2 font-bold text-sm">
                        {isSubmittingOrder || holdProgress >= 100 ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>{paymentMethod === 'mercadopago' ? 'Conectando con Mercado Pago...' : 'Procesando tu pedido...'}</span>
                          </>
                        ) : isHolding ? (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                            <span>Confirmando...</span>
                          </>
                        ) : (
                          <>
                            <span>{paymentMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar Pedido'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </span>
                    </button>
                    {isSubmittingOrder && (
                      <p className="text-[11px] text-slate-500 font-medium mt-1.5 animate-pulse text-center sm:text-right">
                        Por favor espera un momento, no cierres esta ventana...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {/* PASO 3: COMPROBANTE DE COMPRA (DE LA TIENDA AL CLIENTE) */}
            {checkoutStep === 'success' && confirmedOrderSummary && (
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm space-y-8 animate-in fade-in">
                
                {/* Header del comprobante con Logo y Estatus */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                  <div className="space-y-1">
                    <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-1">
                      Comprobante de Pedido Realizado
                    </span>
                    <h2 className="text-2xl font-black text-gray-900">¡Gracias por tu compra, {user?.name || 'Cliente'}! 🦊</h2>
                    <p className="text-xs text-gray-500">
                      Hemos recibido los datos de tu orden y ya está registrada en el sistema de FoxDrop.
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-3 sm:px-4 rounded-2xl shrink-0">
                    <span className="text-[10px] text-gray-400 uppercase font-black block">Fecha del Pedido</span>
                    <span className="font-bold text-xs text-gray-800">{confirmedOrderSummary.date}</span>
                  </div>
                </div>

                {/* Resumen de Artículos Comprados */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Artículos en tu Pedido
                  </h3>

                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                    {confirmedOrderSummary.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white">
                        <div className="flex items-center gap-3">
                          {item.product.images?.[0] ? (
                            <img 
                              src={getSafeProductImage(item.product.images[0])} 
                              alt={item.product.title} 
                              className="w-12 h-12 object-contain bg-gray-50 rounded-xl p-1 border border-gray-200" 
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/no-image.svg';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-lg">📦</div>
                          )}
                          <div>
                            <p className="font-extrabold text-sm text-gray-900">{item.product.title}</p>
                            <p className="text-xs text-gray-500">
                              Cantidad: {item.quantity} • ${item.product.publicPrice.toFixed(0)} MXN c/u
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-sm text-gray-900">
                          ${(item.product.publicPrice * item.quantity).toFixed(0)} MXN
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desglose Económico y Método de Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Detalles de Entrega</span>
                    <div className="font-bold text-gray-900">{confirmedOrderSummary.shippingMethodName}</div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      {confirmedOrderSummary.shippingAddress}
                    </p>
                    {confirmedOrderSummary.isMixedCart && (
                      <div className="mt-2 pt-2 border-t border-gray-200/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <span>📦 Paquete 1 (Boutique):</span>
                          <span className="font-medium text-gray-700">Entrega rápida en 24 a 48 hrs</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                          <span>✈️ Paquete 2 (Internacional):</span>
                          <span className="font-medium text-gray-700">Guía internacional en 10 a 15 días hábiles</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Resumen Económico</span>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-bold">${confirmedOrderSummary.subtotal.toFixed(0)} MXN</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Envío / Entrega:</span>
                      <span className="font-bold">{confirmedOrderSummary.shippingFee === 0 ? <span className="text-emerald-700 font-black">Gratis</span> : `$${confirmedOrderSummary.shippingFee.toFixed(0)} MXN`}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total Pagado:</span>
                      <span className="text-[#DF7F2D] text-base">${confirmedOrderSummary.total.toFixed(0)} MXN</span>
                    </div>
                  </div>
                </div>

                {/* Si fue por transferencia SPEI, recordatorio de datos de pago */}
                {confirmedOrderSummary.paymentMethod === 'spei' && (
                  <div className="bg-[#0F3E36] text-white rounded-2xl p-5 space-y-3">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                      Datos para tu Transferencia Bancaria (${confirmedOrderSummary.total.toFixed(0)} MXN)
                    </span>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div>
                        <span className="text-white/60 block text-[10px]">Banco:</span>
                        <strong className="font-bold">{checkoutSettings.bankTransfer.bankName || 'BBVA México'}</strong>
                      </div>
                      {checkoutSettings.bankTransfer.showHolder !== false && checkoutSettings.bankTransfer.accountHolder && (
                        <div>
                          <span className="text-white/60 block text-[10px]">Beneficiario:</span>
                          <strong className="font-bold">{checkoutSettings.bankTransfer.accountHolder}</strong>
                        </div>
                      )}
                      {checkoutSettings.bankTransfer.showClabe !== false && checkoutSettings.bankTransfer.clabe && (
                        <div>
                          <span className="text-white/60 block text-[10px]">CLABE:</span>
                          <strong className="font-mono text-amber-300 font-bold">{checkoutSettings.bankTransfer.clabe}</strong>
                        </div>
                      )}
                      {checkoutSettings.bankTransfer.showCard !== false && checkoutSettings.bankTransfer.accountNumber && (
                        <div>
                          <span className="text-white/60 block text-[10px]">Tarjeta / Cuenta:</span>
                          <strong className="font-mono text-emerald-300 font-bold">{checkoutSettings.bankTransfer.accountNumber}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN: IR A SEGUIMIENTO DE PEDIDOS O SEGUIR EXPLORANDO */}
                <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setCurrentView('store');
                      setCheckoutStep('cart');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition cursor-pointer text-center"
                  >
                    Seguir explorando la tienda
                  </button>

                  <button
                    onClick={() => {
                      loadFullProfileData();
                      if (user) loadUserAccount(user.phone, user.email);
                      setAccountTab('orders');
                      setCurrentView('account');
                      setCheckoutStep('cart');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0F3E36] hover:bg-[#1A5248] text-white font-extrabold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <Package className="w-4 h-4 text-[#DF7F2D]" />
                    <span>Ir al Seguimiento de Mis Pedidos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      ) : null}


      {/* ======================================================== */}
      {/* 5. FOOTER UNIFICADO EN COLOR VERDE BOSQUE (#0F3E36) */}
      {/* ======================================================== */}
      {/* 5. FOOTER OFICIAL CORPORATIVO (AMAZON / MERCADO LIBRE STYLE) */}
      {/* ======================================================== */}
      <footer className="bg-[#0A2621] text-white mt-14 pt-12 pb-24 md:pb-8 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* COL 1: IDENTIDAD & MARCA */}
            <div className="space-y-3.5">
              <FoxDropLogo size="md" variant="dark" />
              <p className="text-white/70 text-xs leading-relaxed max-w-xs">
                Tu atajo al mundo. Curaduría y productos exclusivos de importación con inspección de calidad y envíos garantizados a todo México.
              </p>
              <div className="pt-1">
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '522221234567'}?text=${encodeURIComponent('Hola FoxDrop, tengo una duda sobre un producto.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold px-3 py-2 rounded-xl transition border border-emerald-500/30"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Atención directa por WhatsApp</span>
                </a>
              </div>
            </div>

            {/* COL 2: COMPRA & SERVICIOS */}
            <div className="space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-[#DF7F2D]">Catálogo & Servicios</h4>
              <ul className="space-y-2 text-white/75 text-xs">
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab('new');
                      setSelectedCategory('Todas');
                      const el = document.getElementById('catalog-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-white hover:underline transition text-left cursor-pointer"
                  >
                    Novedades e Importaciones
                  </button>
                </li>
                {dealsProducts.length > 0 && (
                  <li>
                    <button 
                      onClick={() => {
                        setActiveTab('deals');
                        setSelectedCategory('Todas');
                        const el = document.getElementById('catalog-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white hover:underline transition text-left cursor-pointer"
                    >
                      Ofertas & Descuentos
                    </button>
                  </li>
                )}
                <li>
                  <button 
                    onClick={() => setShowCustomOrderModal(true)}
                    className="hover:text-white hover:underline transition text-left cursor-pointer text-amber-300 font-semibold"
                  >
                    Encargos Especiales
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      if (!user) {
                        openAuthModal();
                      } else {
                        setAccountTab('club');
                        setCurrentView('account');
                      }
                    }}
                    className="hover:text-white hover:underline transition text-left cursor-pointer"
                  >
                    Club Fox Rewards
                  </button>
                </li>
              </ul>
            </div>

            {/* COL 3: ATENCIÓN & AYUDA */}
            <div className="space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-[#DF7F2D]">Ayuda & Garantías</h4>
              <ul className="space-y-2 text-white/75 text-xs">
                <li>
                  <button 
                    onClick={() => setInfoModal('envios')}
                    className="hover:text-white hover:underline transition text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Políticas de Envío</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModal('devoluciones')}
                    className="hover:text-white hover:underline transition text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Garantía y Devoluciones</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModal('privacidad')}
                    className="hover:text-white hover:underline transition text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Aviso de Privacidad</span>
                  </button>
                </li>
                <li>
                  <Link 
                    href="/terminos"
                    className="hover:text-white hover:underline transition text-left flex items-center gap-1.5"
                  >
                    <span>Términos y Condiciones</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* COL 4: PAGOS SEGUROS & CONFIANZA */}
            <div className="space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-[#DF7F2D]">Formas de Pago Seguras</h4>
              <p className="text-white/70 text-xs">
                Paga de forma protegida, inmediata y con confirmación digital:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Transferencia SPEI</span>
                    <span className="text-[10px] text-white/60">Acreditación instantánea 24/7 sin comisión</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Tarjetas de Débito & Crédito</span>
                    <span className="text-[10px] text-white/60">Disponible para importación internacional</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COPYRIGHT & SELLO DE SEGURIDAD */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/60 gap-4">
            <p>© 2026 FoxDrop. Todos los derechos reservados. Comercio electrónico seguro en México.</p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Conexión cifrada SSL & Compra 100% Protegida</span>
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
                    <p className="text-xs text-gray-400 font-medium">Entregas seguras y cobertura nacional</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-[#FAF6F0] p-4 rounded-2xl border border-gray-100">
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">📦 Envíos Nacionales e Internacionales:</strong>
                    Enviamos a cualquier código postal de la República Mexicana mediante paqueterías certificadas con número de rastreo oficial.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">💳 Medios de Pago Protegidos:</strong>
                    Aceptamos transferencias electrónicas SPEI con acreditación inmediata y pago con tarjetas bancarias de débito/crédito para pedidos de importación.
                  </p>
                  <p>
                    <strong className="text-gray-900 block font-bold mb-0.5">⏱️ Tiempos de Entrega:</strong>
                    Los pedidos de catálogo local se despachan en 24 a 48 horas hábiles. Los pedidos de importación directa tienen un tiempo de tránsito asegurado de 10 a 15 días hábiles.
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
      {selectedProduct && (() => {
        const isImportProd = (selectedProduct.sku && selectedProduct.sku.startsWith('CJ')) || (selectedProduct.brand && selectedProduct.brand.toLowerCase().includes('cj dropshipping'));
        const displayDescription = isImportProd 
          ? "Producto de importación directa a tu domicilio. Tiempo de entrega: 10 a 15 días hábiles." 
          : selectedProduct.description;
        const displayStock = isImportProd 
          ? Math.min(20, selectedProduct.stock > 0 ? selectedProduct.stock : 20) 
          : selectedProduct.stock;
        
        // Catálogo de recomendaciones cruzadas filtrado sin mezclar Boutique con Importación
        const relatedCatalog = isImportProd
          ? products.filter(p => (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')))
          : products.filter(p => !((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'))));
        const crossSellItems = getCrossSellRecommendations(selectedProduct, relatedCatalog, 2);

        return (
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
              {/* IMAGEN PRINCIPAL Y SELECTOR DE FOTOS MÚLTIPLES */}
              <div className="space-y-3">
                <div 
                  onMouseEnter={() => setIsZoomActive(true)}
                  onMouseLeave={() => setIsZoomActive(false)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setZoomCoords({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                  }}
                  className="aspect-square bg-slate-50 rounded-2xl p-4 flex items-center justify-center border border-gray-100 relative overflow-hidden cursor-crosshair group"
                >
                  <img
                    src={getSafeProductImage(selectedProduct.images?.[activeModalImageIndex] || selectedProduct.images?.[0])}
                    alt={selectedProduct.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/no-image.svg';
                    }}
                    style={isZoomActive ? {
                      transform: 'scale(2.2)',
                      transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`
                    } : {}}
                    className="max-h-full object-contain transition-transform duration-100 ease-out pointer-events-none select-none"
                  />
                  {selectedProduct.isCombo && (
                    <span className="absolute top-3 left-3 bg-[#E65F2B] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 z-10 pointer-events-none">
                      <Sparkles className="w-3 h-3" /> COMBO PROMOCIONAL
                    </span>
                  )}
                  {/* Pista visual de zoom */}
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full opacity-60 group-hover:opacity-100 transition pointer-events-none flex items-center gap-1">
                    <Search className="w-2.5 h-2.5" />
                    <span>Pasa el cursor para zoom</span>
                  </div>
                </div>

                {/* Miniaturas de galería si tiene más de 1 imagen */}
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {selectedProduct.images.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveModalImageIndex(i)}
                        className={`w-14 h-14 rounded-xl p-1 border-2 transition shrink-0 cursor-pointer ${
                          activeModalImageIndex === i ? 'border-[#E65F2B] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <img src={getSafeProductImage(imgUrl)} alt={`Foto ${i + 1}`} className="w-full h-full object-contain rounded-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.svg"; }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#E65F2B] uppercase font-bold tracking-wider">{selectedProduct.category}</span>
                    {selectedProduct.isCombo && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Precio especial todo incluido
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#1F2D3D] leading-snug mt-1">{selectedProduct.title}</h3>
                  
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">${selectedProduct.publicPrice.toFixed(0)} <span className="text-sm font-normal text-gray-400">MXN</span></span>
                    {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 ? (
                      <span className="text-xs text-gray-400 line-through">
                        ${(selectedProduct.publicPrice / (1 - (selectedProduct.discountPercent / 100))).toFixed(0)} MXN
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-600 mt-2.5 leading-relaxed border-t border-gray-100 pt-2.5">
                    {displayDescription}
                  </p>

                  {/* DESGLOSE DE PRODUCTOS INCLUIDOS EN ESTE COMBO */}
                  {selectedProduct.isCombo && selectedProduct.comboProductIds && selectedProduct.comboProductIds.length > 0 && (
                    <div className="mt-3 bg-orange-50/70 border border-orange-200 rounded-2xl p-3 space-y-2">
                      <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                        📦 Este combo incluye {selectedProduct.comboProductIds.length} artículos:
                      </span>
                      <div className="space-y-1.5">
                        {products
                          .filter(p => selectedProduct.comboProductIds?.includes(p.id))
                          .map(includedProd => (
                            <div key={includedProd.id} className="flex items-center justify-between bg-white/90 p-2 rounded-xl border border-orange-100 text-xs">
                              <div className="flex items-center gap-2">
                                <img src={includedProd.images[0] || '/file.svg'} alt={includedProd.title} className="w-7 h-7 object-contain rounded" />
                                <div>
                                  <span className="font-bold text-slate-800 block line-clamp-1">{includedProd.title}</span>
                                  <span className="text-[10px] text-slate-400 block">{includedProd.category}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                Incluido
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* CLUB FOXDROP PUNTOS */}
                  <div className="mt-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                    <Sparkles className="w-4 h-4 text-[#E65F2B] shrink-0" />
                    <span>Ganas <strong>+{calculateEarnedPoints(selectedProduct.publicPrice, clubSettings?.pesosPerPoint || 10)} {clubSettings?.currencySymbol || '⭐'} {clubSettings?.currencyName || 'puntos'}</strong> para tu <strong>Club Foxdrop</strong>.</span>
                  </div>

                  {/* DISPONIBILIDAD DE STOCK & BADGES */}
                  <div className="pt-2">
                    {displayStock <= 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Agotado temporalmente
                      </span>
                    ) : displayStock === 1 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                        ¡Última pieza disponible!
                      </span>
                    ) : displayStock <= 3 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        ¡Solo quedan {displayStock} piezas listas para entrega!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {displayStock} piezas listas para entrega
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* SELECTOR DE CANTIDAD A COMPRAR */}
                  {displayStock > 0 && (
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
                          onClick={() => setModalQuantity(prev => Math.min(displayStock, prev + 1))}
                          disabled={modalQuantity >= displayStock}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ESTRUCTURA VISUAL DE PASARELA DE PAGO: TARJETA DE CRÉDITO / DÉBITO O MERCADO PAGO */}
                  {isImportProd ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Métodos de Pago Aceptados:</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Pago 100% Seguro
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 shadow-2xs">💳 Tarjeta de Crédito</span>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 shadow-2xs">💳 Tarjeta de Débito</span>
                        <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 rounded text-sky-800 font-black shadow-2xs">⚡ Mercado Pago</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        * Los artículos de importación directa solo admiten pago con tarjeta o Mercado Pago para despacho inmediato.
                      </p>
                    </div>
                  ) : (
                    isPrivilegedPartner && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-slate-600">
                        <span className="font-bold flex items-center gap-1 text-slate-700">
                          💳 Pagos Seguros:
                        </span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Tarjetas</span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">OXXO</span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">SPEI</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800">⚡ Mercado Pago</span>
                        </div>
                      </div>
                    )
                  )}

                  {/* BOTÓN 1-CLIC: COMPRAR AHORA (ESTILO MERCADO LIBRE / AMAZON) */}
                  {displayStock > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProduct, undefined, modalQuantity);
                        setSelectedProduct(null);
                        handleCheckoutInit();
                      }}
                      className="w-full bg-[#0F3E36] hover:bg-[#154E45] active:scale-98 text-white font-black py-3 rounded-xl text-xs sm:text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Comprar Ahora • ${ (selectedProduct.publicPrice * modalQuantity).toFixed(0) } MXN</span>
                    </button>
                  )}

                  {/* BOTÓN AGREGAR AL CARRITO */}
                  <button
                    disabled={displayStock <= 0}
                    onClick={() => {
                      addToCart(selectedProduct, undefined, modalQuantity);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-[#E65F2B] hover:bg-[#D45321] active:scale-98 disabled:bg-gray-400 text-white font-black py-2.5 rounded-xl text-xs sm:text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {displayStock <= 0 
                        ? 'Agotado' 
                        : modalQuantity > 1 
                          ? `Agregar ${modalQuantity} al carrito` 
                          : 'Agregar al carrito'}
                    </span>
                  </button>

                  {/* FILA DE ACCIONES RÁPIDAS: WHATSAPP DIRECTO (SOLO BOUTIQUE) & COMPARTIR */}
                  <div className={`grid ${isImportProd ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-1`}>
                    {!isImportProd && (
                      <button
                        type="button"
                        onClick={() => {
                          const msg = `¡Hola FoxDrop! Me interesa comprar este artículo visto en su tienda:\n\n• *${selectedProduct.title}*\n• Cantidad: ${modalQuantity}\n• Precio: $${(selectedProduct.publicPrice * modalQuantity).toFixed(0)} MXN\n• Enlace: https://foxdrop.mx/tienda\n\n¿Tienen entrega o envío disponible en 24 a 48 hrs?`;
                          const whatsappNum = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
                          const waUrl = whatsappNum 
                            ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`
                            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                          window.open(waUrl, '_blank');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2 rounded-xl text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs truncate px-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="truncate">Pedir por WhatsApp</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tienda?id=${selectedProduct.id}` : 'https://foxdrop.mx/tienda';
                        const shareText = `¡Mira este producto en FoxDrop! ${selectedProduct.title} por solo $${selectedProduct.publicPrice} MXN:\n${shareUrl}`;
                        if (navigator.share) {
                          navigator.share({ title: selectedProduct.title, text: shareText, url: shareUrl }).catch(() => {});
                        } else if (navigator.clipboard) {
                          navigator.clipboard.writeText(shareText);
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2500);
                        }
                      }}
                      className="bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-800 font-bold py-2 rounded-xl text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200 truncate px-2"
                    >
                      {shareCopied ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> ¡Copiado!
                        </span>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-gray-500" />
                          <span>Compartir</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* RECOMENDACIONES DE PRODUCTOS RELACIONADOS (FILTRADOS SIN MEZCLAR CATÁLOGOS) */}
                  {crossSellItems.length > 0 && (
                    <div className="border-t border-gray-100 pt-2.5">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#E65F2B]" /> Te podría interesar:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {crossSellItems.map((rec) => (
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
        );
      })()}

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

            {/* Vista del Carrito en Drawer Lateral */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-gray-600">Tu carrito está vacío</p>
                  <p className="text-xs text-gray-400 mt-1">Explora los productos globales y encuéntralos aquí.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                        <img 
                          src={getSafeProductImage(item.product.images?.[0])} 
                          alt={item.product.title} 
                          className="w-14 h-14 object-contain bg-white rounded-lg p-1 border border-gray-200 shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/no-image.svg';
                          }}
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <p className="font-bold text-gray-800 line-clamp-1">{item.product.title}</p>
                          <p className="font-black text-gray-900 text-sm">${(item.product.publicPrice * item.quantity).toFixed(0)} MXN</p>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100 cursor-pointer">
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="font-bold text-gray-800">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100 cursor-pointer">
                              <Plus className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CÁLCULO DE AHORRO TOTAL EN CARRITO */}
                  {(() => {
                    const totalSavings = cart.reduce((acc, it) => {
                      if (it.product.discountPercent && it.product.discountPercent > 0) {
                        const originalPrice = it.product.publicPrice / (1 - (it.product.discountPercent / 100));
                        return acc + ((originalPrice - it.product.publicPrice) * it.quantity);
                      }
                      return acc;
                    }, 0);

                    return totalSavings > 0 ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold animate-in fade-in">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                          <span>¡Estás ahorrando en esta orden!</span>
                        </span>
                        <span className="text-emerald-700 font-black font-mono">
                          -${totalSavings.toFixed(0)} MXN
                        </span>
                      </div>
                    ) : null;
                  })()}

                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex justify-between text-base font-black text-gray-900">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(0)} MXN</span>
                    </div>

                    <button
                      onClick={handleCheckoutInit}
                      className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow cursor-pointer tracking-wide"
                    >
                      <span>Pagar</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

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
      {/* MODAL DETALLE Y SEGUIMIENTO COMPLETO DEL PEDIDO SELECCIONADO */}
      {/* ======================================================== */}
      {selectedOrderForDetail && (() => {
        const order = selectedOrderForDetail;
        const isCancelled = order.status === 'cancelled';
        const isDelivered = order.status === 'delivered';
        const isShipped = order.status === 'shipped';
        const isProcessing = order.status === 'processing';
        const isPending = order.status === 'pending';

        const orderNum = order.order_number || order.id;
        const waMsg = `Hola FoxDrop 🦊, deseo consultar el estado de mi pedido *${orderNum}* por un total de *${Number(order.total).toFixed(2)} MXN*.`;
        const waLink = `https://wa.me/522221234567?text=${encodeURIComponent(waMsg)}`;

        // Resolver items si vienen vacíos usando catálogo local
        const orderItems = (order.order_items && order.order_items.length > 0)
          ? order.order_items
          : (order.items || []);

        const isInternational = order.shipping_type === 'international_shipping' || 
                                (order.notes && (order.notes.includes('[IMPORTACION') || order.notes.includes('[CJ-ORDER:')));

        // Dirección limpia y formateada estilo Amazon/Mercado Libre
        const addr = typeof order.shipping_address === 'object' && order.shipping_address !== null ? order.shipping_address : {};
        const formattedAddress = [addr.street, addr.colonia, addr.city, addr.zip ? `C.P. ${addr.zip}` : ''].filter(Boolean).join(', ');

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 relative shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-slate-800">
              {/* Header limpio estilo Amazon / Mercado Libre */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 pr-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 tracking-tight">
                      Pedido {orderNum}
                    </span>
                    {isCancelled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Cancelado
                      </span>
                    ) : isDelivered ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Entregado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F3E36] border border-emerald-200">
                        En Preparación
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Comprado el {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForDetail(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner de Entrega / Estado estilo Mercado Libre */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0F3E36] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">
                      {isCancelled 
                        ? 'Este pedido fue cancelado' 
                        : isDelivered 
                        ? 'Paquete entregado' 
                        : isShipped 
                        ? 'Tu paquete está en camino' 
                        : isInternational
                        ? 'En preparación de despacho internacional'
                        : 'En preparación en tienda'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {isInternational ? 'Tiempo estimado de entrega: 10 a 15 días hábiles' : 'Entrega local: 24 a 48 horas'}
                    </p>
                  </div>
                </div>

                {formattedAddress && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Enviar a: <strong>{formattedAddress}</strong></span>
                  </div>
                )}
              </div>

              {/* Guía de Rastreo si ya cuenta con tracking */}
              {(order.tracking_number || order.trackingNumber) && (
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600" /> Número de Guía de Rastreo
                  </span>
                  <div className="bg-white p-2.5 rounded-xl border border-sky-200 flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-sky-900 tracking-wider">
                      {order.tracking_number || order.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const tr = order.tracking_number || order.trackingNumber;
                        if (navigator?.clipboard && tr) {
                          navigator.clipboard.writeText(tr);
                          alert("Número de guía copiado");
                        }
                      }}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg transition"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista limpia de Productos Comprados */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Artículos en el pedido ({orderItems.length})
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {orderItems.map((item: any, idx: number) => {
                    const cleanItemTitle = (item.product_title || "").trim().toLowerCase();
                    const matchedProduct = products.find(p => {
                      if (p.id && item.product_id && p.id === item.product_id) return true;
                      const pTitle = (p.title || "").trim().toLowerCase();
                      return pTitle === cleanItemTitle || (cleanItemTitle.length > 5 && pTitle.includes(cleanItemTitle));
                    });
                    const productImg = (item.product_image && !item.product_image.includes("no-image.svg"))
                      ? item.product_image
                      : (matchedProduct?.images?.[0] && !matchedProduct.images[0].includes("no-image.svg") ? matchedProduct.images[0] : '/no-image.svg');

                    return (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={productImg}
                              alt={item.product_title}
                              className="w-full h-full object-contain"
                              onError={(e: any) => { e.currentTarget.src = '/no-image.svg'; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate max-w-[220px] sm:max-w-xs">{item.product_title}</p>
                            <p className="text-[11px] text-slate-500">
                              Cantidad: {item.quantity} ud(s)
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            ${(Number(item.price_at_purchase) * item.quantity).toFixed(2)} MXN
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen Limpio de Pago */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Productos ({orderItems.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0)}):</span>
                  <span className="font-mono font-medium text-slate-800">${Number(order.subtotal || order.total).toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Envío:</span>
                  <span className="font-bold text-emerald-600">
                    {Number(order.shipping_cost) > 0 ? `${Number(order.shipping_cost).toFixed(2)} MXN` : 'Gratis'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Pagado:</span>
                  <span className="font-mono text-base text-[#DF7F2D]">${Number(order.total).toFixed(2)} MXN</span>
                </div>
              </div>

              {/* Acciones principales limpias */}
              <div className="space-y-2 pt-1">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingClientOrder(order);
                      setClientCancelReason('Encontré un mejor precio / Ya no lo necesito');
                      setClientCancelNotes('');
                      setShowClientCancelModal(true);
                    }}
                    className="w-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Ban className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                    <span>Cancelar este Pedido</span>
                  </button>
                )}

                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Ayuda con mi Pedido (WhatsApp)</span>
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 12. MODAL DE CANCELACIÓN DE PEDIDO ESTILO MERCADO LIBRE / AMAZON */}
      {/* ======================================================== */}
      {showClientCancelModal && cancellingClientOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border border-gray-100 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowClientCancelModal(false);
                setCancellingClientOrder(null);
                setClientCancelNotes('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 pr-6">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900">¿Deseas cancelar este pedido?</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {cancellingClientOrder.order_number || cancellingClientOrder.id}
                </p>
              </div>
            </div>

            {/* Resumen del Pedido a Cancelar */}
            <div className="bg-[#FAF6F0] p-3.5 rounded-2xl border border-gray-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Total a reembolsar / liberar</span>
                <span className="font-extrabold text-[#DF7F2D] text-sm">
                  ${Number(cancellingClientOrder.total).toFixed(2)} MXN
                </span>
              </div>
              <span className="text-gray-600 text-xs">
                {cancellingClientOrder.order_items?.length || 1} producto(s)
              </span>
            </div>

            {/* Formulario con motivos estándar de Amazon / Mercado Libre */}
            <form onSubmit={handleExecuteClientCancellation} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-800 font-bold block mb-1.5">
                  ¿Cuál es el motivo de la cancelación? *
                </label>
                <div className="space-y-2">
                  {[
                    'Encontré un mejor precio / Ya no lo necesito',
                    'El tiempo de entrega es muy largo',
                    'Me equivoqué de dirección o método de entrega',
                    'Compré por error / Duplicado',
                    'Prefiero cambiar de producto o modelo',
                    'Otro motivo personal',
                  ].map(option => (
                    <label
                      key={option}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                        clientCancelReason === option
                          ? 'border-[#0F3E36] bg-[#0F3E36]/5 text-[#0F3E36] font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="clientCancelReason"
                        value={option}
                        checked={clientCancelReason === option}
                        onChange={() => setClientCancelReason(option)}
                        className="text-[#0F3E36] focus:ring-[#0F3E36]"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 font-bold block mb-1">
                  Detalles adicionales (opcional):
                </label>
                <textarea
                  rows={2}
                  value={clientCancelNotes}
                  onChange={e => setClientCancelNotes(e.target.value)}
                  placeholder="Cuéntanos más si lo deseas para ayudarnos a mejorar..."
                  className="w-full bg-[#FAF6F0] border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-[#DF7F2D] text-xs resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
                ℹ️ Si ya realizaste transferencia por SPEI, el equipo administrativo de FoxDrop te contactará por WhatsApp para coordinar tu reembolso de inmediato.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowClientCancelModal(false);
                    setCancellingClientOrder(null);
                    setClientCancelNotes('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold transition cursor-pointer"
                >
                  Conservar Pedido
                </button>

                <button
                  type="submit"
                  disabled={clientCancellingLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-black px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {clientCancellingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Confirmar Cancelación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. BARRA DE NAVEGACIÓN MÓVIL INFERIOR NATIVA (ESTILO APP) */}
      {/* ======================================================== */}
      <nav 
        aria-label="Navegación inferior móvil"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden safe-area-bottom select-none"
      >
        <div className="grid grid-cols-4 items-center h-16 px-1">
          {/* BOTÓN EXPLORAR / INICIO */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              setCurrentView('store');
              setSelectedCategory('Todas');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 ${
              currentView === 'store'
                ? 'text-[#DF7F2D] font-bold'
                : 'text-gray-500 hover:text-[#0F3E36]'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentView === 'store' ? 'bg-[#FFF3E6]' : ''}`}>
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Catálogo</span>
          </button>

          {/* BOTÓN CLUB FOXDROP */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              if (!user) {
                openAuthModal();
              } else {
                setAccountTab('club');
                setCurrentView('account');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 ${
              currentView === 'account' && accountTab === 'club'
                ? 'text-[#DF7F2D] font-bold'
                : 'text-gray-500 hover:text-[#0F3E36]'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentView === 'account' && accountTab === 'club' ? 'bg-[#FFF3E6]' : ''}`}>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] tracking-tight">Club Fox</span>
          </button>

          {/* BOTÓN MI BOLSA / CARRITO CON BADGE FLOTANTE */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('medium'); } catch {}
              setIsCartOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 text-gray-500 hover:text-[#0F3E36] relative"
          >
            <div className="relative p-1 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#DF7F2D] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Mi Bolsa</span>
          </button>

          {/* BOTÓN MIS PEDIDOS / CUENTA */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              if (!user) {
                openAuthModal();
              } else {
                setAccountTab('orders');
                setCurrentView('account');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 ${
              currentView === 'account' && accountTab === 'orders'
                ? 'text-[#DF7F2D] font-bold'
                : 'text-gray-500 hover:text-[#0F3E36]'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentView === 'account' && accountTab === 'orders' ? 'bg-[#FFF3E6]' : ''}`}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">{user ? 'Pedidos' : 'Ingresar'}</span>
          </button>
        </div>
      </nav>

    </div>
  );
}

