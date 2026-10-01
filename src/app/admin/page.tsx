'use client';

import { useState, useEffect } from 'react';
import FoxDropLogo from '@/components/FoxDropLogo';
import MobileBarcodeScanner from '@/components/MobileBarcodeScanner';
import { 
  Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare, 
  Search, ShieldAlert, Sparkles, TrendingUp, Clock, CheckCircle2, User, RefreshCw, BarChart3, ChevronRight, X,
  Lock, LogOut, KeyRound, Upload, Check, ShieldCheck, FileText, Send, Eye, EyeOff, Edit3, Trash2, Ban,
  Users, Layers, Award, Phone, Mail, History, ExternalLink, QrCode, ShoppingBag, Receipt, Printer, Minus, Camera,
  Clipboard, Globe, Image as ImageIcon, Wand2, Download, Star, HeartHandshake, Save, Percent, Menu, CreditCard,
  Bell, BellRing, Volume2, VolumeX
} from 'lucide-react';
import { Product, Order, AbandonedCart, SpecialOrder, ImportBatch, ClientProfile, ClubFoxDropSettings, ClubFoxDropTier, LoyaltyMetrics, CheckoutSettings, ShippingMethodConfig } from '@/types';
import { getActiveProducts } from '@/lib/products';
import { 
  getLiveExchangeRate, createProductInDb, updateProductInDb, deleteProductInDb, 
  getImportBatches, createImportBatch, deleteImportBatch, getClientsWithMetrics,
  getCarouselSlides, createCarouselSlide, deleteCarouselSlide, CarouselSlide,
  fetchAdminCategories, createAdminCategory,
  getAdminAbandonedCarts, updateAdminAbandonedCart, deleteAdminAbandonedCart,
  getClubSettings, saveClubSettings, getLoyaltyMetrics
} from '@/lib/admin';
import { getCheckoutSettings, saveCheckoutSettings, DEFAULT_CHECKOUT_SETTINGS } from '@/lib/checkoutSettings';
import { getAdminOrders, getSpecialOrders, updateSpecialOrderStatus, updateOrderStatusInDb, deleteOrderInDb, createPhysicalSaleOrder, subscribeToAllOrders } from '@/lib/orders';
import { authenticateAdmin, updateAdminPassword, AdminSession } from '@/lib/adminAuth';
import { uploadProductImage, uploadProductImageUrl, generateProductImageWithAi } from '@/lib/storage';
import { getClubFoxDropTier, DEFAULT_CLUB_SETTINGS } from '@/lib/clubFoxdrop';
import { soundManager } from '@/lib/sounds';

export default function AdminCRM() {
  // Estado de Autenticación y Seguridad
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Modal obligatorio de cambio de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Navegación CRM
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'batches' | 'orders' | 'cancelled_orders' | 'clients' | 'special_orders' | 'finance' | 'carts' | 'carousel' | 'loyalty' | 'shipping_payments'>('inventory');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Datos principales
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [loadingCarts, setLoadingCarts] = useState(false);
  const [cartFilter, setCartFilter] = useState<'all' | 'pending' | 'followed'>('all');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientForModal, setSelectedClientForModal] = useState<ClientProfile | null>(null);

  // Configuración Club FoxDrop & Métricas de Fidelidad
  const [clubSettings, setClubSettings] = useState<ClubFoxDropSettings>(DEFAULT_CLUB_SETTINGS);
  const [savingClubSettings, setSavingClubSettings] = useState(false);
  const [clubSettingsSavedNotice, setClubSettingsSavedNotice] = useState(false);

  // Configuración de Envíos & Métodos de Pago
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings>(DEFAULT_CHECKOUT_SETTINGS);
  const [savingCheckoutSettings, setSavingCheckoutSettings] = useState(false);
  const [checkoutSettingsSavedNotice, setCheckoutSettingsSavedNotice] = useState(false);
  const [loyaltyMetrics, setLoyaltyMetrics] = useState<LoyaltyMetrics | null>(null);
  const [loadingLoyaltyMetrics, setLoadingLoyaltyMetrics] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [usdRate, setUsdRate] = useState(20.00);

  // Modal Alta / Edición de Producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Cosmética');
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customNewCategoryName, setCustomNewCategoryName] = useState('');
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);
  const [newCostUsd, setNewCostUsd] = useState(5.00);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [newPublicPrice, setNewPublicPrice] = useState(230.00);
  const [newStock, setNewStock] = useState(15);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Escáner de Cámara Móvil (Códigos de barra / QR)
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scannerContext, setScannerContext] = useState<'sku_input' | 'pos_sale'>('sku_input');

  // Sistema POS Móvil (Punto de Venta Físico para Celular)
  const [showPosModal, setShowPosModal] = useState(false);
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [posClientPhone, setPosClientPhone] = useState('');
  const [posClientName, setPosClientName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'spei'>('cash');
  const [posProcessing, setPosProcessing] = useState(false);
  const [posCompletedTicket, setPosCompletedTicket] = useState<{
    orderNumber: string;
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: 'cash' | 'card' | 'spei';
    clientPhone: string;
    clientName: string;
    pointsEarned: number;
    date: string;
  } | null>(null);

  // Modal Nuevo Lote de Importación
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchNameInput, setBatchNameInput] = useState('');
  const [batchShippingCostInput, setBatchShippingCostInput] = useState(500);
  const [batchUnitsInput, setBatchUnitsInput] = useState(25);
  const [batchNotesInput, setBatchNotesInput] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  // Estado del Carrusel Hero
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideImageUrl, setSlideImageUrl] = useState('');
  const [slideCtaText, setSlideCtaText] = useState('Ver Colección');
  const [slideCtaCategory, setSlideCtaCategory] = useState('Todas');
  const [savingSlide, setSavingSlide] = useState(false);

  // Modal Cancelación de Pedidos
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Notificaciones en Tiempo Real (Admin)
  const [adminRealtimeToast, setAdminRealtimeToast] = useState<{
    id: string;
    type: 'new_order' | 'status_update' | 'cancelled' | 'deleted';
    title: string;
    message: string;
    orderId?: string;
  } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Soporte PWA WebApp (Instalar aplicación en celular / escritorio)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // 1. Verificar sesión persistente y cargar tipo de cambio real inmediatamente al montar
  useEffect(() => {
    // Listener para instalación PWA (Web App)
    const handleBeforeInstallPrompt = (e: Event) => {
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
      alert("Para instalar FoxDrop en tu celular:\n\n• En Safari / iPhone: Toca el botón 'Compartir' y elige 'Agregar a pantalla de inicio'.\n• En Android / Chrome: Toca el menú (3 puntos) y elige 'Instalar aplicación'.");
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
    // Cargar tipo de cambio en tiempo real de inmediato
    getLiveExchangeRate().then(rate => {
      if (rate > 0) setUsdRate(rate);
    });

    try {
      const stored = localStorage.getItem('foxdrop_admin_session');
      if (stored) {
        const parsed: AdminSession = JSON.parse(stored);
        // Si el usuario ya había establecido su contraseña (guardada en local o server),
        // consultamos al servidor para asegurar si de verdad debe o no cambiar contraseña
        const localSavedPass = localStorage.getItem(`admin_pass_${parsed.email}`);
        if (localSavedPass && (localSavedPass !== 'FoxDrop2026!' && localSavedPass !== 'Foxdrop2026*')) {
          parsed.mustChangePassword = false;
        }
        setAdminSession(parsed);
        if (parsed.mustChangePassword) {
          setShowResetModal(true);
        }
      }
    } catch {
      localStorage.removeItem('foxdrop_admin_session');
    } finally {
      setAuthChecked(true);
    }
  }, []);


  // 2. Cargar datos del CRM cuando el admin está autenticado
  useEffect(() => {
    if (!adminSession) return;

    async function loadData() {
      // Tipo de cambio USD
      const rate = await getLiveExchangeRate();
      setUsdRate(rate);

      // Productos
      const dbProducts = await getActiveProducts();
      setProducts(dbProducts ?? []);

      // Pedidos
      const dbOrders = await getAdminOrders();
      if (dbOrders && dbOrders.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedOrders: Order[] = dbOrders.map((o: any) => ({
          id: o.order_number || o.id,
          clientName: o.client_name,
          clientPhone: o.client_phone,
          clientEmail: o.client_email,
          status: o.status || 'pending',
          shippingType: o.shipping_type || 'puebla_local',
          pickupPoint: o.pickup_point,
          subtotal: Number(o.subtotal) || 0,
          shippingCost: Number(o.shipping_cost) || 0,
          total: Number(o.total) || 0,
          trackingNumber: o.tracking_number,
          createdAt: o.created_at,
          itemsCount: o.order_items?.length || 1,
          notes: o.notes || undefined,
          order_items: o.order_items || [],
        }));
        setOrders(mappedOrders);
      } else {
        setOrders([]);
      }

      // Lotes de Importación
      const dbBatches = await getImportBatches();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedBatches: ImportBatch[] = (dbBatches ?? []).map((b: any) => ({
        id: b.id,
        batchName: b.batch_name,
        totalShippingCost: Number(b.total_shipping_cost),
        totalUnits: Number(b.total_units),
        costPerUnit: Number(b.cost_per_unit || (b.total_shipping_cost / b.total_units)),
        receivedAt: b.received_at,
        notes: b.notes,
      }));
      setBatches(mappedBatches);
      if (mappedBatches.length > 0) {
        setSelectedBatchId(mappedBatches[0].id);
      } else {
        setSelectedBatchId('');
      }

      // Clientes y métricas
      const dbClients = await getClientsWithMetrics();
      setClients(dbClients ?? []);

      // Encargos especiales
      const specials = await getSpecialOrders();
      setSpecialOrders(specials ?? []);

      // Slides del carrusel
      const dbSlides = await getCarouselSlides();
      setSlides(dbSlides);

      // Categorías del sistema desde Supabase
      const cats = await fetchAdminCategories();
      if (cats && cats.length > 0) {
        setDbCategories(cats);
        // Si la categoría seleccionada no existe aún, establecer a la primera
        if (!newCategory && cats[0]) {
          setNewCategory(cats[0].name);
        }
      }

      // Carritos abandonados
      const dbCarts = await getAdminAbandonedCarts();
      setAbandonedCarts(dbCarts ?? []);

      // Configuración dinámica Club Foxdrop
      const dbClub = await getClubSettings();
      if (dbClub) setClubSettings(dbClub);

      // Métricas de inversión en fidelidad
      const dbMetrics = await getLoyaltyMetrics();
      if (dbMetrics) setLoyaltyMetrics(dbMetrics);

      // Configuración de envíos y métodos de pago
      const dbCheckout = await getCheckoutSettings();
      if (dbCheckout) setCheckoutSettings(dbCheckout);
    }
    loadData();

    // ─────────────────────────────────────────────────────────
    // Suscripción Realtime a Pedidos para Notificaciones Inmediatas
    // ─────────────────────────────────────────────────────────
    const unsubscribe = subscribeToAllOrders((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'INSERT' && newRecord) {
        // Nuevo pedido recibido
        const formattedOrder: Order = {
          id: newRecord.order_number || newRecord.id,
          clientName: newRecord.client_name || 'Cliente FoxDrop',
          clientPhone: newRecord.client_phone || '',
          clientEmail: newRecord.client_email,
          status: newRecord.status || 'pending',
          shippingType: newRecord.shipping_type || 'puebla_local',
          pickupPoint: newRecord.pickup_point,
          subtotal: Number(newRecord.subtotal) || 0,
          shippingCost: Number(newRecord.shipping_cost) || 0,
          total: Number(newRecord.total) || 0,
          trackingNumber: newRecord.tracking_number,
          createdAt: newRecord.created_at || new Date().toISOString(),
          itemsCount: 1,
          notes: newRecord.notes,
          order_items: [],
        };

        // Recargar pedidos completos en segundo plano para traer los order_items
        getAdminOrders().then(freshOrders => {
          if (freshOrders && freshOrders.length > 0) {
            const mapped: Order[] = freshOrders.map((o: any) => ({
              id: o.order_number || o.id,
              clientName: o.client_name,
              clientPhone: o.client_phone,
              clientEmail: o.client_email,
              status: o.status || 'pending',
              shippingType: o.shipping_type || 'puebla_local',
              pickupPoint: o.pickup_point,
              subtotal: Number(o.subtotal) || 0,
              shippingCost: Number(o.shipping_cost) || 0,
              total: Number(o.total) || 0,
              trackingNumber: o.tracking_number,
              createdAt: o.created_at,
              itemsCount: o.order_items?.length || 1,
              notes: o.notes || undefined,
              order_items: o.order_items || [],
            }));
            setOrders(mapped);
          } else {
            setOrders(prev => [formattedOrder, ...prev.filter(o => o.id !== formattedOrder.id)]);
          }
        });

        // Reproducir sonido de caja registradora / venta
        if (audioEnabled) {
          soundManager.playOrderCreated();
        }

        // Mostrar notificación flotante interactiva
        setAdminRealtimeToast({
          id: `toast-${Date.now()}`,
          type: 'new_order',
          title: '¡Nueva Compra Recibida!',
          message: `${formattedOrder.clientName} ordenó $${formattedOrder.total.toLocaleString('es-MX')} MXN (${formattedOrder.id})`,
          orderId: formattedOrder.id,
        });

        // Notificación de escritorio del navegador si está permitido
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🛒 ¡Nueva compra en FoxDrop!', {
              body: `${formattedOrder.clientName} - Total: $${formattedOrder.total} MXN`,
              icon: '/icons/icon-192x192.png',
            });
          } catch {}
        }
      } else if (eventType === 'UPDATE' && newRecord) {
        // Estado o datos de pedido modificados (por cliente o repartidor)
        const orderId = newRecord.order_number || newRecord.id;
        const newStatus = newRecord.status;
        const isCancelled = newStatus === 'cancelled';

        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.id === newRecord.id || o.id === newRecord.order_number) {
            return {
              ...o,
              status: newRecord.status || o.status,
              notes: newRecord.notes !== undefined ? newRecord.notes : o.notes,
              trackingNumber: newRecord.tracking_number !== undefined ? newRecord.tracking_number : o.trackingNumber,
            };
          }
          return o;
        }));

        if (isCancelled) {
          if (audioEnabled) soundManager.playOrderCancelled();
          setAdminRealtimeToast({
            id: `toast-${Date.now()}`,
            type: 'cancelled',
            title: 'Pedido Cancelado',
            message: `El pedido ${orderId} fue marcado como cancelado. ${newRecord.notes ? `Motivo: ${newRecord.notes}` : ''}`,
            orderId,
          });
        } else {
          if (audioEnabled) soundManager.playStatusUpdated();
          setAdminRealtimeToast({
            id: `toast-${Date.now()}`,
            type: 'status_update',
            title: 'Estado de Pedido Actualizado',
            message: `El pedido ${orderId} cambió a: ${newStatus}`,
            orderId,
          });
        }
      } else if (eventType === 'DELETE' && oldRecord) {
        const delId = oldRecord.order_number || oldRecord.id;
        setOrders(prev => prev.filter(o => o.id !== delId && o.id !== oldRecord.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [adminSession, audioEnabled]);

  useEffect(() => {
    if (crmSubTab === 'carts') {
      getAdminAbandonedCarts().then(dbCarts => setAbandonedCarts(dbCarts ?? []));
    }
  }, [crmSubTab]);

  // Handle Login de Administrador
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await authenticateAdmin(loginEmail, loginPass);
      if (!result.success || !result.session) {
        setLoginError(result.error || 'Credenciales no autorizadas.');
        return;
      }

      setAdminSession(result.session);
      localStorage.setItem('foxdrop_admin_session', JSON.stringify(result.session));

      if (result.session.mustChangePassword) {
        setShowResetModal(true);
      }
    } catch {
      setLoginError('Ocurrió un error al verificar credenciales.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('foxdrop_admin_session');
    setAdminSession(null);
    setLoginPass('');
    setShowResetModal(false);
  };

  // Handle Cambio Obligatorio de Contraseña
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPasswordVal.length < 8) {
      setResetError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }
    if (newPasswordVal === 'FoxDrop2026!' || newPasswordVal === 'Foxdrop2026*') {
      setResetError('Por seguridad, no puedes reutilizar la contraseña temporal.');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }

    if (!adminSession?.email) return;

    setResetLoading(true);
    try {
      await updateAdminPassword(adminSession.email, newPasswordVal);
      const updatedSession: AdminSession = {
        ...adminSession,
        mustChangePassword: false,
      };
      setAdminSession(updatedSession);
      localStorage.setItem('foxdrop_admin_session', JSON.stringify(updatedSession));
      setResetSuccess(true);
      setNewPasswordVal('');
      setConfirmPasswordVal('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess(false);
      }, 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al actualizar contraseña.';
      setResetError(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  // ─── ACCIONES CARRITOS ABANDONADOS ─────────────────────────────────────────
  const handleToggleCartFollowedUp = async (cartId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setAbandonedCarts(prev => prev.map(c => c.id === cartId ? { ...c, followedUp: nextStatus } : c));
    await updateAdminAbandonedCart(cartId, nextStatus);
  };

  const handleDeleteCart = async (cartId: string) => {
    if (!confirm('¿Deseas eliminar este carrito abandonado?')) return;
    setAbandonedCarts(prev => prev.filter(c => c.id !== cartId));
    await deleteAdminAbandonedCart(cartId);
  };

  const handleRefreshCarts = async () => {
    setLoadingCarts(true);
    const updated = await getAdminAbandonedCarts();
    setAbandonedCarts(updated);
    setLoadingCarts(false);
  };

  // ─── ACCIONES PROGRAMA CLUB FOXDROP & MÉTRICAS ─────────────────────────────
  const handleSaveClubSettings = async () => {
    setSavingClubSettings(true);
    setClubSettingsSavedNotice(false);
    const success = await saveClubSettings(clubSettings);
    setSavingClubSettings(false);
    if (success) {
      setClubSettingsSavedNotice(true);
      setTimeout(() => setClubSettingsSavedNotice(false), 3500);
      handleRefreshLoyaltyMetrics();
    } else {
      alert('Error al guardar la configuración del club. Verifica tu conexión.');
    }
  };

  const handleResetClubSettings = () => {
    if (confirm('¿Restablecer la configuración del Club FoxDrop a los valores iniciales ($10 MXN = 1 Estrella)?')) {
      setClubSettings(DEFAULT_CLUB_SETTINGS);
    }
  };

  const handleRefreshLoyaltyMetrics = async () => {
    setLoadingLoyaltyMetrics(true);
    const metrics = await getLoyaltyMetrics();
    setLoadingLoyaltyMetrics(false);
  };

  // ─── ACCIONES ENVÍOS & MÉTODOS DE PAGO ──────────────────────────────────────
  const handleSaveCheckoutSettings = async () => {
    setSavingCheckoutSettings(true);
    setCheckoutSettingsSavedNotice(false);
    const success = await saveCheckoutSettings(checkoutSettings);
    setSavingCheckoutSettings(false);
    if (success) {
      setCheckoutSettingsSavedNotice(true);
      setTimeout(() => setCheckoutSettingsSavedNotice(false), 3500);
    } else {
      alert('Error al guardar la configuración de envíos y pagos.');
    }
  };

  const handleAddShippingMethod = () => {
    const newMethod: ShippingMethodConfig = {
      id: `shipping_${Date.now()}`,
      name: 'Nuevo método de entrega',
      description: 'Detalles de entrega para el cliente',
      price: 0,
      requiresAddress: true,
      enabled: true,
    };
    setCheckoutSettings(prev => ({
      ...prev,
      shippingMethods: [...prev.shippingMethods, newMethod],
    }));
  };

  const handleRemoveShippingMethod = (id: string) => {
    if (checkoutSettings.shippingMethods.length <= 1) {
      alert('Debe existir al menos un método de entrega configurado.');
      return;
    }
    setCheckoutSettings(prev => ({
      ...prev,
      shippingMethods: prev.shippingMethods.filter(m => m.id !== id),
    }));
  };

  const handleUpdateShippingMethod = (id: string, updates: Partial<ShippingMethodConfig>) => {
    setCheckoutSettings(prev => ({
      ...prev,
      shippingMethods: prev.shippingMethods.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  };

  // Procesar archivo de imagen (desde input file o desde evento de pegado)
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor proporciona un formato de imagen válido.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen no debe superar los 8MB.');
      return;
    }

    setUploadingImage(true);
    setUploadSuccess(false);
    try {
      const publicUrl = await uploadProductImage(file);
      setNewImageUrl(publicUrl);
      setUploadSuccess(true);
    } catch (err) {
      console.error('Error al subir imagen:', err);
      // Fallback local en memoria
      const reader = new FileReader();
      reader.onload = () => {
        setNewImageUrl(reader.result as string);
        setUploadSuccess(true);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Subida de Imagen a Supabase Storage (Archivo local)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  // Pegar imagen directamente desde el portapapeles (Ctrl+V o botón)
  const handlePasteImage = async (e?: React.ClipboardEvent) => {
    // Si viene de un evento onPaste nativo
    if (e && e.clipboardData) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processImageFile(file);
            return;
          }
        }
      }

      // Si pegó una URL de imagen de texto
      const text = e.clipboardData.getData('text');
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
        e.preventDefault();
        setUploadingImage(true);
        setUploadSuccess(false);
        try {
          const uploadedUrl = await uploadProductImageUrl(text.trim());
          setNewImageUrl(uploadedUrl);
          setUploadSuccess(true);
        } catch {
          setNewImageUrl(text.trim());
          setUploadSuccess(true);
        } finally {
          setUploadingImage(false);
        }
        return;
      }
    }

    // Si se invoca desde el botón "Pegar Imagen" usando la Clipboard API
    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        setUploadingImage(true);
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `pasted-${Date.now()}.${imageType.split('/')[1] || 'png'}`, { type: imageType });
            await processImageFile(file);
            return;
          }
        }

        // Si en el portapapeles hay texto (ej. URL copiada de Google)
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
          const uploadedUrl = await uploadProductImageUrl(text.trim());
          setNewImageUrl(uploadedUrl);
          setUploadSuccess(true);
          return;
        }

        alert('No se detectó ninguna imagen ni enlace en el portapapeles. Copia una imagen primero (Clic derecho -> Copiar imagen).');
      } catch (clipErr) {
        console.warn('Clipboard read permission denied or unsupported:', clipErr);
        const promptUrl = prompt('Pega aquí el enlace directo de la imagen (URL):');
        if (promptUrl && promptUrl.trim()) {
          setUploadingImage(true);
          try {
            const uploaded = await uploadProductImageUrl(promptUrl.trim());
            setNewImageUrl(uploaded);
            setUploadSuccess(true);
          } catch {
            setNewImageUrl(promptUrl.trim());
            setUploadSuccess(true);
          }
        }
      } finally {
        setUploadingImage(false);
      }
    } else {
      alert('Tu navegador no soporta lectura directa del portapapeles. Usa el atajo Ctrl+V o pega el enlace en la caja.');
    }
  };

  // Abrir búsqueda de imágenes en Google para el artículo
  const handleSearchImageOnGoogle = () => {
    const query = newTitle.trim() || newSku.trim() || 'producto';
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Generar / Homogeneizar Fotografía de Catálogo con IA
  const handleGenerateAiImage = async () => {
    if (!newTitle.trim()) {
      alert('Por favor escribe primero el nombre o título del producto arriba.');
      return;
    }

    setGeneratingAiImage(true);
    setUploadSuccess(false);
    try {
      // Si el usuario ya pegó o tiene una foto en newImageUrl, la pasamos para que la IA la tome como base real
      const generatedUrl = await generateProductImageWithAi(newTitle.trim(), newCategory, newImageUrl || undefined);
      setNewImageUrl(generatedUrl);
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('Error al procesar imagen con IA:', err);
      alert('No se pudo procesar la imagen con IA en este momento. Puedes usar "Buscar en Google" o pegar una imagen.');
    } finally {
      setGeneratingAiImage(false);
    }
  };

  // Cálculo automático según Lote seleccionado
  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0] || {
    id: 'custom',
    batchName: 'Lote Genérico',
    costPerUnit: 20.0
  };

  const costMxn = newCostUsd * usdRate;
  const shippingPerUnit = currentBatch.costPerUnit || 20.0;
  const totalCostUnitMxn = costMxn + shippingPerUnit;
  const profitUnit = newPublicPrice - totalCostUnitMxn;
  const marginPercent = newPublicPrice > 0 ? (profitUnit / newPublicPrice) * 100 : 0;

  // Filtrado de productos
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInventoryUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalInvestment = products.reduce((acc, p) => acc + ((p.totalCostMxn || 0) * (p.stock || 0)), 0);
  const totalExpectedRevenue = products.reduce((acc, p) => acc + ((p.publicPrice || 0) * (p.stock || 0)), 0);
  const totalExpectedProfit = totalExpectedRevenue - totalInvestment;
  const avgMargin = totalExpectedRevenue > 0 ? (totalExpectedProfit / totalExpectedRevenue) * 100 : 0;

  // Finanzas Reales de Pedidos Concretados/Entregados
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'processing' || o.status === 'shipped');
  const realizedRevenue = completedOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  // Costo real de los artículos vendidos
  const realizedCost = completedOrders.reduce((acc, o) => {
    if (o.order_items && o.order_items.length > 0) {
      const itemsCost = o.order_items.reduce((sum: number, it: any) => sum + (Number(it.cost_at_purchase || 0) * Number(it.quantity || 1)), 0);
      return acc + itemsCost;
    }
    return acc;
  }, 0);
  const realizedProfit = realizedRevenue > 0 ? realizedRevenue - realizedCost : 0;
  const realizedMargin = realizedRevenue > 0 ? (realizedProfit / realizedRevenue) * 100 : 0;

  // Abrir Modal para Editar Producto
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setNewTitle(prod.title);
    setNewSku(prod.sku || '');
    setNewCategory(prod.category || 'Electrónica');
    setNewCostUsd(prod.baseCostUsd || 5.0);
    setNewPublicPrice(prod.publicPrice);
    setNewStock(prod.stock);
    setNewImageUrl(prod.images[0] || '');
    if (prod.batchId) setSelectedBatchId(prod.batchId);
    setShowAddModal(true);
  };

  // Abrir Modal para Crear Producto Nuevo
  const handleOpenCreateProduct = () => {
    setEditingProductId(null);
    setNewTitle('');
    setNewSku('');
    setNewCategory('Electrónica');
    setNewCostUsd(5.00);
    setNewPublicPrice(230.00);
    setNewStock(15);
    setNewImageUrl('');
    setShowAddModal(true);
  };

  // Guardar Alta o Edición de Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingProductId) {
        // EDICIÓN
        await updateProductInDb(editingProductId, {
          title: newTitle,
          sku: newSku.trim() || undefined,
          categoryName: newCategory,
          baseCostUsd: newCostUsd,
          baseCostMxn: costMxn,
          shippingCostAllocated: shippingPerUnit,
          publicPrice: newPublicPrice,
          stock: newStock,
          imageUrl: newImageUrl,
        });

        setProducts(prev => prev.map(p => {
          if (p.id === editingProductId) {
            return {
              ...p,
              title: newTitle,
              sku: newSku.trim() || p.sku,
              category: newCategory,
              baseCostUsd: newCostUsd,
              baseCostMxn: costMxn,
              shippingCostAllocated: shippingPerUnit,
              totalCostMxn: totalCostUnitMxn,
              publicPrice: newPublicPrice,
              profitUnit,
              marginPercent,
              stock: newStock,
              batchId: currentBatch.id,
              batchName: currentBatch.batchName,
              images: newImageUrl ? [newImageUrl] : p.images,
            };
          }
          return p;
        }));
      } else {
        // ALTA NUEVA
        await createProductInDb({
          title: newTitle,
          sku: newSku.trim() || undefined,
          categoryName: newCategory,
          baseCostUsd: newCostUsd,
          baseCostMxn: costMxn,
          shippingCostAllocated: shippingPerUnit,
          publicPrice: newPublicPrice,
          stock: newStock,
          imageUrl: newImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80',
        });

        const updatedProducts = await getActiveProducts();
        if (updatedProducts && updatedProducts.length > 0) {
          setProducts(updatedProducts);
        }
      }

      // Actualizar lista persistente de categorías en vivo
      const refreshedCats = await fetchAdminCategories();
      if (refreshedCats && refreshedCats.length > 0) {
        setDbCategories(refreshedCats);
      }
    } catch (err: any) {
      console.error("Fallo al guardar en base de datos:", err);
      alert(`Error al guardar en la base de datos: ${err.message || 'Intenta de nuevo'}`);
      return;
    } finally {
      setIsSaving(false);
      setShowAddModal(false);
      setEditingProductId(null);
      setNewTitle('');
      setNewImageUrl('');
      setUploadSuccess(false);
    }
  };

  // Eliminar Producto
  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${title}" del catálogo permanentemente?`)) return;

    try {
      await deleteProductInDb(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error("Fallo al eliminar producto:", err);
      alert(`Error al eliminar de la base de datos: ${err.message || 'Intente nuevamente'}`);
    }
  };

  // Crear Lote de Importación
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNameInput.trim() || batchUnitsInput <= 0) return;

    setSavingBatch(true);
    const costPerUnitCalc = batchShippingCostInput / batchUnitsInput;
    const newBatchObj: ImportBatch = {
      id: `batch-${Date.now()}`,
      batchName: batchNameInput,
      totalShippingCost: batchShippingCostInput,
      totalUnits: batchUnitsInput,
      costPerUnit: costPerUnitCalc,
      receivedAt: new Date().toISOString().split('T')[0],
      notes: batchNotesInput,
    };

    try {
      const created = await createImportBatch({
        batchName: batchNameInput,
        totalShippingCost: batchShippingCostInput,
        totalUnits: batchUnitsInput,
        notes: batchNotesInput,
      });
      if (created) {
        newBatchObj.id = created.id;
        newBatchObj.costPerUnit = Number(created.cost_per_unit || costPerUnitCalc);
      }
      setBatches([newBatchObj, ...batches]);
      setSelectedBatchId(newBatchObj.id);
      setShowBatchModal(false);
      setBatchNameInput('');
      setBatchNotesInput('');
    } catch (err: any) {
      console.error("Error al crear lote en base de datos:", err);
      alert(`Error al guardar el lote en la base de datos: ${err.message || 'Intente de nuevo'}`);
    } finally {
      setSavingBatch(false);
    }
  };

  // Eliminar Lote de Importación
  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${batchName}"?`)) return;

    setBatches(prev => prev.filter(b => b.id !== batchId));
    if (selectedBatchId === batchId && batches.length > 1) {
      const remaining = batches.filter(b => b.id !== batchId);
      setSelectedBatchId(remaining[0]?.id || '');
    }

    try {
      await deleteImportBatch(batchId);
    } catch (err) {
      console.warn("Lote eliminado localmente:", err);
    }
  };


  // Crear Slide del Carrusel
  const handleCreateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim() || !slideImageUrl.trim()) return;
    setSavingSlide(true);
    try {
      const created = await createCarouselSlide({
        title: slideTitle,
        subtitle: slideSubtitle,
        image_url: slideImageUrl,
        cta_text: slideCtaText,
        cta_category: slideCtaCategory,
        sort_order: slides.length + 1,
      });
      setSlides(prev => [...prev, created]);
      setShowSlideModal(false);
      setSlideTitle(''); setSlideSubtitle(''); setSlideImageUrl('');
      setSlideCtaText('Ver Colección'); setSlideCtaCategory('Todas');
    } catch (err) {
      console.error('Error al crear slide:', err);
    } finally {
      setSavingSlide(false);
    }
  };

  // Eliminar Slide del Carrusel
  const handleDeleteSlide = async (id: string) => {
    if (!confirm('¿Eliminar este slide del carrusel?')) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    try {
      await deleteCarouselSlide(id);
    } catch (err) {
      console.error('Error al eliminar slide:', err);
    }
  };

  // Actualizar Estado de Pedido (o Cancelarlo)
  const updateOrderStatus = async (orderId: string, newStatus: Order['status'], notes?: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, ...(notes !== undefined ? { notes } : {}) } : o));

    try {
      await updateOrderStatusInDb(orderId, newStatus, notes);
      if (targetOrder?.clientPhone) {
        fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status_update",
            orderNumber: targetOrder.id,
            clientName: targetOrder.clientName,
            clientPhone: targetOrder.clientPhone,
            newStatus,
          }),
        }).catch(e => console.warn("WhatsApp status update error:", e));
      }
    } catch (err) {
      console.warn("No se pudo actualizar estado en Supabase, manteniéndose en memoria:", err);
    }
  };

  // Confirmar Cancelación con Motivo Obligatorio
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrderId || !cancellationReason.trim()) return;

    setCancellingLoading(true);
    try {
      await updateOrderStatus(cancellingOrderId, 'cancelled', cancellationReason.trim());
      setShowCancelModal(false);
      setCancellingOrderId(null);
      setCancellationReason('');
    } catch (err) {
      console.error("Error al cancelar orden:", err);
      alert("No se pudo registrar la cancelación. Intenta de nuevo.");
    } finally {
      setCancellingLoading(false);
    }
  };

  // Eliminar Pedido Definitivamente de la Base de Datos
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`¿Eliminar definitivamente el pedido ${orderId}? Esta acción borrará el pedido de la base de datos de inmediato.`)) return;

    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await deleteOrderInDb(orderId);
    } catch (err) {
      console.error("Error al eliminar pedido:", err);
      alert("No se pudo eliminar el pedido en la base de datos.");
    }
  };

  // Actualizar Estado de Encargo Especial
  const handleUpdateSpecialStatus = async (id: string, newStatus: string) => {
    setSpecialOrders(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as SpecialOrder['status'] } : s));
    await updateSpecialOrderStatus(id, newStatus);
  };

  // Controlador de Escaneo con Cámara
  const handleBarcodeScanSuccess = (decodedText: string) => {
    setShowCameraScanner(false);
    const code = decodedText.trim();

    if (scannerContext === 'sku_input') {
      setNewSku(code);
      // Si el código ya coincide con algún producto existente, sugerir autocompletar título
      const matched = products.find(p => p.sku === code || p.id === code);
      if (matched && !newTitle) {
        setNewTitle(matched.title);
      }
    } else if (scannerContext === 'pos_sale') {
      // Buscar producto por SKU o ID o título
      const matched = products.find(
        p => p.sku.toLowerCase() === code.toLowerCase() || p.id === code
      );

      if (matched) {
        handleAddToCartPos(matched);
      } else {
        alert(`Código "${code}" no encontrado en el catálogo de FoxDrop. Verifica el inventario o agrégalo con el botón correspondiente.`);
      }
    }
  };

  // Carrito de POS Móvil
  const handleAddToCartPos = (prod: Product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stock) {
          alert(`No hay más stock disponible de ${prod.title} (Stock actual: ${prod.stock})`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        if (prod.stock <= 0) {
          alert(`¡El producto "${prod.title}" no tiene stock disponible!`);
          return prev;
        }
        return [...prev, { product: prod, quantity: 1 }];
      }
    });
  };

  const handleUpdateCartPosQty = (prodId: string, delta: number) => {
    setPosCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === prodId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              alert(`Stock máximo disponible alcanzado (${item.product.stock})`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const posTotal = posCart.reduce((acc, item) => acc + (item.product.publicPrice * item.quantity), 0);
  const posPointsEarned = Math.floor(posTotal / (clubSettings.pesosPerPoint || 10));

  // Cliente detectado en tiempo real según el teléfono tecleado en el POS
  const posDetectedClient = posClientPhone.trim() ? clients.find(c => {
    const cleanInput = posClientPhone.replace(/[^0-9]/g, '');
    const cleanClientPhone = c.phone.replace(/[^0-9]/g, '');
    return cleanInput && cleanClientPhone.includes(cleanInput);
  }) : null;

  // Confirmar Venta POS y descontar stock
  const handleConfirmPosSale = async () => {
    if (posCart.length === 0) {
      alert('Agrega al menos un producto al ticket.');
      return;
    }

    setPosProcessing(true);
    try {
      const cleanPhone = posClientPhone.trim() || 'Mostrador';
      const cleanName = posClientName.trim() || posDetectedClient?.name || 'Cliente en Tienda';

      const saleResult = await createPhysicalSaleOrder({
        clientName: cleanName,
        clientPhone: cleanPhone,
        items: posCart,
        total: posTotal,
        paymentMethod: posPaymentMethod,
      });

      // Descontar inventario localmente
      setProducts(prev => {
        return prev.map(prod => {
          const cartItem = posCart.find(ci => ci.product.id === prod.id);
          if (cartItem) {
            return {
              ...prod,
              stock: Math.max(0, prod.stock - cartItem.quantity),
            };
          }
          return prod;
        });
      });

      // Recargar clientes y pedidos
      const [updatedOrders, updatedClients] = await Promise.all([
        getAdminOrders(),
        getClientsWithMetrics(),
      ]);
      if (updatedOrders.length > 0) setOrders(updatedOrders);
      if (updatedClients.length > 0) setClients(updatedClients);

      // Guardar ticket completado para mostrar modal
      setPosCompletedTicket({
        orderNumber: saleResult.orderNumber,
        items: [...posCart],
        total: posTotal,
        paymentMethod: posPaymentMethod,
        clientPhone: cleanPhone,
        clientName: cleanName,
        pointsEarned: posPointsEarned,
        date: saleResult.date,
      });

      // Limpiar carrito
      setPosCart([]);
      setPosClientPhone('');
      setPosClientName('');
      setShowPosModal(false);
    } catch (err) {
      console.error('Error al procesar venta física POS:', err);
      alert('Ocurrió un error al procesar la venta. Intenta nuevamente.');
    } finally {
      setPosProcessing(false);
    }
  };

  const sendWhatsAppTicket = (ticket: NonNullable<typeof posCompletedTicket>) => {
    const methodNames: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta Débito/Crédito',
      spei: 'Transferencia SPEI',
    };

    const itemsSummary = ticket.items
      .map(item => `• ${item.quantity}x ${item.product.title} - $${(item.product.publicPrice * item.quantity).toFixed(2)} MXN`)
      .join('\n');

    const msg = `🦊 *TICKET DE COMPRA FOXDROP PUEBLA*
━━━━━━━━━━━━━━━━━━━━
📄 *Orden:* ${ticket.orderNumber}
📅 *Fecha:* ${new Date(ticket.date).toLocaleDateString()} ${new Date(ticket.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
👤 *Cliente:* ${ticket.clientName}
📱 *Tel:* ${ticket.clientPhone}

🛍️ *Detalle de Productos:*
${itemsSummary}

💳 *Forma de Pago:* ${methodNames[ticket.paymentMethod] || ticket.paymentMethod}
💰 *TOTAL PAGADO:* $${ticket.total.toFixed(2)} MXN
⭐ *Puntos Club Ganados:* +${ticket.pointsEarned} pts

✨ *¡Tus puntos están acreditados!*
Cuando ingreses a nuestra tienda en línea con este número de celular, podrás ver todo tu historial y saldo de puntos Club FoxDrop.

¡Gracias por tu compra en FoxDrop Puebla! 🦊🔥
https://foxdrop.com.mx`;

    sendWhatsAppNotification(ticket.clientPhone, msg);
  };

  const sendWhatsAppNotification = (phone: string, text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
  };

  // Pedidos activos (excluyendo cancelados del panel principal)
  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  // Pedidos cancelados (historial separado)
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  // Esperar a que se revise el localStorage para evitar parpadeos
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#1F2D3D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E65F2B]"></div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA DE LOGIN MINIMALISTA Y ELEGANTE DEL CRM FOXDROP
  // =========================================================================
  if (!adminSession) {
    return (
      <div className="min-h-screen bg-[#1F2D3D] flex flex-col items-center justify-center p-4 selection:bg-[#E65F2B] selection:text-white">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <FoxDropLogo size="lg" />
            <div className="text-center pt-2">
              <span className="bg-[#2D4A58] text-white text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full">
                Acceso Administrativo
              </span>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Panel seguro de gestión e inventario
              </p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="ejemplo@correo.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold py-3 rounded-lg text-sm transition shadow flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="border-t border-gray-100 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conexión cifrada TLS & Lista Blanca Activa</span>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD PRINCIPAL DEL CRM ADMIN
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#222E3C] flex font-sans selection:bg-[#E65F2B] selection:text-white relative">
      
      {/* ======================================================== */}
      {/* MODAL OBLIGATORIO DE ACTUALIZACIÓN DE CONTRASEÑA */}
      {/* ======================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border-t-4 border-[#E65F2B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#E65F2B] shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Actualización de Contraseña
                </h3>
                <p className="text-xs text-gray-500">
                  Por seguridad institucional, debes establecer tu contraseña personal antes de continuar.
                </p>
              </div>
            </div>

            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>¡Contraseña actualizada con éxito! Entrando al panel...</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Nueva Contraseña (mínimo 8 caracteres):
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={newPasswordVal}
                    onChange={e => setNewPasswordVal(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Confirmar Nueva Contraseña:
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Repite la contraseña"
                  value={confirmPasswordVal}
                  onChange={e => setConfirmPasswordVal(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={resetLoading || resetSuccess}
                  className="w-full bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg transition shadow"
                >
                  {resetLoading ? 'Guardando...' : 'Establecer Mi Contraseña y Acceder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BACKDROP PARA MÓVIL */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* MENÚ LATERAL (SIDEBAR) ELEGANTE & LIMPIO */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#18252E] text-slate-300 flex flex-col z-50 shrink-0 transition-transform duration-200 ease-in-out border-r border-slate-800 ${
        mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Cabecera del Menú Lateral */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <FoxDropLogo size="sm" showTagline={true} />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block bg-[#E65F2B]/20 text-[#E65F2B] text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border border-[#E65F2B]/30">
                PANEL ADMIN
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listado de Navegación con Categorías */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 text-xs scrollbar-thin">
          {/* GRUPO 1: CATÁLOGO */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Catálogo & Logística
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => { setCrmSubTab('inventory'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'inventory' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" /> Inventario
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'inventory' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {products.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('batches'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'batches' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-orange-300" /> Lotes de Flete
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'batches' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {batches.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('carousel'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'carousel' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-300" /> Carrusel Hero
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'carousel' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {slides.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('shipping_payments'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'shipping_payments' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-400" /> Envíos & Pagos
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  crmSubTab === 'shipping_payments' ? 'bg-black/20 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                }`}>
                  Config
                </span>
              </button>
            </div>
          </div>

          {/* GRUPO 2: VENTAS & PEDIDOS */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Ventas & Pedidos
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => { setCrmSubTab('orders'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'orders' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4" /> Pedidos Activos
                </span>
                {activeOrders.length > 0 ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black">
                    {activeOrders.length}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    0
                  </span>
                )}
              </button>

              <button
                onClick={() => { setCrmSubTab('cancelled_orders'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'cancelled_orders' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Ban className="w-4 h-4 text-red-400" /> Cancelados
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'cancelled_orders' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {cancelledOrders.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('special_orders'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'special_orders' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-amber-300" /> Encargos
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'special_orders' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {specialOrders.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('carts'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'carts' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Carritos
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'carts'
                    ? 'bg-black/20 text-white'
                    : abandonedCarts.filter(c => !c.followedUp).length > 0
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {abandonedCarts.length}
                </span>
              </button>
            </div>
          </div>

          {/* GRUPO 3: CLIENTES & LEALTAD */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Clientes & Lealtad
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => { setCrmSubTab('clients'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'clients' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-300" /> Clientes
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'clients' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {clients.length}
                </span>
              </button>

              <button
                onClick={() => { setCrmSubTab('loyalty'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'loyalty' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-400" /> Club & Fidelidad
                </span>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                  {clubSettings.currencySymbol}
                </span>
              </button>
            </div>
          </div>

          {/* GRUPO 4: FINANZAS */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Finanzas
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => { setCrmSubTab('finance'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'finance' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" /> Utilidad & Margen
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2.5">
          <button
            onClick={() => {
              setShowPosModal(true);
              setMobileSidebarOpen(false);
            }}
            className="w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Punto de Venta POS</span>
          </button>

          <div className="flex items-center justify-between pt-1 text-slate-400 text-[11px] px-1">
            <div className="truncate max-w-[170px]">
              <span className="block text-white font-bold truncate">{adminSession?.email?.split('@')[0]}</span>
              <span className="block text-[10px] text-slate-400 truncate">{adminSession?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO (HEADER SUPERIOR + MAIN) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER SUPERIOR */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-2xs">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                title="Abrir menú lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                  {crmSubTab === 'inventory' && 'Inventario de Productos'}
                  {crmSubTab === 'batches' && 'Lotes de Importación'}
                  {crmSubTab === 'orders' && 'Pedidos Activos'}
                  {crmSubTab === 'cancelled_orders' && 'Pedidos Cancelados'}
                  {crmSubTab === 'special_orders' && 'Encargos Especiales'}
                  {crmSubTab === 'carts' && 'Carritos Abandonados'}
                  {crmSubTab === 'clients' && 'Directorio de Clientes'}
                  {crmSubTab === 'loyalty' && 'Club FoxDrop & Fidelidad'}
                  {crmSubTab === 'finance' && 'Margen de Utilidad & Finanzas'}
                  {crmSubTab === 'carousel' && 'Carrusel Hero de la Tienda'}
                  {crmSubTab === 'shipping_payments' && 'Configuración de Envíos & Pagos (SPEI)'}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {crmSubTab === 'inventory' && 'Catálogo, costos base, precios de venta y existencias'}
                  {crmSubTab === 'batches' && 'Prorrateo de fletes internacionales y costeo unitario'}
                  {crmSubTab === 'orders' && 'Monitoreo de órdenes, estados de pago y guías de envío'}
                  {crmSubTab === 'cancelled_orders' && 'Historial de cancelaciones y motivos reportados'}
                  {crmSubTab === 'special_orders' && 'Cotizaciones y solicitudes a medida de clientes'}
                  {crmSubTab === 'carts' && 'Bolsas pendientes y recuperación directa por WhatsApp'}
                  {crmSubTab === 'clients' && 'Perfiles, puntos acumulados y compras conectadas'}
                  {crmSubTab === 'loyalty' && 'Configuración de estrellas por peso, niveles e inversión'}
                  {crmSubTab === 'finance' && 'Rendimiento financiero y márgenes de ganancia'}
                  {crmSubTab === 'carousel' && 'Banners destacados y colecciones visuales'}
                  {crmSubTab === 'shipping_payments' && 'Edita métodos de entrega, costos y datos bancarios para transferencia'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={async () => {
                  const r = await getLiveExchangeRate();
                  setUsdRate(r);
                }}
                title="Click para actualizar tipo de cambio oficial"
                className="hidden sm:flex items-center space-x-1.5 bg-orange-50/80 hover:bg-orange-100 border border-orange-200 rounded-lg px-2.5 py-1 text-xs text-orange-950 font-medium transition cursor-pointer"
              >
                <span className="text-orange-700 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  USD/MXN:
                </span>
                <span className="font-extrabold text-[#E65F2B]">${usdRate.toFixed(2)}</span>
                <RefreshCw className="w-3 h-3 text-orange-600 hover:rotate-180 transition-transform duration-300" />
              </button>

              {/* Indicador Realtime y Sonido de Alertas */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                title={audioEnabled ? "Alertas de audio activadas (click para silenciar)" : "Alertas de audio silenciadas (click para activar)"}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                  audioEnabled 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <div className="relative">
                  <span className={`w-2 h-2 rounded-full block ${audioEnabled ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                  <span className={`w-2 h-2 rounded-full block absolute inset-0 ${audioEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                </div>
                {audioEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 hidden sm:inline" />
                    <span className="hidden sm:inline">En Vivo</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-gray-500 hidden sm:inline" />
                    <span className="hidden sm:inline">Silenciado</span>
                  </>
                )}
              </button>

              <button
                onClick={handleInstallApp}
                title="Instalar FoxDrop en Celular o Escritorio"
                className="hidden lg:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instalar App</span>
              </button>

              <a
                href="/tienda"
                target="_blank"
                className="bg-[#2D4A58] hover:bg-[#203641] text-white font-bold text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition flex items-center gap-1 shadow-2xs"
              >
                <span className="hidden sm:inline">Ver Tienda</span>
                <span className="sm:hidden text-xs">Tienda</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* BANNER FLOTANTE DE NOTIFICACIÓN EN TIEMPO REAL */}
          {adminRealtimeToast && (
            <div className="bg-gradient-to-r from-slate-900 to-[#0F3E36] text-white px-4 py-2.5 shadow-lg border-b border-white/10 flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  adminRealtimeToast.type === 'new_order' ? 'bg-emerald-500 text-white animate-bounce' :
                  adminRealtimeToast.type === 'cancelled' ? 'bg-rose-500 text-white' : 'bg-[#DF7F2D] text-white'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-extrabold block text-amber-300">{adminRealtimeToast.title}</span>
                  <span className="text-white/90">{adminRealtimeToast.message}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCrmSubTab('orders');
                    setAdminRealtimeToast(null);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer"
                >
                  Ver Pedidos
                </button>
                <button
                  onClick={() => setAdminRealtimeToast(null)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-6 space-y-6">

        {/* 1. SECCIÓN INVENTARIO & GESTIÓN DE ARTÍCULOS */}
        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Control de Inventario y Edición</h2>
                <p className="text-xs text-slate-500">Administra, edita precios/stock o elimina artículos del catálogo.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar SKU, título..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 w-48 sm:w-64"
                  />
                </div>
                <button
                  onClick={handleOpenCreateProduct}
                  className="bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Dar de Alta Artículo
                </button>
                {products.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm("¿Deseas vaciar TODO el inventario actual de la base de datos para comenzar desde cero? Esta acción no se puede deshacer.")) return;
                      try {
                        const res = await fetch("/api/admin", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "delete_all_mock_products" }),
                        });
                        if (res.ok) {
                          setProducts([]);
                          alert("Inventario vaciado por completo con éxito.");
                        } else {
                          const err = await res.json();
                          alert(`Error: ${err.error}`);
                        }
                      } catch (err: any) {
                        alert(`Error: ${err.message}`);
                      }
                    }}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-200"
                    title="Vaciar inventario y empezar en blanco"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vaciar Todo
                  </button>
                )}
              </div>
            </div>

            {/* TABLA DE PRODUCTOS (DESKTOP) Y TARJETAS TÁCTILES (MÓVIL) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {/* VISTA DESKTOP (TABLA COMPLETA) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Artículo</th>
                      <th className="py-3 px-4">Lote / Flete</th>
                      <th className="py-3 px-4 font-black text-slate-900">Costo Total</th>
                      <th className="py-3 px-4 text-emerald-600 font-black">Precio Venta</th>
                      <th className="py-3 px-4 text-emerald-700">Utilidad</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[200px]">{p.title}</span>
                              <span className="text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-orange-50 text-[#E65F2B] border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold block truncate max-w-[130px]">
                            {p.batchName || 'Lote 1 (+Flete)'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">+${p.shippingCostAllocated.toFixed(2)} flete</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">${p.totalCostMxn.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-700 bg-emerald-50/50">${p.publicPrice.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                          +${p.profitUnit.toFixed(2)} <span className="text-[10px] text-slate-400">({p.marginPercent.toFixed(0)}%)</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            p.stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 font-black'
                          }`}>
                            {p.stock} pzas
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Editar artículo"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.title)}
                              title="Eliminar artículo"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL OPTIMIZADA (TARJETAS INTUITIVAS TIPO APP) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No se encontraron productos coincidentes.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={p.images[0]} 
                          alt="" 
                          className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                              {p.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                              p.stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 font-black'
                            }`}>
                              {p.stock} {p.stock === 1 ? 'pza' : 'pzas'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {p.sku || 'Sin SKU'} • <span className="font-semibold text-slate-600">{p.category}</span>
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="bg-orange-50 text-[#E65F2B] border border-orange-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {p.batchName || 'Lote 1'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              +${p.shippingCostAllocated.toFixed(0)} flete
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas financieras del producto */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Costo</span>
                          <span className="text-xs font-mono font-black text-slate-700">${p.totalCostMxn.toFixed(0)}</span>
                        </div>
                        <div className="border-x border-slate-200">
                          <span className="text-[9px] text-emerald-600 font-bold block uppercase">Venta</span>
                          <span className="text-xs font-mono font-black text-emerald-700">${p.publicPrice.toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-emerald-600 font-bold block uppercase">Ganancia</span>
                          <span className="text-xs font-mono font-black text-emerald-600">+${p.profitUnit.toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Botones de acción móvil */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 border border-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. SECCIÓN LOTES DE IMPORTACIÓN & PRORRATEO CENTRALIZADO */}
        {crmSubTab === 'batches' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Lotes de Importación y Prorrateo</h2>
                <p className="text-xs text-slate-500">
                  Calcula el flete por fuera: registra cada remesa de mercancía y el sistema asigna el costo unitario exacto.
                </p>
              </div>

              <button
                onClick={() => setShowBatchModal(true)}
                className="bg-[#2D4A58] hover:bg-[#203641] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo Lote de Importación
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(batch => {
                const productsInBatch = products.filter(p => p.batchId === batch.id || p.batchName === batch.batchName);
                const totalUnitsStock = productsInBatch.reduce((sum, p) => sum + p.stock, 0);

                return (
                  <div key={batch.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Folio: {batch.id}
                        </span>
                        <h3 className="font-extrabold text-sm text-gray-900 mt-1">{batch.batchName}</h3>
                        <p className="text-[11px] text-gray-400">Recibido: {batch.receivedAt}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                          title="Eliminar este lote de importación"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Layers className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Costo total de flete:</span>
                        <span className="font-bold text-gray-900">${batch.totalShippingCost.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Unidades adquiridas:</span>
                        <span className="font-bold text-gray-900">{batch.totalUnits} piezas</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-orange-700 font-bold">Flete por unidad asignado:</span>
                        <span className="font-black text-orange-600">+${batch.costPerUnit.toFixed(2)} MXN</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Artículos asociados: <strong>{productsInBatch.length}</strong></span>
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                        {totalUnitsStock} unidades en stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. SECCIÓN PEDIDOS ACTIVOS */}
        {crmSubTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Seguimiento de Pedidos Activos</h2>
              <p className="text-xs text-slate-500">Actualiza estados o cancela pedidos para enviarlos al historial de cancelados.</p>
            </div>

            {activeOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
                No hay pedidos activos pendientes por procesar.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {order.status === 'delivered' ? '✓ Entregado' : order.status === 'shipped' ? '🚚 En Camino' : '⏳ En Preparación'}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium">{order.clientName} • <span className="text-slate-500">{order.clientPhone}</span></p>
                      <p className="text-slate-500 text-[11px]">Tipo de envío: {order.shippingType === 'puebla_local' ? 'Local Puebla' : 'Nacional'}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Total</span>
                        <span className="text-base font-black text-slate-900">${order.total.toFixed(2)} MXN</span>
                      </div>

                      <select
                        value={order.status}
                        onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="processing">En Preparación</option>
                        <option value="shipped">En Camino</option>
                        <option value="delivered">Entregado</option>
                      </select>

                      <button
                        onClick={() => {
                          setCancellingOrderId(order.id);
                          setCancellationReason('');
                          setShowCancelModal(true);
                        }}
                        title="Cancelar pedido y registrar motivo"
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition text-xs border border-red-200"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancelar
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Eliminar pedido permanentemente de la base de datos"
                        className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 font-bold p-1.5 rounded-lg flex items-center transition text-xs border border-slate-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => sendWhatsAppNotification(
                          order.clientPhone, 
                          `Hola ${order.clientName}, te informamos que tu pedido ${order.id} se encuentra: ${order.status.toUpperCase()}. Si deseas acordar los detalles de entrega, estamos a tu disposición.`
                        )}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Notificar WA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SECCIÓN PEDIDOS CANCELADOS (HISTORIAL SEPARADO) */}
        {crmSubTab === 'cancelled_orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Historial de Pedidos Cancelados</h2>
              <p className="text-xs text-slate-500">Pedidos dados de baja con su motivo de cancelación registrado.</p>
            </div>

            {cancelledOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
                No hay pedidos cancelados en el registro.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {cancelledOrders.map(order => (
                  <div key={order.id} className="bg-white border border-red-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm opacity-90 hover:opacity-100 transition">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{order.id}</span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">
                          Cancelado
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium">{order.clientName} • <span className="text-slate-500">{order.clientPhone}</span></p>
                      <p className="text-slate-400 text-[11px]">Fecha original: {new Date(order.createdAt).toLocaleDateString()}</p>
                      
                      {/* Motivo de Cancelación */}
                      <div className="bg-red-50/70 border border-red-100 rounded-xl p-2.5 text-xs text-red-900 mt-2">
                        <span className="font-bold text-red-800 block text-[11px] mb-0.5 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-red-600 inline" /> Motivo de la cancelación:
                        </span>
                        <p className="text-red-700 italic">
                          {order.notes ? order.notes : 'Cancelado por administración sin motivo especificado.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Monto Cancelado</span>
                        <span className="text-base font-black text-gray-500 line-through">${order.total.toFixed(2)} MXN</span>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'pending')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Restaurar Pedido
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Eliminar pedido permanentemente de la base de datos"
                        className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold p-1.5 rounded-lg flex items-center transition text-xs border border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. SECCIÓN CLIENTES & CLUB FOXDROP */}
        {crmSubTab === 'clients' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Directorio de Clientes & Club Foxdrop</h2>
              <p className="text-xs text-slate-500">
                Consulta los clientes registrados, sus puntos acumulados, nivel de lealtad y el historial de compras conectado.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4">Nivel Club</th>
                      <th className="py-3 px-4">Puntos Foxdrop</th>
                      <th className="py-3 px-4">Pedidos Realizados</th>
                      <th className="py-3 px-4">Total Comprado</th>
                      <th className="py-3 px-4 text-right">Seguimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map(client => {
                      const tier = getClubFoxDropTier(client.loyaltyPoints || 0, clubSettings.tiers);
                      return (
                        <tr key={client.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#2D4A58] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{client.name}</span>
                                <span className="text-[10px] text-slate-400 capitalize">{client.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="text-slate-800">{client.phone}</div>
                            <div className="text-slate-400 text-[10px]">{client.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span>{tier.badge}</span> {tier.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-[#E65F2B] text-sm">
                            {client.loyaltyPoints} pts
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {client.ordersCount} compras
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                            ${client.totalSpent?.toFixed(2)} MXN
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedClientForModal(client)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded text-xs transition flex items-center gap-1"
                              >
                                <History className="w-3.5 h-3.5" /> Ver Pedidos
                              </button>
                              <button
                                onClick={() => sendWhatsAppNotification(
                                  client.phone,
                                  `Hola ${client.name}! Te saludamos de FoxDrop Puebla. Como miembro de ${tier.name} en el Club Foxdrop, cuentas con atención prioritaria para tus pedidos.`
                                )}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded transition"
                                title="Contactar por WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. SECCIÓN ENCARGOS ESPECIALES */}
        {crmSubTab === 'special_orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Encargos Especiales de Clientes</h2>
              <p className="text-xs text-slate-500">Solicitudes de artículos internacionales solicitados desde la tienda.</p>
            </div>

            {specialOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
                No hay encargos especiales registrados por el momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {specialOrders.map(special => (
                  <div key={special.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{special.client_name || 'Cliente FoxDrop'}</span>
                        <span className="text-slate-500 font-mono text-[11px]">• {special.client_phone}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          special.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          special.status === 'quoted' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {special.status}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        &quot;{special.description}&quot;
                      </p>
                      <span className="text-[10px] text-gray-400 block">
                        Registrado: {new Date(special.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <select
                        value={special.status}
                        onChange={e => handleUpdateSpecialStatus(special.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="quoted">Cotizado</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="rejected">Rechazado</option>
                      </select>

                      <button
                        onClick={() => sendWhatsAppNotification(
                          special.client_phone,
                          `Hola ${special.client_name || ''}! Te contactamos de FoxDrop sobre tu encargo especial "${special.description}". Ya tenemos la cotización y tiempo de entrega disponible.`
                        )}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Cotizar por WA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. SECCIÓN FINANZAS */}
        {crmSubTab === 'finance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Balance Financiero & Utilidades Reales</h2>
              <p className="text-xs text-slate-500">Métricas calculadas directamente de tus pedidos en curso y stock activo (arrancan en 0 si no hay operaciones).</p>
            </div>

            {/* Bloque 1: Ventas y Utilidades Concretadas */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                💰 Ventas Realizadas (Pedidos En Preparación, Camino y Entregados)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Ingresos Totales</span>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">${realizedRevenue.toFixed(2)} MXN</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block truncate">{completedOrders.length} pedido(s) activos</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Costo Mercancía</span>
                  <p className="text-lg sm:text-2xl font-black text-slate-600 mt-1">${realizedCost.toFixed(2)} MXN</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block truncate">Costo base + importación</span>
                </div>
                <div className="bg-white border border-emerald-100 bg-emerald-50/20 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-emerald-700 text-[11px] sm:text-xs font-semibold">Utilidad Neta Real</span>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">
                    {realizedProfit >= 0 ? `+$${realizedProfit.toFixed(2)}` : `-$${Math.abs(realizedProfit).toFixed(2)}`} MXN
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block truncate">Ganancia efectiva</span>
                </div>
                <div className="bg-white border border-orange-100 bg-orange-50/20 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-[#E65F2B] text-[11px] sm:text-xs font-semibold">Margen Real</span>
                  <p className="text-lg sm:text-2xl font-black text-[#E65F2B] mt-1">{realizedMargin.toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Retorno sobre venta</span>
                </div>
              </div>
            </div>

            {/* Bloque 2: Proyección de Inventario en Almacén */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                📦 Inventario en Almacén (Proyección del Catálogo Activo)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Inversión en Stock</span>
                  <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">${totalInvestment.toFixed(2)} MXN</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block truncate">{totalInventoryUnits} piezas en bodega</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Ventas Proyectadas</span>
                  <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">${totalExpectedRevenue.toFixed(2)} MXN</p>
                  <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-bold truncate">
                    <ArrowUpRight className="w-3 h-3" /> Al 100% de venta
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Ganancia Proyectada</span>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">+${totalExpectedProfit.toFixed(2)} MXN</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block truncate">Utilidad estimada</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-xs">
                  <span className="text-gray-500 text-[11px] sm:text-xs font-semibold">Margen Catálogo</span>
                  <p className="text-lg sm:text-2xl font-black text-[#E65F2B] mt-1">{avgMargin.toFixed(1)}%</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block truncate">Rendimiento ponderado</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-700" /> Prorrateo Automático de Envíos
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al recibir una remesa o caja con múltiples productos, ingresas el costo total del flete pagado y la cantidad de unidades en la pestaña <strong>Lotes de Flete</strong>. 
                El sistema divide el costo equitativamente y lo añade al costo base de cada pieza, protegiendo siempre tu margen de beneficio.
              </p>
            </div>
          </div>
        )}

        {/* 8. SECCIÓN CARRITOS INACTIVOS & RECUPERACIÓN */}
        {crmSubTab === 'carts' && (() => {
          const totalPendingCarts = abandonedCarts.filter(c => !c.followedUp).length;
          const totalFollowedCarts = abandonedCarts.filter(c => c.followedUp).length;
          const totalCartsValue = abandonedCarts.reduce((acc, c) => acc + (Number(c.total) || 0), 0);
          const filteredCarts = abandonedCarts.filter(c => {
            if (cartFilter === 'pending') return !c.followedUp;
            if (cartFilter === 'followed') return c.followedUp;
            return true;
          });

          return (
            <div className="space-y-6">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Carritos Abandonados & Recuperación
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supervisa bolsas de compra no concretadas, contacta al cliente vía WhatsApp con 1 clic y ofrécele el cupón de rescate (5% OFF).
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={handleRefreshCarts}
                    disabled={loadingCarts}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                    title="Actualizar listado"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCarts ? 'animate-spin text-[#E65F2B]' : ''}`} />
                    Actualizar
                  </button>
                </div>
              </div>

              {/* KPI Cards Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Carritos Totales
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{abandonedCarts.length}</span>
                    <span className="text-xs text-slate-500 font-medium">registrados</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Venta en Riesgo
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-600">${totalCartsValue.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 font-medium">MXN</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estatus de Seguimiento
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      {totalPendingCarts} pendientes
                    </span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                      {totalFollowedCarts} contactados
                    </span>
                  </div>
                </div>
              </div>

              {/* Filtros de Pestaña */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setCartFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    cartFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Todos ({abandonedCarts.length})
                </button>
                <button
                  onClick={() => setCartFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    cartFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pendientes ({totalPendingCarts})
                </button>
                <button
                  onClick={() => setCartFilter('followed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    cartFilter === 'followed'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Contactados ({totalFollowedCarts})
                </button>
              </div>

              {/* Listado de Carritos */}
              {filteredCarts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 shadow-2xs">
                  <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 opacity-60" />
                  <p className="font-bold text-slate-700 text-sm">No hay carritos abandonados en esta vista</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cuando un cliente navega en la tienda e ingresa artículos con su teléfono o sesión activa sin concluir el pedido, se registrará aquí en tiempo real.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleRefreshCarts}
                      disabled={loadingCarts}
                      className="px-4 py-2 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCarts ? 'animate-spin' : ''}`} /> Actualizar Carritos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCarts.map(cart => {
                    const cleanPhone = (cart.clientPhone || '').replace(/[^0-9]/g, '');
                    const waMessage = `Hola ${cart.clientName || 'Cliente'}, te saludamos de FoxDrop Puebla 🦊✨. Notamos que dejaste artículos seleccionados en tu bolsa de compra. Te ofrecemos un cupón especial del 5% de descuento con el código *DESC5* y envío preferencial para completar tu orden hoy. ¿Te gustaría que te asista a finalizarla?`;
                    const waUrl = cleanPhone ? `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(waMessage)}` : '#';

                    return (
                      <div
                        key={cart.id}
                        className={`bg-white border rounded-2xl p-5 shadow-2xs transition hover:shadow-sm ${
                          cart.followedUp ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Datos del Cliente y Tiempo */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">{cart.clientName || 'Cliente Invitado'}</span>
                              {cart.followedUp ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Contactado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3 text-amber-600" /> Pendiente de Rescate
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              {cart.clientPhone && (
                                <a
                                  href={`tel:${cart.clientPhone}`}
                                  className="inline-flex items-center gap-1 text-slate-700 hover:text-[#E65F2B] font-medium"
                                >
                                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {cart.clientPhone}
                                </a>
                              )}
                              {cart.clientEmail && (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {cart.clientEmail}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                Última actividad: {new Date(cart.lastActive).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>

                          {/* Total y Acciones Directas */}
                          <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
                            <div className="text-right">
                              <span className="text-xs text-slate-400 block font-medium">Valor en Bolsa</span>
                              <span className="text-lg font-black text-slate-900">${cart.total.toFixed(2)} MXN</span>
                            </div>

                            {cleanPhone && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if (!cart.followedUp) handleToggleCartFollowedUp(cart.id, false);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-2xs"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Contactar WA (Cupón 5%)
                              </a>
                            )}

                            <button
                              onClick={() => handleToggleCartFollowedUp(cart.id, cart.followedUp)}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                                cart.followedUp
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              }`}
                              title={cart.followedUp ? 'Marcar como pendiente' : 'Marcar como contactado'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                {cart.followedUp ? 'Desmarcar' : 'Hecho'}
                              </span>
                            </button>

                            <button
                              onClick={() => handleDeleteCart(cart.id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                              title="Eliminar carrito"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Desglose de Artículos del Carrito */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Artículos en la bolsa ({cart.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} u):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {cart.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                              >
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-9 h-9 object-cover rounded-lg shrink-0 border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                                    <ShoppingBag className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-800 truncate">{item.title}</p>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                    <span>Cant: {item.quantity}</span>
                                    <span className="font-bold text-slate-700">${item.price.toFixed(2)} c/u</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 9. SECCIÓN GESTIÓN DEL CARRUSEL HERO */}
        {crmSubTab === 'carousel' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Carrusel Hero de la Tienda</h2>
                <p className="text-xs text-slate-500">Imágenes y banners que se muestran en el carrusel de la tienda principal.</p>
              </div>
              <button
                onClick={() => setShowSlideModal(true)}
                className="bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Agregar Slide al Carrusel
              </button>
            </div>

            {slides.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-sm">Sin imágenes en el carrusel</p>
                <p className="text-xs text-slate-400">Si no configuras ningún slide, la tienda ocultará el banner superior automáticamente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide, idx) => (
                  <div key={slide.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="relative h-44 w-full bg-slate-900">
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                        Slide #{idx + 1}
                      </span>
                      <span className="absolute bottom-2 left-2 bg-[#E65F2B] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                        {slide.cta_category}
                      </span>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm line-clamp-1">{slide.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{slide.subtitle}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium text-[11px]">Botón: "{slide.cta_text}"</span>
                        <button
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Eliminar del carrusel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Nuevo Slide */}
            {showSlideModal && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                  <button
                    onClick={() => setShowSlideModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-black text-base text-slate-900">Nuevo Slide del Carrusel</h3>
                    <p className="text-xs text-slate-500">Configura la imagen y texto del banner principal</p>
                  </div>

                  <form onSubmit={handleCreateSlide} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Título del Banner *</label>
                      <input
                        type="text"
                        required
                        value={slideTitle}
                        onChange={e => setSlideTitle(e.target.value)}
                        placeholder="Ej. Colección Exclusiva de Temporada"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Subtítulo Descriptivo</label>
                      <input
                        type="text"
                        value={slideSubtitle}
                        onChange={e => setSlideSubtitle(e.target.value)}
                        placeholder="Ej. Artículos importados directo a Puebla"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1">URL de la Imagen *</label>
                      <input
                        type="url"
                        required
                        value={slideImageUrl}
                        onChange={e => setSlideImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Texto del Botón</label>
                        <input
                          type="text"
                          value={slideCtaText}
                          onChange={e => setSlideCtaText(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Categoría a Filtrar</label>
                        <select
                          value={slideCtaCategory}
                          onChange={e => setSlideCtaCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                        >
                          <option value="Todas">Todas</option>
                          <option value="Electrónica">Electrónica</option>
                          <option value="Moda">Moda</option>
                          <option value="Hogar">Hogar</option>
                          <option value="Juguetes">Juguetes</option>
                          <option value="Belleza">Belleza</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSlideModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingSlide}
                        className="flex-1 py-2.5 rounded-xl bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold transition disabled:opacity-50"
                      >
                        {savingSlide ? 'Guardando...' : 'Publicar Slide'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10. SECCIÓN CLUB FOXDROP & MÉTRICAS DE FIDELIDAD */}
        {crmSubTab === 'loyalty' && (
          <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Programa de Miembros (Club FoxDrop) & Fidelidad
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitorea cuánto dinero se invierte en fidelidad, el pasivo de puntos acumulados y ajusta las reglas de conversión y niveles.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleRefreshLoyaltyMetrics}
                  disabled={loadingLoyaltyMetrics}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLoyaltyMetrics ? 'animate-spin text-[#E65F2B]' : ''}`} />
                  Actualizar Métricas
                </button>
                <button
                  onClick={handleSaveClubSettings}
                  disabled={savingClubSettings}
                  className="px-4 py-2 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingClubSettings ? 'Guardando...' : 'Guardar Reglas del Club'}
                </button>
              </div>
            </div>

            {/* Aviso visual de guardado */}
            {clubSettingsSavedNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Configuración del Club FoxDrop guardada exitosamente en Supabase! La tienda ahora aplica estas reglas en vivo.</span>
              </div>
            )}

            {/* KPI Cards: Inversión en Fidelidad & Métricas Financieras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-white to-orange-50/40 border border-orange-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-orange-600 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider">Inversión en Fidelidad</span>
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ${(loyaltyMetrics?.totalLoyaltyDiscountGiven || 0).toFixed(2)} <span className="text-xs font-bold text-slate-400">MXN</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Descuentos reales otorgados a miembros en {loyaltyMetrics?.totalOrdersAnalyzed || 0} órdenes analizadas.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-amber-50/40 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-amber-600 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider">Puntos en Circulación</span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {(loyaltyMetrics?.totalCirculatingPoints || 0).toLocaleString()} <span className="text-sm font-bold text-amber-600">{clubSettings.currencySymbol}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Acumulado entre los {loyaltyMetrics?.totalClients || 0} clientes registrados en la plataforma.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50/40 border border-blue-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-blue-600 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider">Pasivo Financiero Estimado</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ${(loyaltyMetrics?.circulatingLiabilityMxn || 0).toFixed(2)} <span className="text-xs font-bold text-slate-400">MXN</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor económico a redimir (${clubSettings.pointMonetaryValueMxn.toFixed(2)} MXN por {clubSettings.currencySymbol}).
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider">Miembros por Nivel</span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold mt-1">
                  <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded-md flex items-center justify-between">
                    <span>🥉 Bronce</span>
                    <span>{loyaltyMetrics?.tierCounts.bronze || 0}</span>
                  </span>
                  <span className="bg-slate-200/70 text-slate-800 px-2 py-0.5 rounded-md flex items-center justify-between">
                    <span>🥈 Plata</span>
                    <span>{loyaltyMetrics?.tierCounts.silver || 0}</span>
                  </span>
                  <span className="bg-yellow-100/70 text-yellow-900 px-2 py-0.5 rounded-md flex items-center justify-between">
                    <span>🥇 Oro</span>
                    <span>{loyaltyMetrics?.tierCounts.gold || 0}</span>
                  </span>
                  <span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded-md flex items-center justify-between">
                    <span>👑 Platino</span>
                    <span>{loyaltyMetrics?.tierCounts.platinum || 0}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Editor de Parámetros del Club */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Reglas de Conversión y Equivalencias</h3>
                  <p className="text-xs text-slate-500">Define cuántos pesos equivalen a 1 estrella/punto y el valor monetario de recompensa.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetClubSettings}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline self-start sm:self-auto"
                >
                  Restablecer valores predeterminados
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre de la Moneda</label>
                  <input
                    type="text"
                    value={clubSettings.currencyName}
                    onChange={e => setClubSettings({ ...clubSettings, currencyName: e.target.value })}
                    placeholder="Ej. Estrellas, Puntos Fox"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ícono o Símbolo</label>
                  <input
                    type="text"
                    value={clubSettings.currencySymbol}
                    onChange={e => setClubSettings({ ...clubSettings, currencySymbol: e.target.value })}
                    placeholder="Ej. ⭐, 🦊, 💎"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Pesos por cada {clubSettings.currencySymbol} ($ MXN)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={clubSettings.pesosPerPoint}
                    onChange={e => setClubSettings({ ...clubSettings, pesosPerPoint: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B] font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Ej: $10 gastados = 1 {clubSettings.currencySymbol} ganada.
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Valor Monetario por {clubSettings.currencySymbol} ($ MXN)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={clubSettings.pointMonetaryValueMxn}
                    onChange={e => setClubSettings({ ...clubSettings, pointMonetaryValueMxn: Math.max(0.01, Number(e.target.value) || 0.01) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B] font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Valor de canje para calcular el pasivo financiero.
                  </span>
                </div>
              </div>

              {/* Simulador Dinámico en Vivo */}
              <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-2xl text-xs space-y-1">
                <span className="font-black text-orange-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E65F2B]" />
                  Simulador en tiempo real para el cliente:
                </span>
                <p className="text-orange-900 leading-relaxed">
                  Por cada compra de <strong>$500.00 MXN</strong>, el cliente recibirá{' '}
                  <span className="font-mono font-black text-[#E65F2B] bg-white px-2 py-0.5 rounded-md border border-orange-200">
                    +{Math.floor(500 / clubSettings.pesosPerPoint)} {clubSettings.currencySymbol} {clubSettings.currencyName}
                  </span>
                  , con un valor de recompensa estimado de{' '}
                  <strong>${(Math.floor(500 / clubSettings.pesosPerPoint) * clubSettings.pointMonetaryValueMxn).toFixed(2)} MXN</strong> (inversión de fidelidad del {((Math.floor(500 / clubSettings.pesosPerPoint) * clubSettings.pointMonetaryValueMxn / 500) * 100).toFixed(1)}%).
                </p>
              </div>
            </div>

            {/* Editor de Niveles de Membresía (Tiers) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900">Niveles de Membresía & Descuentos Directos</h3>
                <p className="text-xs text-slate-500">Configura los puntos requeridos y el beneficio porcentual que desbloquea cada nivel.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clubSettings.tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 rounded-2xl bg-gradient-to-b from-white to-slate-50/50 space-y-3.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400">Nivel #{idx + 1}</span>
                      <input
                        type="text"
                        value={tier.badge}
                        onChange={e => {
                          const updated = [...clubSettings.tiers];
                          updated[idx] = { ...updated[idx], badge: e.target.value };
                          setClubSettings({ ...clubSettings, tiers: updated });
                        }}
                        className="w-10 text-center text-lg py-0.5 border border-slate-200 rounded-lg bg-white"
                        title="Emoji o Insignia"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nombre del Nivel</label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={e => {
                          const updated = [...clubSettings.tiers];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setClubSettings({ ...clubSettings, tiers: updated });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Puntos Mínimos ({clubSettings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={tier.minPoints}
                        onChange={e => {
                          const updated = [...clubSettings.tiers];
                          updated[idx] = { ...updated[idx], minPoints: Math.max(0, Number(e.target.value) || 0) };
                          setClubSettings({ ...clubSettings, tiers: updated });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Descuento Directo (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tier.discountPercent}
                          onChange={e => {
                            const updated = [...clubSettings.tiers];
                            updated[idx] = { ...updated[idx], discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) };
                            setClubSettings({ ...clubSettings, tiers: updated });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-[#E65F2B] bg-white pr-8"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón de Guardar en Pie */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveClubSettings}
                  disabled={savingClubSettings}
                  className="px-6 py-3 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingClubSettings ? 'Guardando Cambios...' : 'Guardar y Publicar en Tienda'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 11. SECCIÓN ENVÍOS & MÉTODOS DE PAGO */}
        {crmSubTab === 'shipping_payments' && (
          <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-500" />
                  Configuración de Envíos & Métodos de Pago
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Establece los costos de entrega, condiciones para entrega personal o paquetería y tus datos bancarios para transferencias SPEI.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleSaveCheckoutSettings}
                  disabled={savingCheckoutSettings}
                  className="px-4 py-2 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCheckoutSettings ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>

            {/* Aviso de guardado exitoso */}
            {checkoutSettingsSavedNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">¡Configuración de envíos y pagos guardada y sincronizada con la tienda exitosamente!</span>
              </div>
            )}

            {/* 1. MÉTODOS DE ENTREGA DISPONIBLES */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E65F2B]" />
                    Métodos de Entrega Activos en Tienda
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configura las opciones que tus clientes pueden elegir al confirmar su bolsa de compra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddShippingMethod}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E65F2B]" />
                  Agregar Método
                </button>
              </div>

              <div className="space-y-4">
                {checkoutSettings.shippingMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-2xl p-4 transition ${
                      method.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={e => handleUpdateShippingMethod(method.id, { enabled: e.target.checked })}
                            className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-4 h-4"
                          />
                          <span className="font-bold text-xs text-slate-800">
                            {method.enabled ? 'Activo en Tienda' : 'Pausado'}
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {checkoutSettings.shippingMethods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveShippingMethod(method.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition text-xs flex items-center gap-1"
                            title="Eliminar método"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Nombre del Método de Entrega
                        </label>
                        <input
                          type="text"
                          value={method.name}
                          onChange={e => handleUpdateShippingMethod(method.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Costo en MXN ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={method.price}
                          onChange={e => handleUpdateShippingMethod(method.id, { price: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#E65F2B]"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Descripción visible para el cliente
                      </label>
                      <input
                        type="text"
                        value={method.description}
                        onChange={e => handleUpdateShippingMethod(method.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-[#E65F2B]"
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={method.requiresAddress}
                          onChange={e => handleUpdateShippingMethod(method.id, { requiresAddress: e.target.checked })}
                          className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-4 h-4"
                        />
                        <span className="text-xs text-slate-700 font-medium">
                          ¿Requiere dirección física de envío?
                        </span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {method.requiresAddress ? '📦 El checkout pedirá dirección obligatoria' : '🤝 Entrega personal (NO pide dirección en checkout)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. DATOS DE TRANSFERENCIA BANCARIA (SPEI) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Datos Bancarios para Transferencia SPEI
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estos datos se mostrarán directamente al cliente al seleccionar Pago con Transferencia y en su pantalla de confirmación.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Institución Bancaria
                  </label>
                  <input
                    type="text"
                    value={checkoutSettings.bankTransfer.bankName}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      bankTransfer: { ...checkoutSettings.bankTransfer, bankName: e.target.value }
                    })}
                    placeholder="Ej. BBVA México, Nu, Santander..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nombre del Titular / Beneficiario
                  </label>
                  <input
                    type="text"
                    value={checkoutSettings.bankTransfer.accountHolder}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      bankTransfer: { ...checkoutSettings.bankTransfer, accountHolder: e.target.value }
                    })}
                    placeholder="Ej. FoxDrop México / Mario..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    CLABE Interbancaria (18 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={checkoutSettings.bankTransfer.clabe}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      bankTransfer: { ...checkoutSettings.bankTransfer, clabe: e.target.value.replace(/[^0-9]/g, '') }
                    })}
                    placeholder="012680015948372619"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Número de Cuenta o Tarjeta (Opcional)
                  </label>
                  <input
                    type="text"
                    value={checkoutSettings.bankTransfer.accountNumber || ''}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      bankTransfer: { ...checkoutSettings.bankTransfer, accountNumber: e.target.value }
                    })}
                    placeholder="Ej. 1594837261"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Instrucciones o Referencia para el Cliente
                </label>
                <textarea
                  rows={2}
                  value={checkoutSettings.bankTransfer.notes || ''}
                  onChange={e => setCheckoutSettings({
                    ...checkoutSettings,
                    bankTransfer: { ...checkoutSettings.bankTransfer, notes: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#E65F2B]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkoutSettings.allowCashOnDelivery}
                    onChange={e => setCheckoutSettings({ ...checkoutSettings, allowCashOnDelivery: e.target.checked })}
                    className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Permitir Pago en Efectivo contra Entrega (ideal para entregas personales en Puebla)
                  </span>
                </label>
              </div>
            </div>



            {/* Botón flotante/inferior de guardar */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCheckoutSettings}
                disabled={savingCheckoutSettings}
                className="px-6 py-3 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCheckoutSettings ? 'Guardando Cambios...' : 'Guardar y Publicar en Tienda'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL ALTA / EDICIÓN DE ARTÍCULO */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingProductId ? 'Editar Artículo en Inventario' : 'Dar de Alta Artículo con Lote'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecciona el lote correspondiente para asignar el prorrateo de flete automáticamente.
                </p>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Nombre del Producto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Apple AirPods Pro 2da Gen, Reloj Seiko..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Código de Barras / SKU con Escáner Móvil */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold block">Código de Barras / SKU:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerContext('sku_input');
                        setShowCameraScanner(true);
                      }}
                      className="text-[#E65F2B] hover:text-[#c44f22] font-bold text-[11px] flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200 shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Escanear con Cámara</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. 7501000123456 o FX-4021"
                      value={newSku}
                      onChange={e => setNewSku(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-slate-900"
                    />
                    {newSku && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-bold">
                        Detectado ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Usa la cámara del celular para escanear el código de barras de fábrica (UPC/EAN) del producto.
                  </p>
                </div>

                {/* Subida de Imagen a Supabase Storage con IA, Buscador y Copiar/Pegar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-bold block text-xs">Fotografía del Producto:</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSearchImageOnGoogle}
                        className="text-slate-600 hover:text-slate-900 font-bold text-[11px] flex items-center gap-1 bg-white hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition"
                        title="Buscar fotos de este producto en Google"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span>Google Fotos</span>
                      </button>
                    </div>
                  </div>

                  <div 
                    onPaste={handlePasteImage}
                    className="space-y-2 border border-slate-200 bg-slate-50/50 p-3 rounded-2xl"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Opción 1: Archivo local */}
                      <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-700 transition">
                        <Upload className="w-4 h-4 text-[#E65F2B]" />
                        <span className="font-semibold text-xs">
                          {uploadingImage ? 'Procesando...' : 'Subir archivo PC/móvil'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      {/* Opción 2: Pegar imagen directamente desde portapapeles */}
                      <button
                        type="button"
                        onClick={() => handlePasteImage()}
                        disabled={uploadingImage}
                        className="bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-700 transition font-semibold text-xs shadow-xs"
                      >
                        <Clipboard className="w-4 h-4 text-emerald-600" />
                        <span>Pegar foto (Ctrl+V)</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>💡 Haz clic en <strong>Google Fotos</strong>, copia la foto del artículo y presiona <strong>Pegar foto (Ctrl+V)</strong>.</span>
                      </span>
                      {uploadSuccess && (
                        <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 shrink-0">
                          <Check className="w-4 h-4" /> ¡Lista!
                        </span>
                      )}
                    </div>

                    {newImageUrl && (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <img 
                          src={newImageUrl} 
                          alt="Vista previa" 
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 block truncate">Foto seleccionada</span>
                          <span className="text-[10px] text-slate-400 truncate block">{newImageUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setNewImageUrl(''); setUploadSuccess(false); }}
                          className="text-xs text-rose-500 font-bold hover:underline px-2 py-1"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">O URL directa:</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newImageUrl.startsWith('data:') ? '' : newImageUrl}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setNewImageUrl(val);
                          if (val.startsWith('http://') || val.startsWith('https://')) {
                            try {
                              const uploaded = await uploadProductImageUrl(val);
                              setNewImageUrl(uploaded);
                              setUploadSuccess(true);
                            } catch {}
                          }
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold block">Categoría:</label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                        className="text-[#E65F2B] hover:text-[#D45321] text-[10px] font-bold hover:underline flex items-center gap-0.5"
                      >
                        {isAddingNewCategory ? '✕ Cancelar' : '+ Crear Nueva'}
                      </button>
                    </div>

                    {isAddingNewCategory ? (
                      <div className="space-y-1.5 p-2 bg-orange-50/70 border border-orange-200 rounded-xl">
                        <span className="text-[10px] font-bold text-orange-950 block">Dar de alta nueva categoría fija:</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Ej. Juguetes, Joyería..."
                            value={customNewCategoryName}
                            onChange={e => setCustomNewCategoryName(e.target.value)}
                            className="flex-1 bg-white border border-orange-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#E65F2B]"
                          />
                          <button
                            type="button"
                            disabled={creatingCategoryLoading || !customNewCategoryName.trim()}
                            onClick={async () => {
                              if (!customNewCategoryName.trim()) return;
                              setCreatingCategoryLoading(true);
                              try {
                                const created = await createAdminCategory(customNewCategoryName.trim());
                                setDbCategories(prev => {
                                  const exists = prev.some(c => c.name.toLowerCase() === created.name.toLowerCase());
                                  return exists ? prev : [...prev, created].sort((a,b) => a.name.localeCompare(b.name));
                                });
                                setNewCategory(created.name);
                                setCustomNewCategoryName('');
                                setIsAddingNewCategory(false);
                              } catch (err: any) {
                                alert(`Error al registrar categoría: ${err.message || 'Intente de nuevo'}`);
                              } finally {
                                setCreatingCategoryLoading(false);
                              }
                            }}
                            className="bg-[#2D4A58] hover:bg-[#203641] disabled:bg-gray-400 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shrink-0"
                          >
                            {creatingCategoryLoading ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <select
                          value={newCategory}
                          onChange={e => setNewCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-[#E65F2B]"
                        >
                          {(() => {
                            const allCategoryNames = Array.from(new Set([
                              ...dbCategories.map(c => c.name),
                              ...products.map(p => p.category).filter(Boolean),
                              'Cosmética', 'Juguetes', 'Electrónica', 'Moda', 'Hogar'
                            ]));
                            return allCategoryNames.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ));
                          })()}
                        </select>

                        {/* Chips de selección rápida de categorías guardadas */}
                        <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto">
                          {Array.from(new Set([
                            ...dbCategories.map(c => c.name),
                            ...products.map(p => p.category).filter(Boolean),
                            'Cosmética'
                          ])).slice(0, 8).map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setNewCategory(cat)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition cursor-pointer ${
                                newCategory.toLowerCase() === cat.toLowerCase()
                                  ? 'bg-[#2D4A58] text-white border-[#2D4A58] font-bold'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Stock Inicial:</label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                </div>

                {/* Selección de Lote de Importación */}
                <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 block text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#E65F2B]" /> Asignar a Lote de Importación:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="text-[#E65F2B] font-bold text-[10px] hover:underline"
                    >
                      + Crear Nuevo Lote
                    </button>
                  </div>

                  <select
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-lg p-2 text-slate-900 font-medium"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} (+${b.costPerUnit.toFixed(2)} MXN flete/ud)
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] text-orange-900 font-bold flex justify-between">
                    <span>Flete unitario calculado del lote:</span>
                    <span>+${shippingPerUnit.toFixed(2)} MXN</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Costo Base Adquisición (USD):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCostUsd}
                      onChange={e => setNewCostUsd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Equivalente MXN: ${costMxn.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Precio Venta Público:</label>
                    <input
                      type="number"
                      value={newPublicPrice}
                      onChange={e => setNewPublicPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 block">Costo Total Unitario: ${totalCostUnitMxn.toFixed(2)} MXN</span>
                    <span className="text-sm font-black text-emerald-700">Ganancia Neta: +${profitUnit.toFixed(2)} MXN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Margen:</span>
                    <span className="text-base font-black text-slate-900">{marginPercent.toFixed(1)}%</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || uploadingImage}
                  className="w-full bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold py-3 rounded-md shadow-sm transition"
                >
                  {isSaving ? 'Guardando en Servidor...' : (editingProductId ? 'Actualizar Artículo' : 'Guardar en Catálogo')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVO LOTE DE IMPORTACIÓN */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
              <button onClick={() => setShowBatchModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#E65F2B]" /> Nuevo Lote de Importación
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ingresa el costo total de envío pagado por la caja o remesa para que el sistema calcule el prorrateo automático.
                </p>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Nombre o Folio del Lote:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lote 3 - Ropa y Zapatillas Noviembre"
                    value={batchNameInput}
                    onChange={e => setBatchNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Flete Total Pagado (MXN):</label>
                    <input
                      type="number"
                      required
                      value={batchShippingCostInput}
                      onChange={e => setBatchShippingCostInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Unidades del Lote:</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={batchUnitsInput}
                      onChange={e => setBatchUnitsInput(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-orange-950 font-bold">Flete Calculado por Pieza:</span>
                  <span className="text-base font-black text-[#E65F2B]">
                    +${(batchUnitsInput > 0 ? batchShippingCostInput / batchUnitsInput : 0).toFixed(2)} MXN
                  </span>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Notas o Proveedor (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej. Aduana CDMX, guía 99201..."
                    value={batchNotesInput}
                    onChange={e => setBatchNotesInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingBatch}
                  className="w-full bg-[#2D4A58] hover:bg-[#203641] text-white font-bold py-3 rounded-lg shadow-sm transition"
                >
                  {savingBatch ? 'Registrando...' : 'Guardar Lote de Importación'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DETALLE DE CLIENTE CON SUS PEDIDOS Y PUNTOS */}
        {selectedClientForModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setSelectedClientForModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-12 h-12 rounded-full bg-[#2D4A58] text-white flex items-center justify-center font-black text-base">
                  {selectedClientForModal.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">{selectedClientForModal.name}</h3>
                  <p className="text-xs text-gray-500">{selectedClientForModal.phone} • {selectedClientForModal.email}</p>
                </div>
              </div>

              {/* Tarjeta de Lealtad */}
              {(() => {
                const tier = getClubFoxDropTier(selectedClientForModal.loyaltyPoints || 0, clubSettings.tiers);
                return (
                  <div className="bg-gradient-to-r from-[#2D4A58] to-[#1F2D3D] text-white p-4 rounded-xl flex items-center justify-between shadow">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-orange-400">Club Foxdrop</span>
                      <h4 className="font-black text-sm">{tier.badge} {tier.name}</h4>
                      <p className="text-[11px] text-gray-300">
                        {tier.discountPercent > 0 ? `${tier.discountPercent}% descuento otorgado` : 'Acumulando puntos'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#E65F2B]">{selectedClientForModal.loyaltyPoints}</span>
                      <span className="text-[10px] text-gray-300 block">Puntos Acumulados</span>
                    </div>
                  </div>
                );
              })()}

              {/* Pedidos del Cliente */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Historial de Pedidos ({orders.filter(o => o.clientPhone === selectedClientForModal.phone || o.clientEmail === selectedClientForModal.email).length})
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {orders
                    .filter(o => o.clientPhone === selectedClientForModal.phone || o.clientEmail === selectedClientForModal.email)
                    .map(ord => (
                      <div key={ord.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{ord.id}</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              ord.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 text-sm">
                          ${ord.total.toFixed(2)} MXN
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => sendWhatsAppNotification(
                    selectedClientForModal.phone,
                    `Hola ${selectedClientForModal.name}! Te contactamos de FoxDrop Puebla para dar seguimiento a tu cuenta y pedidos.`
                  )}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" /> Enviar Mensaje por WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM NAVIGATION BAR MÓVIL PARA ADMIN CRM (PWA WEBAPP) */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18252E] text-white border-t border-slate-800 z-40 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => { setCrmSubTab('inventory'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center gap-1 transition ${
            crmSubTab === 'inventory' ? 'text-[#E65F2B] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Stock</span>
        </button>

        <button
          onClick={() => { setCrmSubTab('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center gap-1 transition relative ${
            crmSubTab === 'orders' ? 'text-[#E65F2B] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-5 h-5" />
          {activeOrders.length > 0 && (
            <span className="absolute -top-1 right-1 bg-[#E65F2B] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
              {activeOrders.length}
            </span>
          )}
          <span className="text-[10px]">Pedidos</span>
        </button>

        <button
          onClick={() => setShowPosModal(true)}
          className="flex flex-col items-center justify-center -mt-6 bg-[#E65F2B] text-white w-13 h-13 rounded-full shadow-2xl border-4 border-[#18252E] ring-2 ring-orange-400/50 hover:scale-105 active:scale-95 transition"
        >
          <QrCode className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase tracking-tighter">POS</span>
        </button>

        <button
          onClick={() => { setCrmSubTab('carts'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center gap-1 transition relative ${
            crmSubTab === 'carts' ? 'text-[#E65F2B] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          {abandonedCarts.length > 0 && (
            <span className="absolute -top-1 right-1 bg-amber-500 text-slate-950 text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black">
              {abandonedCarts.length}
            </span>
          )}
          <span className="text-[10px]">Carritos</span>
        </button>

        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-1 transition text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5 text-slate-200" />
          <span className="text-[10px] font-bold text-slate-200">Más Menú</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* MODAL SISTEMA POS MÓVIL (PUNTO DE VENTA FÍSICO) */}
      {/* ======================================================== */}
      {showPosModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Cabecera del POS */}
            <div className="bg-[#2D4A58] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E65F2B] flex items-center justify-center text-white shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    POS Móvil FoxDrop
                    <span className="bg-orange-500/20 text-orange-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                      Mostrador
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300">Venta física con descuento directo de inventario</p>
                </div>
              </div>
              <button
                onClick={() => setShowPosModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Botón de Escáner de Cámara */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannerContext('pos_sale');
                    setShowCameraScanner(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-[#E65F2B] to-[#d44e1d] hover:from-[#d44e1d] hover:to-[#be4215] text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
                >
                  <Camera className="w-5 h-5 animate-pulse" />
                  <span className="text-sm">Escanear Código de Barras / QR</span>
                </button>
              </div>

              {/* Selector Rápido de Producto manual */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  O selecciona un producto del catálogo:
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {products.filter(p => p.stock > 0).slice(0, 8).map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddToCartPos(prod)}
                      className="w-full text-left p-2.5 hover:bg-orange-50/50 flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {prod.sku}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{prod.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-900">${prod.publicPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                          +{prod.stock} disp
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del Carrito POS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#E65F2B]" />
                    Artículos en el Ticket ({posCart.reduce((acc, i) => acc + i.quantity, 0)})
                  </h4>
                  {posCart.length > 0 && (
                    <button
                      onClick={() => setPosCart([])}
                      className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                    >
                      Vaciar ticket
                    </button>
                  )}
                </div>

                {posCart.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 space-y-1">
                    <QrCode className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">Ticket vacío</p>
                    <p className="text-[11px]">Usa el botón de arriba para escanear productos con la cámara de tu celular.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {posCart.map(item => (
                      <div
                        key={item.product.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="truncate flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.product.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            ${item.product.publicPrice.toFixed(2)} c/u • SKU: {item.product.sku}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartPosQty(item.product.id, -1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-black text-xs text-slate-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartPosQty(item.product.id, 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-black text-slate-900 text-xs w-16 text-right">
                            ${(item.product.publicPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teléfono del Cliente & Unificación con Cuenta Web */}
              <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 text-[11px] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#E65F2B]" />
                    WhatsApp del Cliente (Para Ticket & Puntos):
                  </label>
                  <span className="text-[10px] font-bold text-[#E65F2B]">Club FoxDrop</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Ej. 2221234567 (10 dígitos)"
                    value={posClientPhone}
                    onChange={e => setPosClientPhone(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E65F2B]"
                  />
                  <input
                    type="text"
                    placeholder={posDetectedClient ? posDetectedClient.name : "Nombre del cliente (opcional)"}
                    value={posClientName}
                    onChange={e => setPosClientName(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                {/* Detección automática en vivo */}
                {posDetectedClient ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-[11px] flex items-center justify-between text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Cliente frecuente detectado: <strong>{posDetectedClient.name}</strong>
                      </span>
                    </div>
                    <span className="font-black text-emerald-900 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {posDetectedClient.loyaltyPoints} pts actuales
                    </span>
                  </div>
                ) : posClientPhone.trim().length >= 10 ? (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-2 text-[11px] flex items-center gap-1.5 text-sky-800">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>
                      Cliente nuevo. Se registrará en la base y acumulará <strong>+{posPointsEarned} pts</strong> que se vincularán si crea cuenta en línea.
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Método de Pago */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 text-[11px]">Método de Pago:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      posPaymentMethod === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      posPaymentMethod === 'card'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    💳 Tarjeta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('spei')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      posPaymentMethod === 'spei'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ SPEI
                  </button>
                </div>
              </div>

              {/* Total y Puntos */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">
                    Total a Cobrar
                  </span>
                  <span className="text-2xl font-black">${posTotal.toFixed(2)} MXN</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-orange-400 font-bold block">🦊 Puntos Club</span>
                  <span className="text-base font-black text-white">+{posPointsEarned} pts</span>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <button
                type="button"
                disabled={posCart.length === 0 || posProcessing}
                onClick={handleConfirmPosSale}
                className="w-full bg-[#E65F2B] hover:bg-[#d44e1d] disabled:bg-gray-300 text-white font-black py-3.5 rounded-2xl shadow-lg transition active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
              >
                {posProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Descontando Inventario y Cobrando...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    <span>Cobrar y Generar Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TICKET DIGITAL FOXDROP & ENVÍO POR WHATSAPP */}
      {/* ======================================================== */}
      {posCompletedTicket && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setPosCompletedTicket(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Ticket */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-black text-base text-slate-900">¡Venta Completada con Éxito!</h3>
              <p className="text-xs text-slate-500 font-mono">Orden: {posCompletedTicket.orderNumber}</p>
              <p className="text-[10px] text-slate-400">
                {new Date(posCompletedTicket.date).toLocaleString()}
              </p>
            </div>

            {/* Detalle Ticket */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-[11px] text-slate-500">
                  Cliente: <strong className="text-slate-900">{posCompletedTicket.clientName}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Teléfono: <strong className="text-slate-900">{posCompletedTicket.clientPhone}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Método de pago: <strong className="text-slate-900 capitalize">{posCompletedTicket.paymentMethod}</strong>
                </p>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {posCompletedTicket.items.map(item => (
                  <div key={item.product.id} className="py-1.5 flex justify-between">
                    <span className="text-slate-700">
                      {item.quantity}x {item.product.title}
                    </span>
                    <span className="font-bold text-slate-900">
                      ${(item.product.publicPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totales y Puntos */}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">TOTAL:</span>
                <span className="font-black text-lg text-slate-900">
                  ${posCompletedTicket.total.toFixed(2)} MXN
                </span>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between text-orange-950 font-bold text-xs">
                <span>Puntos Club Acreditados:</span>
                <span className="text-[#E65F2B] font-black text-sm">+{posCompletedTicket.pointsEarned} pts</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => sendWhatsAppTicket(posCompletedTicket)}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Ticket por WhatsApp</span>
              </button>

              <button
                onClick={() => setPosCompletedTicket(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition"
              >
                Cerrar y Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CANCELACIÓN DE PEDIDO CON MOTIVO OBLIGATORIO */}
      {/* ======================================================== */}
      {showCancelModal && cancellingOrderId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setCancellingOrderId(null);
                setCancellationReason('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Cancelar Pedido {cancellingOrderId}</h3>
                <p className="text-xs text-slate-500">Ingresa el motivo obligatorio para la bitácora administrativa.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmCancellation} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">
                  Selecciona el Motivo de Cancelación: *
                </label>
                <div className="space-y-1.5 mb-2.5">
                  {[
                    'Cliente solicitó cancelación (No lo requiere / Cambió de opinión)',
                    'Comprobante o pago no acreditado / Tiempo expirado',
                    'Falta de stock / Inventario agotado',
                    'Dirección o datos de entrega inaccesibles / No localizable',
                    'Pedido de prueba o duplicado',
                    'Otro motivo administrativo'
                  ].map(reasonOption => (
                    <label
                      key={reasonOption}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition text-[11px] ${
                        cancellationReason.startsWith(reasonOption)
                          ? 'border-rose-400 bg-rose-50/60 text-rose-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adminCancelReason"
                        checked={cancellationReason.startsWith(reasonOption)}
                        onChange={() => setCancellationReason(reasonOption)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{reasonOption}</span>
                    </label>
                  ))}
                </div>

                <label className="text-slate-700 font-bold block mb-1">
                  Detalles o Justificación Adicional (Visible para el cliente):
                </label>
                <textarea
                  rows={2}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="Detalles que el cliente verá en su seguimiento (ej. Transferencia no reflejada en 24h)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none text-xs"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                ⚠️ Al cancelar, el pedido se trasladará automáticamente a <strong>Pedidos Cancelados</strong> y el cliente verá el estado actualizado en tiempo real.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellingOrderId(null);
                    setCancellationReason('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition"
                >
                  Regresar
                </button>

                <button
                  type="submit"
                  disabled={!cancellationReason.trim() || cancellingLoading}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-black px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5"
                >
                  {cancellingLoading ? (
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
      {/* COMPONENTE ESCÁNER DE CÁMARA (MÓVIL) */}
      {/* ======================================================== */}
      <MobileBarcodeScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleBarcodeScanSuccess}
      />

    </div>
  );
}
