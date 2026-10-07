'use client';

import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import FoxDropLogo from '@/components/FoxDropLogo';
import { FOX_LOGO_BASE64 } from '@/data/foxLogoBase64';
import MobileBarcodeScanner from '@/components/MobileBarcodeScanner';
import AdminWhatsAppTab from '@/components/AdminWhatsAppTab';
import { 
  Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare, 
  Search, ShieldAlert, Sparkles, TrendingUp, Clock, CheckCircle2, User, RefreshCw, BarChart3, ChevronRight, X,
  Lock, LogOut, KeyRound, Upload, Check, ShieldCheck, FileText, Send, Eye, EyeOff, Edit3, Trash2, Ban,
  Users, Layers, Award, Phone, Mail, History, ExternalLink, QrCode, ShoppingBag, Receipt, Printer, Minus, Camera,
  Clipboard, Globe, Image as ImageIcon, Wand2, Download, Star, HeartHandshake, Save, Percent, Menu, CreditCard,
  Bell, BellRing, Volume2, VolumeX, Copy, FileSpreadsheet, Power, Tag, CheckSquare, Square,
  Bot, Share2, Flame, Lightbulb, MessageCircle, Calendar, CalendarDays, CheckCircle,
  Mic, MicOff, Radio, Play, Pause, Zap
} from 'lucide-react';
import { Product, Order, AbandonedCart, SpecialOrder, ImportBatch, ClientProfile, ClubFoxDropSettings, ClubFoxDropTier, LoyaltyMetrics, CheckoutSettings, ShippingMethodConfig, AgentChatMessage, AgentSocialPost, AgentWeeklyCalendarDay, AgentWeeklyPlan } from '@/types';
import { getActiveProducts } from '@/lib/products';
import { 
  getLiveExchangeRate, createProductInDb, updateProductInDb, deleteProductInDb, 
  getImportBatches, createImportBatch, deleteImportBatch, getClientsWithMetrics,
  getCarouselSlides, createCarouselSlide, deleteCarouselSlide, CarouselSlide,
  fetchAdminCategories, createAdminCategory, bulkUpdateProductsCategory,
  getAdminAbandonedCarts, updateAdminAbandonedCart, deleteAdminAbandonedCart,
  getClubSettings, saveClubSettings, getLoyaltyMetrics, generateTicketImage,
  deleteClientFromDb,
  generateAgentSocialPost, generateAgentWeeklyCalendar, generateAgentOrderFollowup, generateAgentCartRecovery, chatWithFoxBot, executeAgentAction
} from '@/lib/admin';
import { getCheckoutSettings, saveCheckoutSettings, DEFAULT_CHECKOUT_SETTINGS } from '@/lib/checkoutSettings';
import { getAdminOrders, getSpecialOrders, updateSpecialOrderStatus, updateOrderStatusInDb, deleteOrderInDb, createPhysicalSaleOrder, subscribeToAllOrders } from '@/lib/orders';
import { authenticateAdmin, updateAdminPassword, AdminSession } from '@/lib/adminAuth';
import { uploadProductImage, uploadProductImageUrl, generateProductImageWithAi } from '@/lib/storage';
import { getClubFoxDropTier, DEFAULT_CLUB_SETTINGS } from '@/lib/clubFoxdrop';
import { getCategoryIconEmoji } from '@/lib/constants';
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

  // Navegación CRM (Persistente en recarga)
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'batches' | 'orders' | 'order_history' | 'cancelled_orders' | 'clients' | 'special_orders' | 'finance' | 'carts' | 'carousel' | 'loyalty' | 'shipping_payments' | 'agent' | 'whatsapp'>('inventory');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Leer pestaña persistida al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') as any;
    const tabFromStorage = localStorage.getItem('foxdrop_admin_active_tab') as any;
    const validTabs = ['inventory', 'batches', 'orders', 'order_history', 'cancelled_orders', 'clients', 'special_orders', 'finance', 'carts', 'carousel', 'loyalty', 'shipping_payments', 'agent', 'whatsapp'];

    const targetTab = validTabs.includes(tabFromUrl) ? tabFromUrl : (validTabs.includes(tabFromStorage) ? tabFromStorage : null);
    if (targetTab) {
      setCrmSubTab(targetTab);
    }
  }, []);

  // Sincronizar automáticamente en localStorage y URL cada vez que cambia crmSubTab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('foxdrop_admin_active_tab', crmSubTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== crmSubTab) {
        url.searchParams.set('tab', crmSubTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, [crmSubTab]);

  const handleSwitchTab = (tab: typeof crmSubTab) => {
    setCrmSubTab(tab);
  };
  
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
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

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
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isCombo, setIsCombo] = useState(false);
  const [selectedComboProductIds, setSelectedComboProductIds] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);

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
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posCompletedTicket, setPosCompletedTicket] = useState<{
    orderNumber: string;
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: 'cash' | 'card' | 'spei';
    clientPhone: string;
    clientName: string;
    pointsEarned: number;
    date: string;
    ticketImageUrl?: string;
  } | null>(null);
  const [generatingTicketImg, setGeneratingTicketImg] = useState(false);
  const [viewingTicketOrder, setViewingTicketOrder] = useState<Order | null>(null);
  const ticketReceiptRef = useRef<HTMLDivElement>(null);

  // Modal Marcar Producto como Ya Vendido (Venta previa o fuera de sistema)
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldProduct, setSoldProduct] = useState<Product | null>(null);
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [soldPriceUnit, setSoldPriceUnit] = useState(0);
  const [soldNote, setSoldNote] = useState('Venta realizada previamente fuera de plataforma');
  const [savingSold, setSavingSold] = useState(false);

  // Estados de Mejora de Inventario (Filtro por stock, categoría, estado y carga masiva)
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'healthy' | 'combos' | 'inactive'>('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);

  // Selección Múltiple de Productos para Acciones en Lote (ej. Cambiar Categoría)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState('');
  const [isBulkCustomCategory, setIsBulkCustomCategory] = useState(false);
  const [bulkCustomCategoryName, setBulkCustomCategoryName] = useState('');
  const [savingBulkCategory, setSavingBulkCategory] = useState(false);

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

  // Filtros Historial General de Pedidos
  const [orderHistorySearchTerm, setOrderHistorySearchTerm] = useState('');
  const [orderHistoryChannelFilter, setOrderHistoryChannelFilter] = useState<'all' | 'pos' | 'online'>('all');
  const [orderHistoryStatusFilter, setOrderHistoryStatusFilter] = useState<'all' | 'delivered' | 'cancelled' | 'pending' | 'processing' | 'shipped'>('all');

  // Notificaciones en Tiempo Real (Admin)
  const [adminRealtimeToast, setAdminRealtimeToast] = useState<{
    id: string;
    type: 'new_order' | 'status_update' | 'cancelled' | 'deleted';
    title: string;
    message: string;
    orderId?: string;
  } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // ─── ESTADO FOXBOT AI AGENT ─────────────────────────────────────────────────
  const [agentActiveTab, setAgentActiveTab] = useState<'chat' | 'marketing' | 'weekly_plan' | 'sales_radar'>('weekly_plan');
  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: '¡Hola! 🦊 Soy **Fox**, tu Inteligencia Artificial ejecutiva y copiloto de operaciones de FoxDrop Puebla.\n\nEstoy conectado en vivo a tu inventario, finanzas y pedidos. Cuento con protocolos de seguridad para proteger tu catálogo.\n\nPuedes hablarme por micrófono o pedirme:\n- ☀️ **"Briefing matutino"** para el balance de hoy y entregas en Puebla.\n- ⚡ **Ajustar stock o precios** con confirmación en un clic.\n- 📅 **Crear el plan de difusión continua (7 días)** para Instagram y Facebook.\n- 📦 **Redactar seguimientos de pedidos** para enviar por WhatsApp.\n\n¿En qué te apoyo?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionSuggestions: [
        'Buenos días Fox, dame el briefing ejecutivo de hoy',
        '¿Cuáles son nuestros productos con mayor margen de ganancia?',
        'Genera el plan de difusión continua para esta semana',
      ],
    },
  ]);
  const [agentInputText, setAgentInputText] = useState('');
  const [agentChatLoading, setAgentChatLoading] = useState(false);

  // Fox Voice & Speech States (Solo Admin)
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [autoVoiceReplyEnabled, setAutoVoiceReplyEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('server_mexican');
  const recognitionRef = useRef<any>(null);
  const foxAudioRef = useRef<HTMLAudioElement | null>(null);

  // Marketing Generator State
  const [agentSelectedProductId, setAgentSelectedProductId] = useState<string>('');
  const [agentPlatform, setAgentPlatform] = useState<'instagram' | 'facebook' | 'tiktok' | 'whatsapp'>('instagram');
  const [agentTone, setAgentTone] = useState<string>('Divertido y entusiasta');
  const [agentAudience, setAgentAudience] = useState<string>('Jóvenes y familias en Puebla amantes de productos virales de importación');
  const [agentCustomDiscount, setAgentCustomDiscount] = useState<number>(0);
  const [agentGeneratedPost, setAgentGeneratedPost] = useState<AgentSocialPost | null>(null);
  const [agentGeneratingPost, setAgentGeneratingPost] = useState(false);
  const [agentPostCopied, setAgentPostCopied] = useState(false);

  // Weekly Campaign Planner State
  const [agentWeeklyPlan, setAgentWeeklyPlan] = useState<AgentWeeklyPlan | null>(null);
  const [agentGeneratingPlan, setAgentGeneratingPlan] = useState(false);
  const [agentPlanFocusTheme, setAgentPlanFocusTheme] = useState('');
  const [agentSelectedDayForModal, setAgentSelectedDayForModal] = useState<AgentWeeklyCalendarDay | null>(null);
  const [downloadingFlyerId, setDownloadingFlyerId] = useState<string | null>(null);
  const flyerFlyerRef = useRef<HTMLDivElement>(null);

  // Followup Generator State
  const [agentFollowupOrderId, setAgentFollowupOrderId] = useState<string | null>(null);
  const [agentGeneratedFollowupText, setAgentGeneratedFollowupText] = useState<string>('');
  const [agentFollowupLoading, setAgentFollowupLoading] = useState(false);


  // Soporte PWA WebApp (Instalar aplicación en celular / escritorio)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Cargar y sincronizar voces nativas del navegador (evento onvoiceschanged)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const spanishVoices = allVoices.filter(v => v.lang.startsWith('es'));
      setAvailableVoices(spanishVoices.length > 0 ? spanishVoices : allVoices);

      // Si el usuario ya tenía una guardada en localStorage
      const savedVoice = localStorage.getItem('foxdrop_agent_voice_uri');
      if (savedVoice && allVoices.some(v => v.voiceURI === savedVoice)) {
        setSelectedVoiceUri(savedVoice);
        return;
      }

      // Priorizar voces mexicanas de alta definición
      const mexicanBest = allVoices.find(v => 
        (v.lang === 'es-MX' || v.lang === 'es_MX') &&
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Paulina') || v.name.includes('Dalia') || v.name.includes('Jorge') || v.name.includes('Raul'))
      );
      const anyMexican = allVoices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX');
      const anyNaturalSpanish = allVoices.find(v => v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google')));
      const anySpanish = allVoices.find(v => v.lang.startsWith('es'));

      const defaultBest = mexicanBest || anyMexican || anyNaturalSpanish || anySpanish;
      if (defaultBest) {
        setSelectedVoiceUri(defaultBest.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
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

      // Productos (activos e inactivos para administración completa)
      const dbProducts = await getActiveProducts(true);
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
          paymentMethod: o.payment_method || (o.order_number?.startsWith('FX-POS') ? 'cash' : undefined),
          paymentStatus: o.payment_status || 'pending',
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

    // Sanitizar valores numéricos asegurando que no queden vacíos o inválidos
    const sanitizedSettings: ClubFoxDropSettings = {
      ...clubSettings,
      pesosPerPoint: Math.max(1, Number(clubSettings.pesosPerPoint) || 10),
      pointMonetaryValueMxn: Math.max(0.01, Number(clubSettings.pointMonetaryValueMxn) || 0.1),
      tiers: (clubSettings.tiers || []).map((t, idx) => ({
        ...t,
        minPoints: Math.max(0, Number(t.minPoints) || 0),
        discountPercent: Math.max(0, Math.min(100, Number(t.discountPercent) || 0)),
      })),
    };

    setClubSettings(sanitizedSettings);

    const success = await saveClubSettings(sanitizedSettings);
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

  const handleDeleteClient = async (client: ClientProfile) => {
    const confirmMsg = `¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${client.name}" (${client.email || client.phone})?\n\nEsta acción no se puede deshacer y retirará el usuario de la lista de clientes.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingClientId(client.id);
    try {
      await deleteClientFromDb(client.id, client.email, client.phone, false);
      setClients(prev => prev.filter(c => c.id !== client.id && c.email !== client.email && c.phone !== client.phone));
      if (selectedClientForModal?.id === client.id) {
        setSelectedClientForModal(null);
      }
      handleRefreshLoyaltyMetrics();
      alert(`La cuenta de "${client.name}" ha sido eliminada con éxito.`);
    } catch (err: any) {
      console.error('Error al eliminar cliente:', err);
      alert(err.message || 'Error al eliminar cliente');
    } finally {
      setDeletingClientId(null);
    }
  };

  // ─── ACCIONES FOX AI AGENT & VOZ FOX (SERVIDO DESDE EL SISTEMA ADMIN) ─────
  const speakWithFoxVoice = (rawText: string) => {
    if (typeof window === 'undefined') return;

    try {
      stopFoxVoice(); // Detener cualquier locución previa

      // Limpieza exhaustiva de markdown, asteriscos, viñetas, emojis y URLs
      let cleanText = rawText
        .replace(/\*\*([^*]+)\*\*/g, '$1') // quitar negritas
        .replace(/\*([^*]+)\*/g, '$1')     // quitar cursivas
        .replace(/`([^`]+)`/g, '$1')       // quitar código
        .replace(/#+\s*/g, '')             // quitar títulos
        .replace(/https?:\/\/\S+/g, 'enlace de la tienda')
        .replace(/[•▪\-\*]\s+/g, '. ')     // viñetas a pausas de punto
        .replace(/[#_~><\[\]()$]/g, '')    // símbolos que provocan chasquidos
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // remover emojis
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      // 1. MODO VOZ NATIVA DEL SISTEMA (Google TTS Neural es-MX en Servidor)
      // Funciona idéntico en Windows, Mac, Android, iOS sin depender del sistema operativo del cliente
      if (!selectedVoiceUri || selectedVoiceUri === 'server_mexican') {
        const audioUrl = `/api/admin/agent/tts?text=${encodeURIComponent(cleanText)}`;
        const audio = new Audio(audioUrl);
        foxAudioRef.current = audio;

        audio.onplay = () => setIsVoiceSpeaking(true);
        audio.onended = () => setIsVoiceSpeaking(false);
        audio.onerror = () => {
          // Si el audio del servidor fallara por red, fallback a síntesis de navegador
          setIsVoiceSpeaking(false);
          fallbackLocalSpeechSynthesis(cleanText);
        };

        audio.play().catch(err => {
          console.warn("Audio autoplay bloqueado o error en servidor:", err);
          fallbackLocalSpeechSynthesis(cleanText);
        });
        return;
      }

      // 2. MODO VOZ LOCAL DEL NAVEGADOR (Si el usuario eligió una específica de su equipo)
      fallbackLocalSpeechSynthesis(cleanText);
    } catch (err) {
      console.warn('Error iniciando voz de Fox:', err);
      setIsVoiceSpeaking(false);
    }
  };

  const fallbackLocalSpeechSynthesis = (cleanText: string) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let matchedVoice: SpeechSynthesisVoice | undefined;

    if (selectedVoiceUri && selectedVoiceUri !== 'server_mexican') {
      matchedVoice = voices.find(v => v.voiceURI === selectedVoiceUri);
    }

    if (!matchedVoice) {
      matchedVoice = voices.find(v => (v.lang === 'es-MX' || v.lang === 'es_MX')) ||
                     voices.find(v => v.lang.startsWith('es'));
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    utterance.onstart = () => setIsVoiceSpeaking(true);
    utterance.onend = () => setIsVoiceSpeaking(false);
    utterance.onerror = () => setIsVoiceSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopFoxVoice = () => {
    // 1. Detener audio de servidor
    if (foxAudioRef.current) {
      foxAudioRef.current.pause();
      foxAudioRef.current.currentTime = 0;
      foxAudioRef.current = null;
    }
    // 2. Detener SpeechSynthesis del navegador
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceSpeaking(false);
  };

  const toggleVoiceListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo (Speech Recognition). Te recomendamos usar Google Chrome o Edge.');
      return;
    }

    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      return;
    }

    try {
      stopFoxVoice();
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        const spokenText = event.results[0][0].transcript;
        if (spokenText) {
          setAgentInputText(spokenText);
          handleSendAgentChatMessage(spokenText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Error en reconocimiento de voz:', event.error);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('No se pudo inicializar micrófono:', err);
      setIsVoiceListening(false);
    }
  };

  // Ejecutar acción sugerida por Fox en la base de datos
  const handleExecuteAgentAction = async (msgId: string, actionExecution: any) => {
    try {
      if (actionExecution.type === 'order_whatsapp' || actionExecution.type === 'cart_recovery') {
        const phone = (actionExecution.payload?.phone || '').replace(/\D/g, '');
        const text = encodeURIComponent(actionExecution.payload?.whatsappText || '');
        if (phone) {
          window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        } else {
          window.open(`https://wa.me/?text=${text}`, '_blank');
        }
        setAgentChatMessages(prev => prev.map(m => m.id === msgId && m.actionExecution ? {
          ...m,
          actionExecution: { ...m.actionExecution, status: 'executed' }
        } : m));
        return;
      }

      const res = await executeAgentAction(actionExecution.type, actionExecution.payload);
      if (res.success) {
        alert(`✅ ${res.message || 'Acción ejecutada con éxito por Fox'}`);
        // Marcar acción como ejecutada en el chat
        setAgentChatMessages(prev => prev.map(m => m.id === msgId && m.actionExecution ? {
          ...m,
          actionExecution: { ...m.actionExecution, status: 'executed' }
        } : m));

        // Refrescar inventario local si aplica
        if (actionExecution.type === 'update_stock' && actionExecution.payload?.productId) {
          setProducts(prev => prev.map(p => p.id === actionExecution.payload.productId ? {
            ...p,
            stock: Number(actionExecution.payload.newStock)
          } : p));
        } else if (actionExecution.type === 'update_price' && actionExecution.payload?.productId) {
          setProducts(prev => prev.map(p => p.id === actionExecution.payload.productId ? {
            ...p,
            publicPrice: Number(actionExecution.payload.newPrice)
          } : p));
        } else if (actionExecution.type === 'toggle_product' && actionExecution.payload?.productId) {
          setProducts(prev => prev.map(p => p.id === actionExecution.payload.productId ? {
            ...p,
            isActive: Boolean(actionExecution.payload.isActive)
          } : p));
        }
      } else {
        alert(`Error: ${res.error || 'No se pudo ejecutar la acción'}`);
      }
    } catch (err: any) {
      alert(`Error ejecutando acción: ${err.message}`);
    }
  };

  const handleSendAgentChatMessage = async (msgText?: string) => {
    const textToSend = msgText || agentInputText;
    if (!textToSend.trim() || agentChatLoading) return;

    const userMsg: AgentChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAgentChatMessages(prev => [...prev, userMsg]);
    if (!msgText) setAgentInputText('');
    setAgentChatLoading(true);

    try {
      const historyPayload = agentChatMessages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text,
      }));
      const { reply, actionExecution } = await chatWithFoxBot(textToSend.trim(), historyPayload);
      const agentMsg: AgentChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecution,
      };
      setAgentChatMessages(prev => [...prev, agentMsg]);

      // Si está activada la voz de Fox, responder hablada en tiempo real
      if (autoVoiceReplyEnabled) {
        speakWithFoxVoice(reply);
      }
    } catch (err: any) {
      const errorMsg: AgentChatMessage = {
        id: `agent_err_${Date.now()}`,
        sender: 'agent',
        text: `⚠️ Hubo un inconveniente al conectar con Gemini: ${err.message || 'Error desconocido'}. Verifica que tu conexión o API key sean válidas.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAgentChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setAgentChatLoading(false);
    }
  };

  const handleGenerateSocialPost = async () => {
    const targetProduct = products.find(p => p.id === agentSelectedProductId);
    if (!targetProduct) {
      alert('Por favor selecciona un producto para crear la publicación.');
      return;
    }

    setAgentGeneratingPost(true);
    setAgentGeneratedPost(null);

    try {
      const post = await generateAgentSocialPost({
        productTitle: targetProduct.title,
        productCategory: targetProduct.category,
        price: targetProduct.publicPrice,
        discountPercent: agentCustomDiscount || targetProduct.discountPercent || 0,
        platform: agentPlatform,
        tone: agentTone,
        audience: agentAudience,
      });
      setAgentGeneratedPost(post);
    } catch (err: any) {
      alert(err.message || 'Error al generar la publicación');
    } finally {
      setAgentGeneratingPost(false);
    }
  };

  const handleGenerateOrderFollowup = async (order: Order) => {
    setAgentFollowupOrderId(order.id);
    setAgentGeneratedFollowupText('');
    setAgentFollowupLoading(true);

    const daysSince = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    try {
      const msg = await generateAgentOrderFollowup({
        orderNumber: order.id,
        clientName: order.clientName,
        status: order.status,
        total: order.total,
        daysSinceCreated: Math.max(0, daysSince),
        trackingNumber: order.trackingNumber,
      });
      setAgentGeneratedFollowupText(msg);
    } catch (err: any) {
      alert(err.message || 'Error al generar seguimiento');
    } finally {
      setAgentFollowupLoading(false);
    }
  };

  const handleGenerateWeeklyPlan = async () => {
    if (products.length === 0) {
      alert('Se requieren productos en el catálogo para armar el calendario de difusión.');
      return;
    }

    setAgentGeneratingPlan(true);
    try {
      const plan = await generateAgentWeeklyCalendar(products, agentPlanFocusTheme);
      setAgentWeeklyPlan(plan);
      localStorage.setItem('foxdrop_agent_weekly_plan', JSON.stringify(plan));
    } catch (err: any) {
      alert(err.message || 'Error al generar el plan de difusión semanal');
    } finally {
      setAgentGeneratingPlan(false);
    }
  };

  const handleDownloadFlyer = async (day: AgentWeeklyCalendarDay) => {
    setDownloadingFlyerId(day.id);
    try {
      // Intentar captura con html-to-image si el flyer está montado
      const element = document.getElementById(`flyer-card-${day.id}`);
      if (element) {
        const dataUrl = await toPng(element, { quality: 0.95, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `foxdrop-${day.dayName.toLowerCase()}-${day.productTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        alert('Selecciona este día para previsualizar el flyer antes de descargarlo.');
      }
    } catch (err) {
      console.error('Error generando imagen de flyer:', err);
      alert('No se pudo generar la imagen del flyer. Puedes copiar el texto y usar la foto del producto directamente.');
    } finally {
      setDownloadingFlyerId(null);
    }
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
      setNewImages(prev => prev.includes(publicUrl) ? prev : [...prev, publicUrl]);
      setUploadSuccess(true);
    } catch (err) {
      console.error('Error al subir imagen:', err);
      // Fallback local en memoria
      const reader = new FileReader();
      reader.onload = () => {
        const localUrl = reader.result as string;
        setNewImageUrl(localUrl);
        setNewImages(prev => prev.includes(localUrl) ? prev : [...prev, localUrl]);
        setUploadSuccess(true);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Subida de Múltiples Imágenes (Archivos locales)
  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          try {
            const url = await uploadProductImage(file);
            uploadedUrls.push(url);
          } catch (err) {
            console.warn('Fallo subiendo archivo:', err);
          }
        }
      }
      if (uploadedUrls.length > 0) {
        setNewImages(prev => {
          const combined = [...prev];
          uploadedUrls.forEach(u => {
            if (!combined.includes(u)) combined.push(u);
          });
          return combined;
        });
        setNewImageUrl(uploadedUrls[0]);
        setUploadSuccess(true);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // Pegar imagen directamente desde el portapapeles (Ctrl+V o botón)
  const handlePasteImage = async (e?: React.ClipboardEvent) => {
    // 1. Si viene de un evento onPaste nativo (ej. Ctrl+V en teclado físico o pegar en campo)
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
          setNewImages(prev => prev.includes(uploadedUrl) ? prev : [...prev, uploadedUrl]);
          setUploadSuccess(true);
        } catch {
          setNewImageUrl(text.trim());
          setNewImages(prev => prev.includes(text.trim()) ? prev : [...prev, text.trim()]);
          setUploadSuccess(true);
        } finally {
          setUploadingImage(false);
        }
        return;
      }
    }

    // 2. Si se invoca desde el botón "Pegar foto" usando la Clipboard API
    if (navigator.clipboard) {
      setUploadingImage(true);
      setUploadSuccess(false);

      // Intento A: Leer imágenes binarias del portapapeles (Chrome desktop, Safari iOS 16+)
      if (navigator.clipboard.read) {
        try {
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
        } catch (readErr: any) {
          console.warn('Lectura de blob bloqueada en este dispositivo o permisos no otorgados:', readErr);
        }
      }

      // Intento B: Leer texto / enlace copiado del portapapeles
      if (navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          const trimmed = text ? text.trim() : '';
          if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/'))) {
            try {
              const uploadedUrl = await uploadProductImageUrl(trimmed);
              setNewImageUrl(uploadedUrl);
              setNewImages(prev => prev.includes(uploadedUrl) ? prev : [...prev, uploadedUrl]);
              setUploadSuccess(true);
              return;
            } catch {
              setNewImageUrl(trimmed);
              setNewImages(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
              setUploadSuccess(true);
              return;
            }
          }
        } catch (textErr: any) {
          console.warn('Lectura de texto de portapapeles bloqueada:', textErr);
        }
      }

      setUploadingImage(false);
      // Mensaje amigable y claro para móvil
      alert('Para pegar una foto en tu celular:\n\n1. Copia la foto desde tu navegador o galería.\n2. Si tu celular bloquea el acceso directo al portapapeles, puedes usar el botón "+ Tomar Foto con Cámara" o "+ Subir Fotos" de arriba.');
    } else {
      alert('Tu navegador no admite acceso directo al portapapeles. Usa el botón "+ Tomar Foto con Cámara" o "+ Subir Fotos".');
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

  // Conteos para Filtros de Inventario
  const countOutOfStock = products.filter(p => (p.stock || 0) <= 0).length;
  const countLowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 3).length;
  const countHealthy = products.filter(p => (p.stock || 0) > 3).length;
  const countCombos = products.filter(p => p.isCombo).length;
  const countInactive = products.filter(p => p.isActive === false).length;

  // Filtrado de productos mejorado
  const filteredProducts = products.filter(p => {
    // 1. Filtro por término de búsqueda
    const matchesSearch = !searchTerm.trim() || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Filtro por categoría seleccionada
    if (inventoryCategoryFilter !== 'all' && p.category.toLowerCase() !== inventoryCategoryFilter.toLowerCase()) {
      return false;
    }

    // 3. Filtro por estado de stock / tipo
    if (stockFilter === 'low_stock') {
      return (p.stock || 0) > 0 && (p.stock || 0) <= 3;
    }
    if (stockFilter === 'out_of_stock') {
      return (p.stock || 0) <= 0;
    }
    if (stockFilter === 'healthy') {
      return (p.stock || 0) > 3;
    }
    if (stockFilter === 'combos') {
      return Boolean(p.isCombo);
    }
    if (stockFilter === 'inactive') {
      return p.isActive === false;
    }

    return true;
  });

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
    setNewImages(prod.images && prod.images.length > 0 ? prod.images : []);
    setIsCombo(Boolean(prod.isCombo));
    setSelectedComboProductIds(prod.comboProductIds || []);
    setNewIsActive(prod.isActive !== false);
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
    setNewImages([]);
    setIsCombo(false);
    setSelectedComboProductIds([]);
    setNewIsActive(true);
    setShowAddModal(true);
  };

  // Guardar Alta o Edición de Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const finalImages = newImages.length > 0
        ? newImages
        : (newImageUrl ? [newImageUrl] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80']);

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
          imageUrl: finalImages[0],
          images: finalImages,
          isCombo,
          comboProductIds: isCombo ? selectedComboProductIds : [],
          isActive: newIsActive,
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
              images: finalImages,
              isCombo,
              comboProductIds: isCombo ? selectedComboProductIds : [],
              isActive: newIsActive,
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
          imageUrl: finalImages[0],
          images: finalImages,
          isCombo,
          comboProductIds: isCombo ? selectedComboProductIds : [],
          isActive: newIsActive,
        });

        const updatedProducts = await getActiveProducts(true);
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
      setNewImages([]);
      setIsCombo(false);
      setSelectedComboProductIds([]);
      setUploadSuccess(false);
    }
  };

  // Abrir Modal para Marcar como Ya Vendido
  const handleOpenSoldModal = (prod: Product) => {
    setSoldProduct(prod);
    setSoldQuantity(1);
    setSoldPriceUnit(prod.publicPrice);
    setSoldNote('Venta realizada previamente fuera de plataforma');
    setShowSoldModal(true);
  };

  // Confirmar y Registrar Venta Previa
  const handleConfirmSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldProduct) return;
    if (soldQuantity <= 0) {
      alert('La cantidad vendida debe ser mayor a 0');
      return;
    }

    setSavingSold(true);
    try {
      // 1. Registrar la orden entregada y pagada en el historial de ventas
      const totalAmount = soldPriceUnit * soldQuantity;
      await createPhysicalSaleOrder({
        clientName: 'Venta Registrada Previa',
        clientPhone: 'Mostrador / Histórica',
        items: [{ product: soldProduct, quantity: soldQuantity }],
        total: totalAmount,
        paymentMethod: 'cash',
      });

      // 2. Refrescar lista de pedidos para que sume a las métricas de ingresos, costos y ganancias
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
      }

      // 3. Refrescar productos con el stock actualizado
      const updatedProds = await getActiveProducts();
      if (updatedProds) {
        setProducts(updatedProds);
      }

      setShowSoldModal(false);
      setSoldProduct(null);
    } catch (err: any) {
      console.error('Error al registrar venta previa:', err);
      alert(`Error al registrar venta previa: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setSavingSold(false);
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

  // 1. AJUSTE RÁPIDO DE STOCK (+ / - o directo)
  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const newStockVal = Math.max(0, (product.stock || 0) + delta);
    if (newStockVal === product.stock) return;

    setUpdatingStockId(product.id);
    try {
      // Optimistic update
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStockVal } : p));
      await updateProductInDb(product.id, { stock: newStockVal });
    } catch (err: any) {
      console.error("Error al actualizar stock rápido:", err);
      // Revert optimistic update
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: product.stock } : p));
      alert(`No se pudo actualizar el stock: ${err.message || 'Error de conexión'}`);
    } finally {
      setUpdatingStockId(null);
    }
  };

  // 2. ACTIVAR / PAUSAR VISIBILIDAD (Sin borrar)
  const handleToggleProductActive = async (product: Product) => {
    const currentActive = product.isActive !== false;
    const newActive = !currentActive;

    setTogglingActiveId(product.id);
    try {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newActive } : p));
      await updateProductInDb(product.id, { isActive: newActive });
    } catch (err: any) {
      console.error("Error al cambiar estado activo:", err);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: currentActive } : p));
      alert(`Error al cambiar visibilidad: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setTogglingActiveId(null);
    }
  };

  // 3. DUPLICAR / CLONAR PRODUCTO
  const handleDuplicateProduct = (prod: Product) => {
    setEditingProductId(null); // Nuevo registro
    setNewTitle(`${prod.title} (Copia)`);
    setNewSku(''); // Vacío para que el usuario escriba o se genere nuevo
    setNewCategory(prod.category || 'Electrónica');
    setNewCostUsd(prod.baseCostUsd || 5.0);
    setNewPublicPrice(prod.publicPrice || 250);
    setNewStock(prod.stock || 10);
    setNewImageUrl(prod.images[0] || '');
    setNewImages(prod.images && prod.images.length > 0 ? [...prod.images] : []);
    setIsCombo(Boolean(prod.isCombo));
    setSelectedComboProductIds(prod.comboProductIds || []);
    setNewIsActive(prod.isActive !== false);
    if (prod.batchId) setSelectedBatchId(prod.batchId);
    setShowAddModal(true);
  };

  // 4. EXPORTAR INVENTARIO A CSV (Compatible con Excel y Google Sheets)
  const handleExportInventoryCsv = () => {
    if (products.length === 0) {
      alert("No hay productos para exportar.");
      return;
    }

    const headers = ["SKU", "Título", "Categoría", "Tipo", "Costo USD", "Costo MXN", "Flete MXN", "Costo Total MXN", "Precio Venta MXN", "Utilidad MXN", "Margen %", "Stock", "Estado"];
    const rows = products.map(p => [
      `"${p.sku || ''}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      `"${p.isCombo ? 'Combo' : 'Individual'}"`,
      p.baseCostUsd?.toFixed(2) || '0.00',
      p.baseCostMxn?.toFixed(2) || '0.00',
      p.shippingCostAllocated?.toFixed(2) || '0.00',
      p.totalCostMxn?.toFixed(2) || '0.00',
      p.publicPrice?.toFixed(2) || '0.00',
      p.profitUnit?.toFixed(2) || '0.00',
      `${p.marginPercent?.toFixed(1) || 0}%`,
      p.stock || 0,
      p.isActive === false ? "Pausado" : "Activo"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventario_FoxDrop_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5. ABRIR KARDEX (Historial de movimientos de un producto)
  const handleOpenKardex = (prod: Product) => {
    setKardexProduct(prod);
    setShowKardexModal(true);
  };

  // 6. GESTIÓN DE SELECCIÓN MÚLTIPLE DE PRODUCTOS
  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllVisibleProducts = () => {
    const visibleIds = filteredProducts.map(p => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      // Deseleccionar los visibles
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Seleccionar todos los visibles
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearSelectedProducts = () => {
    setSelectedProductIds([]);
  };

  // 7. APLICAR CAMBIO MASIVO DE CATEGORÍA
  const handleOpenBulkCategoryModal = () => {
    if (selectedProductIds.length === 0) {
      alert("Selecciona al menos un artículo para cambiar de categoría.");
      return;
    }
    const defaultCat = dbCategories[0]?.name || 'Cosmética';
    setBulkTargetCategory(defaultCat);
    setIsBulkCustomCategory(false);
    setBulkCustomCategoryName('');
    setShowBulkCategoryModal(true);
  };

  const handleApplyBulkCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isBulkCustomCategory ? bulkCustomCategoryName.trim() : bulkTargetCategory.trim();
    if (!finalCategory) {
      alert("Por favor ingresa o selecciona el nombre de la categoría.");
      return;
    }

    setSavingBulkCategory(true);
    try {
      await bulkUpdateProductsCategory(selectedProductIds, finalCategory);

      // Actualizar optimistamente el estado local de productos
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          return { ...p, category: finalCategory };
        }
        return p;
      }));

      // Refrescar categorías en la lista si fue una categoría nueva
      const refreshedCats = await fetchAdminCategories();
      if (refreshedCats && refreshedCats.length > 0) {
        setDbCategories(refreshedCats);
      }

      const totalUpdated = selectedProductIds.length;
      setSelectedProductIds([]);
      setShowBulkCategoryModal(false);
      alert(`¡Listo! Se cambió la categoría a "${finalCategory}" para ${totalUpdated} artículo(s).`);
    } catch (err: any) {
      console.error("Error al cambiar categorías masivamente:", err);
      alert(`Error al cambiar categorías: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setSavingBulkCategory(false);
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
      const detectedEmail = posDetectedClient?.email && posDetectedClient.email !== 'Sin correo' ? posDetectedClient.email : undefined;
      const detectedUserId = posDetectedClient?.id && !posDetectedClient.id.startsWith('cli-') ? posDetectedClient.id : undefined;

      const saleResult = await createPhysicalSaleOrder({
        clientName: cleanName,
        clientPhone: cleanPhone,
        clientEmail: detectedEmail,
        userId: detectedUserId,
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

      // Objeto base del ticket
      const ticketData = {
        orderNumber: saleResult.orderNumber,
        items: [...posCart],
        total: posTotal,
        paymentMethod: posPaymentMethod,
        clientPhone: cleanPhone,
        clientName: cleanName,
        pointsEarned: posPointsEarned,
        date: saleResult.date,
      };

      setPosCompletedTicket(ticketData);

      // Generar ticket gráfico nítido en el cliente y sincronizar con servidor
      setGeneratingTicketImg(true);
      setTimeout(async () => {
        try {
          let clientDataUrl = "";
          if (ticketReceiptRef.current) {
            try {
              clientDataUrl = await toPng(ticketReceiptRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                skipFonts: true,
                style: {
                  transform: 'none',
                  animation: 'none',
                  clipPath: 'none',
                  opacity: '1',
                },
              });
            } catch (errCapture) {
              console.warn("No se pudo capturar ticket desde DOM client-side:", errCapture);
            }
          }

          const result = await generateTicketImage({
            ...ticketData,
            imageDataUrl: (clientDataUrl && clientDataUrl.length > 5000) ? clientDataUrl : undefined,
          });

          const finalImgUrl = result?.imageUrl || clientDataUrl;
          if (finalImgUrl) {
            setPosCompletedTicket(prev => prev ? { ...prev, ticketImageUrl: finalImgUrl } : null);
            try {
              await updateOrderStatusInDb(
                saleResult.orderNumber,
                'delivered',
                `Venta física POS | Ticket: ${finalImgUrl}`
              );
              setOrders(prev => prev.map(o => o.id === saleResult.orderNumber ? { ...o, notes: `Venta física POS | Ticket: ${finalImgUrl}` } : o));
            } catch (saveNoteErr) {
              console.warn("No se pudo actualizar nota de ticket en la orden:", saveNoteErr);
            }
          }
        } catch (genErr) {
          console.warn("Error capturando o generando ticket:", genErr);
        } finally {
          setGeneratingTicketImg(false);
        }
      }, 800);

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

  // Compartir imagen del ticket directamente al WhatsApp o galería mediante Web Share API
  const shareTicketImageDirectly = async (ticket: NonNullable<typeof posCompletedTicket>) => {
    try {
      let file: File | null = null;

      // 1. Si tenemos el ref del DOM del ticket en pantalla, renderizarlo con html-to-image de forma segura
      if (ticketReceiptRef.current) {
        try {
          const dataUrl = await toPng(ticketReceiptRef.current, {
            cacheBust: true,
            pixelRatio: 2, // 2x alta resolución nítida
            backgroundColor: '#ffffff',
            skipFonts: true,
            style: {
              transform: 'none',
              animation: 'none',
              clipPath: 'none',
              opacity: '1',
            },
          });

          if (dataUrl && dataUrl.length > 5000) {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            file = new File([blob], `Ticket-${ticket.orderNumber}.png`, { type: "image/png" });

            // Si el ticket no tenía imageUrl en storage, podemos actualizarlo
            if (!ticket.ticketImageUrl) {
              setPosCompletedTicket(prev => prev ? { ...prev, ticketImageUrl: dataUrl } : null);
            }
          }
        } catch (domImgErr) {
          console.warn("Fallo renderizando imagen de ticket desde DOM:", domImgErr);
        }
      }

      // 2. Si no fue posible desde DOM pero hay ticketImageUrl guardado en el ticket
      if (!file && ticket.ticketImageUrl) {
        try {
          const res = await fetch(ticket.ticketImageUrl);
          const blob = await res.blob();
          file = new File([blob], `Ticket-${ticket.orderNumber}.png`, { type: "image/png" });
        } catch (fetchErr) {
          console.warn("Error convirtiendo ticketImageUrl a File:", fetchErr);
        }
      }

      // 3. Compartir archivo directo si Web Share está disponible
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ticket FoxDrop ${ticket.orderNumber}`,
          text: `Foxdrop - Tu atajo al mundo\nComprobante oficial de compra ${ticket.orderNumber}`,
        });
        return;
      }
    } catch (shareErr) {
      console.warn("Web Share API no disponible o cancelado, fallback a WhatsApp estándar:", shareErr);
    }

    // Fallback: Si no soporta compartir archivo directamente, enviar texto con enlace directo a WhatsApp
    sendWhatsAppTicket(ticket);
  };

  const sendWhatsAppTicket = (ticket: NonNullable<typeof posCompletedTicket>) => {
    const methodNames: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta Débito/Crédito',
      spei: 'Transferencia SPEI',
    };

    const itemsSummary = ticket.items
      .map(item => `  ▪ ${item.quantity}x ${item.product.title} - $${(item.product.publicPrice * item.quantity).toFixed(2)} MXN`)
      .join('\n');

    let ticketImgSection = '';
    if (ticket.ticketImageUrl) {
      ticketImgSection = `\n🧾 *Imagen oficial del ticket adjunta:*\n${ticket.ticketImageUrl}\n`;
    }

    const msg = `🦊 *Foxdrop - Tu atajo al mundo*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *COMPROBANTE OFICIAL DE COMPRA*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 *Folio de Venta:* ${ticket.orderNumber}
📅 *Fecha:* ${new Date(ticket.date).toLocaleDateString('es-MX')} ${new Date(ticket.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
👤 *Cliente:* ${ticket.clientName}
📱 *Teléfono:* ${ticket.clientPhone}

🛍️ *DETALLE DE TU COMPRA:*
${itemsSummary}

💳 *Forma de Pago:* ${methodNames[ticket.paymentMethod] || ticket.paymentMethod}
💰 *TOTAL PAGADO:* $${ticket.total.toFixed(2)} MXN
⭐ *Puntos Club Ganados:* +${ticket.pointsEarned} pts
${ticketImgSection}
✨ *¡Tus puntos Club FoxDrop están acreditados!*
Cuando ingreses a nuestra tienda en línea con este número de celular (${ticket.clientPhone}), podrás ver tu saldo de puntos acumulados para canjearlos por descuentos en tus próximas compras.

🦊 *Tienda Online Oficial:* https://foxdrop.mx
¡Muchas gracias por tu compra y confianza! 🔥`;

    sendWhatsAppNotification(ticket.clientPhone, msg);
  };

  const sendWhatsAppNotification = (phone: string, text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
  };

  // Pedidos activos (Exclusivamente pedidos en línea en proceso: pendiente, preparación o en camino.
  // Las ventas en físico (POS) se entregan en el acto y los pedidos entregados/cancelados pasan automáticamente al Historial).
  const activeOrders = orders.filter(o => 
    o.status !== 'cancelled' && 
    o.status !== 'delivered' && 
    !o.id.startsWith('FX-POS')
  );
  // Pedidos cancelados (historial separado de bajas)
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
          {/* BOTÓN DESTACADO: AGENTE INTELIGENTE FOXBOT */}
          <div>
            <button
              onClick={() => { setCrmSubTab('agent'); setMobileSidebarOpen(false); }}
              className={`w-full p-2.5 rounded-2xl font-bold transition flex items-center justify-between border ${
                crmSubTab === 'agent'
                  ? 'bg-gradient-to-r from-[#E65F2B] to-[#FF8A00] text-white border-orange-400 shadow-md ring-2 ring-orange-400/40'
                  : 'bg-gradient-to-r from-slate-900 to-indigo-950/80 text-orange-200 border-indigo-800/40 hover:border-orange-500/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-[#E65F2B] flex items-center justify-center shrink-0 border border-orange-500/30">
                  <Bot className="w-4 h-4 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <span className="block font-black text-xs leading-none">Agente FoxBot</span>
                  <span className="text-[10px] text-orange-300/80 font-normal">Marketing & Ventas AI</span>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                AI 2.0
              </span>
            </button>
          </div>

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
                  <Truck className="w-4 h-4 text-emerald-400" /> Pedidos Activos
                </span>
                {activeOrders.length > 0 ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black animate-pulse">
                    {activeOrders.length}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    0
                  </span>
                )}
              </button>

              <button
                onClick={() => { setCrmSubTab('order_history'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between ${
                  crmSubTab === 'order_history' ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-blue-400" /> Historial de Pedidos
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  crmSubTab === 'order_history' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {orders.length}
                </span>
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

              <button
                onClick={() => { setCrmSubTab('whatsapp'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-bold transition flex items-center justify-between border ${
                  crmSubTab === 'whatsapp' 
                    ? 'bg-emerald-600 text-white shadow-xs border-emerald-500' 
                    : 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-800/40'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp
                </span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  crmSubTab === 'whatsapp' ? 'bg-black/20 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  Live
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
        <div className="p-3 pb-6 md:pb-3 safe-area-bottom border-t border-slate-800/80 bg-slate-900/60 space-y-2.5">
          <button
            onClick={() => {
              setShowPosModal(true);
              setMobileSidebarOpen(false);
            }}
            className="hidden md:flex w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold py-2.5 px-3 rounded-xl text-xs items-center justify-center gap-2 transition shadow-sm cursor-pointer"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
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
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition shrink-0"
                title="Abrir menú lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-sm xs:text-base sm:text-lg text-slate-900 tracking-tight truncate">
                  {crmSubTab === 'inventory' && 'Inventario de Productos'}
                  {crmSubTab === 'batches' && 'Lotes de Importación'}
                  {crmSubTab === 'orders' && 'Pedidos Activos (En Proceso)'}
                  {crmSubTab === 'order_history' && 'Historial General de Pedidos & Ventas'}
                  {crmSubTab === 'cancelled_orders' && 'Pedidos Cancelados'}
                  {crmSubTab === 'special_orders' && 'Encargos Especiales'}
                  {crmSubTab === 'carts' && 'Carritos Abandonados'}
                  {crmSubTab === 'clients' && 'Directorio de Clientes'}
                  {crmSubTab === 'loyalty' && 'Club FoxDrop & Fidelidad'}
                  {crmSubTab === 'finance' && 'Margen de Utilidad & Finanzas'}
                  {crmSubTab === 'carousel' && 'Carrusel Hero de la Tienda'}
                  {crmSubTab === 'shipping_payments' && 'Configuración de Envíos & Pagos (SPEI)'}
                  {crmSubTab === 'whatsapp' && 'WhatsApp Central FoxDrop'}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block truncate">
                  {crmSubTab === 'inventory' && 'Catálogo, costos base, precios de venta y existencias'}
                  {crmSubTab === 'batches' && 'Prorrateo de fletes internacionales y costeo unitario'}
                  {crmSubTab === 'orders' && 'Solo órdenes en línea activas pendientes de empaque y despacho'}
                  {crmSubTab === 'order_history' && 'Registro histórico consolidado de ventas físicas (Mostrador POS) y pedidos web (Entregados, Cancelados y Activos)'}
                  {crmSubTab === 'cancelled_orders' && 'Historial de cancelaciones y motivos reportados'}
                  {crmSubTab === 'special_orders' && 'Cotizaciones y solicitudes a medida de clientes'}
                  {crmSubTab === 'carts' && 'Bolsas pendientes y recuperación directa por WhatsApp'}
                  {crmSubTab === 'clients' && 'Perfiles, puntos acumulados y compras conectadas'}
                  {crmSubTab === 'loyalty' && 'Configuración de estrellas por peso, niveles e inversión'}
                  {crmSubTab === 'finance' && 'Rendimiento financiero y márgenes de ganancia'}
                  {crmSubTab === 'carousel' && 'Banners destacados y colecciones visuales'}
                  {crmSubTab === 'shipping_payments' && 'Edita métodos de entrega, costos y datos bancarios para transferencia'}
                  {crmSubTab === 'whatsapp' && 'Bandeja de entrada compartida en tiempo real para socios con plantillas y confirmaciones de compra'}
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
        <main className={`flex-1 w-full mx-auto space-y-6 ${
          crmSubTab === 'whatsapp' 
            ? 'max-w-none p-2 sm:p-4 pb-20 md:pb-4' 
            : 'max-w-7xl p-4 sm:p-6 pb-36 md:pb-8'
        }`}>

        {/* 1. SECCIÓN INVENTARIO & GESTIÓN DE ARTÍCULOS */}
        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Control de Inventario y Edición</h2>
                <p className="text-xs text-slate-500">Administra, edita precios/stock o elimina artículos del catálogo.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar SKU, título..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 w-44 sm:w-56"
                  />
                </div>

                {/* Categoría Selector */}
                <select
                  value={inventoryCategoryFilter}
                  onChange={e => setInventoryCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400"
                >
                  <option value="all">Todas las categorías</option>
                  {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Botón Exportar CSV / Excel */}
                <button
                  onClick={handleExportInventoryCsv}
                  title="Exportar inventario completo a archivo Excel / CSV"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </button>

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

            {/* BARRA DE FILTROS RÁPIDOS & SEMÁFORO DE STOCK */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Todos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {products.length}
                </span>
              </button>

              <button
                onClick={() => setStockFilter('low_stock')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50/50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Bajo Stock (1 a 3)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'low_stock' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 font-bold'}`}>
                  {countLowStock}
                </span>
              </button>

              <button
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50/50'
                }`}
              >
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>Agotados (0 pzas)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'out_of_stock' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 font-bold'}`}>
                  {countOutOfStock}
                </span>
              </button>

              <button
                onClick={() => setStockFilter('healthy')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'healthy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50/50'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Stock Óptimo (&gt;3)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'healthy' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'}`}>
                  {countHealthy}
                </span>
              </button>

              <button
                onClick={() => setStockFilter('combos')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'combos'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-purple-200 text-purple-800 hover:bg-purple-50/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Combos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'combos' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800 font-bold'}`}>
                  {countCombos}
                </span>
              </button>

              <button
                onClick={() => setStockFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                  stockFilter === 'inactive'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50/50'
                }`}
              >
                <Power className="w-3.5 h-3.5 text-rose-500" />
                <span>Apagados</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'inactive' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                  {countInactive}
                </span>
              </button>
            </div>

            {/* BARRA FLOTANTE DE ACCIONES EN LOTE (CUANDO HAY ARTÍCULOS SELECCIONADOS) */}
            {selectedProductIds.length > 0 && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-[#E65F2B] text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedProductIds.length} seleccionados</span>
                  </div>
                  <span className="text-xs text-slate-300 hidden sm:inline">
                    Aplica cambios a todos los artículos seleccionados simultáneamente.
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleOpenBulkCategoryModal}
                    className="bg-[#2D4A58] hover:bg-[#3d6072] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-2 border border-slate-700 shadow-xs cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Categoría ({selectedProductIds.length})</span>
                  </button>

                  <button
                    onClick={handleClearSelectedProducts}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Deseleccionar</span>
                  </button>
                </div>
              </div>
            )}

            {/* TABLA DE PRODUCTOS (DESKTOP) Y TARJETAS TÁCTILES (MÓVIL) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {/* VISTA DESKTOP (TABLA COMPLETA) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAllVisibleProducts}
                          title={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id)) ? "Deseleccionar todos" : "Seleccionar todos"}
                          className="text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id)) ? (
                            <CheckSquare className="w-4 h-4 text-[#E65F2B]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">Artículo</th>
                      <th className="py-3 px-4">Lote / Flete</th>
                      <th className="py-3 px-4 font-black text-slate-900">Costo Total</th>
                      <th className="py-3 px-4 text-emerald-600 font-black">Precio Venta</th>
                      <th className="py-3 px-4 text-emerald-700">Utilidad</th>
                      <th className="py-3 px-4 text-center">Stock Rápido</th>
                      <th className="py-3 px-4 text-center">En Tienda</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const isOutOfStock = (p.stock || 0) <= 0;
                      const isLowStock = (p.stock || 0) > 0 && (p.stock || 0) <= 3;
                      const isPaused = p.isActive === false;
                      const isSelected = selectedProductIds.includes(p.id);

                      return (
                        <tr 
                          key={p.id} 
                          className={`transition ${
                            isSelected 
                              ? 'bg-orange-50/70 border-l-4 border-l-[#E65F2B]' 
                              : isPaused 
                                ? 'bg-slate-50/70 opacity-60' 
                                : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectProduct(p.id)}
                              className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                              title={isSelected ? "Quitar selección" : "Seleccionar artículo"}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#E65F2B]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img src={p.images[0]} alt="" className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0" />
                                {p.images.length > 1 && (
                                  <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1 rounded-sm shadow-2xs">
                                    +{p.images.length}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{p.title}</span>
                                  {p.isCombo && (
                                    <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-purple-200">
                                      COMBO
                                    </span>
                                  )}
                                  {isPaused && (
                                    <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                      PAUSADO
                                    </span>
                                  )}
                                </div>
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
                          
                          {/* CONTROL RÁPIDO DE STOCK (+ / -) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                              <button
                                onClick={() => handleQuickStockAdjust(p, -1)}
                                disabled={p.stock <= 0 || updatingStockId === p.id}
                                title="Descontar 1 pieza"
                                className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`min-w-[42px] px-1.5 py-0.5 text-center font-mono font-bold text-xs rounded-md ${
                                isOutOfStock ? 'bg-rose-100 text-rose-700 font-black' :
                                isLowStock ? 'bg-amber-100 text-amber-800 font-black' :
                                'text-slate-800'
                              }`}>
                                {updatingStockId === p.id ? '...' : p.stock}
                              </span>
                              <button
                                onClick={() => handleQuickStockAdjust(p, 1)}
                                disabled={updatingStockId === p.id}
                                title="Sumar 1 pieza"
                                className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="block text-[9px] mt-0.5 font-bold">
                              {isOutOfStock ? (
                                <span className="text-rose-600 font-bold">Agotado</span>
                              ) : isLowStock ? (
                                <span className="text-amber-600 font-bold">Por agotarse</span>
                              ) : (
                                <span className="text-emerald-600">Disponible</span>
                              )}
                            </span>
                          </td>

                          {/* TOGGLE VISIBILIDAD EN TIENDA */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleProductActive(p)}
                              disabled={togglingActiveId === p.id}
                              title={p.isActive !== false ? "Artículo encendido en tienda (clic para apagar)" : "Artículo apagado en tienda (clic para encender)"}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto shadow-2xs ${
                                p.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                                  : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 active:scale-95'
                              }`}
                            >
                              <Power className={`w-3.5 h-3.5 ${p.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`} />
                              <span>{p.isActive !== false ? 'Encendido' : 'Apagado'}</span>
                            </button>
                          </td>

                          {/* ACCIONES */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenSoldModal(p)}
                                title="Marcar piezas como ya vendidas en mostrador o fuera de la web"
                                className="px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden lg:inline">Ya Vendido</span>
                              </button>
                              <button
                                onClick={() => handleOpenKardex(p)}
                                title="Ver Kardex / Historial de movimientos"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                title="Duplicar / Clonar este producto para dar de alta uno similar"
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                title="Editar artículo"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.title)}
                                title="Eliminar artículo"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL OPTIMIZADA (TARJETAS INTUITIVAS TIPO APP) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredProducts.length > 0 && (
                  <div className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                    <button
                      type="button"
                      onClick={handleSelectAllVisibleProducts}
                      className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer hover:text-slate-900"
                    >
                      {filteredProducts.every(p => selectedProductIds.includes(p.id)) ? (
                        <CheckSquare className="w-4 h-4 text-[#E65F2B]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>
                        {filteredProducts.every(p => selectedProductIds.includes(p.id))
                          ? 'Deseleccionar todos'
                          : `Seleccionar todos (${filteredProducts.length})`}
                      </span>
                    </button>
                    {selectedProductIds.length > 0 && (
                      <span className="text-[11px] font-bold text-[#E65F2B]">
                        {selectedProductIds.length} marcado(s)
                      </span>
                    )}
                  </div>
                )}
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No se encontraron productos coincidentes con los filtros aplicados.
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isOutOfStock = (p.stock || 0) <= 0;
                    const isLowStock = (p.stock || 0) > 0 && (p.stock || 0) <= 3;
                    const isPaused = p.isActive === false;
                    const isSelected = selectedProductIds.includes(p.id);

                    return (
                      <div 
                        key={p.id} 
                        className={`p-4 space-y-3 transition ${
                          isSelected 
                            ? 'bg-orange-50/80 border-l-4 border-l-[#E65F2B]' 
                            : isPaused 
                              ? 'bg-slate-50/70 opacity-70' 
                              : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox táctil para celular */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelectProduct(p.id)}
                            className="pt-1 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                            title={isSelected ? "Quitar selección" : "Seleccionar artículo"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-[#E65F2B]" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>

                          <div className="relative shrink-0">
                            <img 
                              src={p.images[0]} 
                              alt="" 
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50" 
                            />
                            {p.images.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1 rounded-sm shadow-2xs">
                                +{p.images.length}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                                {p.title}
                              </h4>
                              <button
                                onClick={() => handleToggleProductActive(p)}
                                disabled={togglingActiveId === p.id}
                                title={!isPaused ? "Artículo encendido (clic para apagar)" : "Artículo apagado (clic para encender)"}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition flex items-center gap-1 shadow-2xs ${
                                  !isPaused
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                                    : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 active:scale-95'
                                }`}
                              >
                                <Power className={`w-3 h-3 ${!isPaused ? 'text-emerald-600' : 'text-rose-600'}`} />
                                <span>{!isPaused ? 'Encendido' : 'Apagado'}</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {p.sku || 'Sin SKU'} • <span className="font-semibold text-slate-600">{p.category}</span>
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {p.isCombo && (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-200">
                                  COMBO
                                </span>
                              )}
                              <span className="bg-orange-50 text-[#E65F2B] border border-orange-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {p.batchName || 'Lote 1'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                +${p.shippingCostAllocated.toFixed(0)} flete
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Control Rápido de Stock en Celular */}
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>Stock disponible:</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickStockAdjust(p, -1)}
                              disabled={p.stock <= 0 || updatingStockId === p.id}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs disabled:opacity-30"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`px-2 py-0.5 text-xs font-mono font-black rounded-md ${
                              isOutOfStock ? 'bg-rose-100 text-rose-700' :
                              isLowStock ? 'bg-amber-100 text-amber-800' :
                              'bg-white border border-slate-200 text-slate-900'
                            }`}>
                              {updatingStockId === p.id ? '...' : `${p.stock} pzas`}
                            </span>
                            <button
                              onClick={() => handleQuickStockAdjust(p, 1)}
                              disabled={updatingStockId === p.id}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
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
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <button
                            onClick={() => handleOpenSoldModal(p)}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ya Vendido</span>
                          </button>
                          <button
                            onClick={() => handleOpenKardex(p)}
                            title="Kardex"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs p-2 rounded-xl border border-indigo-100 transition"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            title="Clonar"
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs p-2 rounded-xl border border-purple-100 transition"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition flex items-center justify-center border border-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
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

                      {/* Si es venta física o tiene ticket registrado, botón para ver y compartir ticket */}
                      {(order.id.startsWith("FX-POS") || (order.notes && order.notes.includes("Ticket:"))) && (
                        <button
                          onClick={() => setViewingTicketOrder(order)}
                          title="Ver y re-enviar ticket oficial de venta"
                          className="bg-orange-50 hover:bg-orange-100 text-[#E65F2B] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs border border-orange-200 shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Ver Ticket
                        </button>
                      )}

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

        {/* 4. SECCIÓN HISTORIAL GENERAL DE PEDIDOS & VENTAS */}
        {crmSubTab === 'order_history' && (() => {
          // Filtrado del historial según canal, estado y término de búsqueda
          const filteredHistory = orders.filter(order => {
            const isPos = order.id.startsWith('FX-POS');
            
            // Filtro por canal
            if (orderHistoryChannelFilter === 'pos' && !isPos) return false;
            if (orderHistoryChannelFilter === 'online' && isPos) return false;

            // Filtro por estado
            if (orderHistoryStatusFilter !== 'all' && order.status !== orderHistoryStatusFilter) return false;

            // Filtro por búsqueda
            if (orderHistorySearchTerm.trim()) {
              const query = orderHistorySearchTerm.toLowerCase();
              const matchId = order.id.toLowerCase().includes(query);
              const matchClient = order.clientName?.toLowerCase().includes(query);
              const matchPhone = order.clientPhone?.toLowerCase().includes(query);
              const matchProduct = order.order_items?.some(it => it.product_title?.toLowerCase().includes(query));
              if (!matchId && !matchClient && !matchPhone && !matchProduct) return false;
            }

            return true;
          });

          // Métricas rápidas del historial
          const totalHistoryRevenue = filteredHistory
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total || 0), 0);

          const posCount = orders.filter(o => o.id.startsWith('FX-POS')).length;
          const onlineCount = orders.filter(o => !o.id.startsWith('FX-POS')).length;
          const deliveredCount = orders.filter(o => o.status === 'delivered').length;
          const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

          return (
            <div className="space-y-5">
              {/* Encabezado y Métricas Rápidas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Historial General de Pedidos & Ventas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registro completo de transacciones físicas de mostrador y pedidos web (entregados, en curso y cancelados).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl font-bold">
                    {filteredHistory.length} registros encontrados
                  </span>
                </div>
              </div>

              {/* Tarjetas de Resumen Rápido */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Registrado</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900">
                    ${totalHistoryRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </div>
                  <span className="text-[10px] text-slate-400">En ventas no canceladas</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Mostrador POS</span>
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-orange-700">
                    {posCount} <span className="text-xs font-medium text-slate-500">ventas</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Entregadas en físico</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tienda Online</span>
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-blue-700">
                    {onlineCount} <span className="text-xs font-medium text-slate-500">órdenes</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Pedidos web realizados</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Completados</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-700">
                    {deliveredCount} <span className="text-xs font-medium text-slate-500">entregados</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{cancelledCount} cancelados</span>
                </div>
              </div>

              {/* Filtros Interactivos: Canal, Estado y Buscador */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Buscador */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por folio (FX-...), cliente, teléfono o producto..."
                      value={orderHistorySearchTerm}
                      onChange={e => setOrderHistorySearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition"
                    />
                    {orderHistorySearchTerm && (
                      <button
                        onClick={() => setOrderHistorySearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Selector de Canal */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">Canal:</span>
                    <button
                      onClick={() => setOrderHistoryChannelFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        orderHistoryChannelFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setOrderHistoryChannelFilter('pos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        orderHistoryChannelFilter === 'pos'
                          ? 'bg-[#E65F2B] text-white'
                          : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Mostrador (POS)
                    </button>
                    <button
                      onClick={() => setOrderHistoryChannelFilter('online')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        orderHistoryChannelFilter === 'online'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> Tienda Online
                    </button>
                  </div>

                  {/* Selector de Estado */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">Estado:</span>
                    <select
                      value={orderHistoryStatusFilter}
                      onChange={e => setOrderHistoryStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold focus:outline-none focus:border-slate-400"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="delivered">✓ Entregados</option>
                      <option value="shipped">🚚 En Camino</option>
                      <option value="processing">⏳ En Preparación</option>
                      <option value="pending">🕒 Pendientes</option>
                      <option value="cancelled">✕ Cancelados</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista de Registros */}
              {filteredHistory.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
                  No se encontraron pedidos en el historial con los filtros aplicados.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredHistory.map(order => {
                    const isPos = order.id.startsWith('FX-POS');
                    const isCancelled = order.status === 'cancelled';
                    const isDelivered = order.status === 'delivered';

                    // Etiqueta de medio de compra
                    const channelLabel = isPos ? 'Mostrador (POS Físico)' : 'Tienda Online Web';
                    const shippingDesc = isPos 
                      ? 'Entrega Inmediata en Mostrador' 
                      : order.shippingType === 'puebla_local' 
                      ? 'Envío Local Puebla' 
                      : order.shippingType === 'national_shipping'
                      ? 'Envío Nacional Estafeta/DHL'
                      : 'Punto de Entrega Acordado';

                    // Etiqueta de método de pago
                    const paymentLabel = order.paymentMethod === 'card'
                      ? '💳 Tarjeta'
                      : order.paymentMethod === 'spei'
                      ? '⚡ SPEI'
                      : '💵 Efectivo';

                    return (
                      <div
                        key={order.id}
                        className={`bg-white border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-2xs transition ${
                          isCancelled
                            ? 'border-red-200 bg-red-50/20 opacity-80'
                            : isPos
                            ? 'border-orange-100 hover:border-orange-300'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Información del Pedido */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm font-mono">{order.id}</span>
                            
                            {/* Insignia Canal de Venta */}
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                              isPos
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {isPos ? <ShoppingBag className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              {channelLabel}
                            </span>

                            {/* Insignia Estado */}
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isCancelled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isDelivered
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'shipped'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isCancelled ? '✕ Cancelado' : isDelivered ? '✓ Entregado' : order.status === 'shipped' ? '🚚 En Camino' : '⏳ En Proceso'}
                            </span>

                            {/* Forma de Pago */}
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                              {paymentLabel}
                            </span>

                            <span className="text-slate-400 text-[11px]">
                              {new Date(order.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-slate-700">
                            <p className="font-bold text-slate-900">
                              {order.clientName || 'Cliente FoxDrop'} • <span className="font-normal text-slate-500 font-mono">{order.clientPhone}</span>
                            </p>
                            <span className="text-slate-400 hidden sm:inline">•</span>
                            <p className="text-slate-600 text-[11px]">
                              Método de Entrega: <strong className="text-slate-800">{shippingDesc}</strong>
                            </p>
                          </div>

                          {/* Artículos Comprados */}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-700 block mb-0.5">Productos adquiridos:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {order.order_items.map((it, idx) => (
                                  <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-800 font-medium">
                                    {it.quantity}x {it.product_title || 'Producto'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notas o motivo de cancelación */}
                          {order.notes && (
                            <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                              {order.notes}
                            </p>
                          )}
                        </div>

                        {/* Montos y Acciones */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block">Total Pagado</span>
                            <span className={`text-base font-black ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              ${order.total.toFixed(2)} MXN
                            </span>
                          </div>

                          {/* Botón Ver Ticket Oficial */}
                          {(isPos || (order.notes && order.notes.includes("Ticket:"))) && (
                            <button
                              onClick={() => setViewingTicketOrder(order)}
                              title="Ver y re-enviar comprobante oficial de ticket"
                              className="bg-orange-50 hover:bg-orange-100 text-[#E65F2B] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition text-xs border border-orange-200 shadow-2xs"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Ver Ticket
                            </button>
                          )}

                          {/* Botón WhatsApp */}
                          {order.clientPhone && order.clientPhone !== 'Mostrador / Histórica' && (
                            <button
                              onClick={() => sendWhatsAppNotification(
                                order.clientPhone,
                                `Hola ${order.clientName || ''}! Te contactamos de FoxDrop respecto a tu pedido ${order.id}. Estamos a tu servicio para cualquier duda o consulta sobre tu compra.`
                              )}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-2xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> WA
                            </button>
                          )}

                          {/* Botón Eliminar Permanente */}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            title="Eliminar pedido permanentemente de la base de datos"
                            className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 font-bold p-2 rounded-xl flex items-center transition text-xs border border-slate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 5. SECCIÓN PEDIDOS CANCELADOS (HISTORIAL SEPARADO) */}
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
                              <button
                                onClick={() => handleDeleteClient(client)}
                                disabled={deletingClientId === client.id}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 p-1.5 rounded transition disabled:opacity-50"
                                title="Eliminar cuenta de cliente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-700 font-bold">Imagen del Banner *</label>
                        <label className="text-[10px] font-bold text-[#E65F2B] hover:underline cursor-pointer flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Subir desde dispositivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setSavingSlide(true);
                              try {
                                const url = await uploadProductImage(file);
                                setSlideImageUrl(url);
                              } catch (errUpload) {
                                console.warn("Error subiendo imagen de slide:", errUpload);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    setSlideImageUrl(reader.result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              } finally {
                                setSavingSlide(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="url"
                        required
                        value={slideImageUrl}
                        onChange={e => setSlideImageUrl(e.target.value)}
                        placeholder="https://... o sube una imagen arriba"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                      />
                      {slideImageUrl && (
                        <div className="mt-2 h-20 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                          <img src={slideImageUrl} alt="Preview" className="h-full w-full object-cover opacity-90" />
                        </div>
                      )}
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
                  Valor económico a redimir (${(Number(clubSettings.pointMonetaryValueMxn) || 0).toFixed(2)} MXN por {clubSettings.currencySymbol}).
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
                    value={clubSettings.pesosPerPoint === 0 || isNaN(Number(clubSettings.pesosPerPoint)) ? '' : clubSettings.pesosPerPoint}
                    onChange={e => {
                      const val = e.target.value;
                      setClubSettings({
                        ...clubSettings,
                        pesosPerPoint: val === '' ? ('' as any) : Number(val),
                      });
                    }}
                    onBlur={() => {
                      const num = Number(clubSettings.pesosPerPoint);
                      if (isNaN(num) || num < 1) {
                        setClubSettings({ ...clubSettings, pesosPerPoint: 10 });
                      }
                    }}
                    placeholder="10"
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
                    value={clubSettings.pointMonetaryValueMxn === 0 || isNaN(Number(clubSettings.pointMonetaryValueMxn)) ? '' : clubSettings.pointMonetaryValueMxn}
                    onChange={e => {
                      const val = e.target.value;
                      setClubSettings({
                        ...clubSettings,
                        pointMonetaryValueMxn: val === '' ? ('' as any) : Number(val),
                      });
                    }}
                    onBlur={() => {
                      const num = Number(clubSettings.pointMonetaryValueMxn);
                      if (isNaN(num) || num <= 0) {
                        setClubSettings({ ...clubSettings, pointMonetaryValueMxn: 0.1 });
                      }
                    }}
                    placeholder="0.10"
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
                    +{Math.floor(500 / (Number(clubSettings.pesosPerPoint) || 10))} {clubSettings.currencySymbol} {clubSettings.currencyName}
                  </span>
                  , con un valor de recompensa estimado de{' '}
                  <strong>${((Math.floor(500 / (Number(clubSettings.pesosPerPoint) || 10))) * (Number(clubSettings.pointMonetaryValueMxn) || 0.1)).toFixed(2)} MXN</strong> (inversión de fidelidad del {(((Math.floor(500 / (Number(clubSettings.pesosPerPoint) || 10)) * (Number(clubSettings.pointMonetaryValueMxn) || 0.1)) / 500) * 100).toFixed(1)}%).
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
                        value={tier.minPoints === undefined || isNaN(Number(tier.minPoints)) ? '' : tier.minPoints}
                        onChange={e => {
                          const val = e.target.value;
                          const updated = [...clubSettings.tiers];
                          updated[idx] = {
                            ...updated[idx],
                            minPoints: val === '' ? ('' as any) : Number(val),
                          };
                          setClubSettings({ ...clubSettings, tiers: updated });
                        }}
                        onBlur={() => {
                          const updated = [...clubSettings.tiers];
                          const num = Number(updated[idx].minPoints);
                          updated[idx] = {
                            ...updated[idx],
                            minPoints: isNaN(num) || num < 0 ? 0 : num,
                          };
                          setClubSettings({ ...clubSettings, tiers: updated });
                        }}
                        placeholder="0"
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
                          value={tier.discountPercent === undefined || isNaN(Number(tier.discountPercent)) ? '' : tier.discountPercent}
                          onChange={e => {
                            const val = e.target.value;
                            const updated = [...clubSettings.tiers];
                            updated[idx] = {
                              ...updated[idx],
                              discountPercent: val === '' ? ('' as any) : Number(val),
                            };
                            setClubSettings({ ...clubSettings, tiers: updated });
                          }}
                          onBlur={() => {
                            const updated = [...clubSettings.tiers];
                            const num = Number(updated[idx].discountPercent);
                            updated[idx] = {
                              ...updated[idx],
                              discountPercent: isNaN(num) ? 0 : Math.max(0, Math.min(100, num)),
                            };
                            setClubSettings({ ...clubSettings, tiers: updated });
                          }}
                          placeholder="0"
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

                {/* Nombre del Titular con Checkbox para mostrar/ocultar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Nombre del Titular / Beneficiario
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-slate-800">
                      <input
                        type="checkbox"
                        checked={checkoutSettings.bankTransfer.showHolder !== false}
                        onChange={e => setCheckoutSettings({
                          ...checkoutSettings,
                          bankTransfer: { ...checkoutSettings.bankTransfer, showHolder: e.target.checked }
                        })}
                        className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-3.5 h-3.5"
                      />
                      Mostrar al cliente
                    </label>
                  </div>
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

                {/* CLABE con Checkbox para mostrar/ocultar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      CLABE Interbancaria (18 dígitos)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-slate-800">
                      <input
                        type="checkbox"
                        checked={checkoutSettings.bankTransfer.showClabe !== false}
                        onChange={e => setCheckoutSettings({
                          ...checkoutSettings,
                          bankTransfer: { ...checkoutSettings.bankTransfer, showClabe: e.target.checked }
                        })}
                        className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-3.5 h-3.5"
                      />
                      Mostrar al cliente
                    </label>
                  </div>
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

                {/* Número de Tarjeta o Cuenta con Checkbox para mostrar/ocultar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Número de Tarjeta o Cuenta
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-slate-800">
                      <input
                        type="checkbox"
                        checked={checkoutSettings.bankTransfer.showCard !== false}
                        onChange={e => setCheckoutSettings({
                          ...checkoutSettings,
                          bankTransfer: { ...checkoutSettings.bankTransfer, showCard: e.target.checked }
                        })}
                        className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-3.5 h-3.5"
                      />
                      Mostrar al cliente
                    </label>
                  </div>
                  <input
                    type="text"
                    value={checkoutSettings.bankTransfer.accountNumber || ''}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      bankTransfer: { ...checkoutSettings.bankTransfer, accountNumber: e.target.value }
                    })}
                    placeholder="Ej. 5428780313554651"
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

        {/* 12. SECCIÓN AGENTE FOXBOT AI (MARKETING, SEGUIMIENTO & VENTAS) */}
        {crmSubTab === 'agent' && (
          <div className="space-y-6">
            {/* Encabezado del Agente */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-900/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E65F2B] to-[#FF8A00] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
                    <Bot className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">FoxBot AI Copilot</h2>
                      <span className="bg-orange-500 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                        Gemini Pro
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Tu asistente comercial autónomo. Promociona productos, crea posts para Instagram/TikTok, da seguimiento a pedidos en Puebla y recupera carritos con 1 clic.
                    </p>
                  </div>
                </div>

                {/* Subtabs del Agente */}
                <div className="flex flex-wrap bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 self-start md:self-auto gap-1">
                  <button
                    onClick={() => setAgentActiveTab('weekly_plan')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      agentActiveTab === 'weekly_plan'
                        ? 'bg-[#E65F2B] text-white shadow-sm ring-2 ring-orange-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-amber-300" />
                    <span>📅 Difusión Continua (7 Días)</span>
                  </button>
                  <button
                    onClick={() => setAgentActiveTab('marketing')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      agentActiveTab === 'marketing'
                        ? 'bg-[#E65F2B] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Post Individual</span>
                  </button>
                  <button
                    onClick={() => setAgentActiveTab('chat')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      agentActiveTab === 'chat'
                        ? 'bg-[#E65F2B] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat con FoxBot</span>
                  </button>
                  <button
                    onClick={() => setAgentActiveTab('sales_radar')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      agentActiveTab === 'sales_radar'
                        ? 'bg-[#E65F2B] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Radar de Pedidos ({orders.filter(o => o.status === 'pending' || o.status === 'processing').length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA 0: DIFUSIÓN CONTINUA / PLAN SEMANAL (7 DÍAS) */}
            {agentActiveTab === 'weekly_plan' && (
              <div className="space-y-6">
                {/* Generador de Campaña */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-orange-100 text-[#E65F2B] rounded-xl">
                          <CalendarDays className="w-5 h-5" />
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Parrilla de Difusión Continua (7 Días)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        FoxBot organiza los 4 pilares probados para dar a conocer la tienda en Puebla (Novedad, Curiosidad, Oferta y Confianza Local). Genera con 1 solo clic los 7 copys y flyers publicitarios listos para publicar en Facebook, Instagram y WhatsApp.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <button
                        onClick={handleGenerateWeeklyPlan}
                        disabled={agentGeneratingPlan || products.length === 0}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#E65F2B] to-[#FF8A00] hover:opacity-95 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
                      >
                        {agentGeneratingPlan ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Diseñando Estrategia con IA...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            <span>Generar Plan Semanal con FoxBot</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Input de Enfoque Opcional */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                    <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      Enfoque o Temporada (Opcional):
                    </span>
                    <input
                      type="text"
                      value={agentPlanFocusTheme}
                      onChange={e => setAgentPlanFocusTheme(e.target.value)}
                      placeholder="Ej. Quincena de novedades, Especial cuidado de la piel en Puebla, Liquidación de temporada..."
                      className="flex-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>
                </div>

                {/* Parrilla de los 7 Días */}
                {agentWeeklyPlan && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          Campaña activa: {agentWeeklyPlan.theme}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Generado el {new Date(agentWeeklyPlan.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        7 publicaciones listas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {agentWeeklyPlan.days.map((day: AgentWeeklyCalendarDay, idx: number) => (
                        <div
                          key={day.id || idx}
                          className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3 relative group"
                        >
                          <div>
                            {/* Cabecera del Día */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#E65F2B]" />
                                {day.dayName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                                {day.suggestedTime}
                              </span>
                            </div>

                            {/* Pilar de Contenido */}
                            <div className="mb-2.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200/60 inline-block">
                                {day.pillarLabel}
                              </span>
                            </div>

                            {/* Tarjeta del Producto */}
                            <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-100 mb-3">
                              {day.productImage ? (
                                <img
                                  src={day.productImage}
                                  alt={day.productTitle}
                                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">
                                  🦊
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 text-xs block truncate" title={day.productTitle}>
                                  {day.productTitle}
                                </span>
                                <span className="font-mono font-black text-[#E65F2B] text-xs">
                                  ${day.productPrice} MXN
                                </span>
                              </div>
                            </div>

                            {/* Gancho y Copy Preview */}
                            <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug mb-1">
                              {day.headline}
                            </h4>
                            <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                              {day.caption}
                            </p>
                          </div>

                          {/* Acciones del Día */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="text-[10px] text-slate-400 font-medium">
                              Canal recomendado: <strong className="text-slate-700">{day.suggestedNetwork}</strong>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                              <button
                                onClick={() => setAgentSelectedDayForModal(day)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition flex items-center justify-center gap-1 text-[11px]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Copy & Flyer</span>
                              </button>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(day.fullCopy)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center gap-1 text-[11px] shadow-2xs"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!agentWeeklyPlan && !agentGeneratingPlan && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 shadow-2xs">
                    <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#E65F2B] flex items-center justify-center mx-auto">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Aún no has generado el plan de esta semana</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        Presiona el botón de arriba para que FoxBot organice tus 7 publicaciones semanales automáticas con ganchos virales y hashtags de Puebla.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL DETALLE DE PUBLICACIÓN & FLYER HD DESCARGABLE */}
            {agentSelectedDayForModal && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setAgentSelectedDayForModal(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-base font-black text-slate-900">
                      Publicación de {agentSelectedDayForModal.dayName}
                    </span>
                    <span className="text-xs bg-orange-100 text-[#E65F2B] font-black px-2.5 py-0.5 rounded-full">
                      {agentSelectedDayForModal.pillarLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* COLUMNA 1: FLYER HD OFICIAL GENERADO (html-to-image) */}
                    <div className="md:col-span-5 space-y-3">
                      <span className="text-xs font-bold text-slate-600 block">
                        Flyer Visual HD Oficial para Redes:
                      </span>

                      {/* Elemento que se descarga como imagen PNG */}
                      <div
                        id={`flyer-card-${agentSelectedDayForModal.id}`}
                        ref={flyerFlyerRef}
                        className="w-full aspect-square rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-slate-950 text-white p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>

                        {/* Top: Branding */}
                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">🦊</span>
                            <span className="font-black text-sm tracking-tight text-white">FoxDrop</span>
                            <span className="text-[10px] text-orange-400 font-bold ml-1">Puebla</span>
                          </div>
                          <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                            foxdrop.mx
                          </span>
                        </div>

                        {/* Centro: Imagen del Producto */}
                        <div className="my-auto text-center z-10 flex flex-col items-center">
                          {agentSelectedDayForModal.productImage ? (
                            <img
                              src={agentSelectedDayForModal.productImage}
                              alt={agentSelectedDayForModal.productTitle}
                              className="w-36 h-36 object-contain rounded-2xl drop-shadow-2xl mx-auto my-2 bg-white/5 p-1"
                            />
                          ) : (
                            <div className="w-28 h-28 rounded-2xl bg-orange-500/10 flex items-center justify-center text-4xl mx-auto">
                              📦
                            </div>
                          )}
                          <h3 className="font-black text-sm text-white line-clamp-2 px-2 leading-tight mt-1">
                            {agentSelectedDayForModal.productTitle}
                          </h3>
                        </div>

                        {/* Bottom: Precio & Entregas */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center justify-between z-10 border border-white/10">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-300 block">Precio Especial</span>
                            <span className="text-base font-black text-orange-400 font-mono">
                              ${agentSelectedDayForModal.productPrice} MXN
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-emerald-400 block">Entregas en Puebla</span>
                            <span className="text-[8px] text-slate-300">Plaza Dorada • Angelópolis</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadFlyer(agentSelectedDayForModal)}
                        disabled={downloadingFlyerId === agentSelectedDayForModal.id}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>{downloadingFlyerId === agentSelectedDayForModal.id ? 'Descargando...' : 'Descargar Imagen Flyer HD'}</span>
                      </button>
                    </div>

                    {/* COLUMNA 2: COPY COMPLETO & BOTONES DE DIFUSIÓN */}
                    <div className="md:col-span-7 space-y-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Gancho (Headline):</label>
                        <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-2xl font-black text-slate-900">
                          {agentSelectedDayForModal.headline}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700">Texto Completo (Listo para Pegar):</label>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(agentSelectedDayForModal.fullCopy);
                              alert('¡Texto copiado al portapapeles!');
                            }}
                            className="text-[#E65F2B] font-bold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Copy className="w-3 h-3" /> Copiar Texto
                          </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
                          {agentSelectedDayForModal.fullCopy}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(agentSelectedDayForModal.fullCopy)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Enviar a Grupos / Estados de WhatsApp</span>
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(agentSelectedDayForModal.fullCopy);
                            alert('¡Copy copiado! Pégalo en tu Facebook o Instagram.');
                          }}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copiar para Facebook / Instagram</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 1: CHAT ESTRATÉGICO CON EL AGENTE */}
            {agentActiveTab === 'chat' && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-[650px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#E65F2B] animate-pulse" />
                      Fox • Conectado en Vivo
                    </span>
                    <span className="text-[10px] text-slate-400">({products.length} productos, {orders.length} pedidos)</span>
                  </div>

                  {/* Controles de Voz Fox */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón Briefing Matutino */}
                    <button
                      onClick={() => handleSendAgentChatMessage("Buenos días Fox, dame el briefing ejecutivo del día: entregas en Puebla, finanzas y alertas críticas.")}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      title="Generar y escuchar el resumen operativo de hoy"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>☀️ Briefing Matutino</span>
                    </button>

                    {/* Indicador de Voz Oficial Fija: Hombre Mexicano HD */}
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/80 rounded-xl px-2.5 py-1 shadow-2xs select-none">
                      <Volume2 className="w-3.5 h-3.5 text-[#E65F2B] shrink-0" />
                      <span className="text-[11px] font-black text-orange-950 flex items-center gap-1">
                        <span>🇲🇽</span>
                        <span>Voz Fox (Hombre Mexicano HD)</span>
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={autoVoiceReplyEnabled}
                        onChange={e => {
                          setAutoVoiceReplyEnabled(e.target.checked);
                          if (!e.target.checked) stopFoxVoice();
                        }}
                        className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-3.5 h-3.5"
                      />
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Hablar Respuestas</span>
                    </label>

                    {isVoiceSpeaking && (
                      <button
                        onClick={stopFoxVoice}
                        className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-rose-100 transition animate-pulse"
                      >
                        <VolumeX className="w-3 h-3" />
                        <span>Silenciar</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        stopFoxVoice();
                        setAgentChatMessages([agentChatMessages[0]]);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-700 underline font-semibold"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {agentChatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'agent' && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E65F2B] to-[#FF8A00] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ring-2 ring-orange-400/20">
                          🦊
                        </div>
                      )}
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#2D4A58] text-white rounded-tr-none shadow-xs'
                          : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-2xs'
                      }`}>
                        <div className="whitespace-pre-line font-normal">{msg.text}</div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/40">
                          <span className={`text-[9px] font-mono ${msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                            {msg.timestamp}
                          </span>
                          {msg.sender === 'agent' && (
                            <button
                              onClick={() => speakWithFoxVoice(msg.text)}
                              className="text-slate-400 hover:text-[#E65F2B] transition p-0.5 rounded"
                              title="Escuchar en voz alta"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Tarjeta de Acción Ejecutiva Propuesta por Fox */}
                        {msg.actionExecution && (
                          <div className={`mt-3 p-3 rounded-2xl border transition-all ${
                            msg.actionExecution.status === 'executed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-950 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-extrabold text-[11px] flex items-center gap-1.5">
                                {msg.actionExecution.status === 'executed' ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Acción Ejecutada</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 text-[#E65F2B]" />
                                    <span>Acción de Negocio Propuesta</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white/80 border border-slate-200">
                                {msg.actionExecution.type}
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-slate-700 mb-2.5">
                              {msg.actionExecution.label || 'Fox preparó esta operación.'}
                            </p>

                            {msg.actionExecution.status === 'pending' ? (
                              <button
                                onClick={() => handleExecuteAgentAction(msg.id, msg.actionExecution)}
                                className="w-full py-2 px-3 bg-gradient-to-r from-[#E65F2B] to-[#FF8A00] hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Confirmar & Ejecutar Ahora</span>
                              </button>
                            ) : (
                              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aplicado en Base de Datos
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sugerencias de acción rápida */}
                        {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Comandos rápidos de negocio:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.actionSuggestions.map((sug, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSendAgentChatMessage(sug)}
                                  className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:border-orange-400 hover:text-orange-600 px-2.5 py-1 rounded-xl transition text-left shadow-2xs"
                                >
                                  💬 {sug}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          👤
                        </div>
                      )}
                    </div>
                  ))}

                  {agentChatLoading && (
                    <div className="flex gap-3 justify-start items-center">
                      <div className="w-8 h-8 rounded-xl bg-[#E65F2B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        🦊
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-500 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E65F2B]" />
                        <span>Fox está analizando inventario, pedidos y finanzas de FoxDrop...</span>
                      </div>
                    </div>
                  )}

                  {isVoiceSpeaking && (
                    <div className="flex gap-2 items-center justify-center py-2 bg-orange-50/70 border border-orange-200/80 rounded-2xl text-xs text-orange-950 font-bold animate-pulse">
                      <Volume2 className="w-4 h-4 text-[#E65F2B]" />
                      <span>Fox está hablando...</span>
                      <button
                        onClick={stopFoxVoice}
                        className="ml-2 text-rose-600 underline text-[11px]"
                      >
                        Detener voz
                      </button>
                    </div>
                  )}
                </div>

                {/* Input del Chat con Botón de Voz Fox */}
                <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendAgentChatMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Botón de Micrófono Fox */}
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      title={isVoiceListening ? "Detener escucha" : "Hablar con Fox por micrófono"}
                      className={`p-3 rounded-2xl transition flex items-center justify-center shrink-0 border ${
                        isVoiceListening
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-400/30'
                          : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-[#E65F2B] border-slate-200'
                      }`}
                    >
                      {isVoiceListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#E65F2B]" />}
                    </button>

                    <input
                      type="text"
                      value={agentInputText}
                      onChange={e => setAgentInputText(e.target.value)}
                      placeholder={isVoiceListening ? "🎙️ Escuchando tu voz... habla ahora" : "Pregúntale a Fox o presiona el micrófono para hablar..."}
                      disabled={agentChatLoading}
                      className={`flex-1 px-4 py-3 bg-white border rounded-2xl text-xs focus:outline-none focus:border-[#E65F2B] font-medium text-slate-800 disabled:opacity-50 transition ${
                        isVoiceListening ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={agentChatLoading || !agentInputText.trim()}
                      className="px-5 py-3 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  </form>
                  {isVoiceListening && (
                    <span className="text-[10px] text-rose-600 font-bold mt-1.5 block animate-pulse text-center">
                      🔴 Micrófono activo: Fox te está escuchando. Al terminar de hablar procesará tu instrucción automáticamente.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 2: GENERADOR DE MARKETING & REDES SOCIALES */}
            {agentActiveTab === 'marketing' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulario de Configuración del Post */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm text-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E65F2B]" />
                      Crear Publicación para Redes
                    </h3>
                    <p className="text-[11px] text-slate-500">Selecciona el producto y la red social; el agente redactará el copy con ganchos, hashtags y llamadas a la acción.</p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Producto a Promocionar</label>
                    <select
                      value={agentSelectedProductId}
                      onChange={e => setAgentSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                    >
                      <option value="">-- Elige un producto de tu catálogo --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} (${p.publicPrice} MXN - Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Red Social / Canal</label>
                      <select
                        value={agentPlatform}
                        onChange={e => setAgentPlatform(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                      >
                        <option value="instagram">📸 Instagram Post / Reel</option>
                        <option value="facebook">📘 Facebook Marketplace / Post</option>
                        <option value="tiktok">🎵 TikTok Guion / Caption</option>
                        <option value="whatsapp">💬 Estado / Mensaje WhatsApp</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tono de Voz</label>
                      <select
                        value={agentTone}
                        onChange={e => setAgentTone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                      >
                        <option value="Divertido y entusiasta">🎉 Divertido & Viral</option>
                        <option value="Urgencia y oferta relámpago">🔥 Urgencia (¡Pocas piezas!)</option>
                        <option value="Elegante y exclusivo">✨ Exclusivo & Estético</option>
                        <option value="Directo y comercial">💼 Directo al beneficio</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Público Objetivo</label>
                    <input
                      type="text"
                      value={agentAudience}
                      onChange={e => setAgentAudience(e.target.value)}
                      placeholder="Ej. Jóvenes en Puebla buscando cosméticos coreanos..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Descuento Promocional Extra (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={agentCustomDiscount || ''}
                      onChange={e => setAgentCustomDiscount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#E65F2B] font-mono font-bold"
                    />
                  </div>

                  <button
                    onClick={handleGenerateSocialPost}
                    disabled={agentGeneratingPost || !agentSelectedProductId}
                    className="w-full py-3 bg-gradient-to-r from-[#E65F2B] to-[#FF8A00] hover:opacity-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
                  >
                    {agentGeneratingPost ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generando copy con IA...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Generar Copy de Venta con FoxBot</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Previsualización del Resultado */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between text-xs">
                  {agentGeneratedPost ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">Copy Generado</span>
                          <span className="uppercase text-[9px] font-black bg-orange-100 text-[#E65F2B] px-2 py-0.5 rounded-md">
                            {agentPlatform}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(agentGeneratedPost.fullCopy);
                              setAgentPostCopied(true);
                              setTimeout(() => setAgentPostCopied(false), 2500);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {agentPostCopied ? '¡Copiado!' : 'Copiar Texto'}
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(agentGeneratedPost.fullCopy)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs shadow-xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Compartir a WhatsApp
                          </a>
                        </div>
                      </div>

                      {/* Caja de contenido lista para publicar */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-all max-h-[420px] overflow-y-auto">
                        {agentGeneratedPost.fullCopy}
                      </div>

                      {/* Hashtags sugeridos */}
                      {agentGeneratedPost.hashtags && agentGeneratedPost.hashtags.length > 0 && (
                        <div className="pt-2">
                          <span className="font-bold text-slate-500 text-[11px] block mb-1">Hashtags incluidos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {agentGeneratedPost.hashtags.map((tag, idx) => (
                              <span key={idx} className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-indigo-200/60">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Sparkles className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">Tu publicación aparecerá aquí</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Selecciona un producto del panel izquierdo y presiona el botón para que FoxBot redacte un copy de alta conversión.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 3: RADAR DE PEDIDOS & SEGUIMIENTO INTELIGENTE */}
            {agentActiveTab === 'sales_radar' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        Radar de Pedidos para Seguimiento
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pedidos que requieren confirmación, empaque o aviso de entrega. Genera mensajes de seguimiento de 1 clic para enviar por WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {orders
                      .filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'shipped')
                      .slice(0, 9)
                      .map(order => {
                        const daysSince = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div
                            key={order.id}
                            className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-slate-900 text-xs">{order.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {order.status}
                                </span>
                              </div>

                              <div className="font-bold text-slate-800">{order.clientName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {order.clientPhone}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-emerald-700">
                                Total: ${order.total.toFixed(2)} MXN
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                Hace {daysSince === 0 ? 'hoy' : `${daysSince} día(s)`}
                              </span>
                            </div>

                            <button
                              onClick={() => handleGenerateOrderFollowup(order)}
                              disabled={agentFollowupLoading && agentFollowupOrderId === order.id}
                              className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] shadow-2xs"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-[#E65F2B]" />
                              {agentFollowupLoading && agentFollowupOrderId === order.id
                                ? 'Redactando con IA...'
                                : 'Redactar Seguimiento WhatsApp'}
                            </button>
                          </div>
                        );
                      })}

                    {orders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'shipped').length === 0 && (
                      <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                        🎉 ¡Todo al día! No hay pedidos activos pendientes de entrega en este momento.
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensaje de Seguimiento Generado */}
                {agentGeneratedFollowupText && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-black text-slate-900 text-sm">Mensaje de Seguimiento Listo</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(agentGeneratedFollowupText);
                            alert('¡Mensaje copiado al portapapeles!');
                          }}
                          className="bg-white text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </button>
                        {(() => {
                          const targetOrder = orders.find(o => o.id === agentFollowupOrderId);
                          return (
                            <a
                              href={`https://wa.me/${(targetOrder?.clientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(agentGeneratedFollowupText)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp Ahora
                            </a>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                      {agentGeneratedFollowupText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 13. SECCIÓN WHATSAPP CENTRAL FOXDROP (MULTI-SOCIO EN TIEMPO REAL) */}
        {crmSubTab === 'whatsapp' && (
          <div className="space-y-4">
            <AdminWhatsAppTab
              orders={orders}
              clients={clients}
              adminSessionName={adminSession?.email?.split('@')[0] || 'Mario'}
            />
          </div>
        )}

        {/* MODAL REGISTRAR PRODUCTOS YA VENDIDOS PREVIAMENTE */}
        {showSoldModal && soldProduct && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => { setShowSoldModal(false); setSoldProduct(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  Ajuste de Salida por Venta
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Registrar Piezas Ya Vendidas
                </h3>
                <p className="text-[11px] text-slate-500">
                  Resta las piezas de tu inventario actual y súmalas automáticamente a tus métricas de ingresos, costos y ganancias.
                </p>
              </div>

              {/* Ficha rápida del producto */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                <img
                  src={soldProduct.images[0] || '/file.svg'}
                  alt={soldProduct.title}
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{soldProduct.title}</h4>
                  <span className="text-[10px] text-slate-400 block font-mono">SKU: {soldProduct.sku || 'N/A'}</span>
                  <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                    Stock actual disponible: <strong className="text-slate-900">{soldProduct.stock} piezas</strong>
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmSold} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Cantidad Vendida:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={soldProduct.stock}
                      value={soldQuantity}
                      onChange={e => setSoldQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Precio de Venta ($ MXN):
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="1"
                      value={soldPriceUnit}
                      onChange={e => setSoldPriceUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Nota o Referencia de la Venta:
                  </label>
                  <input
                    type="text"
                    value={soldNote}
                    onChange={e => setSoldNote(e.target.value)}
                    placeholder="Ej. Venta en persona el fin de semana, amigo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#E65F2B]"
                  />
                </div>

                {/* Resumen del impacto en caja y métricas */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center text-emerald-900">
                    <span>Nuevo Stock restante:</span>
                    <strong className="font-mono">{Math.max(0, soldProduct.stock - soldQuantity)} piezas</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-900">
                    <span>Total que se sumará a tus ventas:</span>
                    <strong className="font-mono text-sm font-black text-emerald-800">
                      ${(soldPriceUnit * soldQuantity).toFixed(2)} MXN
                    </strong>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowSoldModal(false); setSoldProduct(null); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSold}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingSold ? 'Registrando...' : 'Confirmar Venta'}</span>
                  </button>
                </div>
              </form>
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

                {/* Subida de Múltiples Imágenes con Buscador y Portapapeles */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-bold block text-xs flex items-center gap-1.5">
                      <span>Fotografías del Producto</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {newImages.length} {newImages.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </label>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Opción 1: Tomar foto directa con la cámara del celular */}
                      <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-700 transition shadow-2xs">
                        <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-xs truncate">
                          {uploadingImage ? 'Procesando...' : '+ Tomar Foto con Cámara'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleMultipleFilesUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      {/* Opción 2: Subir archivos desde la galería / archivos */}
                      <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-700 transition shadow-2xs">
                        <Upload className="w-4 h-4 text-[#E65F2B] shrink-0" />
                        <span className="font-semibold text-xs truncate">
                          {uploadingImage ? 'Subiendo...' : '+ Subir Fotos (Galería)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleMultipleFilesUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      {/* Opción 3: Pegar foto del portapapeles */}
                      <button
                        type="button"
                        onClick={() => handlePasteImage()}
                        disabled={uploadingImage}
                        className="bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-700 transition font-semibold text-xs shadow-2xs truncate"
                      >
                        <Clipboard className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">Pegar foto copiada</span>
                      </button>
                    </div>

                    {uploadSuccess && (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" /> ¡Fotografía añadida a la galería con éxito!
                        </span>
                      </div>
                    )}

                    {/* Galería de Miniaturas de Fotos */}
                    {newImages.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-600 block">Fotos cargadas (la primera será la portada principal):</span>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {newImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-slate-200 bg-white aspect-square shadow-2xs">
                              <img
                                src={imgUrl}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 bg-[#E65F2B] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                                  Portada
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = newImages.filter((_, i) => i !== idx);
                                  setNewImages(updated);
                                  if (updated.length > 0) setNewImageUrl(updated[0]);
                                  else setNewImageUrl('');
                                }}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 opacity-90 hover:opacity-100 hover:scale-110 transition shadow cursor-pointer"
                                title="Eliminar foto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">+ Añadir por URL:</span>
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
                              setNewImages(prev => prev.includes(uploaded) ? prev : [...prev, uploaded]);
                              setUploadSuccess(true);
                            } catch {}
                          }
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* MODALIDAD: PRODUCTO INDIVIDUAL O COMBO */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#E65F2B]" /> Tipo de Oferta / Venta:
                      </span>
                      <span className="text-[10px] text-slate-500">¿Se vende como artículo individual o como un combo con varios productos?</span>
                    </div>
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setIsCombo(false)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          !isCombo ? 'bg-[#2D4A58] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCombo(true)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                          isCombo ? 'bg-[#E65F2B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> Combo
                      </button>
                    </div>
                  </div>

                  {/* Configuración especial si es COMBO */}
                  {isCombo && (
                    <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                          📦 Selecciona los productos incluidos en este combo:
                        </span>
                        <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                          {selectedComboProductIds.length} seleccionados
                        </span>
                      </div>
                      <p className="text-[10px] text-orange-900/80">
                        El combo se venderá por un <strong>solo precio global</strong>, pero el inventario de cada artículo se mantendrá separado y se descontará automáticamente.
                      </p>

                      <div className="max-h-40 overflow-y-auto space-y-1 bg-white border border-orange-200 rounded-xl p-2">
                        {products
                          .filter(p => !editingProductId || p.id !== editingProductId)
                          .map(p => {
                            const isSelected = selectedComboProductIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                                  isSelected ? 'bg-orange-50 border border-orange-300' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedComboProductIds(prev => [...prev, p.id]);
                                      } else {
                                        setSelectedComboProductIds(prev => prev.filter(id => id !== p.id));
                                      }
                                    }}
                                    className="rounded text-[#E65F2B] focus:ring-[#E65F2B] w-4 h-4"
                                  />
                                  <img src={p.images[0] || '/file.svg'} alt={p.title} className="w-6 h-6 object-cover rounded" />
                                  <span className="font-semibold text-slate-800">{p.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">Stock: {p.stock}</span>
                              </label>
                            );
                          })}
                      </div>

                      {/* Stock calculado para el combo si hay productos seleccionados */}
                      {selectedComboProductIds.length > 0 && (() => {
                        const includedProds = products.filter(p => selectedComboProductIds.includes(p.id));
                        const minStock = includedProds.length > 0 ? Math.min(...includedProds.map(p => p.stock)) : 0;
                        return (
                          <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-medium">
                            <span>Stock disponible máximo del combo (según inventario de partes):</span>
                            <strong className="font-black text-xs text-emerald-700">{minStock} combos listos</strong>
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
                    <label className="text-slate-700 font-bold block mb-1">
                      {isCombo ? 'Stock Disponible del Combo:' : 'Stock Inicial:'}
                    </label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setNewStock(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                    {isCombo && selectedComboProductIds.length > 0 && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Limitado por el producto de menor stock en la lista.
                      </span>
                    )}
                  </div>
                </div>

                {/* Control de Encendido / Apagado (Visibilidad en Tienda) */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  newIsActive 
                    ? 'bg-emerald-50/70 border-emerald-200' 
                    : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Power className={`w-4 h-4 ${newIsActive ? 'text-emerald-600' : 'text-rose-600'}`} />
                        <span className="font-bold text-xs text-slate-900">
                          {newIsActive ? 'Artículo Encendido (Visible en Tienda)' : 'Artículo Apagado (Oculto a Clientes)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {newIsActive 
                          ? 'Los clientes pueden ver y comprar este producto en la tienda online.'
                          : 'El producto está pausado. Úsalo si no hay stock o no quieres mostrarlo sin tener que eliminarlo.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewIsActive(!newIsActive)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        newIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={newIsActive}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          newIsActive ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      >
                        <Power className={`w-3 h-3 ${newIsActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </span>
                    </button>
                  </div>
                  {!newIsActive && (
                    <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-center gap-1.5 text-[10px] text-rose-700 font-semibold">
                      <span>⚠️ Este artículo no aparecerá en el catálogo de clientes hasta que lo vuelvas a encender.</span>
                    </div>
                  )}
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

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => sendWhatsAppNotification(
                    selectedClientForModal.phone,
                    `Hola ${selectedClientForModal.name}! Te contactamos de FoxDrop Puebla para dar seguimiento a tu cuenta y pedidos.`
                  )}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" /> Enviar Mensaje por WhatsApp
                </button>
                <button
                  onClick={() => handleDeleteClient(selectedClientForModal)}
                  disabled={deletingClientId === selectedClientForModal.id}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Eliminar esta cuenta"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingClientId === selectedClientForModal.id ? 'Eliminando...' : 'Eliminar Cuenta'}
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
          title="Abrir Escáner y Venta Física (POS)"
          className="flex items-center justify-center -mt-6 bg-gradient-to-tr from-[#d44e1d] to-[#FF8C42] text-white w-13 h-13 rounded-full shadow-2xl border-4 border-[#18252E] ring-2 ring-orange-500/50 hover:scale-105 active:scale-95 transition"
        >
          <QrCode className="w-7 h-7" />
        </button>

        <button
          onClick={() => { setCrmSubTab('whatsapp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center gap-1 transition relative ${
            crmSubTab === 'whatsapp' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-1 animate-pulse"></span>
          </div>
          <span className="text-[10px]">WhatsApp</span>
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

              {/* Selector de Producto con Buscador Inteligente tipo Tienda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Buscar en inventario disponible:
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {products.filter(p => p.stock > 0).length} productos en stock
                  </span>
                </div>

                {/* Input de Búsqueda estilo Tienda */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={posSearchTerm}
                    onChange={e => setPosSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, SKU, código de barras o categoría..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E65F2B] focus:bg-white transition"
                  />
                  {posSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setPosSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros rápidos de categoría para POS */}
                {dbCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPosCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition ${
                        posCategoryFilter === 'all'
                          ? 'bg-[#E65F2B] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todas
                    </button>
                    {dbCategories.map((cat: { id: string; name: string; slug: string }) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPosCategoryFilter(cat.name)}
                        className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition ${
                          posCategoryFilter === cat.name
                            ? 'bg-[#E65F2B] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lista interactiva de productos coincidentes */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 shadow-inner">
                  {(() => {
                    const cleanTerm = posSearchTerm.trim().toLowerCase();
                    const filtered = products.filter(p => {
                      if (p.stock <= 0) return false;
                      if (posCategoryFilter !== 'all' && p.category !== posCategoryFilter) return false;
                      if (!cleanTerm) return true;
                      return (
                        p.title.toLowerCase().includes(cleanTerm) ||
                        p.sku.toLowerCase().includes(cleanTerm) ||
                        p.category.toLowerCase().includes(cleanTerm) ||
                        (p.description && p.description.toLowerCase().includes(cleanTerm))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-slate-400">
                          <p className="text-xs font-semibold">No se encontraron productos disponibles</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Prueba con otro término de búsqueda o limpia el filtro.</p>
                        </div>
                      );
                    }

                    return filtered.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddToCartPos(prod)}
                        className="w-full text-left p-2.5 hover:bg-orange-50/60 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {prod.images && prod.images[0] ? (
                            <img
                              src={prod.images[0]}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0">
                              📦
                            </div>
                          )}
                          <div className="truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-slate-800 truncate">{prod.title}</span>
                              {prod.isCombo && (
                                <span className="bg-purple-100 text-purple-700 text-[9px] px-1 rounded font-black shrink-0">
                                  COMBO
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {prod.sku} • {prod.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-black text-slate-900">${prod.publicPrice.toFixed(2)}</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                            +{prod.stock} disp
                          </span>
                        </div>
                      </button>
                    ));
                  })()}
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-sm w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative border border-slate-300 my-auto">
            <button
              onClick={() => setPosCompletedTicket(null)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-xs transition z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* CONTENEDOR DE SALIDA DEL TICKET (EMERGE DE ABAJO HACIA ARRIBA) */}
            <div className="relative pt-1 overflow-hidden rounded-2xl">
              {/* VISTA PREVIA DEL TICKET REAL CON ANIMACIÓN DE SALIDA DE ABAJO HACIA ARRIBA */}
              <div className="animate-thermal-ticket-rise origin-bottom">
                <div ref={ticketReceiptRef} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
                  {/* Encabezado Verde Oscuro / Brand */}
                  <div className="bg-[#0F3E36] text-white p-4 text-center relative border-b-4 border-[#E65F2B]">
                  <div className="flex items-center justify-center gap-2.5 mb-1">
                    <img
                      src={FOX_LOGO_BASE64}
                      alt="FoxDrop"
                      className="w-10 h-10 object-contain drop-shadow-md"
                    />
                    <div className="text-left">
                      <span className="font-black tracking-tight text-base text-white block leading-none">
                        Foxdrop - Tu atajo al mundo
                      </span>
                      <span className="text-[9px] font-bold text-[#E6A76E] tracking-widest uppercase block mt-1">
                        PUEBLA • MÉXICO
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-1">
                    Comprobante Oficial de Compra
                  </p>
                </div>

                {/* Datos de la Venta */}
                <div className="p-4 space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Folio de Venta</span>
                    <span className="font-mono font-black text-sm text-[#E65F2B]">{posCompletedTicket.orderNumber}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Fecha y Hora</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(posCompletedTicket.date).toLocaleDateString('es-MX')} {new Date(posCompletedTicket.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Cliente</span>
                      <span className="font-bold text-slate-900 truncate block">{posCompletedTicket.clientName}</span>
                    </div>
                  </div>

                  <div className="text-[11px] pb-1 border-b border-dashed border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Teléfono Registrado</span>
                    <span className="font-mono font-bold text-sky-700">{posCompletedTicket.clientPhone}</span>
                  </div>

                  {/* Lista de Artículos */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span>Artículos</span>
                      <span>Importe</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                      {posCompletedTicket.items.map(item => (
                        <div key={item.product.id} className="py-1 flex justify-between items-center text-xs">
                          <span className="text-slate-800 font-medium truncate max-w-[190px]">
                            {item.quantity}x {item.product.title}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            ${(item.product.publicPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subtotales y Total */}
                  <div className="border-t-2 border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Método de pago:</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {posCompletedTicket.paymentMethod === 'cash' ? '💵 Efectivo' : posCompletedTicket.paymentMethod === 'card' ? '💳 Tarjeta' : '⚡ SPEI'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="font-black text-slate-900 text-sm">TOTAL PAGADO:</span>
                      <span className="font-mono font-black text-xl text-[#0F3E36]">
                        ${posCompletedTicket.total.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>

                  {/* Banner Club FoxDrop */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      ⭐ Club FoxDrop:
                    </span>
                    <span className="font-mono font-black text-sm text-[#E65F2B]">
                      +{posCompletedTicket.pointsEarned} Puntos
                    </span>
                  </div>

                  <div className="text-center pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <p className="font-bold text-slate-600">¡Gracias por tu compra en FoxDrop Puebla! 🦊</p>
                    <p>https://foxdrop.mx</p>
                  </div>
                </div>

                {/* Dientes de sierra decorativos del ticket en el borde inferior */}
                <div className="flex justify-between overflow-hidden bg-slate-100 h-2 px-1">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 bg-white rotate-45 -translate-y-1.5 shrink-0" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ranura dispensadora de la terminal sobre la que sale el ticket */}
          <div className="relative -mt-2.5 z-20">
            <div className="w-48 h-3 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 mx-auto rounded-full shadow-md border border-slate-700 flex items-center justify-center">
              <div className="w-36 h-1 bg-black/90 rounded-full" />
            </div>
          </div>

          {/* Acciones de Envío Directo y Compartir (con z-20 para estar al frente mientras el ticket emerge por detrás) */}
          <div className="space-y-2 pt-1 relative z-20">
              <button
                onClick={() => shareTicketImageDirectly(posCompletedTicket)}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Imagen de Ticket a WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    let downloadUrl = posCompletedTicket.ticketImageUrl;
                    if (ticketReceiptRef.current) {
                      try {
                        downloadUrl = await toPng(ticketReceiptRef.current, {
                          cacheBust: true,
                          pixelRatio: 2,
                          backgroundColor: '#ffffff',
                          skipFonts: true,
                          style: {
                            transform: 'none',
                            animation: 'none',
                            clipPath: 'none',
                            opacity: '1',
                          },
                        });
                      } catch (cErr) {
                        console.warn("Fallo toPng en descarga:", cErr);
                      }
                    }

                    if (downloadUrl) {
                      const a = document.createElement('a');
                      a.href = downloadUrl;
                      a.download = `Ticket-${posCompletedTicket.orderNumber}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }
                  } catch (err) {
                    console.warn("Fallo descarga de ticket:", err);
                    if (posCompletedTicket.ticketImageUrl) {
                      window.open(posCompletedTicket.ticketImageUrl, '_blank');
                    }
                  }
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold py-2.5 rounded-2xl shadow-2xs flex items-center justify-center gap-2 text-xs transition"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Descargar Archivo de Imagen (PNG)</span>
              </button>

              {generatingTicketImg && (
                <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#E65F2B]" />
                  <span>Renderizando comprobante oficial en servidor...</span>
                </p>
              )}

              <button
                onClick={() => setPosCompletedTicket(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition"
              >
                Cerrar y Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL VER TICKET DESDE HISTORIAL DE PEDIDOS */}
      {/* ======================================================== */}
      {viewingTicketOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-sm w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative border border-slate-300 my-auto">
            <button
              onClick={() => setViewingTicketOrder(null)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-xs transition z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-1 pb-1">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#E65F2B]" />
                Ticket Oficial de Venta
              </h3>
              <p className="text-[11px] text-slate-500">Orden {viewingTicketOrder.id}</p>
            </div>

            {(() => {
              // Extraer url de ticket desde notes si existe
              const notes = viewingTicketOrder.notes || "";
              const match = notes.match(/Ticket:\s*(https?:\/\/[^\s]+)/i);
              const ticketImg = match ? match[1] : null;

              return (
                <div className="space-y-3">
                  {ticketImg ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-white">
                      <img
                        src={ticketImg}
                        alt={`Ticket ${viewingTicketOrder.id}`}
                        className="w-full h-auto object-contain max-h-96"
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between font-bold border-b pb-1.5">
                        <span>Cliente:</span>
                        <span>{viewingTicketOrder.clientName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-slate-500">Teléfono:</span>
                        <span className="font-mono">{viewingTicketOrder.clientPhone}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-slate-500">Total:</span>
                        <span className="font-bold text-[#0F3E36]">${viewingTicketOrder.total.toFixed(2)} MXN</span>
                      </div>
                      <div className="text-[11px] text-slate-500 pt-1">
                        {viewingTicketOrder.notes || "Venta de mostrador registrada."}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {ticketImg && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(ticketImg);
                            const blob = await res.blob();
                            const file = new File([blob], `Ticket-${viewingTicketOrder.id}.png`, { type: "image/png" });
                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                              await navigator.share({
                                files: [file],
                                title: `Ticket ${viewingTicketOrder.id}`,
                                text: `Foxdrop - Tu atajo al mundo\nComprobante oficial de compra ${viewingTicketOrder.id}`,
                              });
                              return;
                            }
                          } catch (err) {
                            console.warn("Error en share:", err);
                          }
                          window.open(`https://wa.me/${viewingTicketOrder.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Foxdrop - Tu atajo al mundo\nComprobante de compra ${viewingTicketOrder.id}:\n${ticketImg}`)}`, '_blank');
                        }}
                        className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-2.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Re-enviar Imagen a WhatsApp</span>
                      </button>
                    )}

                    {ticketImg && (
                      <a
                        href={ticketImg}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs transition"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>Abrir / Descargar Imagen PNG</span>
                      </a>
                    )}

                    <button
                      onClick={() => setViewingTicketOrder(null)}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-2xl text-xs transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              );
            })()}
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
      {/* MODAL KARDEX / HISTORIAL DE MOVIMIENTOS POR PRODUCTO */}
      {/* ======================================================== */}
      {showKardexModal && kardexProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Kardex */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                    Kardex de Inventario
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      {kardexProduct.sku || 'SIN-SKU'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{kardexProduct.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowKardexModal(false);
                  setKardexProduct(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen Actual del Producto */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Stock Actual</span>
                <span className={`text-base font-mono font-black ${
                  kardexProduct.stock <= 0 ? 'text-rose-600' : kardexProduct.stock <= 3 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {kardexProduct.stock} pzas
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Costo Unitario</span>
                <span className="text-base font-mono font-black text-slate-800">
                  ${kardexProduct.totalCostMxn?.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-emerald-600 block uppercase">Precio Público</span>
                <span className="text-base font-mono font-black text-emerald-700">
                  ${kardexProduct.publicPrice?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Lista de Movimientos Detectados en Pedidos y Ventas */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Movimientos Registrados en Pedidos & Ventas:
              </h4>

              {(() => {
                // Buscar ventas asociadas en las órdenes
                const movements = orders
                  .filter(o => o.order_items?.some(it => 
                    it.product_id === kardexProduct.id || 
                    (it.product_title && it.product_title.toLowerCase() === kardexProduct.title.toLowerCase())
                  ))
                  .map(o => {
                    const matchedItem = o.order_items?.find(it => 
                      it.product_id === kardexProduct.id || 
                      (it.product_title && it.product_title.toLowerCase() === kardexProduct.title.toLowerCase())
                    );
                    return {
                      id: o.id,
                      date: o.createdAt || new Date().toISOString(),
                      type: 'salida',
                      qty: matchedItem?.quantity || 1,
                      client: o.clientName || 'Cliente FoxDrop',
                      orderStatus: o.status,
                      total: (matchedItem?.price_at_purchase || kardexProduct.publicPrice) * (matchedItem?.quantity || 1)
                    };
                  });

                if (movements.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">Sin salidas registradas todavía</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        El stock actual ({kardexProduct.stock} pzas) proviene del alta inicial o lote de importación.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {movements.map(m => (
                      <div key={m.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                            <Minus className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              Venta #{m.id} • {m.client}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} • Estado: {m.orderStatus}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-rose-600 text-sm block">
                            -{m.qty} {m.qty === 1 ? 'pza' : 'pzas'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ${m.total.toFixed(2)} MXN
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer Kardex */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowKardexModal(false);
                  handleOpenSoldModal(kardexProduct);
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Registrar Venta Física</span>
              </button>

              <button
                onClick={() => {
                  setShowKardexModal(false);
                  setKardexProduct(null);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CAMBIO MASIVO DE CATEGORÍA PARA ARTÍCULOS SELECCIONADOS */}
      {/* ======================================================== */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowBulkCategoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Cambiar Categoría en Lote
                </h3>
                <p className="text-xs text-slate-500">
                  Asignarás una nueva categoría a <span className="font-bold text-[#E65F2B]">{selectedProductIds.length}</span> artículo(s) seleccionados.
                </p>
              </div>
            </div>

            {/* Lista previa de los primeros artículos seleccionados */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Artículos a reasignar:</span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs text-slate-700">
                {products
                  .filter(p => selectedProductIds.includes(p.id))
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200">
                      <span className="font-bold truncate max-w-[260px]">{p.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Actual: {p.category}</span>
                    </div>
                  ))}
              </div>
            </div>

            <form onSubmit={handleApplyBulkCategory} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Selecciona la Nueva Categoría:
                </label>

                {!isBulkCustomCategory ? (
                  <div className="space-y-2">
                    <select
                      value={bulkTargetCategory}
                      onChange={e => setBulkTargetCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#2D4A58]"
                    >
                      {Array.from(new Set([
                        ...dbCategories.map(c => c.name),
                        ...products.map(p => p.category).filter(Boolean),
                        'Cosmética', 'Electrónica', 'Hogar', 'Moda', 'Accesorios'
                      ])).map(cat => (
                        <option key={cat} value={cat}>
                          {getCategoryIconEmoji(cat)} {cat}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Ícono asignado: <strong className="text-sm">{getCategoryIconEmoji(bulkTargetCategory)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsBulkCustomCategory(true)}
                        className="text-[11px] font-bold text-[#E65F2B] hover:underline cursor-pointer"
                      >
                        + Escribir una categoría nueva
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-lg select-none">
                        {getCategoryIconEmoji(bulkCustomCategoryName)}
                      </span>
                      <input
                        type="text"
                        placeholder="Ej. Deportes, Mascotas, Juguetes..."
                        value={bulkCustomCategoryName}
                        onChange={e => setBulkCustomCategoryName(e.target.value)}
                        className="w-full bg-slate-50 border border-orange-300 rounded-xl p-2.5 pl-10 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#E65F2B]"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Ícono generado: <strong className="text-sm">{getCategoryIconEmoji(bulkCustomCategoryName)}</strong> (se guardará en Supabase)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkCustomCategory(false);
                          setBulkCustomCategoryName('');
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        ← Volver a categorías existentes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkCategoryModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBulkCategory}
                  className="flex-1 py-2.5 bg-[#E65F2B] hover:bg-[#D45321] text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingBulkCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Aplicar a {selectedProductIds.length} artículos</span>
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

      {/* ======================================================== */}
      {/* BARRA MÓVIL DE ACCIONES RÁPIDAS DEL ADMIN (ESTILO APP) */}
      {/* ======================================================== */}
      <nav 
        aria-label="Acciones rápidas del administrador"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.35)] md:hidden safe-area-bottom select-none"
      >
        <div className="grid grid-cols-4 items-center h-16 px-2">
          {/* TAB: INVENTARIO */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              setCrmSubTab('inventory');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 ${
              crmSubTab === 'inventory' ? 'text-[#E65F2B] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Stock</span>
          </button>

          {/* TAB: PEDIDOS ACTIVOS */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              setCrmSubTab('orders');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 relative ${
              crmSubTab === 'orders' ? 'text-[#E65F2B] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Truck className="w-5 h-5" />
              {activeOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {activeOrders.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Pedidos</span>
          </button>

          {/* ACCIÓN CENTRAL: BOTÓN QR */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('medium'); } catch {}
              setShowPosModal(true);
            }}
            className="flex flex-col items-center justify-center -mt-4 group active:scale-95 transition-all"
            title="Escanear Código QR / POS"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#E65F2B] to-[#F18956] text-white flex items-center justify-center shadow-lg shadow-orange-950/40 border-2 border-slate-900 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
          </button>

          {/* ACCIÓN: MENÚ COMPLETO */}
          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('light'); } catch {}
              setMobileSidebarOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Menú</span>
          </button>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* BURBUJA FLOTANTE PARA ACCEDER A FOX DESDE CUALQUIER PESTAÑA */}
      {/* ======================================================== */}
      {crmSubTab !== 'agent' && (
        <aside
          aria-label="Acceso flotante a Fox"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 group animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Tooltip / Píldora descriptiva al hacer hover */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-orange-500/30 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Hablar con Fox</span>
          </div>

          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('medium'); } catch {}
              setCrmSubTab('agent');
              setAgentActiveTab('chat');
            }}
            title="Abrir asistente Fox"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E65F2B] via-[#FF8A00] to-amber-500 text-white flex items-center justify-center shadow-xl shadow-orange-950/40 border-2 border-white hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer relative overflow-visible"
          >
            {/* Carita oficial 3D del logo FoxDrop */}
            <img
              src={FOX_LOGO_BASE64 || "/fox-logo-head-3d.png"}
              alt="Fox"
              className="w-9 h-9 object-contain drop-shadow-md transition-transform group-hover:scale-110 select-none pointer-events-none"
            />
            {/* Indicador de estado en vivo */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            </span>
          </button>
        </aside>
      )}

    </div>
  );
}
