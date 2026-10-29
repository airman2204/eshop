'use client';

import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import FoxDropLogo from '@/components/FoxDropLogo';
import { FOX_LOGO_BASE64 } from '@/data/foxLogoBase64';
import MobileBarcodeScanner from '@/components/MobileBarcodeScanner';
import AdminWhatsAppTab from '@/components/AdminWhatsAppTab';
import AdminCjTab from '@/components/AdminCjTab';
import AdminCjDispatchModal from '@/components/AdminCjDispatchModal';
import WeavyStudio from '@/components/WeavyStudio';
import AdminCampaignsTab from '@/components/AdminCampaignsTab';
import { 
  Package, DollarSign, Truck, AlertTriangle, Plus, ArrowUpRight, MessageSquare, 
  Search, ShieldAlert, Sparkles, TrendingUp, Clock, CheckCircle2, User, RefreshCw, BarChart3, ChevronRight, X,
  Lock, LogOut, KeyRound, Upload, Check, ShieldCheck, FileText, Send, Eye, EyeOff, Edit3, Trash2, Ban,
  Users, Layers, Award, Phone, Mail, History, ExternalLink, QrCode, ShoppingBag, Receipt, Printer, Minus, Camera,
  Clipboard, Globe, Image as ImageIcon, Wand2, Download, Star, HeartHandshake, Save, Percent, Menu, CreditCard,
  Bell, BellRing, Volume2, VolumeX, Copy, FileSpreadsheet, Power, Tag, CheckSquare, Square,
  Bot, Share2, Flame, Lightbulb, MessageCircle, Calendar, CalendarDays, CheckCircle,
  Mic, MicOff, Radio, Play, Pause, Zap, ArrowUpDown, SlidersHorizontal, ArrowLeft, ArrowRight,
  Palette, LayoutTemplate, Moon, Sun, Megaphone
} from 'lucide-react';
import { Product, Order, AbandonedCart, SpecialOrder, ImportBatch, ClientProfile, ClubFoxDropSettings, ClubFoxDropTier, LoyaltyMetrics, CheckoutSettings, ShippingMethodConfig, AgentChatMessage, AgentSocialPost, AgentWeeklyCalendarDay, AgentWeeklyPlan } from '@/types';
import { getActiveProducts, mapDbProductToApp } from '@/lib/products';
import { 
  getLiveExchangeRate, createProductInDb, updateProductInDb, deleteProductInDb, 
  getImportBatches, createImportBatch, updateImportBatch, deleteImportBatch, getClientsWithMetrics,
  getCarouselSlides, createCarouselSlide, updateCarouselSlide, deleteCarouselSlide, CarouselSlide,
  fetchAdminCategories, createAdminCategory, bulkUpdateProductsCategory, bulkUpdateProductsDiscount, bulkUpdateProductsBrand,
  getAdminAbandonedCarts, updateAdminAbandonedCart, deleteAdminAbandonedCart,
  getClubSettings, saveClubSettings, getLoyaltyMetrics, generateTicketImage,
  deleteClientFromDb, getStoreSettings, saveStoreSettings, StoreSettings, DEFAULT_STORE_SETTINGS, getOfficialBrands, saveOfficialBrand, OfficialStoreBrand,
  generateAgentSocialPost, generateAgentWeeklyCalendar, generateAgentOrderFollowup, generateAgentCartRecovery, chatWithFoxBot, executeAgentAction,
  getAgentChatHistory, saveAgentChatHistory
} from '@/lib/admin';
import { getCheckoutSettings, saveCheckoutSettings, DEFAULT_CHECKOUT_SETTINGS } from '@/lib/checkoutSettings';
import { getAdminOrders, getSpecialOrders, updateSpecialOrderStatus, updateOrderStatusInDb, deleteOrderInDb, createPhysicalSaleOrder, subscribeToAllOrders, subscribeToAbandonedCarts } from '@/lib/orders';
import { authenticateAdmin, updateAdminPassword, AdminSession, fetchAgentApi, verify2FaLogin, setup2FaInit, setup2FaConfirm, get2FaStatus, disable2Fa } from '@/lib/adminAuth';
import { uploadProductImage, uploadProductImageUrl } from '@/lib/storage';
import { getClubFoxDropTier, DEFAULT_CLUB_SETTINGS } from '@/lib/clubFoxdrop';
import { getCategoryIconEmoji } from '@/lib/constants';
import { soundManager } from '@/lib/sounds';
import { generateTicketCanvasDataUrl } from '@/lib/ticketCanvas';
import { translateVariantName } from '@/lib/translateVariant';

const getSafeAdminImageUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '/no-image.svg';
  let clean = url.trim();
  if (clean.startsWith('/api/whatsapp/image-proxy') || clean.startsWith('data:') || (clean.startsWith('/') && !clean.startsWith('//'))) {
    return clean;
  }
  if (clean.startsWith('//')) clean = 'https:' + clean;
  if (!clean.startsWith('http')) return '/no-image.svg';
  if (
    clean.includes('cjdropshipping.com') ||
    clean.includes('aliyuncs.com') ||
    clean.includes('alicdn.com') ||
    clean.includes('1688.com')
  ) {
    return `/api/whatsapp/image-proxy?url=${encodeURIComponent(clean)}`;
  }
  return clean;
};

export default function AdminCRM() {
  // Estado de Autenticación y Seguridad
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Blindaje 2FA en Login
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorTempToken, setTwoFactorTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [twoFactorVerifying, setTwoFactorVerifying] = useState(false);

  // Modal de Configuración y Gestión 2FA
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    secret?: string;
    otpauthUrl?: string;
    qrCodeUrl?: string;
    backupCodes?: string[];
  } | null>(null);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [twoFactorSetupError, setTwoFactorSetupError] = useState('');
  const [twoFactorSetupSuccess, setTwoFactorSetupSuccess] = useState(false);
  const [twoFactorConfirmedCodes, setTwoFactorConfirmedCodes] = useState<string[] | null>(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    backupCodesCount: number;
  }>({ enabled: false, backupCodesCount: 0 });
  const [twoFactorCopiedNotice, setTwoFactorCopiedNotice] = useState(false);
  const [disableTwoFactorPass, setDisableTwoFactorPass] = useState('');
  const [disableTwoFactorLoading, setDisableTwoFactorLoading] = useState(false);

  // Modal obligatorio de cambio de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Navegación CRM (Persistente en recarga)
  const [crmSubTab, setCrmSubTab] = useState<'inventory' | 'batches' | 'orders' | 'order_history' | 'cancelled_orders' | 'clients' | 'special_orders' | 'finance' | 'carts' | 'carousel' | 'loyalty' | 'shipping_payments' | 'agent' | 'weavy' | 'whatsapp' | 'cj_dropship' | 'campaigns'>('inventory');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Leer pestaña persistida al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') as any;
    const tabFromStorage = localStorage.getItem('foxdrop_admin_active_tab') as any;
    const validTabs = ['inventory', 'batches', 'orders', 'order_history', 'cancelled_orders', 'clients', 'special_orders', 'finance', 'carts', 'carousel', 'loyalty', 'shipping_payments', 'agent', 'whatsapp', 'cj_dropship', 'campaigns'];

    const targetTab = validTabs.includes(tabFromUrl) ? tabFromUrl : (validTabs.includes(tabFromStorage) ? tabFromStorage : null);
    if (targetTab) {
      setCrmSubTab(targetTab);
    }

    const scopeFromUrl = urlParams.get('scope') as any;
    const scopeFromStorage = localStorage.getItem('foxdrop_admin_inventory_scope') as any;
    const targetScope = (scopeFromUrl === 'cj_international' || scopeFromUrl === 'physical')
      ? scopeFromUrl
      : ((scopeFromStorage === 'cj_international' || scopeFromStorage === 'physical') ? scopeFromStorage : null);
    if (targetScope) {
      setInventoryScope(targetScope);
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
        window.history.pushState({ tab: crmSubTab }, '', url.toString());
      }
    } catch {}
  }, [crmSubTab]);

  // Manejar el botón "Atrás" del navegador / celular cuando está en pestañas secundarias (especialmente WhatsApp)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = (event: PopStateEvent) => {
      const stateTab = event.state?.tab;
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = (stateTab || urlParams.get('tab') || 'inventory') as any;
      setCrmSubTab(urlTab);
      const urlScope = urlParams.get('scope');
      if (urlScope === 'cj_international' || urlScope === 'physical') {
        setInventoryScope(urlScope);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Configuración de Banners y Liquidación de la Tienda
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);
  const [storeSettingsSavedNotice, setStoreSettingsSavedNotice] = useState(false);

  // Modo Oscuro del Panel de Administración (Persistente en Storage y Servidor)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('foxdrop_admin_dark_mode');
      if (cached !== null) {
        setStoreSettings(prev => ({ ...prev, adminDarkMode: cached === 'true' }));
      }
    }
  }, []);

  const toggleAdminDarkMode = async () => {
    const newVal = !storeSettings.adminDarkMode;
    const updated = { ...storeSettings, adminDarkMode: newVal };
    setStoreSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foxdrop_admin_dark_mode', String(newVal));
    }
    setSavingStoreSettings(true);
    try {
      await saveStoreSettings(updated);
      setStoreSettingsSavedNotice(true);
      setTimeout(() => setStoreSettingsSavedNotice(false), 3000);
    } catch {
      // Se mantiene en localStorage aunque falle red
    } finally {
      setSavingStoreSettings(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [usdRate, setUsdRate] = useState(20.00);

  // Modal Alta / Edición de Producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Cosmética');
  const [newBrand, setNewBrand] = useState('Bath & Body Works');
  const [officialBrands, setOfficialBrands] = useState<any[]>([]);
  const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
  const [customNewBrandName, setCustomNewBrandName] = useState('');
  const [customNewBrandLogo, setCustomNewBrandLogo] = useState('');
  const [creatingBrandLoading, setCreatingBrandLoading] = useState(false);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customNewCategoryName, setCustomNewCategoryName] = useState('');
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);
  const [newCostUsd, setNewCostUsd] = useState(5.00);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [newPublicPrice, setNewPublicPrice] = useState(230.00);
  const [priceMarkupPercent, setPriceMarkupPercent] = useState<number>(100);
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(0);
  const [newStock, setNewStock] = useState(15);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [editingVariants, setEditingVariants] = useState<any[]>([]);
  const [isCombo, setIsCombo] = useState(false);
  const [selectedComboProductIds, setSelectedComboProductIds] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);
  const [rewritingDescriptionAi, setRewritingDescriptionAi] = useState(false);
  const [aiRewriteHint, setAiRewriteHint] = useState('');
  const [showAiRewriteHintInput, setShowAiRewriteHintInput] = useState(false);

  // Modal Descuento Promocional en Lote
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [bulkDiscountSelected, setBulkDiscountSelected] = useState<number>(20);
  const [savingBulkDiscount, setSavingBulkDiscount] = useState(false);

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
  const [regeneratingTicket, setRegeneratingTicket] = useState(false);
  const [ticketSentOrders, setTicketSentOrders] = useState<Set<string>>(new Set());
  const [isSendingTicketViaWa, setIsSendingTicketViaWa] = useState(false);
  const ticketReceiptRef = useRef<HTMLDivElement>(null);

  // Estados de Ventanas Flotantes (WhatsApp y Fox IA accesibles desde cualquier pestaña)
  const [showFloatingWhatsApp, setShowFloatingWhatsApp] = useState(false);
  const [showFloatingFox, setShowFloatingFox] = useState(false);
  const [floatingFoxMinimised, setFloatingFoxMinimised] = useState(false);

  // Transferencia rápida desde Clientes / Pedidos al WhatsApp central interno
  const [whatsappTarget, setWhatsappTarget] = useState<{ phone: string; message: string } | null>(null);

  // Posición movible / arrastrable para las burbujas flotantes (WhatsApp y Fox)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  // Tamaño configurable de la ventana flotante de WhatsApp ('compact' | 'normal' | 'expanded' | 'custom')
  const [floatingWhatsAppSize, setFloatingWhatsAppSize] = useState<'compact' | 'normal' | 'expanded'>('expanded');
  // Tamaño configurable de la burbuja ('sm' | 'md' | 'lg')
  const [bubbleSize, setBubbleSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Cargar y persistir posición y tamaños en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('foxdrop_admin_bubble_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setBubblePos(parsed);
        }
      }
      const savedWaSize = localStorage.getItem('foxdrop_wa_window_size') as any;
      if (savedWaSize && ['compact', 'normal', 'expanded'].includes(savedWaSize)) {
        setFloatingWhatsAppSize(savedWaSize);
      }
      const savedBubbleSize = localStorage.getItem('foxdrop_bubble_size') as any;
      if (savedBubbleSize && ['sm', 'md', 'lg'].includes(savedBubbleSize)) {
        setBubbleSize(savedBubbleSize);
      }
    } catch {}
  }, []);

  const updateBubblePosition = (newPos: { x: number; y: number }) => {
    setBubblePos(newPos);
    try {
      localStorage.setItem('foxdrop_admin_bubble_pos', JSON.stringify(newPos));
    } catch {}
  };

  const updateFloatingWhatsAppSize = (size: 'compact' | 'normal' | 'expanded') => {
    setFloatingWhatsAppSize(size);
    try {
      localStorage.setItem('foxdrop_wa_window_size', size);
    } catch {}
  };

  const updateBubbleSize = (size: 'sm' | 'md' | 'lg') => {
    setBubbleSize(size);
    try {
      localStorage.setItem('foxdrop_bubble_size', size);
    } catch {}
  };

  // Modal Marcar Producto como Ya Vendido (Venta previa o fuera de sistema)
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldProduct, setSoldProduct] = useState<Product | null>(null);
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [soldPriceUnit, setSoldPriceUnit] = useState(0);
  const [soldNote, setSoldNote] = useState('Venta realizada previamente fuera de plataforma');
  const [savingSold, setSavingSold] = useState(false);

  // Estados de Mejora de Inventario (Filtro por stock, categoría, estado y carga masiva)
  const [inventoryScope, setInventoryScope] = useState<'physical' | 'cj_international'>(() => {
    if (typeof window !== 'undefined') {
      const urlScope = new URLSearchParams(window.location.search).get('scope');
      if (urlScope === 'cj_international' || urlScope === 'physical') return urlScope;
      const stored = localStorage.getItem('foxdrop_admin_inventory_scope');
      if (stored === 'cj_international' || stored === 'physical') return stored;
    }
    return 'physical';
  });

// Sincronizar automáticamente en localStorage y URL cada vez que cambia inventoryScope
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('foxdrop_admin_inventory_scope', inventoryScope);
      const url = new URL(window.location.href);
      if (crmSubTab === 'inventory') {
        if (url.searchParams.get('scope') !== inventoryScope) {
          url.searchParams.set('scope', inventoryScope);
          window.history.replaceState({ tab: crmSubTab, scope: inventoryScope }, '', url.toString());
        }
      } else {
        url.searchParams.delete('scope');
        window.history.replaceState({ tab: crmSubTab }, '', url.toString());
      }
    } catch {}
  }, [inventoryScope, crmSubTab]);
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'healthy' | 'combos' | 'inactive'>('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');
  const [inventoryBatchFilter, setInventoryBatchFilter] = useState<string>('all');
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
  const [showBulkBrandModal, setShowBulkBrandModal] = useState(false);
  const [bulkTargetBrand, setBulkTargetBrand] = useState('Bath & Body Works');
  const [savingBulkBrand, setSavingBulkBrand] = useState(false);
  const [bulkStockDeltaInput, setBulkStockDeltaInput] = useState<number>(5);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [savingBulkStock, setSavingBulkStock] = useState(false);

  // Edición Rápida de Precio en Línea (Inline Price Edit)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [previewingVariantsProduct, setPreviewingVariantsProduct] = useState<any | null>(null);
  const [deletingVariantKey, setDeletingVariantKey] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title?: string } | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Ordenamiento Dinámico de la Tabla de Inventario
  const [inventorySortBy, setInventorySortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'margin_desc'>('default');

  // Modal de Impresión de Etiquetas con Código de Barras / QR
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [barcodePrintProducts, setBarcodePrintProducts] = useState<Product[]>([]);
  const [barcodePrintCopiesMode, setBarcodePrintCopiesMode] = useState<'single' | 'by_stock'>('single');

  // Modal Lote de Importación (Crear / Editar)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ImportBatch | null>(null);
  const [batchNameInput, setBatchNameInput] = useState('');
  const [batchShippingCostInput, setBatchShippingCostInput] = useState<string>('500');
  const [batchUnitsInput, setBatchUnitsInput] = useState<string>('25');
  const [batchNotesInput, setBatchNotesInput] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  // Estado del Carrusel Hero
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideImageUrl, setSlideImageUrl] = useState('');
  const [slideUseButton, setSlideUseButton] = useState(false);
  const [slideCtaText, setSlideCtaText] = useState('');
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

  // Filtro de canal en Pedidos Activos (Local Puebla vs Envío Nacional)
  const [activeOrderShippingFilter, setActiveOrderShippingFilter] = useState<'all' | 'puebla_local' | 'national_shipping' | 'international_shipping'>('all');

  // Modal de Confirmación Segura de Eliminación (Sin window.confirm)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Modal Producto: Costo en Pesos MXN directo (con toggle opcional a USD)
  const [costInputMode, setCostInputMode] = useState<'mxn' | 'usd'>('mxn');
  const [newCostMxnDirect, setNewCostMxnDirect] = useState<number>(100.0);

  // 1. Buscador Global Inteligente (Cmd/Ctrl + K)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // 2. Generador de Etiquetas de Envío / Guías
  const [shippingLabelOrder, setShippingLabelOrder] = useState<Order | null>(null);
  const [cjDispatchOrder, setCjDispatchOrder] = useState<Order | null>(null);

  // 3. Corte de Caja Diario (Z-Report)
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [zReportDate, setZReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Listener para Cmd/Ctrl + K en teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShippingLabelOrder(null);
        setShowZReportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  
  const defaultAgentWelcomeMessage: AgentChatMessage = {
    id: 'welcome',
    sender: 'agent',
    text: '¡Hola! 🦊 Soy **Fox**, tu Director de Crecimiento (CMO) y Copiloto de Marketing 360° para FoxDrop México.\n\nEstoy conectado en vivo a tu inventario, ventas y clientes. Mi objetivo prioritario ahora es **dar a conocer la tienda, generar tráfico calificado y atraer a tus primeros clientes** mediante estrategias integrales de impacto.\n\n🎯 **¿Qué podemos detonar hoy?**\n- 🚀 **Estrategia 360° de Atracción y Lanzamiento:** Plan paso a paso para pasar de 0 a tus primeros 50 compradores.\n- 📲 **Guiones Virales para TikTok / Reels:** Formatos de video demostrativos que despiertan deseo inmediato.\n- 🛍️ **Estrategia Facebook Marketplace & Grupos:** Máquina de tráfico orgánico gratuito hacia WhatsApp y foxdrop.mx.\n- ⚡ **Oferta Irresistible de Entrada (Tripwire):** Producto gancho de bajo costo para generar tus primeras ventas y clientes de confianza.\n- 👑 **Club FoxDrop & Fidelización:** Sistema de puntos para convertir visitantes curiosos en clientes recurrentes.\n\n¿Qué estrategia o campaña quieres que diseñemos en este momento?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actionSuggestions: [
      '🚀 Fox, dame un plan 360° para conseguir nuestros primeros 30 clientes este mes',
      '📲 Redacta 3 guiones virales de TikTok/Reels para dar a conocer la tienda',
      '🛍️ Arma una estrategia para Facebook Marketplace que derive tráfico a la web',
      '⚡ Diseña una oferta de inauguración irresistible para nuevos clientes',
    ],
  };

  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatMessage[]>([defaultAgentWelcomeMessage]);
  const [agentInputText, setAgentInputText] = useState('');
  const [agentChatLoading, setAgentChatLoading] = useState(false);

  // Fox Voice & Speech States (Desactivada por defecto a petición)
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [autoVoiceReplyEnabled, setAutoVoiceReplyEnabled] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('server_mexican');
  const recognitionRef = useRef<any>(null);
  const foxAudioRef = useRef<HTMLAudioElement | null>(null);

  // Marketing Generator State
  const [agentSelectedProductId, setAgentSelectedProductId] = useState<string>('');
  const [agentPlatform, setAgentPlatform] = useState<'instagram' | 'facebook' | 'tiktok' | 'whatsapp'>('instagram');
  const [agentTone, setAgentTone] = useState<string>('Divertido y entusiasta');
  const [agentAudience, setAgentAudience] = useState<string>('Público general en México buscando productos virales de importación, tecnología y novedades');
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

  // Estudio Visual de Diseño 1-Clic (Plantillas + Motor Nativo)
  const [flyerTheme, setFlyerTheme] = useState<'dark_vip' | 'forest_brand' | 'flash_fire' | 'minimal_clean'>('dark_vip');
  const [flyerFormat, setFlyerFormat] = useState<'square' | 'story'>('square');
  const [flyerCustomBadge, setFlyerCustomBadge] = useState<string>('OFERTA ESPECIAL');

  // ─── ESTADOS DE LA SUITE DE MARKETING (DATOS 100% REALES SUPABASE) ───
  const [targetSalesGoal, setTargetSalesGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('foxdrop_mkt_sales_goal');
      return saved ? Number(saved) : 50000;
    } catch {
      return 50000;
    }
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState<string>('50000');

  const [mktFunnelMetrics, setMktFunnelMetrics] = useState<{
    monthlySales: number;
    targetMonthly: number;
    pacingPercent: number;
    orderCount: number;
    avgTicket: number;
    remainingToTarget: number;
    estimatedOrdersNeeded: number;
    abandonedCartsCount: number;
    abandonedCartsTotal: number;
    estimatedVisitors: number;
    conversionRate: number;
  }>({
    monthlySales: 0,
    targetMonthly: 50000,
    pacingPercent: 0,
    orderCount: 0,
    avgTicket: 450,
    remainingToTarget: 50000,
    estimatedOrdersNeeded: 110,
    abandonedCartsCount: 0,
    abandonedCartsTotal: 0,
    estimatedVisitors: 0,
    conversionRate: 0,
  });
  const [mktLoadingMetrics, setMktLoadingMetrics] = useState(false);
  const [mktStrategy, setMktStrategy] = useState<any | null>(null);
  const [mktLoadingStrategy, setMktLoadingStrategy] = useState(false);
  const [mktUserFeedback, setMktUserFeedback] = useState('');
  const [mktPreviewFormat, setMktPreviewFormat] = useState<'ig' | 'tk' | 'plan'>('plan');
  const [mktSelectedDayIndex, setMktSelectedDayIndex] = useState<number>(0);
  const [mktGeneratedImage, setMktGeneratedImage] = useState<string>('');
  const [mktDayImages, setMktDayImages] = useState<Record<number, string>>({});
  const [mktGeneratingImage, setMktGeneratingImage] = useState(false);
  const [mktDesignProposals, setMktDesignProposals] = useState<any[]>([]);
  const [mktSelectedProposalId, setMktSelectedProposalId] = useState<string>('propuesta_1');
  const [mktCustomDesignPrompt, setMktCustomDesignPrompt] = useState<string>('');
  const [mktWorkflowStep, setMktWorkflowStep] = useState<1 | 2 | 3>(1); // 1: Dirección Estratégica, 2: Parrilla & Copys, 3: Dirección Visual & Prompts
  const [mktPublishing, setMktPublishing] = useState(false);
  const [mktPublishSuccess, setMktPublishSuccess] = useState<string | null>(null);

  // ─── HANDLERS DE LA SUITE DE MARKETING (DATOS 100% REALES SUPABASE) ───
  const handleLoadFunnelMetrics = async (overrideTarget?: number) => {
    setMktLoadingMetrics(true);
    const targetToUse = overrideTarget || targetSalesGoal;

    // 1. Cálculo instantáneo con pedidos reales en memoria (garantiza cero ceros o desincronización)
    if (orders && orders.length > 0) {
      const validPaid = orders.filter(o => o.paymentStatus === 'paid' || o.status === 'delivered' || o.status === 'shipped');
      const salesSum = validPaid.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      const count = validPaid.length;
      const ticket = count > 0 ? Math.round(salesSum / count) : 450;
      const remaining = Math.max(0, targetToUse - salesSum);
      const needed = ticket > 0 ? Math.ceil(remaining / ticket) : 0;
      const pacing = Number(((salesSum / targetToUse) * 100).toFixed(1));

      const cartsTotal = (abandonedCarts || []).reduce((acc, c) => acc + (Number(c.total) || 0), 0);
      const estVisitors = 0; // Sin redes o pixel conectado: 0 datos ficticios
      const convRate = 0;

      setMktFunnelMetrics({
        monthlySales: salesSum,
        targetMonthly: targetToUse,
        pacingPercent: pacing,
        orderCount: count,
        avgTicket: ticket,
        remainingToTarget: remaining,
        estimatedOrdersNeeded: needed,
        abandonedCartsCount: abandonedCarts?.length || 0,
        abandonedCartsTotal: cartsTotal,
        estimatedVisitors: estVisitors,
        conversionRate: convRate,
      });
    }

    // 2. Consulta al servidor para sincronizar métricas del mes con token de administrador
    try {
      const res = await fetchAgentApi({
        action: 'mkt_get_funnel_metrics',
        targetMonthly: targetToUse,
      });
      const data = await res.json();
      if (data.success && data.metrics) {
        setMktFunnelMetrics(data.metrics);
      }
    } catch (err) {
      console.warn('Error cargando métricas de embudo:', err);
    } finally {
      setMktLoadingMetrics(false);
    }
  };

  const handleUpdateSalesGoal = (newGoal: number) => {
    const validGoal = Math.max(1000, newGoal);
    setTargetSalesGoal(validGoal);
    try {
      localStorage.setItem('foxdrop_mkt_sales_goal', validGoal.toString());
    } catch {}
    setIsEditingGoal(false);
    handleLoadFunnelMetrics(validGoal);
  };

  // FASE 1: CONSULTAR AL DIRECTOR (SOLO ESTRATEGIA Y ENFOQUE)
  const handleGenerateDirectorStrategy = async (userFeedbackParam?: string) => {
    setMktLoadingStrategy(true);
    try {
      const res = await fetchAgentApi({
        action: 'mkt_director_strategy',
        feedback: userFeedbackParam || mktUserFeedback || '',
        targetMonthly: targetSalesGoal,
      });
      const data = await res.json();
      if (data.success && data.strategy) {
        setMktStrategy(data.strategy);
        setMktWorkflowStep(1); // Se queda en Fase 1 para revisión del CEO
      } else {
        alert(`Aviso: ${data.error || 'No se pudo generar la estrategia'}`);
      }
    } catch (err: any) {
      alert(`Error al contactar con el Director: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setMktLoadingStrategy(false);
    }
  };

  // FASE 2: CONVOCAR AL COPYWRITER (REDACTA PARRILLA DE 7 DÍAS CON COPYS BASADOS EN EL EJE APROBADO)
  const [mktLoadingCopys, setMktLoadingCopys] = useState(false);
  const handleGenerateParrillaCopys = async () => {
    if (!mktStrategy) return;
    setMktLoadingCopys(true);
    try {
      const res = await fetchAgentApi({
        action: 'mkt_generate_copys',
        weeklyTheme: mktStrategy.weeklyTheme,
        strategicAngle: mktStrategy.strategicAngle,
        storePillar: mktStrategy.storeWideStrategy?.pillar || 'Garantía Oficial FoxDrop',
        featuredProductTitle: mktStrategy.featuredProduct?.title || 'Curaduría FoxDrop',
        featuredProductId: mktStrategy.featuredProduct?.id || '',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.weeklyParrilla) && data.weeklyParrilla.length > 0) {
        setMktStrategy((prev: any) => ({
          ...prev,
          weeklyParrilla: data.weeklyParrilla,
        }));
        setMktWorkflowStep(2);
      } else {
        alert(`Aviso: ${data.error || 'No se pudo redactar la parrilla de copys'}`);
      }
    } catch (err: any) {
      alert(`Error con el Copywriter: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setMktLoadingCopys(false);
    }
  };

  // FASE 3: CONVOCAR AL DISEÑADOR GRÁFICO (GENERA EL PROMPT VISUAL DE GEMINI EXCLUSIVO PARA EL DÍA SELECCIONADO)
  const [mktLoadingDayPrompt, setMktLoadingDayPrompt] = useState(false);
  const [mktDayPrompts, setMktDayPrompts] = useState<Record<number, string>>({});

  const handleGenerateDayVisualPrompt = async (dayIdx: number) => {
    const targetDayPlan = mktStrategy?.weeklyParrilla?.[dayIdx];
    if (!targetDayPlan) return;
    setMktLoadingDayPrompt(true);
    try {
      const res = await fetchAgentApi({
        action: 'mkt_design_day_prompt',
        dayPlan: targetDayPlan,
        productTitle: mktStrategy.featuredProduct?.title || 'Colección Exclusiva',
        weeklyTheme: mktStrategy.weeklyTheme,
      });
      const data = await res.json();
      if (data.success && data.dayVisualPrompt) {
        setMktDayPrompts(prev => ({
          ...prev,
          [dayIdx]: data.dayVisualPrompt,
        }));
        setMktWorkflowStep(3);
      } else {
        alert(`Aviso: ${data.error || 'No se pudo generar el prompt visual'}`);
      }
    } catch (err: any) {
      alert(`Error con el Diseñador: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setMktLoadingDayPrompt(false);
    }
  };


  const handleGenerateNanoBananaImage = async (customPrompt?: string, prodTitle?: string, overrideFormat?: '1:1' | '9:16') => {
    setMktGeneratingImage(true);
    try {
      const promptToUse = customPrompt || mktCustomDesignPrompt || mktStrategy?.nanoBananaPrompt || '';
      const titleToUse = prodTitle || mktStrategy?.featuredProduct?.title || 'Producto Exclusivo FoxDrop';
      const formatToUse = overrideFormat || (mktPreviewFormat === 'tk' ? '9:16' : '1:1');
      const curDayName = mktStrategy?.weeklyParrilla?.[mktSelectedDayIndex]?.day || 'Lunes';

      const res = await fetchAgentApi({
        action: 'mkt_visual_nanobanana',
        prompt: promptToUse,
        format: formatToUse,
        productTitle: titleToUse,
        currentDay: curDayName,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.proposals) && data.proposals.length > 0) {
        setMktDesignProposals(data.proposals);
        setMktSelectedProposalId(data.proposals[0].id);
        if (data.generatedAiImageUrl) {
          setMktGeneratedImage(data.generatedAiImageUrl);
          setMktDayImages(prev => ({ ...prev, [mktSelectedDayIndex]: data.generatedAiImageUrl }));
        }
      }
    } catch (err) {
      console.warn('Error generando propuestas visuales con Nano Banana / Gemini:', err);
    } finally {
      setMktGeneratingImage(false);
    }
  };

  const handlePublishMarketingPost = async (platformName: 'instagram' | 'tiktok' | 'all') => {
    setMktPublishing(true);
    setMktPublishSuccess(null);
    try {
      const linkUrl = mktStrategy?.featuredProduct?.id
        ? `https://foxdrop.mx/tienda?highlight=${mktStrategy.featuredProduct.id}`
        : 'https://foxdrop.mx/tienda';

      const res = await fetchAgentApi({
        action: 'mkt_social_publish',
        platform: platformName,
        imageUrl: mktGeneratedImage,
        linkUrl,
      });
      const data = await res.json();
      if (data.success) {
        setMktPublishSuccess(`¡Publicado con éxito en ${platformName === 'all' ? 'Instagram, Facebook y TikTok' : platformName}! Tráfico dirigiendo a foxdrop.mx`);
        setTimeout(() => setMktPublishSuccess(null), 6000);
      } else {
        alert(`Error al publicar: ${data.error || 'Intenta de nuevo'}`);
      }
    } catch (err: any) {
      alert(`Error de red al publicar: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setMktPublishing(false);
    }
  };




  // Soporte PWA WebApp (Instalar aplicación en celular / escritorio)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const deletedOrderIdsRef = useRef<Set<string>>(new Set());

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

    // Restaurar historial de conversación con FoxBot desde la nube (Supabase) con fallback a localStorage
    try {
      const savedMessages = localStorage.getItem('foxdrop_agent_chat_history');
      if (savedMessages) {
        const parsedMsgs = JSON.parse(savedMessages);
        if (Array.isArray(parsedMsgs) && parsedMsgs.length > 0) {
          setAgentChatMessages(parsedMsgs);
        }
      }

      // Descargar la versión más reciente compartida en la nube para sincronizar con tu socio
      getAgentChatHistory().then((cloudMsgs) => {
        if (Array.isArray(cloudMsgs) && cloudMsgs.length > 0) {
          setAgentChatMessages(cloudMsgs);
          try {
            localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(cloudMsgs));
          } catch {}
        }
      });

      // Restaurar plan semanal si existe
      const savedPlan = localStorage.getItem('foxdrop_agent_weekly_plan');
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan);
        if (parsedPlan && parsedPlan.days) {
          setAgentWeeklyPlan(parsedPlan);
        }
      }
    } catch {}
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
          dbId: o.id,
          orderNumber: o.order_number || o.id,
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

      // Asociar dinámicamente cada producto con el nombre real de su lote
      if (dbProducts && dbProducts.length > 0 && mappedBatches.length > 0) {
        setProducts(prevProds => prevProds.map(p => {
          if (p.batchName && p.batchName !== 'Lote 1 (+Flete)' && p.batchName !== 'Lote 1') return p;
          // Buscar coincidencia exacta por ID de lote
          if (p.batchId) {
            const matchedById = mappedBatches.find(b => b.id === p.batchId);
            if (matchedById) return { ...p, batchName: matchedById.batchName };
          }
          // Buscar coincidencia por costo de flete unitario (+- $0.05 MXN)
          const matchedByCost = mappedBatches.find(b => Math.abs(b.costPerUnit - (p.shippingCostAllocated || 0)) < 0.05);
          if (matchedByCost) {
            return { ...p, batchId: matchedByCost.id, batchName: matchedByCost.batchName };
          }
          return p;
        }));
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

      // Configuración de banners y liquidación
      const dbStoreSettings = await getStoreSettings();
      if (dbStoreSettings) {
        const localDark = typeof window !== 'undefined' ? localStorage.getItem('foxdrop_admin_dark_mode') : null;
        setStoreSettings({
          ...dbStoreSettings,
          adminDarkMode: localDark !== null ? localDark === 'true' : (dbStoreSettings.adminDarkMode ?? false),
        });
      }
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
          paymentMethod: newRecord.payment_method || (newRecord.order_number?.startsWith('FX-POS') ? 'cash' : undefined),
          paymentStatus: newRecord.payment_status || 'pending',
          order_items: [],
        };

        // Recargar pedidos completos en segundo plano para traer los order_items
        getAdminOrders().then(freshOrders => {
          if (freshOrders && freshOrders.length > 0) {
            const mapped: Order[] = freshOrders.map((o: any) => ({
              id: o.order_number || o.id,
              dbId: o.id,
              orderNumber: o.order_number || o.id,
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
            setOrders(mapped);
          } else {
            setOrders(prev => [formattedOrder, ...prev.filter(o => o.id !== formattedOrder.id)]);
          }
        });

        // Solo emitir alerta de ¡Nueva Compra Recibida! si NO es un intento de Mercado Pago pendiente de pago
        const isPendingMp = newRecord.payment_method === 'mercadopago' && newRecord.payment_status !== 'paid';
        if (!isPendingMp) {
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
        }
      } else if (eventType === 'UPDATE' && newRecord) {
        // Estado o datos de pedido modificados (por cliente, pasarela o repartidor)
        const orderId = newRecord.order_number || newRecord.id;
        const newStatus = newRecord.status;
        const isCancelled = newStatus === 'cancelled';
        const justPaid = newRecord.payment_status === 'paid' && oldRecord?.payment_status !== 'paid';

        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.id === newRecord.id || o.id === newRecord.order_number) {
            return {
              ...o,
              status: newRecord.status || o.status,
              paymentMethod: newRecord.payment_method || o.paymentMethod,
              paymentStatus: newRecord.payment_status || o.paymentStatus,
              notes: newRecord.notes !== undefined ? newRecord.notes : o.notes,
              trackingNumber: newRecord.tracking_number !== undefined ? newRecord.tracking_number : o.trackingNumber,
            };
          }
          return o;
        }));

        if (justPaid) {
          if (audioEnabled) soundManager.playOrderCreated();
          setAdminRealtimeToast({
            id: `toast-${Date.now()}`,
            type: 'new_order',
            title: '¡Pago Confirmado y Nueva Compra!',
            message: `El pedido ${orderId} (${newRecord.client_name || 'Cliente'}) por $${Number(newRecord.total || 0).toLocaleString('es-MX')} MXN fue acreditado con éxito.`,
            orderId,
          });
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('💳 ¡Pago Acreditado en FoxDrop!', {
                body: `${newRecord.client_name || 'Cliente'} - Pedido ${orderId} ($${newRecord.total} MXN)`,
                icon: '/icons/icon-192x192.png',
              });
            } catch {}
          }
        } else if (isCancelled) {
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

    // Suscripción en Tiempo Real para Carritos Abandonados
    const unsubscribeCarts = subscribeToAbandonedCarts((payload) => {
      const { eventType, new: newCart, old: oldCart } = payload;
      if (eventType === 'INSERT' && newCart) {
        setAbandonedCarts(prev => {
          if (prev.some(c => c.id === newCart.id)) return prev;
          return [{
            id: newCart.id,
            clientName: newCart.client_name || 'Cliente Invitado',
            clientPhone: newCart.client_phone || '',
            clientEmail: newCart.client_email,
            items: newCart.items || [],
            total: Number(newCart.total) || 0,
            followedUp: Boolean(newCart.followed_up),
            lastActive: newCart.last_active || new Date().toISOString(),
          }, ...prev];
        });
      } else if (eventType === 'UPDATE' && newCart) {
        setAbandonedCarts(prev => prev.map(c => {
          if (c.id === newCart.id) {
            return {
              ...c,
              clientName: newCart.client_name || c.clientName,
              clientPhone: newCart.client_phone || c.clientPhone,
              clientEmail: newCart.client_email !== undefined ? newCart.client_email : c.clientEmail,
              items: newCart.items || c.items,
              total: Number(newCart.total) || c.total,
              followedUp: Boolean(newCart.followed_up),
              lastActive: newCart.last_active || c.lastActive,
            };
          }
          return c;
        }));
      } else if (eventType === 'DELETE' && oldCart) {
        setAbandonedCarts(prev => prev.filter(c => c.id !== oldCart.id));
      }
    });

    // Polling de respaldo cada 12 segundos para asegurar sincronización total sin recargar
    const pollingInterval = setInterval(() => {
      getAdminOrders().then(freshOrders => {
        if (Array.isArray(freshOrders)) {
          const filtered = freshOrders.filter(
            (o: any) => !deletedOrderIdsRef.current.has(o.id) && !deletedOrderIdsRef.current.has(o.order_number)
          );
          const mapped: Order[] = filtered.map((o: any) => ({
            id: o.order_number || o.id,
            dbId: o.id,
            orderNumber: o.order_number || o.id,
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
          setOrders(mapped);
        }
      }).catch(() => {});

      getAdminAbandonedCarts().then(freshCarts => {
        if (Array.isArray(freshCarts)) {
          setAbandonedCarts(freshCarts);
        }
      }).catch(() => {});
    }, 12000);

    // Solicitar permiso para notificaciones del navegador si aún no se ha decidido
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch {}
    }

    return () => {
      unsubscribe();
      unsubscribeCarts();
      clearInterval(pollingInterval);
    };
  }, [adminSession, audioEnabled]);

  useEffect(() => {
    if (crmSubTab === 'carts') {
      getAdminAbandonedCarts().then(dbCarts => setAbandonedCarts(dbCarts ?? []));
    }
    if (crmSubTab === 'agent') {
      handleLoadFunnelMetrics();
    }
  }, [crmSubTab]);

  // Handle Login de Administrador
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await authenticateAdmin(loginEmail, loginPass);

      // Si es primera vez y debe activar 2FA antes de continuar
      if (result.mustSetup2FA && result.tempToken) {
        setTwoFactorTempToken(result.tempToken);
        setTwoFactorLoading(true);
        setTwoFactorSetupError('');
        setTwoFactorSetupSuccess(false);
        setTwoFactorSetupCode('');
        const initData = await setup2FaInit(loginEmail);
        setTwoFactorLoading(false);
        if (initData.success && initData.secret) {
          setTwoFactorData(initData);
          setShowTwoFactorModal(true);
        } else {
          setLoginError(initData.error || 'Error al generar la llave 2FA.');
        }
        return;
      }

      // Si requiere segundo factor (Google Authenticator / 2FA)
      if (result.requires2FA && result.tempToken) {
        setTwoFactorTempToken(result.tempToken);
        setTwoFactorStep(true);
        setTwoFactorCode('');
        return;
      }

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

  // Handle Verificación 2FA (TOTP de 6 dígitos o Backup Code)
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;

    setLoginError('');
    setTwoFactorVerifying(true);

    try {
      const result = await verify2FaLogin(loginEmail, twoFactorTempToken, twoFactorCode.trim(), trustThisDevice);
      if (!result.success || !result.session) {
        setLoginError(result.error || 'Código incorrecto o expirado.');
        return;
      }

      setAdminSession(result.session);
      localStorage.setItem('foxdrop_admin_session', JSON.stringify(result.session));
      setTwoFactorStep(false);
      setTwoFactorTempToken('');
      setTwoFactorCode('');
    } catch {
      setLoginError('Ocurrió un error al verificar el código de seguridad.');
    } finally {
      setTwoFactorVerifying(false);
    }
  };

  // Consultar estado de 2FA cuando el admin está autenticado
  const refreshTwoFactorStatus = async () => {
    if (!adminSession?.email) return;
    try {
      const status = await get2FaStatus(adminSession.email);
      setTwoFactorStatus({
        enabled: Boolean(status.enabled),
        backupCodesCount: status.backupCodesCount || 0,
      });
    } catch {}
  };

  useEffect(() => {
    if (adminSession?.email) {
      refreshTwoFactorStatus();
    }
  }, [adminSession]);

  // Iniciar configuración de 2FA (Genera QR y Backup Codes)
  const handleInitTwoFactorSetup = async () => {
    if (!adminSession?.email) return;
    setTwoFactorLoading(true);
    setTwoFactorSetupError('');
    setTwoFactorSetupSuccess(false);
    setTwoFactorSetupCode('');

    try {
      const initData = await setup2FaInit(adminSession.email);
      if (initData.success && initData.secret) {
        setTwoFactorData(initData);
        setShowTwoFactorModal(true);
      } else {
        alert(initData.error || 'No se pudo iniciar la configuración 2FA.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al conectar con el servidor.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Confirmar activación de 2FA con el primer código de la app
  const handleConfirmTwoFactorSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = adminSession?.email || loginEmail;
    if (!targetEmail || !twoFactorData?.secret || !twoFactorSetupCode.trim()) return;

    setTwoFactorLoading(true);
    setTwoFactorSetupError('');

    try {
      const result = await setup2FaConfirm(
        targetEmail,
        twoFactorData.secret,
        twoFactorSetupCode.trim(),
        twoFactorData.backupCodes || []
      );

      if (result.success) {
        setTwoFactorSetupSuccess(true);
        // Guardar los códigos de respaldo para mostrárselos ÚNICAMENTE al dueño legítimo una vez confirmado el 2FA
        if (twoFactorData.backupCodes && twoFactorData.backupCodes.length > 0) {
          setTwoFactorConfirmedCodes(twoFactorData.backupCodes);
        }
        refreshTwoFactorStatus();

        // Si se estaba configurando desde el login inicial, logearlo automáticamente
        if (!adminSession && twoFactorTempToken) {
          const loginRes = await verify2FaLogin(targetEmail, twoFactorTempToken, twoFactorSetupCode.trim(), trustThisDevice);
          if (loginRes.success && loginRes.session) {
            setAdminSession(loginRes.session);
            localStorage.setItem('foxdrop_admin_session', JSON.stringify(loginRes.session));
          }
        }
      } else {
        setTwoFactorSetupError(result.error || 'Código incorrecto. Verifica la hora de tu teléfono.');
      }
    } catch (err: any) {
      setTwoFactorSetupError(err.message || 'Error al confirmar 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Desactivar 2FA
  const handleDisableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSession?.email || !disableTwoFactorPass) return;

    setDisableTwoFactorLoading(true);
    try {
      const res = await disable2Fa(adminSession.email, disableTwoFactorPass);
      if (res.success) {
        alert('El blindaje 2FA ha sido desactivado.');
        setDisableTwoFactorPass('');
        setShowTwoFactorModal(false);
        refreshTwoFactorStatus();
      } else {
        alert(res.error || 'Contraseña incorrecta.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al desactivar 2FA');
    } finally {
      setDisableTwoFactorLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('foxdrop_admin_session');
    setAdminSession(null);
    setLoginPass('');
    setShowResetModal(false);
    setTwoFactorStep(false);
    setTwoFactorCode('');
    setTwoFactorTempToken('');
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
        const updateStatus = (prev: AgentChatMessage[]) => {
          const updated = prev.map(m => m.id === msgId && m.actionExecution ? {
            ...m,
            actionExecution: { ...m.actionExecution, status: 'executed' as const }
          } : m);
          try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
          return updated;
        };
        setAgentChatMessages(updateStatus);
        return;
      }

      if (actionExecution.type === 'open_flyer_studio') {
        const prod = products.find(p => p.id === actionExecution.payload?.productId) || products[0];
        if (prod) {
          setAgentSelectedDayForModal({
            id: `flyer_${Date.now()}`,
            dayName: 'Especial',
            pillar: 'oferta',
            pillarLabel: actionExecution.payload?.badge || '🔥 Oferta FoxDrop',
            productId: prod.id,
            productTitle: actionExecution.payload?.productTitle || prod.title,
            productPrice: actionExecution.payload?.productPrice || prod.publicPrice,
            productImage: prod.images?.[0] || '',
            suggestedTime: 'Inmediato',
            suggestedNetwork: 'WhatsApp Estados & Grupos',
            headline: actionExecution.payload?.headline || `¡Gran Oferta en FoxDrop: ${prod.title}!`,
            caption: actionExecution.payload?.caption || `Aprovecha esta oportunidad exclusiva con garantía de calidad y envíos seguros a todo México.`,
            callToAction: 'Visita foxdrop.mx o mándanos mensaje por WhatsApp.',
            hashtags: ['#FoxDrop', '#TendenciasMexico', '#Ofertas'],
            fullCopy: `${actionExecution.payload?.headline || prod.title}\n\n${actionExecution.payload?.caption || 'Disponible para entrega inmediata.'}\n\n👉 foxdrop.mx`,
            isCompleted: false,
          });
          if (actionExecution.payload?.badge) {
            setFlyerCustomBadge(actionExecution.payload.badge);
          }
        }
        const updateStatus = (prev: AgentChatMessage[]) => {
          const updated = prev.map(m => m.id === msgId && m.actionExecution ? {
            ...m,
            actionExecution: { ...m.actionExecution, status: 'executed' as const }
          } : m);
          try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
          return updated;
        };
        setAgentChatMessages(updateStatus);
        return;
      }

      const res = await executeAgentAction(actionExecution.type, actionExecution.payload);
      if (res.success) {
        alert(`✅ ${res.message || 'Acción ejecutada con éxito por Fox'}`);
        // Marcar acción como ejecutada en el chat y guardar en storage
        const updateStatus = (prev: AgentChatMessage[]) => {
          const updated = prev.map(m => m.id === msgId && m.actionExecution ? {
            ...m,
            actionExecution: { ...m.actionExecution, status: 'executed' as const }
          } : m);
          try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
          return updated;
        };
        setAgentChatMessages(updateStatus);

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

    setAgentChatMessages(prev => {
      const updated = [...prev, userMsg];
      try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
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
      setAgentChatMessages(prev => {
        const updated = [...prev, agentMsg];
        try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
        // Sincronizar en la nube para que tu socio lo vea
        saveAgentChatHistory(updated).catch(() => {});
        return updated;
      });

      // Voz desactivada por defecto para experiencia silenciosa y ágil
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
      setAgentChatMessages(prev => {
        const updated = [...prev, errorMsg];
        try { localStorage.setItem('foxdrop_agent_chat_history', JSON.stringify(updated)); } catch {}
        return updated;
      });
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

  // Detectar si el producto que se está creando/editando en el modal pertenece al Catálogo Internacional (CJ Dropshipping)
  const editingProductObj = editingProductId ? products.find(p => p.id === editingProductId) : null;
  const isEditingCjProduct = Boolean(
    (newSku && newSku.toUpperCase().startsWith('CJ')) ||
    (newBrand && newBrand.toLowerCase().includes('cj dropshipping')) ||
    (editingProductObj && ((editingProductObj.sku && editingProductObj.sku.startsWith('CJ')) || (editingProductObj.brand && editingProductObj.brand.toLowerCase().includes('cj dropshipping')))) ||
    (!editingProductId && inventoryScope === 'cj_international')
  );

  // Reescribir / Mejorar Descripción con IA (Tanto para Boutique como para Envío Internacional CJ)
  const handleAiRewriteDescription = async (customHint?: string) => {
    if (!newTitle.trim() && !newDescription.trim()) {
      alert('Escribe primero el nombre del producto o una breve idea para que la IA pueda generar la descripción.');
      return;
    }
    setRewritingDescriptionAi(true);
    try {
      const res = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSession?.token ? { Authorization: `Bearer ${adminSession.token}` } : {}),
        },
        body: JSON.stringify({
          action: 'rewrite_description',
          adminToken: adminSession?.token,
          adminEmail: adminSession?.email,
          title: newTitle.trim(),
          currentDescription: newDescription.trim(),
          category: newCategory,
          brand: newBrand,
          isCj: isEditingCjProduct,
          customHint: (customHint ?? aiRewriteHint).trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.description) {
        throw new Error(data.error || 'No se pudo generar la descripción con IA');
      }
      setNewDescription(data.description);
      setShowAiRewriteHintInput(false);
    } catch (err: any) {
      alert(`Aviso IA: ${err.message || 'Intenta nuevamente'}`);
    } finally {
      setRewritingDescriptionAi(false);
    }
  };

  // Cálculo automático según Lote seleccionado (en CJ Internacional no se usan lotes ni fletes prorrateados adicionales, pues baseCostMxn ya es el costo puesto en México)
  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0] || {
    id: 'custom',
    batchName: 'Lote Genérico',
    costPerUnit: 20.0
  };

  const costMxn = costInputMode === 'mxn' ? newCostMxnDirect : (newCostUsd * usdRate);
  const calculatedCostUsd = costInputMode === 'mxn' ? (usdRate > 0 ? (newCostMxnDirect / usdRate) : 0) : newCostUsd;
  const shippingPerUnit = isEditingCjProduct ? 0 : (currentBatch.costPerUnit || 20.0);
  const totalCostUnitMxn = costMxn + shippingPerUnit;
  const profitUnit = newPublicPrice - totalCostUnitMxn;
  const marginPercent = newPublicPrice > 0 ? (profitUnit / newPublicPrice) * 100 : 0;

  // Cálculos dinámicos de Oferta / Promoción
  const promoPrice = newDiscountPercent > 0 ? Math.round(newPublicPrice * (1 - newDiscountPercent / 100)) : newPublicPrice;
  const promoProfit = promoPrice - totalCostUnitMxn;
  const promoMarginPercent = promoPrice > 0 ? (promoProfit / promoPrice) * 100 : 0;
  const isPromoMarginSafe = newDiscountPercent === 0 || (isEditingCjProduct ? promoProfit > 0 : promoMarginPercent >= 50);

  // Productos del ámbito actual: Stock Físico (Boutique) vs Catálogo Virtual (Importación CJ)
  const scopedProducts = products.filter(p => {
    const isCj = Boolean((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')));
    return inventoryScope === 'cj_international' ? isCj : !isCj;
  });

  // Conteos para Filtros de Inventario (calculados exclusivamente sobre el ámbito activo)
  const countOutOfStock = scopedProducts.filter(p => (Number(p.stock) || 0) <= 0).length;
  const countLowStock = scopedProducts.filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= 3).length;
  const countHealthy = scopedProducts.filter(p => (Number(p.stock) || 0) > 3).length;
  const countCombos = scopedProducts.filter(p => Boolean(p.isCombo)).length;
  const countInactive = scopedProducts.filter(p => p.isActive === false).length;

  // Filtrado de productos mejorado
  const filteredProducts = products.filter(p => {
    // 0. Separación de Doble Inventario: Stock Físico (Boutique) vs Catálogo Virtual (CJ Dropshipping)
    const isCj = Boolean((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')));
    if (inventoryScope === 'physical' && isCj) return false;
    if (inventoryScope === 'cj_international' && !isCj) return false;

    // 1. Filtro por término de búsqueda
    const q = (searchTerm || '').trim().toLowerCase();
    const pTitle = (p.title || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    const pCategory = (p.category || '').toLowerCase();
    const matchesSearch = !q || pTitle.includes(q) || pSku.includes(q) || pCategory.includes(q);

    if (!matchesSearch) return false;

    // 2. Filtro por categoría seleccionada
    if (inventoryCategoryFilter !== 'all' && pCategory !== inventoryCategoryFilter.toLowerCase()) {
      return false;
    }

    // 2.1 Filtro por lote de importación (solo aplica a Inventario Físico Boutique)
    if (inventoryScope === 'physical' && inventoryBatchFilter !== 'all') {
      const targetBatch = batches.find(b => b.id === inventoryBatchFilter);
      if (targetBatch) {
        const matchesBatchId = p.batchId === targetBatch.id;
        const matchesCost = Math.abs(targetBatch.costPerUnit - (Number(p.shippingCostAllocated) || 0)) < 0.05;
        const matchesName = p.batchName && p.batchName === targetBatch.batchName;
        if (!matchesBatchId && !matchesCost && !matchesName) return false;
      }
    }

    // 3. Filtro por estado de stock / tipo
    const currentStock = Number(p.stock) || 0;
    if (stockFilter === 'low_stock') {
      return currentStock > 0 && currentStock <= 3;
    }
    if (stockFilter === 'out_of_stock') {
      return currentStock <= 0;
    }
    if (stockFilter === 'healthy') {
      return currentStock > 3;
    }
    if (stockFilter === 'combos') {
      return Boolean(p.isCombo);
    }
    if (stockFilter === 'inactive') {
      return p.isActive === false;
    }

    return true;
  }).sort((a, b) => {
    const aPrice = Number(a.publicPrice || (a as any).public_price) || 0;
    const bPrice = Number(b.publicPrice || (b as any).public_price) || 0;
    const aStock = Number(a.stock) || 0;
    const bStock = Number(b.stock) || 0;
    const aMargin = Number(a.marginPercent) || 0;
    const bMargin = Number(b.marginPercent) || 0;

    if (inventorySortBy === 'price_asc') return aPrice - bPrice;
    if (inventorySortBy === 'price_desc') return bPrice - aPrice;
    if (inventorySortBy === 'stock_asc') return aStock - bStock;
    if (inventorySortBy === 'stock_desc') return bStock - aStock;
    if (inventorySortBy === 'margin_desc') return bMargin - aMargin;
    return 0; // 'default'
  });

  const totalInventoryUnits = scopedProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);

  // Excluir del cálculo de rentabilidad los productos con precio en $0 (pendientes de asignar precio)
  const pricedProducts = scopedProducts.filter(p => (Number(p.publicPrice || (p as any).public_price) || 0) > 0);
  const unpricedProducts = scopedProducts.filter(p => (Number(p.publicPrice || (p as any).public_price) || 0) <= 0);

  const totalInvestment = pricedProducts.reduce((acc, p) => {
    const cost = Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0;
    const qty = Number(p.stock) || 0;
    return acc + (cost * qty);
  }, 0);

  const totalExpectedRevenue = pricedProducts.reduce((acc, p) => {
    const price = Number(p.publicPrice || (p as any).public_price) || 0;
    const qty = Number(p.stock) || 0;
    return acc + (price * qty);
  }, 0);

  const totalExpectedProfit = totalExpectedRevenue - totalInvestment;
  const avgMargin = totalExpectedRevenue > 0 ? (totalExpectedProfit / totalExpectedRevenue) * 100 : 0;

  // Métricas específicas para Catálogo Virtual (Importación CJ Dropshipping) - rangos y promedios claros
  const totalCjVariantsCount = scopedProducts.reduce((acc, p) => acc + (Array.isArray(p.variants) && p.variants.length > 0 ? p.variants.length : 1), 0);
  const cjCosts = pricedProducts.map(p => Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0).filter(c => c > 0);
  const minCjCost = cjCosts.length > 0 ? Math.min(...cjCosts) : 0;
  const maxCjCost = cjCosts.length > 0 ? Math.max(...cjCosts) : 0;
  const avgCjLandedCost = cjCosts.length > 0 ? cjCosts.reduce((a, b) => a + b, 0) / cjCosts.length : 0;

  const cjPrices = pricedProducts.map(p => Number(p.publicPrice || (p as any).public_price) || 0).filter(pr => pr > 0);
  const minCjPrice = cjPrices.length > 0 ? Math.min(...cjPrices) : 0;
  const maxCjPrice = cjPrices.length > 0 ? Math.max(...cjPrices) : 0;
  const avgCjPublicPrice = cjPrices.length > 0 ? cjPrices.reduce((a, b) => a + b, 0) / cjPrices.length : 0;

  const cjProfits = pricedProducts.map(p => {
    const pr = Number(p.publicPrice || (p as any).public_price) || 0;
    const co = Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0;
    return pr - co;
  });
  const minCjProfit = cjProfits.length > 0 ? Math.min(...cjProfits) : 0;
  const maxCjProfit = cjProfits.length > 0 ? Math.max(...cjProfits) : 0;
  const avgCjProfitPerSale = cjProfits.length > 0 ? cjProfits.reduce((a, b) => a + b, 0) / cjProfits.length : 0;
  const avgCjMarginPercent = avgCjPublicPrice > 0 ? (avgCjProfitPerSale / avgCjPublicPrice) * 100 : 0;

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
  // Eliminar una variante específica de un producto y persistirlo en la base de datos
  const handleDeleteVariant = async (product: any, variantIdx: number, variantItem: any) => {
    const varName = variantItem?.name || ('Opción ' + (variantIdx + 1));
    const confirmDelete = window.confirm(`¿Seguro que deseas eliminar la variante "${varName}"? Esta opción ya no aparecerá en la tienda.`);
    if (!confirmDelete) return;

    const remainingVariants = (product.variants || []).filter((_: any, idx: number) => idx !== variantIdx);
    const vKey = String(variantItem?.id || variantIdx);
    setDeletingVariantKey(vKey);

    try {
      await updateProductInDb(product.id, {
        title: product.title,
        categoryName: product.category || 'General',
        baseCostUsd: product.baseCostUsd || 0,
        baseCostMxn: product.baseCostMxn || 0,
        shippingCostAllocated: product.shippingCostAllocated || 0,
        publicPrice: remainingVariants.length > 0
          ? Math.min(...remainingVariants.map((v: any) => Number(v.publicPrice || v.public_price) || product.publicPrice))
          : product.publicPrice,
        stock: product.stock,
        variants: remainingVariants,
      });

      // Actualizar estado local del producto
      setProducts(prev => prev.map(p => {
        if (p.id === product.id) {
          return {
            ...p,
            variants: remainingVariants,
            publicPrice: remainingVariants.length > 0
              ? Math.min(...remainingVariants.map((v: any) => Number(v.publicPrice || v.public_price) || p.publicPrice))
              : p.publicPrice,
          };
        }
        return p;
      }));

      // Si está abierto el modal de visualización rápida, actualizarlo
      if (previewingVariantsProduct && previewingVariantsProduct.id === product.id) {
        setPreviewingVariantsProduct((prev: any) => prev ? {
          ...prev,
          variants: remainingVariants,
        } : null);
      }

      // Si está abierto el modal de edición, actualizarlo
      if (editingProductId === product.id) {
        setEditingVariants(remainingVariants);
      }
    } catch (err: any) {
      alert(`Error al eliminar la variante: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setDeletingVariantKey(null);
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    const isCjProd = Boolean((prod.sku && prod.sku.startsWith('CJ')) || (prod.brand && prod.brand.toLowerCase().includes('cj dropshipping')));
    setEditingProductId(prod.id);
    setNewTitle(prod.title);
    setNewDescription(prod.description || '');
    setNewSku(prod.sku || '');
    setNewCategory(prod.category || 'Electrónica');
    setNewBrand(prod.brand || (isCjProd ? 'CJ Dropshipping' : 'Bath & Body Works'));
    setNewCostUsd(prod.baseCostUsd || 5.0);
    setNewCostMxnDirect(prod.baseCostMxn || (prod.baseCostUsd ? prod.baseCostUsd * usdRate : 100.0));
    setCostInputMode('mxn');
    setNewPublicPrice(prod.publicPrice);
    setNewDiscountPercent(prod.discountPercent || 0);
    setNewStock(prod.stock);
    setNewImageUrl(prod.images[0] || '');
    setNewImages(prod.images && prod.images.length > 0 ? Array.from(new Set(prod.images.map(s => String(s || '').trim()).filter(Boolean))) : []);
    setEditingVariants(Array.isArray(prod.variants) ? JSON.parse(JSON.stringify(prod.variants)) : []);
    setIsCombo(Boolean(prod.isCombo));
    setSelectedComboProductIds(prod.comboProductIds || []);
    setNewIsActive(prod.isActive !== false);
    setAiRewriteHint('');
    setShowAiRewriteHintInput(false);

    // Emparejar lote exacto solo para productos físicos Boutique
    let assignedBatch = null;
    if (!isCjProd) {
      if (prod.batchId) {
        setSelectedBatchId(prod.batchId);
        assignedBatch = batches.find(b => b.id === prod.batchId);
      } else {
        const matchedBatch = batches.find(b => Math.abs(b.costPerUnit - (prod.shippingCostAllocated || 0)) < 0.05);
        if (matchedBatch) {
          setSelectedBatchId(matchedBatch.id);
          assignedBatch = matchedBatch;
        }
      }
    }

    // Calcular qué porcentaje de incremento tiene ya aplicado este producto existente
    const prodTotalCost = isCjProd
      ? (prod.baseCostMxn || prod.totalCostMxn || 0)
      : (prod.baseCostMxn || 0) + (assignedBatch?.costPerUnit || prod.shippingCostAllocated || 0);
    if (prodTotalCost > 0 && prod.publicPrice > 0) {
      const existingMarkup = Math.round(((prod.publicPrice - prodTotalCost) / prodTotalCost) * 100);
      setPriceMarkupPercent(Math.max(10, Math.min(300, existingMarkup)));
    } else {
      setPriceMarkupPercent(isCjProd ? 32 : 100);
    }

    setShowAddModal(true);
  };

  // Abrir Modal para Crear Producto Nuevo
  const handleOpenCreateProduct = () => {
    const isCjScope = inventoryScope === 'cj_international';
    setEditingProductId(null);
    setNewTitle('');
    setNewDescription('');
    setNewSku(isCjScope ? 'CJ-' : '');
    setNewCategory(isCjScope ? 'Gadgets & Novedades' : 'Electrónica');
    setNewBrand(isCjScope ? 'CJ Dropshipping' : 'Bath & Body Works');
    setNewCostUsd(5.00);
    const initialBaseMxn = 100.00;
    setNewCostMxnDirect(initialBaseMxn);
    setCostInputMode('mxn');
    setPriceMarkupPercent(isCjScope ? 32 : 100);
    setNewDiscountPercent(0);
    const defaultBatchFreight = isCjScope ? 0 : (batches[0]?.costPerUnit || 20.0);
    const initialTotalCost = initialBaseMxn + defaultBatchFreight;
    setNewPublicPrice(isCjScope ? Math.max(119, Math.round(initialTotalCost * 1.32)) : Math.round(initialTotalCost * 2));
    setNewStock(isCjScope ? 50 : 15);
    setNewImageUrl('');
    setNewImages([]);
    setEditingVariants([]);
    setIsCombo(false);
    setSelectedComboProductIds([]);
    setNewIsActive(true);
    setAiRewriteHint('');
    setShowAiRewriteHintInput(false);
    setShowAddModal(true);
  };

  // Guardar Alta o Edición de Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const rawFinalImages = newImages.length > 0
        ? newImages
        : (newImageUrl ? [newImageUrl] : ['/no-image.svg']);
      const finalImages = Array.from(new Set(rawFinalImages.map(s => String(s || '').trim()).filter(Boolean)));

      if (editingProductId) {
        // EDICIÓN
        await updateProductInDb(editingProductId, {
          title: newTitle,
          description: newDescription.trim() || undefined,
          sku: newSku.trim() || undefined,
          categoryName: newCategory,
          brand: newBrand,
          baseCostUsd: calculatedCostUsd,
          baseCostMxn: costMxn,
          shippingCostAllocated: shippingPerUnit,
          publicPrice: newPublicPrice,
          discountPercent: newDiscountPercent,
          stock: newStock,
          imageUrl: finalImages[0],
          images: finalImages,
          isCombo,
          comboProductIds: isCombo ? selectedComboProductIds : [],
          isActive: newIsActive,
          variants: (isEditingCjProduct && editingVariants.length > 0) ? editingVariants : undefined,
        });

        setProducts(prev => prev.map(p => {
          if (p.id === editingProductId) {
            const updatedVariants = (isEditingCjProduct && editingVariants.length > 0)
              ? editingVariants
              : p.variants;

            return {
              ...p,
              title: newTitle,
              description: newDescription.trim() || p.description,
              sku: newSku.trim() || p.sku,
              category: newCategory,
              brand: newBrand,
              baseCostUsd: calculatedCostUsd,
              baseCostMxn: costMxn,
              shippingCostAllocated: shippingPerUnit,
              totalCostMxn: totalCostUnitMxn,
              publicPrice: newPublicPrice,
              discountPercent: newDiscountPercent,
              profitUnit,
              marginPercent,
              stock: newStock,
              batchId: isEditingCjProduct ? undefined : currentBatch.id,
              batchName: isEditingCjProduct ? 'CJ Dropshipping' : currentBatch.batchName,
              images: finalImages,
              variants: updatedVariants,
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
          description: newDescription.trim() || undefined,
          sku: newSku.trim() || undefined,
          categoryName: newCategory,
          brand: newBrand,
          baseCostUsd: calculatedCostUsd,
          baseCostMxn: costMxn,
          shippingCostAllocated: shippingPerUnit,
          publicPrice: newPublicPrice,
          discountPercent: newDiscountPercent,
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
      setNewDescription('');
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
          dbId: o.id,
          orderNumber: o.order_number || o.id,
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

  // Eliminar Producto con Modal Estilizado Seguro
  const handleDeleteProduct = (id: string, title: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: `Eliminar "${title}"`,
      description: 'Esta acción borrará definitivamente este artículo del catálogo e inventario. No se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteProductInDb(id);
          setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
          console.error("Fallo al eliminar producto:", err);
          alert(`Error al eliminar de la base de datos: ${err.message || 'Intente nuevamente'}`);
        } finally {
          setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
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

  // 8. ACTIVAR / PAUSAR EN LOTE
  const handleApplyBulkBrand = async () => {
    if (selectedProductIds.length === 0 || !bulkTargetBrand.trim()) return;
    setSavingBulkBrand(true);
    try {
      await bulkUpdateProductsBrand(selectedProductIds, bulkTargetBrand.trim());
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          return { ...p, brand: bulkTargetBrand.trim() };
        }
        return p;
      }));
      setShowBulkBrandModal(false);
      setSelectedProductIds([]);
      alert(`✅ ¡Tienda asignada con éxito a ${selectedProductIds.length} artículos!`);
    } catch (err: any) {
      alert(err.message || 'Error al asignar tienda en lote');
    } finally {
      setSavingBulkBrand(false);
    }
  };

  const handleBulkToggleActive = async (targetActive: boolean) => {
    if (selectedProductIds.length === 0) return;
    const count = selectedProductIds.length;
    try {
      // Optimistic update
      setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, isActive: targetActive } : p));
      
      await Promise.all(
        selectedProductIds.map(id => updateProductInDb(id, { isActive: targetActive }))
      );

      setSelectedProductIds([]);
      alert(`¡Éxito! Se ${targetActive ? 'encendieron' : 'pausaron'} ${count} artículo(s) en la tienda.`);
    } catch (err: any) {
      console.error("Error en cambio de estado masivo:", err);
      alert(`Ocurrió un detalle al actualizar algunos artículos: ${err.message || 'Intenta de nuevo'}`);
    }
  };

  // 9. AJUSTE DE STOCK MASIVO (+ o -)
  const handleApplyBulkStock = async () => {
    if (selectedProductIds.length === 0 || bulkStockDeltaInput === 0) return;
    setSavingBulkStock(true);
    try {
      const delta = bulkStockDeltaInput;
      // Optimistic update
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          const nextStock = Math.max(0, (p.stock || 0) + delta);
          return { ...p, stock: nextStock };
        }
        return p;
      }));

      const prodsToUpdate = products.filter(p => selectedProductIds.includes(p.id));
      await Promise.all(
        prodsToUpdate.map(p => {
          const nextStock = Math.max(0, (p.stock || 0) + delta);
          return updateProductInDb(p.id, { stock: nextStock });
        })
      );

      setShowBulkStockModal(false);
      setSelectedProductIds([]);
      alert(`¡Stock actualizado! Se ${delta > 0 ? 'sumaron' : 'restaron'} ${Math.abs(delta)} piezas a ${prodsToUpdate.length} artículo(s).`);
    } catch (err: any) {
      console.error("Error al ajustar stock en lote:", err);
      alert(`Error al ajustar stock: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setSavingBulkStock(false);
    }
  };

  // 10. APLICAR DESCUENTO PROMOCIONAL EN LOTE
  const handleApplyBulkDiscount = async (discountVal: number) => {
    if (selectedProductIds.length === 0) return;
    setSavingBulkDiscount(true);
    try {
      await bulkUpdateProductsDiscount(selectedProductIds, discountVal);

      // Actualizar optimistamente el estado local de productos
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          return { ...p, discountPercent: discountVal };
        }
        return p;
      }));

      const count = selectedProductIds.length;
      setShowBulkDiscountModal(false);
      setSelectedProductIds([]);
      if (discountVal > 0) {
        alert(`¡Listo! Se activó la oferta del ${discountVal}% de descuento para ${count} producto(s). Ahora aparecerán destacados en la pestaña Promociones.`);
      } else {
        alert(`¡Listo! Se quitó la promoción de ${count} producto(s).`);
      }
    } catch (err: any) {
      console.error("Error al aplicar descuento en lote:", err);
      alert(`Error al actualizar descuentos: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setSavingBulkDiscount(false);
    }
  };

  // 10. GUARDAR PRECIO RÁPIDO EN LÍNEA (INLINE QUICK-EDIT)
  const handleQuickPriceSave = async (product: Product, newPriceNum: number) => {
    if (isNaN(newPriceNum) || newPriceNum <= 0 || newPriceNum === product.publicPrice) {
      setEditingPriceId(null);
      return;
    }

    setSavingPriceId(product.id);
    const prevPrice = product.publicPrice;
    const profit = newPriceNum - (product.totalCostMxn || 0);
    const margin = newPriceNum > 0 ? (profit / newPriceNum) * 100 : 0;

    try {
      // Optimistic update
      setProducts(prev => prev.map(p => {
        if (p.id === product.id) {
          return {
            ...p,
            publicPrice: newPriceNum,
            profitUnit: profit,
            marginPercent: margin,
          };
        }
        return p;
      }));

      await updateProductInDb(product.id, { publicPrice: newPriceNum });
      setEditingPriceId(null);
    } catch (err: any) {
      console.error("Error al actualizar precio en línea:", err);
      // Revert
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, publicPrice: prevPrice } : p));
      alert(`No se pudo actualizar el precio: ${err.message || 'Error de conexión'}`);
    } finally {
      setSavingPriceId(null);
    }
  };

  // 11. GENERADOR AUTOMÁTICO DE SKU INTELIGENTE
  const handleGenerateAutoSku = (catName?: string) => {
    const categoryPrefix = (catName || newCategory || 'GEN')
      .trim()
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X') || 'FOX';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generated = `FX-${categoryPrefix}-${randomSuffix}`;
    setNewSku(generated);
  };

  // 12. ABRIR MODAL DE IMPRESIÓN DE ETIQUETAS
  const handleOpenBarcodePrintModal = (targetProducts: Product[]) => {
    if (targetProducts.length === 0) return;
    setBarcodePrintProducts(targetProducts);
    setShowBarcodePrintModal(true);
  };

  // Abrir Modal para Crear Lote
  const handleOpenCreateBatch = () => {
    setEditingBatch(null);
    setBatchNameInput('');
    setBatchShippingCostInput('500');
    setBatchUnitsInput('25');
    setBatchNotesInput('');
    setShowBatchModal(true);
  };

  // Abrir Modal para Editar Lote
  const handleOpenEditBatch = (batch: ImportBatch) => {
    setEditingBatch(batch);
    setBatchNameInput(batch.batchName);
    setBatchShippingCostInput(batch.totalShippingCost.toString());
    setBatchUnitsInput(batch.totalUnits.toString());
    setBatchNotesInput(batch.notes || '');
    setShowBatchModal(true);
  };

  // Guardar Lote de Importación (Crear o Actualizar)
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const numUnits = parseInt(batchUnitsInput, 10) || 0;
    const numShipping = parseFloat(batchShippingCostInput) || 0;
    if (!batchNameInput.trim() || numUnits <= 0) return;

    setSavingBatch(true);
    const costPerUnitCalc = numShipping / numUnits;

    if (editingBatch) {
      // Modo Edición
      try {
        const updated = await updateImportBatch(editingBatch.id, {
          batchName: batchNameInput.trim(),
          totalShippingCost: numShipping,
          totalUnits: numUnits,
          notes: batchNotesInput,
        });

        const newCostPerUnit = Number(updated?.cost_per_unit || costPerUnitCalc);

        setBatches(prev => prev.map(b => {
          if (b.id !== editingBatch.id) return b;
          return {
            ...b,
            batchName: batchNameInput.trim(),
            totalShippingCost: numShipping,
            totalUnits: numUnits,
            costPerUnit: newCostPerUnit,
            notes: batchNotesInput,
          };
        }));

        // Actualizar nombres de lote y prorrateo de flete en los artículos vinculados en memoria
        setProducts(prev => prev.map(p => {
          if (p.batchId === editingBatch.id || p.batchName === editingBatch.batchName) {
            return {
              ...p,
              batchName: batchNameInput.trim(),
              shippingCostAllocated: newCostPerUnit,
            };
          }
          return p;
        }));

        setShowBatchModal(false);
        setEditingBatch(null);
      } catch (err: any) {
        console.error("Error al actualizar lote:", err);
        alert(`Error al actualizar el lote: ${err.message || 'Intente de nuevo'}`);
      } finally {
        setSavingBatch(false);
      }
    } else {
      // Modo Creación
      const newBatchObj: ImportBatch = {
        id: `batch-${Date.now()}`,
        batchName: batchNameInput,
        totalShippingCost: numShipping,
        totalUnits: numUnits,
        costPerUnit: costPerUnitCalc,
        receivedAt: new Date().toISOString().split('T')[0],
        notes: batchNotesInput,
      };

      try {
        const created = await createImportBatch({
          batchName: batchNameInput,
          totalShippingCost: numShipping,
          totalUnits: numUnits,
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
        const errMsg = err.message || '';
        if (errMsg.includes("No autorizado") || errMsg.includes("expirada")) {
          alert("Tu sesión administrativa expiró. Por favor vuelve a ingresar tus credenciales para renovar la sesión.");
          localStorage.removeItem('foxdrop_admin_session');
          setAdminSession(null);
        } else {
          alert(`Error al guardar el lote en la base de datos: ${errMsg || 'Intente de nuevo'}`);
        }
      } finally {
        setSavingBatch(false);
      }
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


  // Crear o Editar Slide del Carrusel
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim() || !slideImageUrl.trim()) return;
    setSavingSlide(true);
    const finalCtaText = slideUseButton ? (slideCtaText.trim() || 'Ver Colección') : '';
    try {
      if (editingSlideId) {
        const updated = await updateCarouselSlide({
          id: editingSlideId,
          title: slideTitle,
          subtitle: slideSubtitle,
          image_url: slideImageUrl,
          cta_text: finalCtaText,
          cta_category: slideCtaCategory,
        });
        setSlides(prev => prev.map(s => s.id === editingSlideId ? { ...s, ...updated } : s));
      } else {
        const created = await createCarouselSlide({
          title: slideTitle,
          subtitle: slideSubtitle,
          image_url: slideImageUrl,
          cta_text: finalCtaText,
          cta_category: slideCtaCategory,
          sort_order: slides.length + 1,
        });
        setSlides(prev => [...prev, created]);
      }
      setShowSlideModal(false);
      setEditingSlideId(null);
      setSlideTitle(''); setSlideSubtitle(''); setSlideImageUrl('');
      setSlideUseButton(false); setSlideCtaText(''); setSlideCtaCategory('Todas');
    } catch (err) {
      console.error('Error al guardar slide:', err);
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
    const targetOrder = orders.find(o => o.id === orderId || o.dbId === orderId || o.orderNumber === orderId);
    const identifierToUpdate = targetOrder?.orderNumber || targetOrder?.id || orderId;

    setOrders(orders.map(o => (o.id === orderId || o.orderNumber === orderId || o.dbId === orderId) ? { ...o, status: newStatus, ...(notes !== undefined ? { notes } : {}) } : o));

    try {
      await updateOrderStatusInDb(identifierToUpdate, newStatus, notes);
      if (targetOrder?.clientPhone && targetOrder.clientPhone !== 'Mostrador / Histórica') {
        fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status_update",
            orderNumber: targetOrder.orderNumber || targetOrder.id,
            clientName: targetOrder.clientName,
            clientPhone: targetOrder.clientPhone,
            newStatus,
            shippingType: targetOrder.shippingType,
            pickupPoint: targetOrder.pickupPoint,
            total: targetOrder.total,
            trackingNumber: targetOrder.trackingNumber,
            notes: notes || targetOrder.notes,
          }),
        }).then(res => {
          if (res.ok) {
            setAdminRealtimeToast({
              id: Date.now().toString(),
              type: 'status_update',
              title: `WhatsApp Enviado a ${targetOrder.clientName || 'Cliente'}`,
              message: `Notificación automática enviada: Pedido ${targetOrder.orderNumber || targetOrder.id} ahora está "${newStatus}".`,
              orderId: targetOrder.orderNumber || targetOrder.id,
            });
            setTimeout(() => setAdminRealtimeToast(null), 6000);
          }
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

  // Eliminar Pedido Definitivamente con Modal Estilizado Seguro
  const handleDeleteOrder = (orderId: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: `Eliminar Pedido ${orderId}`,
      description: 'Esta acción borrará definitivamente este pedido del sistema y la base de datos.',
      onConfirm: async () => {
        const target = orders.find(o => o.id === orderId || o.dbId === orderId || o.orderNumber === orderId);
        deletedOrderIdsRef.current.add(orderId);
        if (target?.id) deletedOrderIdsRef.current.add(target.id);
        if (target?.dbId) deletedOrderIdsRef.current.add(target.dbId);
        if (target?.orderNumber) deletedOrderIdsRef.current.add(target.orderNumber);

        setOrders(prev => prev.filter(o => o.id !== orderId && o.dbId !== orderId && o.orderNumber !== orderId));
        try {
          await deleteOrderInDb(target?.orderNumber || target?.id || orderId);
        } catch (err) {
          console.error("Error al eliminar pedido:", err);
          alert("No se pudo eliminar el pedido en la base de datos.");
        } finally {
          setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
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

      // Generar ticket gráfico nítido e instantáneo vía Canvas 2D (cero lag, cero memory leak)
      setGeneratingTicketImg(true);
      (async () => {
        try {
          let clientDataUrl = "";
          try {
            clientDataUrl = await generateTicketCanvasDataUrl(ticketData);
          } catch (canvasErr) {
            console.warn("No se pudo generar ticket vía Canvas:", canvasErr);
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

            // DISPARO 100% AUTOMÁTICO DEL TICKET POR WHATSAPP OFICIAL DE FOXDROP
            if (cleanPhone && cleanPhone !== 'Mostrador' && cleanPhone.replace(/\D/g, '').length >= 10) {
              setTicketSentOrders(prev => new Set(prev).add(saleResult.orderNumber));
              fetch("/api/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "status_update",
                  orderNumber: saleResult.orderNumber,
                  clientName: cleanName,
                  clientPhone: cleanPhone,
                  newStatus: "delivered",
                  shippingType: "pos_in_store",
                  total: posTotal,
                  ticketImageUrl: finalImgUrl,
                  loyaltyStars: posPointsEarned,
                }),
              }).catch(autoPosErr => console.warn("Aviso: error despachando ticket automático por WhatsApp:", autoPosErr));
            }
          }
        } catch (genErr) {
          console.warn("Error capturando o generando ticket:", genErr);
        } finally {
          setGeneratingTicketImg(false);
        }
      })();

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

  // Enviar ticket directamente usando el sistema de WhatsApp oficial de FoxDrop
  const shareTicketImageDirectly = async (ticket: NonNullable<typeof posCompletedTicket>) => {
    if (isSendingTicketViaWa) return;
    setIsSendingTicketViaWa(true);

    try {
      const cleanPhone = (ticket.clientPhone || '').replace(/\D/g, '');
      const alreadySent = ticketSentOrders.has(ticket.orderNumber);

      // 1. Si no ha sido despachado automáticamente aún y es un teléfono válido, enviarlo por API
      if (!alreadySent && cleanPhone && cleanPhone !== 'Mostrador' && cleanPhone.length >= 10) {
        setTicketSentOrders(prev => new Set(prev).add(ticket.orderNumber));
        try {
          await fetch("/api/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "status_update",
              orderNumber: ticket.orderNumber,
              clientName: ticket.clientName,
              clientPhone: ticket.clientPhone,
              newStatus: "delivered",
              shippingType: "pos_in_store",
              total: ticket.total,
              ticketImageUrl: ticket.ticketImageUrl,
              loyaltyStars: ticket.pointsEarned,
            }),
          });
        } catch (err) {
          console.warn("Aviso: reintento de envío de ticket por API:", err);
        }
      }

      // 2. Cerrar el modal del ticket para no bloquear ni dejar pantalla negra sobre el WhatsApp flotante
      setPosCompletedTicket(null);

      // 3. Abrir la ventana flotante de WhatsApp posicionada en el chat del cliente (sin reenviar texto duplicado si ya se mandó)
      sendWhatsAppTicket(ticket);
    } finally {
      setIsSendingTicketViaWa(false);
    }
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

  const handleRegenerateTicketOrder = async (order: Order) => {
    setRegeneratingTicket(true);
    try {
      const items = (order.order_items && order.order_items.length > 0)
        ? order.order_items.map((it: any) => ({
            title: it.product_title || 'Artículo',
            quantity: it.quantity || 1,
            price: Number(it.price_at_purchase) || 0,
          }))
        : [{ title: 'Compra mostrador FoxDrop', quantity: 1, price: order.total }];

      const ticketData = {
        orderNumber: order.id,
        items,
        total: order.total,
        paymentMethod: order.paymentMethod || 'cash',
        clientPhone: order.clientPhone || 'Mostrador',
        clientName: order.clientName || 'Cliente FoxDrop',
        pointsEarned: Math.floor(order.total / 10),
        date: order.createdAt || new Date().toISOString(),
      };

      const canvasDataUrl = await generateTicketCanvasDataUrl(ticketData);
      const res = await generateTicketImage({
        ...ticketData,
        imageDataUrl: canvasDataUrl,
      });

      const finalUrl = res?.imageUrl || canvasDataUrl;
      if (finalUrl) {
        const cleanNotes = (order.notes || "").replace(/Ticket:\s*(https?:\/\/[^\s]+)/i, "").trim();
        const updatedNotes = cleanNotes ? `${cleanNotes} | Ticket: ${finalUrl}` : `Venta física POS | Ticket: ${finalUrl}`;
        await updateOrderStatusInDb(order.id, order.status, updatedNotes);
        const updatedOrder = { ...order, notes: updatedNotes };
        setViewingTicketOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      }
    } catch (err) {
      console.error("Error al regenerar ticket:", err);
      alert("No se pudo regenerar el ticket: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRegeneratingTicket(false);
    }
  };

  const sendWhatsAppNotification = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    setWhatsappTarget({ phone: cleanPhone, message: text });
    // Si no está ya en la pestaña fija de WhatsApp, abrir ventana flotante para no sacarlo de su trabajo actual
    if (crmSubTab !== 'whatsapp') {
      setShowFloatingWhatsApp(true);
    }
  };

  // Pedidos activos (Exclusivamente pedidos en línea confirmados o en proceso:
  // Si el método es Mercado Pago, solo aparece en Activos cuando el pago ha sido acreditado ('paid') o ya pasó a preparación ('processing'/'shipped').
  // Las ventas en físico (POS) se entregan en el acto y los pedidos entregados/cancelados pasan automáticamente al Historial).
  const activeOrders = orders.filter(o => 
    o.status !== 'cancelled' && 
    o.status !== 'delivered' && 
    !o.id.startsWith('FX-POS') &&
    !(o.paymentMethod === 'mercadopago' && o.paymentStatus !== 'paid' && o.status === 'pending')
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

          {/* PASO 2: VERIFICACIÓN 2FA (SI SE DETECTÓ QUE TIENE 2FA ACTIVO) */}
          {twoFactorStep ? (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#E65F2B] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">Verificación en Dos Pasos (2FA)</h4>
                <p className="text-[11px] text-gray-600">
                  Ingresa el código de 6 dígitos de tu app autenticadora (Google/Microsoft Authenticator) o un código de respaldo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">
                  Código de Seguridad
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={10}
                  autoComplete="one-time-code"
                  placeholder="000 000"
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value)}
                  className="w-full px-3.5 py-3 bg-gray-50 border border-gray-300 rounded-lg text-center tracking-widest text-lg font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={trustThisDevice}
                  onChange={e => setTrustThisDevice(e.target.checked)}
                  className="rounded text-[#E65F2B] focus:ring-[#E65F2B]"
                />
                <span>Confiar en este equipo por 30 días</span>
              </label>

              <button
                type="submit"
                disabled={twoFactorVerifying || !twoFactorCode.trim()}
                className="w-full bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold py-3 rounded-lg text-sm transition shadow flex items-center justify-center gap-2"
              >
                {twoFactorVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verificando código...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verificar y Entrar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorStep(false);
                  setTwoFactorCode('');
                  setTwoFactorTempToken('');
                  setLoginError('');
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 font-medium transition"
              >
                ← Volver a ingresar contraseña
              </button>
            </form>
          ) : (
            /* PASO 1: CORREO Y CONTRASEÑA */
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
          )}

          <div className="border-t border-gray-100 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conexión cifrada TLS & Lista Blanca Activa</span>
          </div>

        </div>

        {/* Modal de 2FA visible también en la pantalla de login para el onboarding obligatorio */}
        {showTwoFactorModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border-t-4 border-emerald-500 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      Blindaje de Seguridad 2FA
                    </h3>
                    <p className="text-xs text-gray-500">
                      Protege tu cuenta con Google Authenticator o Microsoft Authenticator.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTwoFactorModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {twoFactorData && (
                <div className="space-y-4 text-xs">
                  {twoFactorSetupSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-5 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-emerald-950">¡Blindaje 2FA Activado con Éxito!</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          Tu app autenticadora quedó vinculada. Aquí tienes tus códigos de respaldo de emergencia:
                        </p>
                      </div>

                      {twoFactorConfirmedCodes && twoFactorConfirmedCodes.length > 0 && (
                        <div className="bg-white border border-emerald-300 rounded-xl p-4 text-left space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <span className="font-bold text-gray-900 text-xs">🔐 Códigos de Respaldo Únicos</span>
                            <button
                              type="button"
                              onClick={() => {
                                const text = twoFactorConfirmedCodes.join('\n');
                                navigator.clipboard.writeText(text);
                                alert('Códigos de respaldo copiados al portapapeles. Guárdalos en tu gestor de contraseñas.');
                              }}
                              className="text-[#E65F2B] hover:underline font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Códigos</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Guarda estos 6 códigos en un lugar seguro. Solo se mostrarán esta vez:
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs font-bold text-slate-800 text-center">
                            {twoFactorConfirmedCodes.map((code, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 select-all">
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowTwoFactorModal(false);
                          setTwoFactorSetupSuccess(false);
                          setTwoFactorData(null);
                          setTwoFactorSetupCode('');
                          setTwoFactorConfirmedCodes(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        Entrar al Panel Administrativo →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                          <span className="w-5 h-5 rounded-full bg-[#E65F2B] text-white flex items-center justify-center text-[10px]">1</span>
                          <span>Escanea este código QR con tu celular</span>
                        </div>
                        <p className="text-gray-500 text-[11px]">
                          Abre <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong>, toca &ldquo;+&rdquo; y escanea el código:
                        </p>
                        {twoFactorData.qrCodeUrl && (
                          <div className="flex flex-col items-center justify-center py-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={twoFactorData.qrCodeUrl}
                              alt="Código QR 2FA"
                              className="w-52 h-52 rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 text-[11px]">
                          <span className="text-gray-500 font-mono text-[10px] truncate max-w-[260px]">
                            Clave manual: <strong>{twoFactorData.secret}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (twoFactorData.secret) {
                                navigator.clipboard.writeText(twoFactorData.secret);
                                setTwoFactorCopiedNotice(true);
                                setTimeout(() => setTwoFactorCopiedNotice(false), 2000);
                              }
                            }}
                            className="text-[#E65F2B] hover:underline font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{twoFactorCopiedNotice ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleConfirmTwoFactorSetup} className="space-y-3 pt-1">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                          <span className="w-5 h-5 rounded-full bg-[#E65F2B] text-white flex items-center justify-center text-[10px]">2</span>
                          <span>Ingresa el código de 6 dígitos que muestra tu app</span>
                        </div>

                        {twoFactorSetupError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{twoFactorSetupError}</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            autoFocus
                            placeholder="000000"
                            value={twoFactorSetupCode}
                            onChange={e => setTwoFactorSetupCode(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-center tracking-widest text-base font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
                          />
                          <button
                            type="submit"
                            disabled={twoFactorLoading || twoFactorSetupCode.length < 6}
                            className="bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-bold px-5 py-2.5 rounded-lg transition shadow cursor-pointer"
                          >
                            {twoFactorLoading ? 'Validando...' : 'Activar Blindaje'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // DASHBOARD PRINCIPAL DEL CRM ADMIN
  // =========================================================================
  return (
    <div className={`min-h-screen ${storeSettings.adminDarkMode ? 'admin-dark-mode bg-[#0B131A] text-slate-100' : 'bg-[#F4F6F8] text-[#222E3C]'} flex font-sans selection:bg-[#E65F2B] selection:text-white relative`}>
      
      {/* ======================================================== */}
      {/* MODAL DE BLINDAJE Y GESTIÓN DE 2FA (GOOGLE AUTHENTICATOR) */}
      {/* ======================================================== */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border-t-4 border-emerald-500 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Blindaje de Seguridad 2FA
                  </h3>
                  <p className="text-xs text-gray-500">
                    {twoFactorStatus.enabled
                      ? 'Tu cuenta está protegida con verificación en dos pasos.'
                      : 'Protege tu cuenta con Google Authenticator o Microsoft Authenticator.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTwoFactorModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CASO A: YA ESTÁ ACTIVO */}
            {twoFactorStatus.enabled && !twoFactorData ? (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Blindaje 2FA Activo</h4>
                    <p className="text-emerald-700 mt-1">
                      Cada inicio de sesión desde un nuevo dispositivo requiere tu código TOTP o un código de respaldo.
                    </p>
                    <p className="text-emerald-800 font-semibold mt-2">
                      Códigos de respaldo de emergencia restantes: <span className="underline">{twoFactorStatus.backupCodesCount}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <h5 className="font-bold text-gray-800 mb-2">Desactivar Blindaje 2FA</h5>
                  <p className="text-gray-500 mb-3">
                    Ingresa tu contraseña de administrador para desvincular el autenticador:
                  </p>
                  <form onSubmit={handleDisableTwoFactor} className="flex gap-2">
                    <input
                      type="password"
                      required
                      placeholder="Tu contraseña actual"
                      value={disableTwoFactorPass}
                      onChange={e => setDisableTwoFactorPass(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={disableTwoFactorLoading || !disableTwoFactorPass}
                      className="bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-bold px-4 py-2 rounded-lg transition"
                    >
                      {disableTwoFactorLoading ? 'Desactivando...' : 'Desactivar 2FA'}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

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
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0F172A] text-slate-300 flex flex-col z-50 shrink-0 transition-transform duration-200 ease-in-out border-r border-slate-800/80 shadow-xl ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Cabecera del Menú Lateral */}
        <div className="p-4 sm:p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <FoxDropLogo size="sm" showTagline={true} />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block bg-[#E65F2B]/15 text-[#E65F2B] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md border border-[#E65F2B]/20">
                PANEL DE CONTROL
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
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 text-xs scrollbar-thin">
          {/* BOTÓN DESTACADO: MARKETING & ESTRATEGIA */}
          <div>
            <button
              onClick={() => { setCrmSubTab('agent'); setMobileSidebarOpen(false); }}
              className={`w-full p-2.5 rounded-xl font-medium transition flex items-center justify-between border ${
                crmSubTab === 'agent'
                  ? 'bg-[#E65F2B] text-white border-orange-500 shadow-sm'
                  : 'bg-slate-900/60 text-slate-200 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${crmSubTab === 'agent' ? 'bg-white/20 text-white' : 'bg-[#E65F2B]/15 text-[#E65F2B]'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs leading-none">Marketing</span>
                  <span className={`text-[10px] font-normal ${crmSubTab === 'agent' ? 'text-white/80' : 'text-slate-400'}`}>Estrategia & Redes</span>
                </div>
              </div>
            </button>

            {/* BOTÓN WEAVY STUDIO (LIENZO DE NODOS IA) */}
            <button
              onClick={() => { setCrmSubTab('weavy'); setMobileSidebarOpen(false); }}
              className={`w-full mt-2 p-2.5 rounded-xl font-medium transition flex items-center justify-between border ${
                crmSubTab === 'weavy'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-950/30'
                  : 'bg-purple-950/20 text-purple-200 border-purple-900/40 hover:border-purple-700/60 hover:bg-purple-900/30'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${crmSubTab === 'weavy' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-300'}`}>
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs leading-none flex items-center gap-1">
                    Weavy Studio
                    <span className="bg-purple-400/20 text-purple-300 text-[8px] px-1 py-0.2 rounded font-mono">AI</span>
                  </span>
                  <span className={`text-[10px] font-normal ${crmSubTab === 'weavy' ? 'text-white/80' : 'text-purple-300/70'}`}>Lienzo Visual Nodos</span>
                </div>
              </div>
            </button>
              {/* BOTÓN CAMPAÑAS & CUPONES QR */}
              <button
                onClick={() => { setCrmSubTab('campaigns'); setMobileSidebarOpen(false); }}
                className={`w-full mt-2 p-2.5 rounded-xl font-medium transition flex items-center justify-between border ${
                  crmSubTab === 'campaigns'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500 shadow-md shadow-amber-950/30'
                    : 'bg-amber-950/20 text-amber-200 border-amber-900/40 hover:border-amber-700/60 hover:bg-amber-900/30'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${crmSubTab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'}`}>
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs leading-none flex items-center gap-1">
                      Campañas
                      <span className="bg-amber-400/20 text-amber-300 text-[8px] px-1 py-0.2 rounded font-mono">QR</span>
                    </span>
                    <span className={`text-[10px] font-normal ${crmSubTab === 'campaigns' ? 'text-white/80' : 'text-amber-300/70'}`}>Cupones & Stickers</span>
                  </div>
                </div>
              </button>
          </div>

          {/* GRUPO 1: OPERACIONES & CATÁLOGO */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5 block">
              Operaciones
            </span>
            <div className="space-y-0.5">
              {/* CJ DROPSHIPPING IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('cj_dropship'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'cj_dropship'
                    ? 'bg-indigo-900/60 text-white font-bold border border-indigo-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Globe className={`w-4 h-4 ${crmSubTab === 'cj_dropship' ? 'text-indigo-400' : 'text-slate-400'}`} /> Catálogo CJ (Dropship)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Global
                </span>
              </button>

              {/* 1. INVENTARIO (Catálogo + Lotes) */}
              <button
                onClick={() => { setCrmSubTab('inventory'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'inventory' || crmSubTab === 'batches'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Package className={`w-4 h-4 ${crmSubTab === 'inventory' || crmSubTab === 'batches' ? 'text-[#E65F2B]' : 'text-slate-400'}`} /> Inventario
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/40">
                  {products.length}
                </span>
              </button>

              {/* 2. PEDIDOS (Activos + Historial + Cancelados + Carritos + Encargos) */}
              <button
                onClick={() => { setCrmSubTab('orders'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'orders' || crmSubTab === 'order_history' || crmSubTab === 'cancelled_orders' || crmSubTab === 'carts' || crmSubTab === 'special_orders'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Truck className={`w-4 h-4 ${crmSubTab === 'orders' || crmSubTab === 'order_history' || crmSubTab === 'cancelled_orders' || crmSubTab === 'carts' || crmSubTab === 'special_orders' ? 'text-[#E65F2B]' : 'text-slate-400'}`} /> Pedidos
                </span>
                {activeOrders.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {activeOrders.length}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/40">
                    {orders.length}
                  </span>
                )}
              </button>

              {/* 3. WHATSAPP CENTRAL */}
              <button
                onClick={() => {
                  setShowFloatingWhatsApp(false);
                  setCrmSubTab('whatsapp');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between border ${
                  crmSubTab === 'whatsapp' 
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border-emerald-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className={`w-4 h-4 ${crmSubTab === 'whatsapp' ? 'text-emerald-400' : 'text-slate-400'}`} /> WhatsApp Central
                </span>
                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </button>
            </div>
          </div>

          {/* GRUPO 2: CLIENTES & GESTIÓN */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5 block">
              Gestión & Clientes
            </span>
            <div className="space-y-0.5">
              {/* 4. CLIENTES & CLUB */}
              <button
                onClick={() => { setCrmSubTab('clients'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'clients' || crmSubTab === 'loyalty'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${crmSubTab === 'clients' || crmSubTab === 'loyalty' ? 'text-[#E65F2B]' : 'text-slate-400'}`} /> Clientes & Club
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/40">
                  {clients.length}
                </span>
              </button>

              {/* 5. FINANZAS & MARGEN */}
              <button
                onClick={() => { setCrmSubTab('finance'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'finance' 
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className={`w-4 h-4 ${crmSubTab === 'finance' ? 'text-[#E65F2B]' : 'text-slate-400'}`} /> Finanzas & Margen
                </span>
              </button>

              {/* 6. TIENDA & CONFIGURACIÓN (Carrusel + Envíos & Pagos) */}
              <button
                onClick={() => { setCrmSubTab('carousel'); setMobileSidebarOpen(false); }}
                className={`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between ${
                  crmSubTab === 'carousel' || crmSubTab === 'shipping_payments'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 ${crmSubTab === 'carousel' || crmSubTab === 'shipping_payments' ? 'text-[#E65F2B]' : 'text-slate-400'}`} /> Configuración Tienda
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 pb-6 md:pb-3 safe-area-bottom border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          <button
            onClick={() => {
              setShowPosModal(true);
              setMobileSidebarOpen(false);
            }}
            className="hidden md:flex w-full bg-[#E65F2B] hover:bg-[#D45321] text-white font-semibold py-2.5 px-3 rounded-xl text-xs items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Punto de Venta POS</span>
          </button>

          <div className="flex items-center justify-between pt-1 text-slate-400 text-[11px] px-1">
            <div className="truncate max-w-[170px]">
              <span className="block text-white font-semibold truncate">{adminSession?.email?.split('@')[0]}</span>
              <span className="block text-[10px] text-slate-500 truncate">{adminSession?.email}</span>
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
        <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {crmSubTab === 'whatsapp' ? (
                <div className="flex items-center gap-2 md:hidden">
                  <button
                    onClick={() => setCrmSubTab('inventory')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                    title="Salir al inventario"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#E65F2B]" />
                    <span>Panel</span>
                  </button>
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                    title="Abrir menú lateral"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition shrink-0"
                  title="Abrir menú lateral"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm xs:text-base sm:text-lg text-slate-900 tracking-tight truncate">
                    {(crmSubTab === 'inventory' || crmSubTab === 'batches') && 'Inventario & Catálogo'}
                    {(crmSubTab === 'orders' || crmSubTab === 'order_history' || crmSubTab === 'cancelled_orders' || crmSubTab === 'carts' || crmSubTab === 'special_orders') && 'Gestión de Pedidos'}
                    {(crmSubTab === 'clients' || crmSubTab === 'loyalty') && 'Clientes & Club FoxDrop'}
                    {crmSubTab === 'finance' && 'Margen de Utilidad & Finanzas'}
                    {(crmSubTab === 'carousel' || crmSubTab === 'shipping_payments') && 'Configuración de la Tienda'}
                    {crmSubTab === 'whatsapp' && 'WhatsApp Central FoxDrop'}
                    {crmSubTab === 'cj_dropship' && 'Catálogo Global & Importador CJ Dropshipping'}
                    {crmSubTab === 'agent' && 'Marketing'}
                    {crmSubTab === 'weavy' && 'Weavy Studio — Lienzo Creativo de Nodos IA'}
                      {crmSubTab === 'campaigns' && 'Campañas — Cupones QR & Stickers Tabloide'}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block truncate mt-0.5">
                  {(crmSubTab === 'inventory' || crmSubTab === 'batches') && 'Catálogo maestro de productos, existencias en tiempo real y costeo de lotes'}
                  {(crmSubTab === 'orders' || crmSubTab === 'order_history' || crmSubTab === 'cancelled_orders' || crmSubTab === 'carts' || crmSubTab === 'special_orders') && 'Despacho de pedidos activos, historial de ventas, cancelaciones y carritos'}
                  {(crmSubTab === 'clients' || crmSubTab === 'loyalty') && 'Directorio de compradores, historial de consumo y configuración de puntos'}
                  {crmSubTab === 'finance' && 'Rendimiento financiero neto, costos de importación y análisis de márgenes'}
                  {(crmSubTab === 'carousel' || crmSubTab === 'shipping_payments') && 'Banners principales de la tienda, métodos de entrega y cuentas bancarias SPEI'}
                  {crmSubTab === 'whatsapp' && 'Bandeja unificada para atención y seguimiento directo por chat'}
                  {crmSubTab === 'cj_dropship' && 'Busca productos virales de bajo costo en China y publícalos con 1 clic en FoxDrop'}
                  {crmSubTab === 'agent' && 'Dirección de estrategia comercial, embudo en tiempo real y publicación en redes'}
                  {crmSubTab === 'weavy' && 'Diseña flujos visuales conectando productos, fotos externas, prompts, generación de imágenes y videos comerciales'}
                    {crmSubTab === 'campaigns' && 'Genera promociones con QR únicos, controla la vigencia, monitorea escaneos y canjes, e imprime en tabloide'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Selector Rápido Modo Oscuro */}
              <button
                type="button"
                onClick={toggleAdminDarkMode}
                className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
                  storeSettings.adminDarkMode
                    ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title={storeSettings.adminDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {storeSettings.adminDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                <span className="hidden sm:inline">{storeSettings.adminDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>

              <a
                href="/tienda"
                target="_blank"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <span className="hidden sm:inline">Ver Tienda</span>
                <span className="sm:hidden text-xs">Tienda</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
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
        <main className={`flex-1 w-full mx-auto ${
          (crmSubTab === 'whatsapp' || crmSubTab === 'weavy')
            ? 'max-w-none p-0 md:p-2 pb-0 md:pb-2 space-y-0' 
            : 'max-w-7xl p-4 sm:p-6 pb-36 md:pb-8 space-y-6'
        }`}>



        {/* 1. SECCIÓN INVENTARIO & GESTIÓN DE ARTÍCULOS */}
        {crmSubTab === 'cj_dropship' && (
          <AdminCjTab
            usdRate={usdRate}
            existingProducts={products}
            storeCategories={dbCategories.map(c => c.name)}
            onProductImported={(newP: any) => {
              const cleanProd = mapDbProductToApp(newP);
              setProducts(prev => [cleanProd, ...prev.filter(p => p.id !== cleanProd.id)]);
              fetchAdminCategories().then(cats => {
                if (cats && cats.length > 0) setDbCategories(cats);
              }).catch(() => {});
              alert('¡Producto importado con éxito! Ya está disponible en tu catálogo de FoxDrop.');
            }}
          />
        )}

        {crmSubTab === 'inventory' && (
          <div className="space-y-5">
            
        {/* LIGHTBOX / ZOOM DE FOTO EN TAMAÑO GIGANTE */}
        {zoomedImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setZoomedImage(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full overflow-hidden shadow-2xl border border-white/20 p-4 space-y-3 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate flex-1">
                  {zoomedImage.title || 'Detalle del Modelo / Variante'}
                </span>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-100 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-slate-200">
                <img
                  src={zoomedImage.url}
                  alt={zoomedImage.title || 'Foto ampliada'}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-slate-400">Clic fuera o en ✕ para cerrar</span>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

            {/* SUB-BARRA DE NAVEGACIÓN INVENTARIO: SEPARACIÓN DE DOBLE INVENTARIO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInventoryScope('physical')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    inventoryScope === 'physical'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Package className={`w-3.5 h-3.5 ${inventoryScope === 'physical' ? 'text-[#E65F2B]' : 'text-slate-400'}`} />
                  <span>📦 Inventario Físico (Bodega / Boutique)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    inventoryScope === 'physical' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {products.filter(p => !((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')))).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryScope('cj_international')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    inventoryScope === 'cj_international'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${inventoryScope === 'cj_international' ? 'text-indigo-200' : 'text-slate-400'}`} />
                  <span>✈️ Catálogo Virtual (Importación CJ)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    inventoryScope === 'cj_international' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {products.filter(p => (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'))).length}
                  </span>
                </button>
              </div>

              {inventoryScope === 'physical' ? (
                <button
                  type="button"
                  onClick={() => setCrmSubTab('batches')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer self-start sm:self-auto"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lotes de Fletes Prorrateados</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {batches.length}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCrmSubTab('cj_dropship')}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer self-start sm:self-auto"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Importar más desde Catálogo CJ</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {inventoryScope === 'cj_international'
                    ? 'Catálogo Virtual de Importación (CJ Dropshipping)'
                    : 'Control de Inventario Físico (Bodega / Boutique)'}
                </h2>
                <p className="text-xs text-slate-500">
                  {inventoryScope === 'cj_international'
                    ? 'Artículos de envío internacional directo al cliente (sin inversión previa en stock físico ni etiquetas).'
                    : 'Administra existencias físicas en México, lotes de importación, etiquetas y precios de boutique.'}
                </p>
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
                  {Array.from(new Set(scopedProducts.map(p => p.category).filter(Boolean))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Botón Exportar CSV / Excel */}
                <button
                  onClick={handleExportInventoryCsv}
                  title="Exportar inventario a Excel / CSV"
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </button>

                {/* Botón Imprimir Todas las Etiquetas (Solo para Inventario Físico Boutique) */}
                {inventoryScope === 'physical' && (
                  <button
                    onClick={() => handleOpenBarcodePrintModal(filteredProducts.length > 0 ? filteredProducts : scopedProducts)}
                    title="Imprimir etiquetas de todos los productos del inventario físico actual"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs border border-slate-700 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Imprimir Todas ({filteredProducts.length})</span>
                  </button>
                )}

                <button
                  onClick={handleOpenCreateProduct}
                  className="bg-[#E65F2B] hover:bg-[#D45321] text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
              </div>
            </div>

            {/* CINTA FINANCIERA & KPIS SEGÚN ÁMBITO (FÍSICO BOUTIQUE VS CATÁLOGO VIRTUAL CJ) */}
            {inventoryScope === 'cj_international' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-sm border border-indigo-800/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block flex items-center gap-1">
                    <Globe className="w-3 h-3 text-indigo-400" /> Catálogo CJ Activo
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white">
                    {scopedProducts.length} <span className="text-[11px] font-normal text-indigo-300">productos</span>
                  </span>
                  <span className="text-[10px] text-indigo-300/80 block truncate">
                    {totalCjVariantsCount} modelos disponibles en total
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-indigo-800/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-sky-400" /> Rango Costo Puesto en MX
                  </span>
                  <span className="text-base sm:text-lg font-black text-sky-300">
                    ${minCjCost.toFixed(0)} - ${maxCjCost.toFixed(0)} <span className="text-[10px] font-normal text-sky-200/80">MXN</span>
                  </span>
                  <span className="text-[10px] text-indigo-300/80 block truncate">
                    Prod + flete (prom: ${avgCjLandedCost.toFixed(0)})
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-indigo-800/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" /> Rango Precios en Tienda
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">
                    ${minCjPrice.toFixed(0)} - ${maxCjPrice.toFixed(0)} <span className="text-[10px] font-normal text-emerald-200/80">MXN</span>
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block truncate">
                    Precio venta (prom: ${avgCjPublicPrice.toFixed(0)})
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-indigo-800/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block flex items-center gap-1">
                    <Percent className="w-3 h-3 text-amber-400" /> Tu Ganancia Libre / Venta
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300">
                    +${minCjProfit.toFixed(0)} a +${maxCjProfit.toFixed(0)} <span className="text-[10px] font-normal text-amber-200/80">MXN</span>
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-bold block truncate">
                    Margen prom: {avgCjMarginPercent.toFixed(0)}% por pedido
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-700/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Package className="w-3 h-3 text-[#E65F2B]" /> Total Unidades
                  </span>
                  <span className="text-lg sm:text-xl font-black font-semibold text-white">
                    {totalInventoryUnits} <span className="text-[11px] font-normal text-slate-400">pzas</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {scopedProducts.length} artículos únicos en bodega
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-slate-700/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-blue-400" /> Capital Invertido
                  </span>
                  <span className="text-lg sm:text-xl font-black font-semibold text-blue-300">
                    ${totalInvestment.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {unpricedProducts.length > 0 ? `${pricedProducts.length} art. con precio` : 'Costo de adquisición'}
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-slate-700/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" /> Valor en Piso
                  </span>
                  <span className="text-lg sm:text-xl font-black font-semibold text-emerald-400">
                    ${totalExpectedRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block">
                    {unpricedProducts.length > 0 ? `${unpricedProducts.length} art. pendientes de precio` : 'Venta total proyectada'}
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-slate-700/60 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Percent className="w-3 h-3 text-amber-400" /> Utilidad Estimada
                  </span>
                  <span className="text-lg sm:text-xl font-black font-semibold text-amber-300">
                    +${totalExpectedProfit.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold block">
                    Margen prom: {avgMargin.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* TABS DE FILTRADO POR LOTE DE IMPORTACIÓN (Solo para Inventario Físico Boutique) */}
            {inventoryScope === 'physical' && batches.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Layers className="w-3.5 h-3.5 text-[#E65F2B]" /> Lote:
                </span>

                <button
                  type="button"
                  onClick={() => setInventoryBatchFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    inventoryBatchFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Todos los lotes</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    inventoryBatchFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {scopedProducts.length}
                  </span>
                </button>

                {batches.map(b => {
                  const countForBatch = scopedProducts.filter(p => 
                    p.batchId === b.id || 
                    Math.abs(b.costPerUnit - (p.shippingCostAllocated || 0)) < 0.05 || 
                    (p.batchName && p.batchName === b.batchName)
                  ).length;
                  const isSelected = inventoryBatchFilter === b.id;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setInventoryBatchFilter(b.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#E65F2B] text-white shadow-xs border border-orange-600'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-50/60 hover:text-orange-950 hover:border-orange-200'
                      }`}
                    >
                      <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#E65F2B]'}`} />
                      <span>{b.batchName}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-orange-100 text-orange-900 font-bold'
                      }`}>
                        {countForBatch}
                      </span>
                      <span className={`text-[10px] hidden md:inline opacity-80 font-normal ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                        (+${b.costPerUnit.toFixed(2)} flete)
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* BARRA DE FILTROS RÁPIDOS, SEMÁFORO DE STOCK & ORDENAMIENTO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setStockFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Todos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {scopedProducts.length}
                  </span>
                </button>

                <button
                  onClick={() => setStockFilter('low_stock')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'low_stock'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${stockFilter === 'low_stock' ? 'bg-white' : 'bg-amber-500'}`}></span>
                  <span>Bajo Stock (1 a 3)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'low_stock' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 font-bold'}`}>
                    {countLowStock}
                  </span>
                </button>

                <button
                  onClick={() => setStockFilter('out_of_stock')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'out_of_stock'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${stockFilter === 'out_of_stock' ? 'bg-white' : 'bg-rose-500'}`}></span>
                  <span>Agotados (0)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'out_of_stock' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 font-bold'}`}>
                    {countOutOfStock}
                  </span>
                </button>

                <button
                  onClick={() => setStockFilter('healthy')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'healthy'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${stockFilter === 'healthy' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  <span>Stock Óptimo (&gt;3)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'healthy' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 font-bold'}`}>
                    {countHealthy}
                  </span>
                </button>

                <button
                  onClick={() => setStockFilter('combos')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'combos'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Combos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'combos' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 font-bold'}`}>
                    {countCombos}
                  </span>
                </button>

                <button
                  onClick={() => setStockFilter('inactive')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                    stockFilter === 'inactive'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inactivos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${stockFilter === 'inactive' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 font-bold'}`}>
                    {countInactive}
                  </span>
                </button>
              </div>

              {/* Selector de Ordenamiento */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-500 font-medium">Ordenar:</span>
                <select
                  value={inventorySortBy}
                  onChange={e => setInventorySortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-400 shadow-2xs"
                >
                  <option value="default">Por defecto (Recientes)</option>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                  <option value="stock_asc">Stock: Menor a Mayor (Agotándose)</option>
                  <option value="stock_desc">Stock: Mayor a Menor</option>
                  <option value="margin_desc">Margen: Mayor a Menor (+Rentables)</option>
                </select>
              </div>
            </div>

            {/* BARRA FLOTANTE DE ACCIONES EN LOTE AMPLIADA */}
            {selectedProductIds.length > 0 && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-[#E65F2B] text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedProductIds.length} seleccionados</span>
                  </div>
                  <span className="text-xs text-slate-300 hidden sm:inline">
                    Acciones operativas masivas en un solo clic.
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Encender en tienda masivo */}
                  <button
                    onClick={() => handleBulkToggleActive(true)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-emerald-600 shadow-xs cursor-pointer"
                    title="Activar todos los seleccionados en tienda"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Encender ({selectedProductIds.length})</span>
                  </button>

                  {/* Pausar en tienda masivo */}
                  <button
                    onClick={() => handleBulkToggleActive(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700 shadow-xs cursor-pointer"
                    title="Pausar / ocultar en tienda"
                  >
                    <Power className="w-3.5 h-3.5 text-rose-400" />
                    <span>Pausar</span>
                  </button>

                  {/* Ajustar Stock Masivo */}
                  <button
                    onClick={() => setShowBulkStockModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700 shadow-xs cursor-pointer"
                    title="Sumar o restar piezas a todos"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ajustar Stock</span>
                  </button>

                  {/* Imprimir Etiquetas Código de Barras (Solo en Inventario Físico Boutique) */}
                  {inventoryScope === 'physical' && (
                    <button
                      onClick={() => {
                        const prods = products.filter(p => selectedProductIds.includes(p.id));
                        handleOpenBarcodePrintModal(prods);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700 shadow-xs cursor-pointer"
                      title="Imprimir etiquetas de códigos de barras / precios"
                    >
                      <Printer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Etiquetas ({selectedProductIds.length})</span>
                    </button>
                  )}

                  {/* Aplicar Descuento / Oferta Masivo */}
                  <button
                    onClick={() => setShowBulkDiscountModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Aplicar oferta o descuento promocional a los seleccionados"
                  >
                    <Percent className="w-3.5 h-3.5 text-white" />
                    <span>Oferta / Descuento</span>
                  </button>

                  {/* Asignar Tienda / Marca Masivo */}
                  <button
                    onClick={() => {
                      setBulkTargetBrand(officialBrands[0]?.name || 'Bath & Body Works');
                      setShowBulkBrandModal(true);
                    }}
                    className="bg-gradient-to-r from-amber-600 to-[#DF7F2D] hover:from-amber-500 hover:to-[#e68835] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Asignar tienda/marca a todos los seleccionados de un jalón"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-white" />
                    <span>🏬 Tienda ({selectedProductIds.length})</span>
                  </button>

                  {/* Cambiar Categoría */}
                  <button
                    onClick={handleOpenBulkCategoryModal}
                    className="bg-[#2D4A58] hover:bg-[#3d6072] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-2 border border-slate-700 shadow-xs cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Categoría</span>
                  </button>

                  {/* Deseleccionar */}
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
                <table className="w-full text-left text-xs text-slate-600 min-w-[980px]">
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
                            <CheckSquare className="w-5 h-5 text-[#E65F2B] fill-orange-100" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 hover:text-slate-700 stroke-[2.2]" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 min-w-[220px]">Artículo</th>
                      <th className="py-3 px-4 min-w-[130px]">
                        {inventoryScope === 'cj_international' ? 'Origen / Opciones' : 'Lote / Flete'}
                      </th>
                      <th className="py-3 px-4 font-black text-slate-900 min-w-[100px]">
                        {inventoryScope === 'cj_international' ? 'Costo Puesto MX' : 'Costo Total'}
                      </th>
                      <th className="py-3 px-4 text-emerald-600 font-black min-w-[110px]">Precio Venta</th>
                      <th className="py-3 px-4 text-emerald-700 min-w-[90px]">Utilidad</th>
                      <th className="py-3 px-4 text-center min-w-[130px]">
                        {inventoryScope === 'cj_international' ? 'Cupo Virtual' : 'Stock Rápido'}
                      </th>
                      <th className="py-3 px-4 text-center min-w-[95px]">En Tienda</th>
                      <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-xs min-w-[190px]">Acciones</th>
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
                                <CheckSquare className="w-5 h-5 text-[#E65F2B] fill-orange-100" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-500 hover:text-slate-700 stroke-[2.2]" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img 
                                  src={getSafeAdminImageUrl(p.images[0])} 
                                  alt="" 
                                  className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50" 
                                  onError={(e: any) => {
                                    if (e.target && e.target.src !== '/no-image.svg') {
                                      e.target.src = '/no-image.svg';
                                    }
                                  }}
                                />
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
                            {inventoryScope === 'cj_international' ? (
                              <>
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                  <span>✈️ CJ Dropshipping</span>
                                </span>
                                {p.variants && p.variants.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingVariantsProduct(p)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline block mt-0.5 cursor-pointer text-left"
                                    title="Ver modelos, costos y precios"
                                  >
                                    👁️ {p.variants.length} opciones / modelos (ver)
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                    Envío directo MX
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const matchedBatch = (p.batchId ? batches.find(b => b.id === p.batchId) : null)
                                    || batches.find(b => Math.abs(b.costPerUnit - (p.shippingCostAllocated || 0)) < 0.05);
                                  const displayName = p.batchName && p.batchName !== 'Lote 1 (+Flete)' && p.batchName !== 'Lote 1'
                                    ? p.batchName
                                    : (matchedBatch?.batchName || p.batchName || 'Lote de Importación');

                                  return (
                                    <span className="bg-orange-50 text-[#E65F2B] border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold block truncate max-w-[130px]" title={displayName}>
                                      {displayName}
                                    </span>
                                  );
                                })()}
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">+${(Number(p.shippingCostAllocated) || 0).toFixed(2)} flete</span>
                              </>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {p.variants && p.variants.length > 1 ? (
                              (() => {
                                const costs = p.variants.map((v: any) => Number(v.costMxn || v.cost_mxn) || Number(p.totalCostMxn || p.baseCostMxn) || 0).filter(Boolean);
                                const minC = costs.length > 0 ? Math.min(...costs) : (Number(p.totalCostMxn || p.baseCostMxn) || 0);
                                const maxC = costs.length > 0 ? Math.max(...costs) : (Number(p.totalCostMxn || p.baseCostMxn) || 0);
                                return (
                                  <div>
                                    <span className="font-black text-slate-900 block text-xs">
                                      {minC === maxC ? `${minC.toFixed(2)}` : `${minC.toFixed(0)} - ${maxC.toFixed(0)}`}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                      {inventoryScope === 'cj_international' ? 'Prod + Envío CJ' : 'Landed'}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <div>
                                <span className="font-black text-slate-900 block text-xs">
                                  ${(Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {inventoryScope === 'cj_international' ? 'Prod + Envío CJ' : `Base: ${(Number(p.baseCostMxn || (p as any).base_cost_mxn) || 0).toFixed(2)}`}
                                </span>
                              </div>
                            )}
                          </td>
                          
                          {/* PRECIO VENTA: RANGO SI TIENE MÚLTIPLES VARIANTES O EDICIÓN RÁPIDA SI ES PRODUCTO ÚNICO */}
                          <td className="py-3.5 px-4 font-black bg-emerald-50/40">
                            {p.variants && p.variants.length > 1 ? (
                              (() => {
                                const varPrices = p.variants.map((v: any) => Number(v.publicPrice || v.public_price) || p.publicPrice).filter(Boolean);
                                const minP = varPrices.length > 0 ? Math.min(...varPrices) : p.publicPrice;
                                const maxP = varPrices.length > 0 ? Math.max(...varPrices) : p.publicPrice;

                                return (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingVariantsProduct(p)}
                                      className="text-left group/range cursor-pointer block"
                                      title="Clic para ver o cambiar precios por modelo"
                                    >
                                      {minP === maxP ? (
                                        <span className="text-xs font-black text-slate-900 group-hover/range:text-indigo-600">
                                          ${minP.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-black text-indigo-700 group-hover/range:underline block">
                                          ${minP.toFixed(0)} - ${maxP.toFixed(0)}
                                        </span>
                                      )}
                                      <span className="text-[9px] text-slate-400 block font-semibold">
                                        ({p.variants.length} precios)
                                      </span>
                                    </button>
                                  </div>
                                );
                              })()
                            ) : editingPriceId === p.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  autoFocus
                                  value={editingPriceValue}
                                  onChange={e => setEditingPriceValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleQuickPriceSave(p, parseFloat(editingPriceValue));
                                    } else if (e.key === 'Escape') {
                                      setEditingPriceId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    handleQuickPriceSave(p, parseFloat(editingPriceValue));
                                  }}
                                  className="w-20 px-1.5 py-0.5 bg-white border-2 border-emerald-500 rounded text-xs font-bold text-slate-900 focus:outline-none shadow-xs"
                                />
                              </div>
                            ) : (
                              <div>
                                <div 
                                  onClick={() => {
                                    setEditingPriceId(p.id);
                                    setEditingPriceValue(p.publicPrice.toString());
                                  }}
                                  title="Clic para editar precio al instante"
                                  className="group/price flex items-center gap-1 cursor-pointer hover:bg-emerald-100/70 px-1.5 py-0.5 rounded transition text-emerald-800"
                                >
                                  {p.discountPercent && p.discountPercent > 0 ? (
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-[10px] text-slate-400 line-through">${(Number(p.publicPrice || (p as any).public_price) || 0).toFixed(0)}</span>
                                      <span className="text-xs font-black text-[#E65F2B]">
                                        ${Math.round((Number(p.publicPrice || (p as any).public_price) || 0) * (1 - (Number(p.discountPercent) || 0) / 100))}
                                      </span>
                                    </div>
                                  ) : (
                                    <span>${(Number(p.publicPrice || (p as any).public_price) || 0).toFixed(2)}</span>
                                  )}
                                  <Edit3 className="w-3 h-3 text-emerald-500 opacity-0 group-hover/price:opacity-100 transition shrink-0" />
                                  {savingPriceId === p.id && (
                                    <span className="text-[9px] text-emerald-600 font-sans font-bold animate-pulse">...</span>
                                  )}
                                </div>
                                {Boolean(p.discountPercent && p.discountPercent > 0) && (
                                  <span className="inline-block mt-0.5 bg-[#E65F2B] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                    -{p.discountPercent}% OFF
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-emerald-600">
                            {p.variants && p.variants.length > 1 ? (
                              (() => {
                                const profits = p.variants.map((v: any) => {
                                  const pr = Number(v.publicPrice || v.public_price || p.publicPrice) || 0;
                                  const co = Number(v.costMxn || v.cost_mxn || p.totalCostMxn || p.baseCostMxn) || 0;
                                  return pr - co;
                                });
                                const minProf = profits.length > 0 ? Math.min(...profits) : 0;
                                const maxProf = profits.length > 0 ? Math.max(...profits) : 0;
                                return (
                                  <div>
                                    <span className="text-xs font-black block">
                                      {minProf === maxProf ? `+${minProf.toFixed(0)}` : `+${minProf.toFixed(0)} a +${maxProf.toFixed(0)}`}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium block">
                                      según modelo
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <>
                                +${(Number(p.profitUnit ?? ((Number(p.publicPrice || (p as any).public_price) || 0) - (Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0))) || 0).toFixed(2)} <span className="text-[10px] text-slate-400">({(Number(p.marginPercent) || 0).toFixed(0)}%)</span>
                              </>
                            )}
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
                              <span className={`min-w-[42px] px-1.5 py-0.5 text-center font-bold text-xs rounded-md ${
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
                          <td className="py-3.5 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200/80 shadow-xs">
                            <div className="flex items-center justify-end gap-1">
                              {inventoryScope === 'physical' && (
                                <>
                                  <button
                                    onClick={() => handleOpenSoldModal(p)}
                                    title="Marcar piezas como ya vendidas en mostrador o fuera de la web"
                                    className="px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="hidden lg:inline">Ya Vendido</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenBarcodePrintModal([p])}
                                    title="Imprimir etiqueta con código de barras y precio"
                                    className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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
                        <CheckSquare className="w-5 h-5 text-[#E65F2B] fill-orange-100" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 hover:text-slate-700 stroke-[2.2]" />
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
                              <CheckSquare className="w-5 h-5 text-[#E65F2B] fill-orange-100" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500 hover:text-slate-700 stroke-[2.2]" />
                            )}
                          </button>

                          <div className="relative shrink-0">
                            <img 
                              src={getSafeAdminImageUrl(p.images[0])} 
                              alt="" 
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50" 
                              onError={(e: any) => {
                                if (e.target && e.target.src !== '/no-image.svg') {
                                  e.target.src = '/no-image.svg';
                                }
                              }}
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
                              {inventoryScope === 'cj_international' ? (
                                <>
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                    ✈️ CJ Dropshipping
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    {p.variants && p.variants.length > 0 ? `${p.variants.length} opciones` : 'Envío directo MX'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {(() => {
                                    const matchedBatch = (p.batchId ? batches.find(b => b.id === p.batchId) : null)
                                      || batches.find(b => Math.abs(b.costPerUnit - (p.shippingCostAllocated || 0)) < 0.05);
                                    const displayName = p.batchName && p.batchName !== 'Lote 1 (+Flete)' && p.batchName !== 'Lote 1'
                                      ? p.batchName
                                      : (matchedBatch?.batchName || p.batchName || 'Lote de Importación');

                                    return (
                                      <span className="bg-orange-50 text-[#E65F2B] border border-orange-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {displayName}
                                      </span>
                                    );
                                  })()}
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    +${(Number(p.shippingCostAllocated) || 0).toFixed(0)} flete
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Control Rápido de Stock en Celular */}
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>{inventoryScope === 'cj_international' ? 'Cupo virtual:' : 'Stock disponible:'}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickStockAdjust(p, -1)}
                              disabled={p.stock <= 0 || updatingStockId === p.id}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs disabled:opacity-30"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
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

                        {/* Métricas financieras del producto con Edición Rápida de Precio */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center items-center">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase">
                              {inventoryScope === 'cj_international' ? 'Costo Puesto MX' : 'Costo Total'}
                            </span>
                            <span className="text-xs font-black text-slate-700">${(Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0).toFixed(2)}</span>
                            <span className="text-[9px] font-semibold text-slate-400 block">
                              {inventoryScope === 'cj_international' ? 'Prod + Envío CJ' : `Base: ${(Number(p.baseCostMxn || (p as any).base_cost_mxn) || 0).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="border-x border-slate-200 px-1">
                            <span className="text-[9px] text-emerald-600 font-bold block uppercase">Venta (toca)</span>
                            {editingPriceId === p.id ? (
                              <input
                                type="number"
                                autoFocus
                                value={editingPriceValue}
                                onChange={e => setEditingPriceValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleQuickPriceSave(p, parseFloat(editingPriceValue));
                                  else if (e.key === 'Escape') setEditingPriceId(null);
                                }}
                                onBlur={() => handleQuickPriceSave(p, parseFloat(editingPriceValue))}
                                className="w-full text-center px-1 py-0.5 bg-white border border-emerald-500 rounded text-xs font-bold text-slate-900"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceId(p.id);
                                  setEditingPriceValue(p.publicPrice.toString());
                                }}
                                className="text-xs font-black text-emerald-700 hover:bg-emerald-100/60 px-1.5 py-0.5 rounded transition inline-flex items-center gap-0.5"
                              >
                                <span>${(Number(p.publicPrice || (p as any).public_price) || 0).toFixed(0)}</span>
                                <Edit3 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                              </button>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] text-emerald-600 font-bold block uppercase">Ganancia</span>
                            <span className="text-xs font-black text-emerald-600">+${(Number(p.profitUnit ?? ((Number(p.publicPrice || (p as any).public_price) || 0) - (Number(p.totalCostMxn || p.baseCostMxn || (p as any).base_cost_mxn) || 0))) || 0).toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Botones de acción móvil */}
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          {inventoryScope === 'physical' && (
                            <>
                              <button
                                onClick={() => handleOpenSoldModal(p)}
                                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Ya Vendido</span>
                              </button>
                              <button
                                onClick={() => handleOpenBarcodePrintModal([p])}
                                title="Imprimir Etiqueta"
                                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-xs p-2 rounded-xl border border-cyan-100 transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
            {/* SUB-BARRA DE NAVEGACIÓN INVENTARIO */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setCrmSubTab('inventory')}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Catálogo de Productos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {products.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('batches')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Lotes de Importación y Fletes</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {batches.length}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Lotes de Importación y Prorrateo</h2>
                <p className="text-xs text-slate-500">
                  Calcula el flete por fuera: registra cada remesa de mercancía y el sistema asigna el costo unitario exacto.
                </p>
              </div>

              <button
                onClick={handleOpenCreateBatch}
                className="bg-[#2D4A58] hover:bg-[#203641] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
                          onClick={() => handleOpenEditBatch(batch)}
                          title="Editar este lote de importación"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                          title="Eliminar este lote de importación"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            {/* SUB-BARRA DE NAVEGACIÓN PEDIDOS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setCrmSubTab('orders')}
                className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs shrink-0 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Activos</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                  {activeOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('order_history')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Historial General</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('cancelled_orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-slate-400" />
                <span>Cancelados</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {cancelledOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('carts')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Carritos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {abandonedCarts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('special_orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Encargos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {specialOrders.length}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Seguimiento de Pedidos Activos</h2>
                <p className="text-xs text-slate-500">Órdenes pendientes de empaque, despacho y entrega.</p>
              </div>

              {/* Filtros rápidos por tipo de entrega */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveOrderShippingFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
                    activeOrderShippingFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Todos ({activeOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrderShippingFilter('puebla_local')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
                    activeOrderShippingFilter === 'puebla_local'
                      ? 'bg-[#2D4A58] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>📍 Local Puebla</span>
                  <span className="font-semibold text-[10px] opacity-80">
                    ({activeOrders.filter(o => o.shippingType === 'puebla_local' || o.shippingType === 'agreed_pickup').length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrderShippingFilter('national_shipping')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
                    activeOrderShippingFilter === 'national_shipping'
                      ? 'bg-[#E65F2B] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>📦 Envío Nacional</span>
                  <span className="font-semibold text-[10px] opacity-80">
                    ({activeOrders.filter(o => o.shippingType === 'national_shipping').length})
                  </span>
                </button>
              </div>
            </div>

            {(() => {
              const displayedActiveOrders = activeOrders.filter(order => {
                if (activeOrderShippingFilter === 'puebla_local') {
                  return order.shippingType === 'puebla_local' || order.shippingType === 'agreed_pickup';
                }
                if (activeOrderShippingFilter === 'national_shipping') {
                  return order.shippingType === 'national_shipping';
                }
                return true;
              });

              if (displayedActiveOrders.length === 0) {
                return (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-700">No hay pedidos en este canal</p>
                    <p className="text-slate-400">No se encontraron pedidos activos con el filtro seleccionado.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3">
                  {displayedActiveOrders.map(order => (
                  <div key={order.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-xs hover:border-slate-300 transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-sm tracking-tight">{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                          order.status === 'shipped' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' :
                          (order.status === 'pending' || order.paymentStatus === 'pending') ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}>
                          {order.status === 'delivered' ? 'Entregado' : 
                           order.status === 'shipped' ? 'En camino' : 
                           (order.status === 'pending' || order.paymentStatus === 'pending') ? 'Pendiente' : 
                           'En preparación'}
                        </span>
                        {order.paymentStatus === 'paid' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            ✓ Pagado
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            ⏳ Pago Pendiente
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-semibold">{order.clientName} <span className="text-slate-400 font-normal">• {order.clientPhone}</span></p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                          {order.shippingType === 'puebla_local' ? 'Local Puebla' : ((order.shippingType === 'international_shipping' || (order.notes && order.notes.includes('[IMPORTACION'))) ? '✈️ Importación CJ' : 'Envío Nacional')}
                        </span>
                        {order.createdAt && (
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block font-medium">Total</span>
                        <span className="text-base font-bold text-slate-900 font-semibold">${order.total.toFixed(2)} MXN</span>
                      </div>

                      <select
                        value={order.status}
                        onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="processing">En preparación</option>
                        <option value="shipped">En camino</option>
                        <option value="delivered">Entregado</option>
                      </select>

                      {/* Botón Despacho Internacional CJ */}
                      {(order.shippingType === 'international_shipping' || (order.notes && (order.notes.includes('[IMPORTACION') || order.notes.includes('[CJ-ORDER:')))) && (
                        <button
                          type="button"
                          onClick={() => setCjDispatchOrder(order)}
                          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition text-xs font-bold border cursor-pointer shadow-2xs ${
                            order.notes && order.notes.includes('[CJ-ORDER:')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border-transparent'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{order.notes && order.notes.includes('[CJ-ORDER:') ? 'Ver en CJ' : 'Enviar a CJ'}</span>
                        </button>
                      )}

                      {/* Botón Imprimir Guía de Envío / Remisión */}
                      <button
                        type="button"
                        onClick={() => setShippingLabelOrder(order)}
                        title="Imprimir Guía de Envío / Remisión de Empaque"
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition text-xs border border-slate-200 cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Guía / Remisión</span>
                      </button>

                      <button
                        onClick={() => {
                          setCancellingOrderId(order.id);
                          setCancellationReason('');
                          setShowCancelModal(true);
                        }}
                        title="Cancelar pedido"
                        className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-medium px-2.5 py-2 rounded-xl flex items-center gap-1 transition text-xs border border-slate-200 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Eliminar pedido"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Si es venta física o tiene ticket registrado, botón para ver y compartir ticket */}
                      {(order.id.startsWith("FX-POS") || (order.notes && order.notes.includes("Ticket:"))) && (
                        <button
                          onClick={() => setViewingTicketOrder(order)}
                          title="Ver ticket de compra"
                          className="bg-orange-50 hover:bg-orange-100/80 text-[#E65F2B] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition text-xs border border-orange-200/80"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Ticket</span>
                        </button>
                      )}

                      <button
                        onClick={() => sendWhatsAppNotification(
                          order.clientPhone, 
                          `Hola ${order.clientName}, te informamos que tu pedido ${order.id} se encuentra: ${order.status.toUpperCase()}. Si deseas acordar los detalles de entrega, estamos a tu disposición.`
                        )}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Notificar WA</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
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
              {/* SUB-BARRA DE NAVEGACIÓN PEDIDOS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setCrmSubTab('orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Activos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {activeOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('order_history')}
                  className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs shrink-0 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#E65F2B]" />
                  <span>Historial General</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                    {orders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('cancelled_orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cancelados</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {cancelledOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('carts')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Carritos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {abandonedCarts.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('special_orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Encargos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {specialOrders.length}
                  </span>
                </button>
              </div>

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
                  <span className="text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl font-bold">
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
                            <span className="font-extrabold text-slate-900 text-sm font-semibold">{order.id}</span>
                            
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
                              {order.clientName || 'Cliente FoxDrop'} • <span className="font-normal text-slate-500 font-semibold">{order.clientPhone}</span>
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
            {/* SUB-BARRA DE NAVEGACIÓN PEDIDOS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setCrmSubTab('orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Activos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {activeOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('order_history')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Historial General</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('cancelled_orders')}
                className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs shrink-0 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Cancelados</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {cancelledOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('carts')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Carritos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {abandonedCarts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('special_orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Encargos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {specialOrders.length}
                </span>
              </button>
            </div>

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
            {/* SUB-BARRA DE NAVEGACIÓN CLIENTES & CLUB */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setCrmSubTab('clients')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Directorio de Clientes</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {clients.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('loyalty')}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Club FoxDrop & Fidelidad</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold">
                  {clubSettings.currencySymbol} Puntos
                </span>
              </button>
            </div>

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
                          <td className="py-3.5 px-4 font-semibold text-[11px]">
                            <div className="text-slate-800">{client.phone}</div>
                            <div className="text-slate-400 text-[10px]">{client.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span>{tier.badge}</span> {tier.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-[#E65F2B] text-sm">
                            {client.loyaltyPoints} pts
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {client.ordersCount} compras
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">
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
            {/* SUB-BARRA DE NAVEGACIÓN PEDIDOS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setCrmSubTab('orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Activos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {activeOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('order_history')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Historial General</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('cancelled_orders')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-slate-400" />
                <span>Cancelados</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {cancelledOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('carts')}
                className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Carritos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {abandonedCarts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('special_orders')}
                className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Encargos</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {specialOrders.length}
                </span>
              </button>
            </div>

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
                        <span className="text-slate-500 font-semibold text-[11px]">• {special.client_phone}</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Balance Financiero & Utilidades Reales</h2>
                <p className="text-xs text-slate-500">Métricas calculadas directamente de tus pedidos en curso y stock activo (arrancan en 0 si no hay operaciones).</p>
              </div>

              {/* Botón Corte de Caja Diario (Z-Report) */}
              <button
                type="button"
                onClick={() => setShowZReportModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>Corte de Caja Diario</span>
              </button>
            </div>

            {/* Bloque 1: Ventas y Utilidades Concretadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ventas Realizadas (Órdenes Activas y Entregadas)
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {completedOrders.length} pedido{completedOrders.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Ingresos Totales</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 font-semibold tracking-tight">${realizedRevenue.toFixed(2)}</p>
                  <span className="text-[11px] text-slate-400 block truncate">Facturación bruta en MXN</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Costo de Mercancía</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-700 font-semibold tracking-tight">${realizedCost.toFixed(2)}</p>
                  <span className="text-[11px] text-slate-400 block truncate">Base + flete prorrateado</span>
                </div>
                <div className="bg-white border border-emerald-200/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-emerald-700 text-xs font-medium">Utilidad Neta</span>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-semibold tracking-tight">
                    {realizedProfit >= 0 ? `+$${realizedProfit.toFixed(2)}` : `-$${Math.abs(realizedProfit).toFixed(2)}`}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium block truncate">Ganancia efectiva neta</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Margen Real</span>
                  <p className="text-xl sm:text-2xl font-bold text-[#E65F2B] font-semibold tracking-tight">{realizedMargin.toFixed(1)}%</p>
                  <span className="text-[11px] text-slate-400 block truncate">Retorno sobre la venta</span>
                </div>
              </div>
            </div>

            {/* Bloque 2: Proyección de Inventario en Almacén */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Inventario en Almacén (Proyección del Catálogo Activo)
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {totalInventoryUnits} piezas
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Inversión en Stock</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 font-semibold tracking-tight">${totalInvestment.toFixed(2)}</p>
                  <span className="text-[11px] text-slate-400 block truncate">Capital activo en bodega</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Ventas Proyectadas</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 font-semibold tracking-tight">${totalExpectedRevenue.toFixed(2)}</p>
                  <span className="text-[11px] text-emerald-600 font-medium block truncate">
                    Al 100% de venta
                  </span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Ganancia Proyectada</span>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-semibold tracking-tight">+${totalExpectedProfit.toFixed(2)}</p>
                  <span className="text-[11px] text-slate-400 block truncate">Utilidad bruta esperada</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <span className="text-slate-500 text-xs font-medium">Margen Catálogo</span>
                  <p className="text-xl sm:text-2xl font-bold text-[#E65F2B] font-semibold tracking-tight">{avgMargin.toFixed(1)}%</p>
                  <span className="text-[11px] text-slate-400 block truncate">Margen promedio catálogo</span>
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
              {/* SUB-BARRA DE NAVEGACIÓN PEDIDOS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setCrmSubTab('orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Activos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {activeOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('order_history')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Historial General</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {orders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('cancelled_orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cancelados</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {cancelledOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('carts')}
                  className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs shrink-0 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E65F2B]" />
                  <span>Carritos</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                    {abandonedCarts.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCrmSubTab('special_orders')}
                  className="px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Encargos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {specialOrders.length}
                  </span>
                </button>
              </div>

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
                                    src={getSafeAdminImageUrl(item.image)}
                                    alt={item.title}
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
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

        {/* 9. SECCIÓN GESTIÓN DEL CARRUSEL HERO & BANNERS */}
        {crmSubTab === 'carousel' && (
          <div className="space-y-6">
            {/* SUB-BARRA DE NAVEGACIÓN CONFIGURACIÓN TIENDA */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setCrmSubTab('carousel')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Carrusel Hero & Banners</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {slides.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('shipping_payments')}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Envíos & Cuentas SPEI</span>
              </button>
            </div>

            {/* PANEL DE CONTROL DE MODO OSCURO (VISTA NOCTURNA DEL CRM ADMIN) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                    storeSettings.adminDarkMode ? 'bg-indigo-900/60 text-indigo-300' : 'bg-slate-900 text-white'
                  }`}>
                    {storeSettings.adminDarkMode ? '🌙' : '☀️'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Modo Oscuro del Panel de Administración</h3>
                    <p className="text-xs text-slate-500">
                      Activa la vista nocturna para descansar la vista al gestionar pedidos, inventario y cotizaciones de noche.
                    </p>
                  </div>
                </div>

                {/* TOGGLE ON / OFF */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    storeSettings.adminDarkMode ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {storeSettings.adminDarkMode ? '● Modo Oscuro Activo' : '○ Modo Claro Estándar'}
                  </span>
                  <button
                    type="button"
                    onClick={toggleAdminDarkMode}
                    disabled={savingStoreSettings}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      storeSettings.adminDarkMode 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {storeSettings.adminDarkMode ? (
                      <>
                        <Sun className="w-4 h-4 text-slate-950" />
                        <span>Pasar a Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-white" />
                        <span>Activar Modo Oscuro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL DE CONTROL DE BARRA DE LIQUIDACIÓN */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#E65F2B] flex items-center justify-center font-black">
                    🔥
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Barra de Liquidación (Hasta 70% Menos)</h3>
                    <p className="text-xs text-slate-500">
                      Controla si la barra roja de liquidación se muestra u oculta en la página principal de la tienda.
                    </p>
                  </div>
                </div>

                {/* TOGGLE ON / OFF */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    storeSettings.showClearanceBanner ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {storeSettings.showClearanceBanner ? '● Activa en Tienda' : '○ Desactivada (Oculta)'}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = { ...storeSettings, showClearanceBanner: !storeSettings.showClearanceBanner };
                      setStoreSettings(updated);
                      setSavingStoreSettings(true);
                      try {
                        await saveStoreSettings(updated);
                        setStoreSettingsSavedNotice(true);
                        setTimeout(() => setStoreSettingsSavedNotice(false), 3000);
                      } catch {
                        alert('Error al guardar configuración de liquidación');
                      } finally {
                        setSavingStoreSettings(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      storeSettings.showClearanceBanner 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {storeSettings.showClearanceBanner ? 'Desactivar Barra' : 'Activar Barra de Liquidación'}
                  </button>
                </div>
              </div>

              {storeSettingsSavedNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>¡Estado de la barra de liquidación actualizado en tiempo real con la tienda!</span>
                </div>
              )}

              {/* CAMPOS EDITABLES SI ESTÁ ACTIVA */}
              {storeSettings.showClearanceBanner && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Título</label>
                    <input
                      type="text"
                      value={storeSettings.clearanceTitle}
                      onChange={(e) => setStoreSettings({ ...storeSettings, clearanceTitle: e.target.value })}
                      placeholder="Liquidación de Importación"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Texto Destacado</label>
                    <input
                      type="text"
                      value={storeSettings.clearanceDiscountText}
                      onChange={(e) => setStoreSettings({ ...storeSettings, clearanceDiscountText: e.target.value })}
                      placeholder="Hasta 70% Menos"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Subtítulo</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={storeSettings.clearanceSubtitle}
                        onChange={(e) => setStoreSettings({ ...storeSettings, clearanceSubtitle: e.target.value })}
                        placeholder="En comparación con tiendas departamentales..."
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setSavingStoreSettings(true);
                          try {
                            await saveStoreSettings(storeSettings);
                            setStoreSettingsSavedNotice(true);
                            setTimeout(() => setStoreSettingsSavedNotice(false), 3000);
                          } catch {
                            alert('Error al guardar textos');
                          } finally {
                            setSavingStoreSettings(false);
                          }
                        }}
                        disabled={savingStoreSettings}
                        className="bg-[#0F3E36] hover:bg-[#154E45] text-white text-xs font-bold px-3 py-2 rounded-xl"
                      >
                        {savingStoreSettings ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* INTERRUPTOR DE TEMATIZACIÓN DE TEMPORADA (HALLOWEEN) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E65F2B]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E65F2B] to-amber-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
                    🎃
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-white">
                        Tematización Especial de Halloween
                      </h3>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        storeSettings.halloweenThemeEnabled
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {storeSettings.halloweenThemeEnabled ? '🦇 Activo en Tienda' : 'Apagado (Diseño Regular)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      Activa la atmósfera festiva en la tienda con noche mística, rayos de fondo tenues y murciélagos con aleteo suave. No altera la navegación ni satura la experiencia de compra.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = {
                        ...storeSettings,
                        halloweenThemeEnabled: !storeSettings.halloweenThemeEnabled,
                      };
                      setStoreSettings(updated);
                      setSavingStoreSettings(true);
                      try {
                        await saveStoreSettings(updated);
                        setStoreSettingsSavedNotice(true);
                        setTimeout(() => setStoreSettingsSavedNotice(false), 3000);
                      } catch {
                        alert('Error al guardar el estado de tematización');
                      } finally {
                        setSavingStoreSettings(false);
                      }
                    }}
                    disabled={savingStoreSettings}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      storeSettings.halloweenThemeEnabled ? 'bg-[#E65F2B]' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={storeSettings.halloweenThemeEnabled}
                    title="Activar / Desactivar Tematización de Halloween"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                        storeSettings.halloweenThemeEnabled ? 'translate-x-8 text-amber-600' : 'translate-x-0 text-slate-400'
                      }`}
                    >
                      {storeSettings.halloweenThemeEnabled ? '🦇' : '✕'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL DE CONTROL DE VELOCIDAD DEL CARRUSEL HERO */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tiempo de Rotación del Carrusel</h3>
                    <p className="text-xs text-slate-500">
                      Define cuántos segundos permanece cada banner en pantalla antes de pasar al siguiente automáticamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={storeSettings.carouselIntervalSeconds ?? 8}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setStoreSettings({
                          ...storeSettings,
                          carouselIntervalSeconds: isNaN(val) ? 8 : val,
                        });
                      }}
                      className="w-14 text-center font-black text-sm bg-transparent focus:outline-none text-[#0F3E36]"
                    />
                    <span className="text-xs font-bold text-slate-500">segundos</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setSavingStoreSettings(true);
                      try {
                        await saveStoreSettings(storeSettings);
                        setStoreSettingsSavedNotice(true);
                        setTimeout(() => setStoreSettingsSavedNotice(false), 3000);
                      } catch {
                        alert('Error al guardar el tiempo del carrusel');
                      } finally {
                        setSavingStoreSettings(false);
                      }
                    }}
                    disabled={savingStoreSettings}
                    className="bg-[#0F3E36] hover:bg-[#154E45] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    {savingStoreSettings ? '...' : 'Guardar Tiempo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Carrusel Hero de la Tienda</h2>
                <p className="text-xs text-slate-500">Imágenes y banners que se muestran en el carrusel de la tienda principal.</p>
              </div>
              <button
                onClick={() => {
                  setEditingSlideId(null);
                  setSlideTitle('');
                  setSlideSubtitle('');
                  setSlideImageUrl('');
                  setSlideUseButton(false);
                  setSlideCtaText('');
                  setSlideCtaCategory('Todas');
                  setShowSlideModal(true);
                }}
                className="bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Slide al Carrusel
              </button>
            </div>

            {slides.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-sm">Sin imágenes adicionales en el carrusel</p>
                <p className="text-xs text-slate-400">El slide de bienvenida oficial de FoxDrop se mostrará de forma permanente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide, idx) => (
                  <div key={slide.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="relative h-44 w-full bg-slate-900">
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                        Slide #{idx + 2}
                      </span>
                      {slide.cta_category && (
                        <span className="absolute bottom-2 left-2 bg-[#E65F2B] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                          {slide.cta_category}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm line-clamp-1">{slide.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{slide.subtitle || 'Sin subtítulo'}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium text-[11px]">
                          {slide.cta_text && slide.cta_text.trim() ? `Botón: "${slide.cta_text}"` : 'Sin botón (Solo imagen)'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSlideId(slide.id);
                              setSlideTitle(slide.title);
                              setSlideSubtitle(slide.subtitle || '');
                              setSlideImageUrl(slide.image_url);
                              setSlideUseButton(Boolean(slide.cta_text && slide.cta_text.trim()));
                              setSlideCtaText(slide.cta_text || '');
                              setSlideCtaCategory(slide.cta_category || 'Todas');
                              setShowSlideModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Editar slide"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Eliminar del carrusel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                    <h3 className="font-black text-base text-slate-900">
                      {editingSlideId ? 'Editar Slide del Carrusel' : 'Nuevo Slide del Carrusel'}
                    </h3>
                    <p className="text-xs text-slate-500">Configura la imagen y texto del banner principal</p>
                  </div>

                  <form onSubmit={handleSaveSlide} className="space-y-3.5 text-xs">
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

                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Categoría destino al tocar el banner</label>
                        <select
                          value={slideCtaCategory}
                          onChange={e => setSlideCtaCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                        >
                          <option value="Todas">Todas</option>
                          <option value="Navidad">🎄 Navidad</option>
                          <option value="Gadgets & Novedades">Gadgets & Novedades</option>
                          <option value="Electrónica">Electrónica</option>
                          <option value="Moda">Moda</option>
                          <option value="Hogar">Hogar</option>
                          <option value="Juguetes">Juguetes</option>
                          <option value="Belleza">Belleza</option>
                          {dbCategories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={slideUseButton}
                          onChange={e => {
                            setSlideUseButton(e.target.checked);
                            if (e.target.checked && !slideCtaText.trim()) {
                              setSlideCtaText('Ver Colección');
                            } else if (!e.target.checked) {
                              setSlideCtaText('');
                            }
                          }}
                          className="w-4 h-4 rounded accent-[#E65F2B] cursor-pointer"
                        />
                        <span className="text-slate-800 font-bold text-xs">
                          Mostrar botón de acción en el banner <span className="text-slate-400 font-normal">(Opcional)</span>
                        </span>
                      </label>

                      {slideUseButton && (
                        <div>
                          <label className="text-slate-700 font-bold block mb-1">Texto del Botón</label>
                          <input
                            type="text"
                            value={slideCtaText}
                            onChange={e => setSlideCtaText(e.target.value)}
                            placeholder="Ej. Ver Colección"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B]"
                          />
                        </div>
                      )}
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
                        {savingSlide ? 'Guardando...' : (editingSlideId ? 'Guardar Cambios' : 'Publicar Slide')}
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
            {/* SUB-BARRA DE NAVEGACIÓN CLIENTES & CLUB */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setCrmSubTab('clients')}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Directorio de Clientes</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {clients.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('loyalty')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Club FoxDrop & Fidelidad</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {clubSettings.currencySymbol} Puntos
                </span>
              </button>
            </div>

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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B] font-bold"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E65F2B] font-bold"
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
                  <span className="font-black text-[#E65F2B] bg-white px-2 py-0.5 rounded-md border border-orange-200">
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 bg-white"
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
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-[#E65F2B] bg-white pr-8"
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
            {/* SUB-BARRA DE NAVEGACIÓN CONFIGURACIÓN TIENDA */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setCrmSubTab('carousel')}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Carrusel Hero & Banners</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {slides.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCrmSubTab('shipping_payments')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#E65F2B]" />
                <span>Envíos & Cuentas SPEI</span>
              </button>
            </div>

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
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#E65F2B]"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#E65F2B]"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E65F2B]"
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

            {/* SECCIÓN PASARELA MERCADO PAGO */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 font-black text-xs">
                    MP
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Mercado Pago (Checkout Pro)</h3>
                    <p className="text-[11px] text-slate-500">
                      Permite a los clientes pagar con Tarjetas de Crédito/Débito, OXXO y saldo de Mercado Pago.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkoutSettings.mercadopago?.enabled !== false}
                    onChange={e => setCheckoutSettings({
                      ...checkoutSettings,
                      mercadopago: {
                        enabled: e.target.checked,
                        sandbox: checkoutSettings.mercadopago?.sandbox ?? true,
                        accessToken: checkoutSettings.mercadopago?.accessToken || '',
                        publicKey: checkoutSettings.mercadopago?.publicKey || '',
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {checkoutSettings.mercadopago?.enabled !== false && (
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-sky-50 border border-sky-150 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sky-950 block text-xs">Modo de Operación:</span>
                      <span className="text-[11px] text-sky-700">
                        {checkoutSettings.mercadopago?.sandbox !== false
                          ? '🧪 Modo Sandbox (Pruebas con tarjetas de prueba sin dinero real)'
                          : '🚀 Modo Producción (Cobros reales)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCheckoutSettings({
                        ...checkoutSettings,
                        mercadopago: {
                          enabled: true,
                          sandbox: !(checkoutSettings.mercadopago?.sandbox !== false),
                          accessToken: checkoutSettings.mercadopago?.accessToken || '',
                          publicKey: checkoutSettings.mercadopago?.publicKey || '',
                        }
                      })}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                        checkoutSettings.mercadopago?.sandbox !== false
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-600 text-white border-emerald-600'
                      }`}
                    >
                      {checkoutSettings.mercadopago?.sandbox !== false ? '🧪 Modo Pruebas Activo' : '🚀 Producción Activa'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Access Token ({checkoutSettings.mercadopago?.sandbox !== false ? 'TEST-...' : 'APP_USR-...'})
                      </label>
                      <input
                        type="password"
                        placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={checkoutSettings.mercadopago?.accessToken || ''}
                        onChange={e => setCheckoutSettings({
                          ...checkoutSettings,
                          mercadopago: {
                            enabled: true,
                            sandbox: checkoutSettings.mercadopago?.sandbox ?? true,
                            publicKey: checkoutSettings.mercadopago?.publicKey || '',
                            accessToken: e.target.value.trim(),
                          }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Public Key ({checkoutSettings.mercadopago?.sandbox !== false ? 'TEST-...' : 'APP_USR-...'})
                      </label>
                      <input
                        type="text"
                        placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={checkoutSettings.mercadopago?.publicKey || ''}
                        onChange={e => setCheckoutSettings({
                          ...checkoutSettings,
                          mercadopago: {
                            enabled: true,
                            sandbox: checkoutSettings.mercadopago?.sandbox ?? true,
                            accessToken: checkoutSettings.mercadopago?.accessToken || '',
                            publicKey: e.target.value.trim(),
                          }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    💡 Si dejas estos campos vacíos, el sistema usará las variables de entorno de tu servidor Next.js.
                  </p>
                </div>
              )}
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

        {/* 12. SECCIÓN MARKETING (DIRECTOR DE ESTRATEGIA, EMBUDO & REDES) */}
        {crmSubTab === 'agent' && (
          <div className="space-y-6">

                {/* 1. TERMÓMETRO SUPERIOR HACIA $40,000 MXN */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#0F3E36] text-white flex items-center justify-center text-2xl shadow-sm">
                      👑
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#0F3E36] tracking-tight">Director de Marketing</h3>
                      <p className="text-xs text-stone-500">Estrategia Comercial, Embudo en Tiempo Real & Publicación en Redes</p>
                    </div>
                  </div>

                  {/* Barra de progreso con Meta Editable (ej. 10X, $40K, $100K) */}
                  <div className="bg-[#FBF9F5] border border-stone-200 rounded-2xl p-4 min-w-[340px]">
                    {(() => {
                      const paidList = (orders || []).filter(o => o.paymentStatus === 'paid' || o.status === 'delivered' || o.status === 'shipped');
                      const liveSales = paidList.length > 0 ? paidList.reduce((acc, o) => acc + (Number(o.total) || 0), 0) : (mktFunnelMetrics.monthlySales || 0);
                      const goal = targetSalesGoal || 50000;
                      const dynamicPacing = Number(((liveSales / goal) * 100).toFixed(1));
                      const liveAvgTicket = paidList.length > 0 ? Math.round(liveSales / paidList.length) : (mktFunnelMetrics.avgTicket || 450);
                      const ticket = liveAvgTicket > 0 ? liveAvgTicket : 450;
                      const remaining = Math.max(0, goal - liveSales);
                      const ordersNeeded = Math.ceil(remaining / ticket);

                      return (
                        <>
                          <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-600">Meta del Mes:</span>
                              {isEditingGoal ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={tempGoalInput}
                                    onChange={e => setTempGoalInput(e.target.value)}
                                    className="w-24 px-1.5 py-0.5 text-xs font-bold border border-stone-300 rounded focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleUpdateSalesGoal(Number(tempGoalInput))}
                                    className="px-2 py-0.5 bg-[#0F3E36] text-white rounded text-[10px] font-bold"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setIsEditingGoal(false)}
                                    className="px-1.5 py-0.5 text-stone-400 hover:text-stone-600 text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setTempGoalInput(targetSalesGoal.toString());
                                    setIsEditingGoal(true);
                                  }}
                                  className="text-[#E65F2B] hover:underline flex items-center gap-1 font-black text-sm"
                                  title="Haz clic para editar la meta del mes"
                                >
                                  <span>${targetSalesGoal.toLocaleString()} MXN</span>
                                  <span className="text-[10px] text-stone-400">✏️</span>
                                </button>
                              )}
                            </div>
                            <span className="text-stone-800 font-extrabold text-xs">
                              ${liveSales.toLocaleString()}
                            </span>
                          </div>

                          {/* Accesos rápidos de metas (5X, 10X, $40K, $100K) */}
                          <div className="flex items-center gap-1.5 mb-2 text-[10px]">
                            <span className="text-stone-400">Objetivos:</span>
                            <button
                              onClick={() => handleUpdateSalesGoal(40000)}
                              className={`px-1.5 py-0.5 rounded font-bold transition ${
                                targetSalesGoal === 40000 ? 'bg-[#0F3E36] text-white' : 'bg-stone-200/70 text-stone-600 hover:bg-stone-300'
                              }`}
                            >
                              $40K
                            </button>
                            <button
                              onClick={() => handleUpdateSalesGoal(75000)}
                              className={`px-1.5 py-0.5 rounded font-bold transition ${
                                targetSalesGoal === 75000 ? 'bg-[#0F3E36] text-white' : 'bg-stone-200/70 text-stone-600 hover:bg-stone-300'
                              }`}
                            >
                              🚀 5X ($75K)
                            </button>
                            <button
                              onClick={() => handleUpdateSalesGoal(150000)}
                              className={`px-1.5 py-0.5 rounded font-bold transition ${
                                targetSalesGoal === 150000 ? 'bg-[#0F3E36] text-white' : 'bg-stone-200/70 text-stone-600 hover:bg-stone-300'
                              }`}
                            >
                              ⚡ 10X ($150K)
                            </button>
                          </div>

                          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#0F3E36] to-[#E65F2B] h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(100, dynamicPacing)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[11px] text-stone-500 mt-1 font-medium">
                            <span>{dynamicPacing}% alcanzado</span>
                            <span>Ticket: ${ticket}</span>
                            <span>Faltan: {ordersNeeded.toLocaleString()} pedidos</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>


                {/* 2. EMBUDO DE CONVERSIÓN & LEADS (4 ETAPAS REALES DE SUPABASE) */}
                {(() => {
                  const paidList = (orders || []).filter(o => o.paymentStatus === 'paid' || o.status === 'delivered' || o.status === 'shipped');
                  const liveSales = paidList.length > 0 ? paidList.reduce((acc, o) => acc + (Number(o.total) || 0), 0) : mktFunnelMetrics.monthlySales;
                  const liveOrderCount = paidList.length > 0 ? paidList.length : mktFunnelMetrics.orderCount;
                  const liveCartsCount = (abandonedCarts && abandonedCarts.length > 0) ? abandonedCarts.length : mktFunnelMetrics.abandonedCartsCount;
                  const liveCartsTotal = (abandonedCarts && abandonedCarts.length > 0) ? abandonedCarts.reduce((acc, c) => acc + (Number(c.total) || 0), 0) : mktFunnelMetrics.abandonedCartsTotal;
                  const liveVisitors = mktFunnelMetrics.estimatedVisitors || 0;

                  return (
                    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                        <span className="text-xs font-bold text-stone-700">Embudo de Conversión (Últimos 30 Días):</span>
                        <button
                          onClick={() => handleLoadFunnelMetrics()}
                          disabled={mktLoadingMetrics}
                          className="text-xs text-[#0F3E36] font-bold hover:underline flex items-center gap-1"
                        >
                          <span>{mktLoadingMetrics ? 'Actualizando...' : '↻ Refrescar Datos Reales'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                          <span className="text-stone-400 text-[11px] block font-medium">1. Visitas desde Redes</span>
                          <div className="text-lg font-black text-stone-900 mt-0.5">{liveVisitors}</div>
                          <span className="text-[10px] text-stone-400 font-semibold">Sin vincular API</span>
                        </div>

                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                          <span className="text-stone-400 text-[11px] block font-medium">2. Carritos Armados</span>
                          <div className="text-lg font-black text-stone-900 mt-0.5">
                            {liveOrderCount + liveCartsCount}
                          </div>
                          <span className="text-[10px] text-stone-500">Intención de compra</span>
                        </div>

                        <div className="p-3.5 bg-red-50/70 rounded-2xl border border-red-200">
                          <span className="text-red-700 text-[11px] block font-bold">3. Fuga (Carritos Abandonados)</span>
                          <div className="text-lg font-black text-red-600 mt-0.5">{liveCartsCount} leads</div>
                          <span className="text-[10px] text-red-500 font-semibold">${liveCartsTotal.toLocaleString()} MXN sin cerrar</span>
                        </div>

                        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <span className="text-emerald-800 text-[11px] block font-bold">4. Ventas Pagadas</span>
                          <div className="text-lg font-black text-emerald-700 mt-0.5">{liveOrderCount} órdenes</div>
                          <span className="text-[10px] text-emerald-700 font-semibold">${liveSales.toLocaleString()} MXN netos</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* BARRA DE NAVEGACIÓN DEL FLUJO AUTÓNOMO PASO A PASO (DIRECTOR -> COPYS -> DISEÑO) */}
                <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-[#0F3E36] text-white flex items-center justify-center font-black text-xs">
                        {mktWorkflowStep}
                      </span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
                          Flujo Autónomo por Etapas
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          {mktWorkflowStep === 1 && 'Paso 1: Diagnóstico de Ventas y Aprobación de la Estrategia del Director'}
                          {mktWorkflowStep === 2 && 'Paso 2: Copywriting y Parrilla Editorial de 7 Días (Tienda vs Stock)'}
                          {mktWorkflowStep === 3 && 'Paso 3: Dirección de Arte Visual y Generación de Prompts para Gemini'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => setMktWorkflowStep(1)}
                        className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          mktWorkflowStep === 1
                            ? 'bg-[#0F3E36] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>1. Estrategia</span>
                        {mktStrategy && <span className="text-[10px] text-emerald-400">✓</span>}
                      </button>

                      <span className="text-stone-300">→</span>

                      {/* PASO 2: COMPLETAMENTE BLOQUEADO/DESHABILITADO HASTA QUE SE HAYAN REDACTADO LOS COPYS */}
                      <button
                        onClick={() => {
                          if (!mktStrategy?.weeklyParrilla || mktStrategy.weeklyParrilla.length === 0) {
                            alert("El Paso 2 está bloqueado. Primero debes aprobar la estrategia en el Paso 1 para que el Copywriter redacte la parrilla.");
                            return;
                          }
                          setMktWorkflowStep(2);
                        }}
                        disabled={!mktStrategy?.weeklyParrilla || mktStrategy.weeklyParrilla.length === 0}
                        className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                          mktWorkflowStep === 2
                            ? 'bg-[#0F3E36] text-white shadow-xs'
                            : (!mktStrategy?.weeklyParrilla || mktStrategy.weeklyParrilla.length === 0)
                            ? 'bg-stone-100 text-stone-400 opacity-40 cursor-not-allowed'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer'
                        }`}
                      >
                        <span>2. Copys & Parrilla</span>
                        {mktStrategy?.weeklyParrilla?.length > 0 && <span className="text-[10px] text-emerald-400">✓</span>}
                      </button>

                      <span className="text-stone-300">→</span>

                      {/* PASO 3: COMPLETAMENTE BLOQUEADO/DESHABILITADO HASTA QUE EL DISEÑADOR HAYA GENERADO PROMPTS */}
                      <button
                        onClick={() => {
                          if (!mktStrategy?.weeklyParrilla || mktStrategy.weeklyParrilla.length === 0) {
                            alert("El Paso 3 está bloqueado. Primero deben estar listos los copys en el Paso 2.");
                            return;
                          }
                          if (Object.keys(mktDayPrompts).length === 0) {
                            alert("El Paso 3 se activará cuando elijas un día y presiones 'Diseñar Arte de [Día]'.");
                            return;
                          }
                          setMktWorkflowStep(3);
                        }}
                        disabled={!mktStrategy?.weeklyParrilla || mktStrategy.weeklyParrilla.length === 0 || Object.keys(mktDayPrompts).length === 0}
                        className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                          mktWorkflowStep === 3
                            ? 'bg-[#0F3E36] text-white shadow-xs'
                            : (Object.keys(mktDayPrompts).length === 0)
                            ? 'bg-stone-100 text-stone-400 opacity-40 cursor-not-allowed'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer'
                        }`}
                      >
                        <span>3. Diseño & Prompts</span>
                        {Object.keys(mktDayPrompts).length > 0 && <span className="text-[10px] text-emerald-400">✓</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. COLUMNA DOBLE: CONSEJO ESTRATÉGICO A LA IZQUIERDA + SIMULADOR DE REDES A LA DERECHA */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* COLUMNA IZQUIERDA: CONTROL DE DIRECCIÓN Y FEEDBACK */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0F3E36] text-white flex items-center justify-center text-lg shadow-sm">
                            👑
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-stone-900">Director de Marketing</h4>
                            <p className="text-[11px] text-stone-400">Inteligencia Comercial</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleGenerateDirectorStrategy()}
                          disabled={mktLoadingStrategy}
                          className="px-3 py-1.5 bg-[#0F3E36] hover:bg-[#16564b] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          {mktLoadingStrategy ? 'Analizando...' : (mktStrategy ? '↻ Re-evaluar' : 'Consultar Director')}
                        </button>
                      </div>

                      {/* ESTADO O INSTRUCCIÓN */}
                      {mktStrategy ? (
                        <div className="space-y-3 text-xs leading-relaxed">
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                            <span className="font-black text-[11px] block">✓ Propuesta Lista</span>
                            <p className="text-[11px] text-stone-600 mt-0.5">
                              Revisa el diagnóstico y ángulo en el panel derecho. Si estás conforme, aprueba para pasar a la redacción de copys.
                            </p>
                          </div>

                          {/* CAMPO DE AJUSTE Y FEEDBACK DE MARIO */}
                          <div className="pt-2 border-t border-stone-200 space-y-2">
                            <label className="text-[11px] font-bold text-stone-700 block">¿Deseas orientar la estrategia a otro objetivo?</label>
                            <textarea
                              rows={3}
                              value={mktUserFeedback}
                              onChange={e => setMktUserFeedback(e.target.value)}
                              placeholder="Ej: Esta semana quiero enfocarme en los lotes con más tiempo en bodega o promover regalos..."
                              className="w-full text-xs p-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3E36] resize-none"
                            />
                            <button
                              onClick={() => handleGenerateDirectorStrategy(mktUserFeedback)}
                              disabled={mktLoadingStrategy}
                              className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                              {mktLoadingStrategy ? 'Reajustando...' : 'Re-analizar con este Enfoque'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
                          <p>Haz clic en <strong>"Consultar Director"</strong> para que el agente analice las ventas del mes hacia los $40,000 MXN, revise los carritos abandonados y formule la estrategia de la semana.</p>
                          <button
                            onClick={() => handleGenerateDirectorStrategy()}
                            disabled={mktLoadingStrategy}
                            className="px-5 py-2.5 bg-[#0F3E36] hover:bg-[#16564b] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                          >
                            {mktLoadingStrategy ? 'Analizando Catálogo y Ventas...' : 'Iniciar Consulta con el Director'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: ADAPTATIVA SEGÚN LA ETAPA DEL FLUJO (PASO 1, 2 O 3) */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* ETAPA 1: REVISIÓN Y APROBACIÓN DEL DIAGNÓSTICO Y ÁNGULO DEL DIRECTOR */}
                    {mktWorkflowStep === 1 && (
                      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#E65F2B] bg-[#E65F2B]/10 px-2 py-0.5 rounded-md">
                              Etapa 1 de 3
                            </span>
                            <h4 className="text-base font-black text-[#0F3E36] mt-1">
                              Diagnóstico Estratégico & Propuesta Comercial
                            </h4>
                            <p className="text-xs text-stone-500">
                              El Director analiza las fugas de dinero, carritos abandonados e inventario para definir el tema de la semana.
                            </p>
                          </div>
                          <span className="text-2xl">🧠</span>
                        </div>

                        {mktStrategy ? (
                          <div className="space-y-4">
                            {/* Tema Central Propuesto */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0F3E36] to-[#175248] text-white space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#E3B888]">
                                Eje Estratégico Propuesto por el Director
                              </span>
                              <h3 className="text-lg font-black leading-tight text-white">
                                "{mktStrategy.weeklyTheme}"
                              </h3>
                              <p className="text-xs text-stone-200 leading-relaxed">
                                {mktStrategy.strategicAngle}
                              </p>
                            </div>

                            {/* Comparativa: Diagnóstico del Embudo vs Foco de Tienda */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                                  🚨 Fuga Detectada en el Embudo:
                                </span>
                                <p className="text-stone-700 leading-relaxed">
                                  {mktStrategy.funnelDiagnostic}
                                </p>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                                  🌐 Pilar Global a Posicionar:
                                </span>
                                <p className="font-bold text-[#0F3E36]">
                                  {mktStrategy.storeWideStrategy?.pillar || "Confianza y Envíos Asegurados a México"}
                                </p>
                                <p className="text-stone-600 text-[11px] leading-relaxed">
                                  {mktStrategy.storeWideStrategy?.valueProposition || "Garantía de importación oficial 100% auténtica directo a tu hogar."}
                                </p>
                              </div>
                            </div>

                            {/* Producto Foco Seleccionado para Impulsar Margen */}
                            {mktStrategy.featuredProduct && (
                              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                                    Producto de Stock Seleccionado por el Analista:
                                  </span>
                                  <h4 className="text-xs font-bold text-stone-900">
                                    {mktStrategy.featuredProduct.title}
                                  </h4>
                                  <p className="text-[11px] text-stone-500">
                                    {mktStrategy.analystInsight || "Seleccionado para elevar el ticket promedio y acelerar rotación."}
                                  </p>
                                </div>
                                <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl font-black text-xs text-stone-900 shrink-0">
                                  ${mktStrategy.featuredProduct.price} MXN
                                </span>
                              </div>
                            )}

                            {/* Botón de Aprobación para Pasar a Etapa 2 */}
                            <div className="pt-2 flex items-center justify-between gap-3">
                              <span className="text-xs text-stone-500">
                                ¿Te convence esta dirección comercial?
                              </span>
                              <button
                                onClick={() => handleGenerateParrillaCopys()}
                                disabled={mktLoadingCopys}
                                className="px-5 py-2.5 bg-[#0F3E36] hover:bg-[#16564b] text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                <span>{mktLoadingCopys ? 'Redactando Parrilla con Copywriter...' : 'Aprobar Estrategia y Redactar Copys (Paso 2) →'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
                            <span className="text-3xl block">⏳</span>
                            <p className="font-bold text-stone-700">Aún no se ha generado la estrategia de esta semana.</p>
                            <p>Presiona <strong>"Consultar Director"</strong> en la columna izquierda para que el agente examine los números del negocio y proponga la dirección.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ETAPA 2: PARRILLA EDITORIAL DE 7 DÍAS & COPYS ESPECÍFICOS */}
                    {mktWorkflowStep === 2 && (
                      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#0F3E36] bg-[#0F3E36]/10 px-2 py-0.5 rounded-md">
                              Etapa 2 de 3
                            </span>
                            <h4 className="text-base font-black text-[#0F3E36] mt-1">
                              Parrilla Editorial & Copywriting de los 7 Días
                            </h4>
                            <p className="text-xs text-stone-500">
                              Revisa y ajusta los textos antes de pasar a la dirección de arte visual.
                            </p>
                          </div>
                          <button
                            onClick={() => handleGenerateDayVisualPrompt(mktSelectedDayIndex)}
                            disabled={mktLoadingDayPrompt}
                            className="px-4 py-2 bg-[#0F3E36] hover:bg-[#16564b] text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <span>{mktLoadingDayPrompt ? 'Diseñando...' : 'Pasar a Diseño Visual (Paso 3) →'}</span>
                          </button>
                        </div>

                        {/* Barra interactiva de 7 Días */}
                        <div className="grid grid-cols-7 gap-1.5">
                          {(mktStrategy?.weeklyParrilla || [
                            { day: "Lun", title: "Unboxing", type: "TIENDA_GLOBAL" },
                            { day: "Mar", title: "Detalle Stock", type: "PRODUCTO_STOCK" },
                            { day: "Mié", title: "Empaque", type: "TIENDA_GLOBAL" },
                            { day: "Jue", title: "Regalos", type: "PRODUCTO_STOCK" },
                            { day: "Vie", title: "Últimas Pzas", type: "PRODUCTO_STOCK" },
                            { day: "Sáb", title: "Lifestyle", type: "TIENDA_GLOBAL" },
                            { day: "Dom", title: "Ruta Envíos", type: "TIENDA_GLOBAL" },
                          ]).map((dayItem: any, dIdx: number) => {
                            const isSelected = mktSelectedDayIndex === dIdx;
                            const isGlobal = dayItem.type === "TIENDA_GLOBAL";
                            const dayShort = (dayItem.day || "").slice(0, 3);

                            return (
                              <button
                                key={dIdx}
                                onClick={() => setMktSelectedDayIndex(dIdx)}
                                className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[58px] cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#0F3E36] text-white border-[#0F3E36] ring-2 ring-[#0F3E36]/30 shadow-sm'
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-[#E3B888]' : 'text-stone-500'}`}>
                                  {dayShort}
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-full">
                                  {dayItem.title ? dayItem.title.split(' ')[0] : `Día ${dIdx + 1}`}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                  isGlobal ? 'bg-[#0F3E36]' : 'bg-[#E65F2B]'
                                }`} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Detalle del Copywriting para el Día Seleccionado */}
                        {(() => {
                          const curDay = mktStrategy?.weeklyParrilla?.[mktSelectedDayIndex] || {
                            day: "Lunes",
                            title: "Apertura & Garantía de Importación FoxDrop",
                            type: "TIENDA_GLOBAL",
                            headline: "Tu Atajo Seguro a lo Mejor de USA",
                            copy: "Comprar en el extranjero no tiene por qué ser complicado. En FoxDrop seleccionamos las piezas más codiciadas, garantizamos autenticidad al 100% y te las enviamos aseguradas hasta tu hogar en cualquier parte de México.",
                            cta: "Explora la tienda en foxdrop.mx",
                            hashtags: ["#FoxDrop", "#ComprasSeguras", "#ImportacionesMexico"]
                          };
                          const isStoreGlobal = curDay.type === 'TIENDA_GLOBAL';

                          return (
                            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md bg-[#0F3E36] text-white text-[10px] font-black uppercase">
                                    {curDay.day}
                                  </span>
                                  <h4 className="font-bold text-stone-900 text-xs">{curDay.title}</h4>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black text-white ${
                                  isStoreGlobal ? 'bg-[#0F3E36]' : 'bg-[#E65F2B]'
                                }`}>
                                  {isStoreGlobal ? '🌐 Tienda Global' : '🛍️ Stock Bodega'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                                  Titular / Gancho Visual:
                                </span>
                                <p className="text-xs font-bold text-stone-800">
                                  "{curDay.headline || curDay.title}"
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                                  Copy Persuasivo Completo para Redes:
                                </span>
                                <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200 leading-relaxed whitespace-pre-line">
                                  {curDay.copy}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <span className="text-stone-500">
                                  Llamado a la acción: <strong className="text-[#0F3E36]">{curDay.cta || 'foxdrop.mx/tienda'}</strong>
                                </span>
                                <button
                                  onClick={() => handleGenerateDayVisualPrompt(mktSelectedDayIndex)}
                                  disabled={mktLoadingDayPrompt}
                                  className="px-3.5 py-1.5 bg-[#E65F2B] hover:bg-[#ff7138] text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                  {mktLoadingDayPrompt ? 'Diseñando...' : `Diseñar Arte de ${curDay.day} →`}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* ETAPA 3: DIRECCIÓN DE ARTE, PROMPTS Y SIMULADOR DE REDES */}
                    {mktWorkflowStep === 3 && (
                      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Etapa 3 de 3
                            </span>
                            <h4 className="text-sm font-black text-[#0F3E36] mt-1">Dirección de Arte & Vista Previa Final</h4>
                            <p className="text-[11px] text-stone-400">Prompt visual para Gemini y previsualización de publicación</p>
                          </div>

                          {/* SELECTOR DE FORMATO */}
                          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                            <button
                              onClick={() => setMktPreviewFormat('plan')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                                mktPreviewFormat === 'plan' ? 'bg-[#0F3E36] text-white shadow-xs' : 'text-stone-600'
                              }`}
                            >
                              📖 Cuaderno Semanal (7 Días)
                            </button>
                            <button
                              onClick={() => setMktPreviewFormat('ig')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                                mktPreviewFormat === 'ig' ? 'bg-white text-[#0F3E36] shadow-xs' : 'text-stone-600'
                              }`}
                            >
                              Instagram (1:1)
                            </button>
                            <button
                              onClick={() => setMktPreviewFormat('tk')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                                mktPreviewFormat === 'tk' ? 'bg-white text-[#0F3E36] shadow-xs' : 'text-stone-600'
                              }`}
                            >
                              TikTok (9:16)
                            </button>
                          </div>
                        </div>

                      {/* MENSAJE DE ÉXITO DE PUBLICACIÓN */}
                      {mktPublishSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold text-center">
                          {mktPublishSuccess}
                        </div>
                      )}

                      {/* SELECTOR DE LOS 7 DÍAS DE LA SEMANA (CADA DÍA TIENE SU TEMA, PROMPT Y VISUAL PROPIO) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-[#0F3E36] flex items-center gap-1.5">
                              <span>📅</span>
                              <span>Parrilla Semanal Editorial (7 Días)</span>
                            </span>
                            <p className="text-[11px] text-stone-500">
                              Selecciona un día para ver su enfoque, copiar su prompt visual para Gemini o subir su imagen final:
                            </p>
                          </div>
                          {mktStrategy?.weeklyTheme && (
                            <span className="px-2.5 py-1 bg-[#0F3E36]/10 text-[#0F3E36] rounded-xl text-[10px] font-black border border-[#0F3E36]/20">
                              {mktStrategy.weeklyTheme}
                            </span>
                          )}
                        </div>

                        {/* Barra interactiva de 7 Días */}
                        <div className="grid grid-cols-7 gap-1.5">
                          {(mktStrategy?.weeklyParrilla || [
                            { day: "Lun", title: "Unboxing", type: "TIENDA_GLOBAL" },
                            { day: "Mar", title: "Detalle Stock", type: "PRODUCTO_STOCK" },
                            { day: "Mié", title: "Empaque", type: "TIENDA_GLOBAL" },
                            { day: "Jue", title: "Regalos", type: "PRODUCTO_STOCK" },
                            { day: "Vie", title: "Últimas Pzas", type: "PRODUCTO_STOCK" },
                            { day: "Sáb", title: "Lifestyle", type: "TIENDA_GLOBAL" },
                            { day: "Dom", title: "Ruta Envíos", type: "TIENDA_GLOBAL" },
                          ]).map((dayItem: any, dIdx: number) => {
                            const isSelected = mktSelectedDayIndex === dIdx;
                            const hasImage = !!mktDayImages[dIdx];
                            const isGlobal = dayItem.type === "TIENDA_GLOBAL";
                            const dayShort = (dayItem.day || "").slice(0, 3);

                            return (
                              <button
                                key={dIdx}
                                onClick={() => {
                                  setMktSelectedDayIndex(dIdx);
                                  // Cambiar la imagen activa a la de ese día si existe
                                  if (mktDayImages[dIdx]) {
                                    setMktGeneratedImage(mktDayImages[dIdx]);
                                  } else {
                                    setMktGeneratedImage('');
                                  }
                                }}
                                className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[58px] cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#0F3E36] text-white border-[#0F3E36] ring-2 ring-[#0F3E36]/30 shadow-sm'
                                    : hasImage
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-[#E3B888]' : 'text-stone-500'}`}>
                                  {dayShort}
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-full">
                                  {hasImage ? '✅ Listo' : (dayItem.title ? dayItem.title.split(' ')[0] : `Día ${dIdx + 1}`)}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                  hasImage ? 'bg-emerald-400' : isGlobal ? 'bg-[#0F3E36]' : 'bg-[#E65F2B]'
                                }`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* TARJETA DEL DÍA ACTIVO: DETALLE, PROMPT VISUAL DE GEMINI Y ACCIÓN DE IMAGEN */}
                      {(() => {
                        const activeDayPlan = mktStrategy?.weeklyParrilla?.[mktSelectedDayIndex] || {
                          day: "Lunes",
                          title: "Apertura & Garantía de Importación FoxDrop",
                          type: "TIENDA_GLOBAL",
                          productFocus: mktStrategy?.featuredProduct?.title || "Curaduría FoxDrop México",
                          headline: "Tu Atajo Seguro a lo Mejor de USA",
                          copy: "Comprar en el extranjero no tiene por qué ser complicado. En FoxDrop seleccionamos las piezas más codiciadas, garantizamos autenticidad al 100% y te las enviamos aseguradas hasta tu hogar en cualquier parte de México.",
                          hashtags: ["#FoxDrop", "#ComprasSeguras", "#ImportacionesMexico", "#Tendencias"]
                        };

                        const isStoreGlobal = activeDayPlan.type === 'TIENDA_GLOBAL';
                        const currentHeadline = activeDayPlan.headline || activeDayPlan.title || (isStoreGlobal ? "Tu Atajo Seguro a lo Mejor de USA" : "Edición Limitada en Bodega");
                        const currentProduct = mktStrategy?.featuredProduct?.title || activeDayPlan.productFocus || "Colección Exclusiva FoxDrop";

                        // PROMPT INTELIGENTE DIFERENCIADO (GENERADO POR EL DISEÑADOR O BASADO EN EL MANUAL FRESCO CON EL ZORRITO):
                        const customDayPrompt = mktDayPrompts[mktSelectedDayIndex];
                        const dayVisualPrompt = customDayPrompt || (isStoreGlobal ? `Fotografía publicitaria comercial moderna, fresca y luminosa para la tienda online oficial FoxDrop México (foxdrop.mx).

ESTÉTICA Y CONCEPTO VISUAL (MODERNO, JUVENIL Y FRESCO):
1. PERSONAJE PROTAGONISTA:
   - El Zorrito FoxDrop: adorable mascota zorro en estilo 3D estilizado tipo figura coleccionable moderna o animación tipo Pixar (pelaje color naranja vibrante #E65F2B, pecho y mejillas color crema suave, cola esponjada con punta blanca, expresión simpática y confiable).
   - El zorrito está sentado alegremente sobre una caja de envío kraft abierta o asomándose con curiosidad desde adentro, transmitiendo emoción de unboxing.
2. ENTORNO Y ELEMENTOS DE MARCA:
   - Cajas de paquetería de cartón kraft limpio con cinta de empaque personalizada con el logo FoxDrop en naranja (#E65F2B).
   - Papel de viruta ecológica protectora en tonos beige/crema (#FAF7F0), stickers coloridos y sello de garantía FoxDrop.
   - Sobre la mesa: etiquetas de envío aéreo internacional directas a México, pasaporte o sello de viaje sutil.
3. ILUMINACIÓN Y PALETA DE COLOR:
   - Luz natural de mañana cálida y difusa entrando por una ventana amplia.
   - Paleta: Blanco limpio, crema arena (#FAF7F0), acentos naranja FoxDrop (#E65F2B) y sutiles toques verde bosque contemporáneo (#0F3E36).
   - Titular publicitario visual sugerido: "${currentHeadline}" y lema "TU ATAJO AL MUNDO".
   - Calidad fotográfica realista 8k, nítida, sin oscuridad barroca, súper apetecible para redes sociales.` : `Fotografía comercial publicitaria moderna, luminosa y lifestyle para FoxDrop México destacando inventario exclusivo en bodega.

ESTÉTICA Y CONCEPTO VISUAL:
1. PRODUCTO PROTAGONISTA:
   - ${currentProduct}, colocado en primer plano con máxima nitidez y textura realista.
2. PERSONAJE COMPAÑERO:
   - La tierna mascota oficial "Zorrito FoxDrop" (estilo 3D moderno estilizado, pelaje naranja #E65F2B con crema) interactuando cariñosamente en la escena: sentado junto al producto o asomándose divertido detrás de la caja de empaque kraft.
3. AMBIENTACIÓN:
   - Superficie de madera clara moderna o mármol blanco mate minimalista, con una planta pequeña de interior (tipo suculenta o monstera) desenfocada al fondo.
   - Caja kraft de FoxDrop con sticker de garantía "Stock Oficial • Entrega Inmediata".
4. ILUMINACIÓN Y ESTILO:
   - Luz de estudio suave y luminosa de estilo nórdico-cálido, sombras suaves, aspecto prémium pero accesible y fresco, calidad de catálogo moderno de Instagram 8k.`);

                        const activeDayImage = mktDayImages[mktSelectedDayIndex] || mktGeneratedImage;

                        return (
                          <div className="bg-gradient-to-r from-stone-900 via-[#0d2a24] to-[#0F3E36] rounded-2xl p-4 text-white shadow-md space-y-3 border border-white/10">
                            {/* Cabecera del día */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-[#E3B888] text-stone-950 font-black text-xs uppercase tracking-wider">
                                  {activeDayPlan.day || 'Lunes'}
                                </span>
                                <div>
                                  <h4 className="text-sm font-black text-white leading-tight">
                                    {activeDayPlan.title || 'Estrategia del Día'}
                                  </h4>
                                  <p className="text-[11px] text-[#E3B888] font-medium">
                                    {activeDayPlan.type === 'TIENDA_GLOBAL' ? '🌐 Enfoque: Tienda Global & Confianza' : '🛍️ Enfoque: Impulso de Stock de Bodega'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {activeDayImage ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30 flex items-center gap-1">
                                    <span>✓</span>
                                    <span>Arte Guardado para este día</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                                    Pendiente de Imagen
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Prompt visual de este día específico para Gemini */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#E3B888] flex items-center gap-1">
                                  <span>🎨</span>
                                  <span>Prompt Visual para Gemini (Específico para {activeDayPlan.day}):</span>
                                </span>
                                <span className="text-[10px] text-stone-400">100% Gratis en Gemini Web</span>
                              </div>

                              <div className="p-2.5 bg-black/50 rounded-xl border border-white/10 text-[11px] text-stone-300 font-semibold leading-relaxed max-h-24 overflow-y-auto selection:bg-[#E3B888] selection:text-stone-950">
                                {dayVisualPrompt}
                              </div>
                            </div>

                            {/* Botones de acción del día */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {/* 1. Copiar Prompt de este día */}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(dayVisualPrompt);
                                  alert(`📋 ¡Prompt de ${activeDayPlan.day} copiado al portapapeles!\n\nPégalo en tu Gemini Web para generar la imagen gratis.`);
                                }}
                                className="px-3 py-2 bg-[#E3B888] hover:bg-[#d6a56e] text-stone-950 font-black text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>📋</span>
                                <span>Copiar Prompt de {activeDayPlan.day}</span>
                              </button>

                              {/* 2. Abrir Gemini Web */}
                              <a
                                href="https://gemini.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>🚀</span>
                                <span>Abrir Gemini Web →</span>
                              </a>

                              {/* 3. Pegar Imagen generada para este día */}
                              <button
                                onClick={async () => {
                                  try {
                                    if (navigator.clipboard && navigator.clipboard.read) {
                                      const items = await navigator.clipboard.read();
                                      for (const item of items) {
                                        const imageType = item.types.find(t => t.startsWith('image/'));
                                        if (imageType) {
                                          const blob = await item.getType(imageType);
                                          const reader = new FileReader();
                                          reader.onload = (e) => {
                                            if (e.target?.result) {
                                              const imgStr = e.target.result as string;
                                              setMktGeneratedImage(imgStr);
                                              setMktDayImages(prev => ({ ...prev, [mktSelectedDayIndex]: imgStr }));
                                              alert(`✅ ¡Imagen de ${activeDayPlan.day} guardada con éxito!`);
                                            }
                                          };
                                          reader.readAsDataURL(blob);
                                          return;
                                        }
                                      }
                                    }
                                    const pastedText = await navigator.clipboard.readText();
                                    if (pastedText && (pastedText.startsWith('http') || pastedText.startsWith('data:image/'))) {
                                      const cleanUrl = pastedText.trim();
                                      setMktGeneratedImage(cleanUrl);
                                      setMktDayImages(prev => ({ ...prev, [mktSelectedDayIndex]: cleanUrl }));
                                      alert(`✅ ¡Imagen de ${activeDayPlan.day} guardada con éxito!`);
                                      return;
                                    }
                                    alert("Copia la imagen en Gemini (clic derecho -> Copiar imagen) y presiona este botón.");
                                  } catch {
                                    alert("Presiona Ctrl + V mientras estás en esta ventana para pegar la imagen copiada.");
                                  }
                                }}
                                className="px-3.5 py-2 bg-[#E65F2B] hover:bg-[#ff7138] text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <span>📥</span>
                                <span>Pegar Imagen de {activeDayPlan.day} (1 Clic)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* MOCKUP 0: PLAN SEMANAL DE CONTENIDO EDITORIAL (ESTILO CUADERNO VISUAL CREATIVO) */}
                      {mktPreviewFormat === 'plan' && (
                        <div className="bg-[#fbf7ee] rounded-3xl p-5 border-4 border-[#e5dcc7] shadow-xl relative overflow-hidden">
                          {/* Encabezado del Cuaderno Creativo */}
                          <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-[#d8cdb5] mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">🦊</span>
                              <div>
                                <h3 className="text-lg font-black tracking-wide text-stone-900 uppercase font-serif">
                                  Plan Semanal de Contenido
                                </h3>
                                <p className="text-[11px] font-bold text-[#E65F2B]">FoxDrop México • Curaduría y Despacho</p>
                              </div>
                            </div>
                            <div className="bg-[#0F3E36] text-[#E3B888] px-3.5 py-1.5 rounded-2xl text-[11px] font-black shadow-sm">
                              ✨ Semana Aprobada
                            </div>
                          </div>

                          {/* Rejilla de los 7 Días con Estilo Creativo y Storytelling */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(mktStrategy?.weeklyParrilla || [
                              { day: "Lunes", title: "Lunes de Unboxing", type: "TIENDA_GLOBAL", focus: "Caja oficial sellada FoxDrop" },
                              { day: "Martes", title: "Notas Olfativas & Lotes", type: "PRODUCTO_STOCK", focus: "Notas de fragancia y detalle de producto" },
                              { day: "Miércoles", title: "Empaca Conmigo", type: "TIENDA_GLOBAL", focus: "Proceso de embalaje protegido y seguro" },
                              { day: "Jueves", title: "¿Buscas un Regalo?", type: "PRODUCTO_STOCK", focus: "Kit listo para regalar con presentación premium" },
                              { day: "Viernes", title: "¡Últimas Piezas!", type: "PRODUCTO_STOCK", focus: "Reloj de arena y stock limitado por agotarse" },
                              { day: "Sábado", title: "Momento Relax (Lifestyle)", type: "TIENDA_GLOBAL", focus: "Spray en slow motion y ambiente de fin de semana" },
                              { day: "Domingo", title: "Preparando Pedidos Lunes", type: "TIENDA_GLOBAL", focus: "Mascota FoxDrop organizando paquetes para ruta nacional" }
                            ]).map((planItem: any, pIdx: number) => {
                              const isGlobal = planItem.type === "TIENDA_GLOBAL";
                              const icons = ["📦", "🌸", "🏷️", "🎁", "⏳", "✨", "🦊"];
                              return (
                                <div
                                  key={pIdx}
                                  onClick={() => {
                                    setMktSelectedDayIndex(pIdx);
                                    setMktPreviewFormat('ig');
                                  }}
                                  className={`p-3 rounded-2xl border-2 transition transform hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col justify-between h-44 ${
                                    isGlobal
                                      ? "bg-[#FAF7F0] border-[#0F3E36]/30 text-stone-900"
                                      : "bg-[#FFF9F2] border-[#E65F2B]/30 text-stone-900"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-stone-200">
                                        {planItem.day}
                                      </span>
                                      <span className="text-xl">{icons[pIdx % icons.length]}</span>
                                    </div>
                                    <h4 className="text-xs font-black leading-tight text-stone-800 line-clamp-2">
                                      {planItem.title}
                                    </h4>
                                    <p className="text-[10px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                                      {planItem.focus || planItem.headline || "Contenido de impacto"}
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[9px] font-bold">
                                    <span className={isGlobal ? "text-[#0F3E36]" : "text-[#E65F2B]"}>
                                      {isGlobal ? "🌐 Tienda Global" : "🛍️ Stock Bodega"}
                                    </span>
                                    <span className="text-stone-400">Ver post →</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Post-it amarillo estilo boceto */}
                          <div className="mt-4 p-3 bg-[#fff9c4] rounded-xl border border-[#fbc02d] text-stone-800 text-[11px] font-bold flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-2">
                              <span>📌</span>
                              <span>Haz clic en cualquiera de los días para abrir su arte publicitario final en Instagram o TikTok.</span>
                            </div>
                            <span className="text-[#0F3E36] font-black text-xs">Pide por WhatsApp & foxdrop.mx</span>
                          </div>
                        </div>
                      )}

                      {/* MOCKUP 1: INSTAGRAM FEED (1:1) */}
                      {mktPreviewFormat === 'ig' && (
                        <div className="max-w-md mx-auto bg-white border border-stone-300 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-3 flex items-center justify-between border-b border-stone-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#0F3E36] text-white flex items-center justify-center font-bold text-xs">
                                🦊
                              </div>
                              <span className="font-bold text-xs text-stone-900">foxdrop.mx</span>
                            </div>
                            <span className="text-stone-400 text-sm">•••</span>
                          </div>

                          {/* LIENZO DE DISEÑO AUTÓNOMO CREADO POR EL AGENTE */}
                          {(() => {
                            const currentDayPlan = mktStrategy?.weeklyParrilla?.[mktSelectedDayIndex];
                            const isStoreGlobal = currentDayPlan?.type === 'TIENDA_GLOBAL';

                            // Si el usuario eligió una de las propuestas de Gemini, aplicamos esa propuesta directamente
                            const activeProposal = mktDesignProposals.find(p => p.id === mktSelectedProposalId) || mktDesignProposals[0];
                            const design = activeProposal ? {
                              primaryColor: activeProposal.style?.primaryColor,
                              accentColor: activeProposal.style?.accentColor,
                              textColor: activeProposal.style?.textColor,
                              bigHeadline: activeProposal.typography?.headline,
                              subHeadline: activeProposal.typography?.subheadline,
                              eyebrowBadge: activeProposal.typography?.eyebrowBadge,
                              trustTag: activeProposal.typography?.trustTag,
                              backgroundStyle: activeProposal.style?.backgroundStyle,
                              cardOverlay: activeProposal.style?.cardOverlay,
                            } : currentDayPlan?.designConcept;

                            const primaryBg = design?.primaryColor || '#0a231e';
                            const accentColor = design?.accentColor || '#E3B888';
                            const textColor = design?.textColor || '#FBF9F5';
                            const headline = design?.bigHeadline || currentDayPlan?.headline || (isStoreGlobal ? 'Tu Atajo al Mundo' : mktStrategy?.featuredProduct?.title);
                            const subtitle = design?.subHeadline || currentDayPlan?.copy || 'Importaciones auténticas sin trámites de aduana.';
                            const eyebrow = design?.eyebrowBadge || (isStoreGlobal ? 'CURADURÍA GLOBAL • FOXDROP.MX' : 'STOCK CONFIRMADO • ENTREGA INMEDIATA');
                            const trust = design?.trustTag || 'Envíos Asegurados a Toda la República Mexicana';
                            const bgStyleCustom = design?.backgroundStyle;

                            return (
                              <div
                                className="aspect-square relative overflow-hidden flex flex-col justify-between p-5 select-none border-b border-stone-200"
                                style={{
                                  backgroundColor: primaryBg,
                                  background: bgStyleCustom || undefined,
                                }}
                              >
                                {/* CASO A: SI YA SE PEGÓ/GENERÓ LA IMAGEN COMPLETA DE GEMINI (FULL BLEED LIMPIO) */}
                                {(() => {
                                  const currentDayImg = mktDayImages[mktSelectedDayIndex] || mktGeneratedImage;
                                  if (currentDayImg) {
                                    return (
                                      <>
                                        <div className="absolute inset-0 z-0">
                                          <img
                                            src={currentDayImg}
                                            alt={`Post Publicitario - Día ${mktSelectedDayIndex + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>

                                        {/* Botón flotante sutil para cambiar imagen del día */}
                                        <div className="absolute top-3 right-3 z-20">
                                          <button
                                            onClick={() => {
                                              setMktGeneratedImage('');
                                              setMktDayImages(prev => {
                                                const copy = { ...prev };
                                                delete copy[mktSelectedDayIndex];
                                                return copy;
                                              });
                                            }}
                                            className="px-2 py-1 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-stone-200 hover:text-white text-[10px] font-bold transition border border-white/20"
                                            title="Quitar imagen de este día"
                                          >
                                            ✕ Cambiar Arte de {currentDayPlan?.day || 'este día'}
                                          </button>
                                        </div>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      {/* Textura y atmósfera propuesta por el diseñador */}
                                      <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black/60 z-0 pointer-events-none" />
                                      <div className="absolute inset-0 bg-[radial-gradient(#E3B888_1px,transparent_1px)] [background-size:24px_24px] opacity-10 z-0 pointer-events-none" />

                                      {/* FOTO DEL PRODUCTO DESTACADO O BOTÓN DIRECTO DE CARGA */}
                                      {mktStrategy?.featuredProduct?.image ? (
                                        <div className="absolute inset-0 flex items-center justify-center z-1 p-8">
                                          <div className="relative max-h-60 max-w-xs flex flex-col items-center justify-center">
                                            <div
                                              className="absolute w-52 h-52 rounded-full blur-2xl opacity-40 -z-10 pointer-events-none"
                                              style={{ backgroundColor: accentColor || '#E3B888' }}
                                            />
                                            <div className="absolute -bottom-3 w-48 h-6 bg-black/80 rounded-full blur-lg -z-10" />
                                            <img
                                              src={mktStrategy.featuredProduct.image}
                                              alt={mktStrategy?.featuredProduct?.title || "Producto"}
                                              className="max-w-full max-h-56 object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] transform hover:scale-105 transition duration-500"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-1 text-center space-y-3">
                                          <label className="cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E3B888]/40 hover:border-[#E3B888] rounded-2xl bg-black/30 hover:bg-black/50 transition">
                                            <span className="text-3xl mb-1 group-hover:scale-110 transition">📸</span>
                                            <span className="text-xs font-black text-[#E3B888]">
                                              Pegar o Cargar Imagen de Gemini
                                            </span>
                                            <span className="text-[10px] text-stone-300 mt-0.5">
                                              Haz clic para subir o presiona Ctrl + V
                                            </span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (ev) => {
                                                    const img = ev.target?.result as string;
                                                    setMktGeneratedImage(img);
                                                    setMktDayImages(prev => ({ ...prev, [mktSelectedDayIndex]: img }));
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      )}

                                      {/* Gradiente cinemático inferior */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 z-1 pointer-events-none" />

                                      {/* HEADER DE LA PIEZA: Eyebrow + Badge del Día */}
                                      <div className="relative z-10 flex items-center justify-between">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#E3B888]/60 backdrop-blur-md shadow-lg">
                                          <span className="text-[#E3B888] text-[10px]">✦</span>
                                          <span className="text-[10px] font-black uppercase tracking-widest text-[#FBF9F5]">
                                            {eyebrow}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#0F3E36] text-[#E3B888] border border-[#E3B888]/40 shadow-xs">
                                            {currentDayPlan?.day || 'Lunes'}
                                          </span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-md ${isStoreGlobal ? 'bg-[#0F3E36]' : 'bg-[#E65F2B]'}`}>
                                            {isStoreGlobal ? 'Tienda Global' : 'Stock Bodega'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* FOOTER DE LA PIEZA */}
                                      <div className="relative z-10 space-y-2 mt-auto">
                                        <div className="bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-2xl">
                                          <p className="text-[10px] uppercase font-bold text-[#E3B888] tracking-wider mb-0.5">
                                            {currentDayPlan?.title || (isStoreGlobal ? 'Garantía Oficial FoxDrop' : 'Llegada de Inventario')}
                                          </p>
                                          <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                                            {headline}
                                          </h3>
                                          <p className="text-[11px] text-stone-200 line-clamp-1 mt-0.5">
                                            {subtitle}
                                          </p>

                                          <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                                              <span className="text-[#E3B888]">🛡️</span>
                                              <span>{trust}</span>
                                            </div>
                                            {!isStoreGlobal && mktStrategy?.featuredProduct?.price && (
                                              <span className="px-2.5 py-0.5 rounded-lg bg-[#E65F2B] text-white font-black text-xs shadow-xs">
                                                ${mktStrategy.featuredProduct.price} MXN
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}

                                  {/* LOADING OVERLAY NANO BANANA */}
                                  {mktGeneratingImage && (
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold z-30 space-y-2">
                                      <span className="animate-spin text-2xl">⚡</span>
                                      <span>Nano Banana + Gemini creando fotografía publicitaria...</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          {/* CAPTION Y ENLACE DEDICADOS AL DÍA SELECCIONADO */}
                          {(() => {
                            const curDay = mktStrategy?.weeklyParrilla?.[mktSelectedDayIndex];
                            const curCopy = curDay?.copy || mktStrategy?.igPost?.caption || '¿Buscando lo mejor de importación en México? Descubre las piezas disponibles esta semana en nuestra tienda oficial con garantía y envíos protegidos.';
                            const curTags = curDay?.hashtags || mktStrategy?.igPost?.hashtags || ['#FoxDrop', '#Tendencias', '#ComprasSeguras'];
                            const isStoreGlobal = curDay?.type === 'TIENDA_GLOBAL';

                            return (
                              <div className="p-3.5 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-base text-stone-700">
                                    <span>❤️</span>
                                    <span>💬</span>
                                    <span>🚀</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-stone-400">
                                    Día programado: <strong className="text-stone-800">{curDay?.day || 'Lunes'}</strong>
                                  </span>
                                </div>
                                <p className="text-stone-700 leading-relaxed">
                                  <strong className="text-stone-900">foxdrop.mx</strong> {curCopy}
                                </p>
                                <p className="text-[#0F3E36] font-bold">
                                  👉 {isStoreGlobal ? 'foxdrop.mx/tienda' : (mktStrategy?.featuredProduct?.id ? `foxdrop.mx/tienda?highlight=${mktStrategy.featuredProduct.id}` : 'foxdrop.mx/tienda')}
                                </p>
                                <p className="text-[11px] text-stone-400">
                                  {curTags.join(' ')}
                                </p>
                              </div>
                            );
                          })()}

                          {/* BOTÓN DIRECTO DE PUBLICACIÓN */}
                          <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
                            <button
                              onClick={() => handlePublishMarketingPost('instagram')}
                              disabled={mktPublishing || !mktStrategy}
                              className="px-5 py-2.5 bg-[#0F3E36] hover:bg-[#16564b] text-white font-black text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                              {mktPublishing ? 'Publicando...' : 'Publicar en Instagram y Facebook'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* MOCKUP 2: TIKTOK (9:16) */}
                      {mktPreviewFormat === 'tk' && (
                        <div className="max-w-xs mx-auto bg-[#0a231e] rounded-3xl overflow-hidden shadow-2xl border-4 border-stone-800 relative aspect-[9/16] flex flex-col justify-between p-4">
                          {/* Fondo radial */}
                          <div className="absolute inset-0 bg-radial from-[#13493f]/90 via-[#0a231e] to-black z-0" />
                          <div className="absolute inset-0 bg-[radial-gradient(#E3B888_1px,transparent_1px)] [background-size:20px_20px] opacity-15 z-0" />

                          {/* Foto de producto central */}
                          <div className="absolute inset-0 flex items-center justify-center z-1 pointer-events-none p-10">
                            <div className="relative w-44 h-44 flex items-center justify-center">
                              <div className="absolute inset-0 rounded-full bg-[#E3B888]/20 blur-2xl" />
                              {mktGeneratedImage || mktStrategy?.featuredProduct?.image ? (
                                <img
                                  src={mktGeneratedImage || mktStrategy?.featuredProduct?.image}
                                  alt="TikTok Cover"
                                  className="max-w-full max-h-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.8)]"
                                  onError={(e) => {
                                    if (mktStrategy?.featuredProduct?.image && (e.currentTarget.src !== mktStrategy.featuredProduct.image)) {
                                      e.currentTarget.src = mktStrategy.featuredProduct.image;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-6xl">🦊📦</div>
                              )}
                            </div>
                          </div>

                          {/* Capa superior TikTok */}
                          <div className="relative z-10 pt-2 flex items-center justify-between text-white">
                            <div className="text-xs font-bold tracking-wider opacity-80">Para ti</div>
                            <span className="px-2 py-0.5 rounded-full bg-[#E3B888]/20 border border-[#E3B888]/50 text-[10px] text-[#E3B888] font-black uppercase">
                              foxdrop.mx
                            </span>
                          </div>

                          {/* Hook de video impactante */}
                          <div className="relative z-10 text-center my-auto px-2">
                            <div className="inline-block bg-[#0F3E36]/95 border-2 border-[#E65F2B] text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl backdrop-blur-md">
                              🔥 {mktStrategy?.tiktokReel?.videoHook || mktStrategy?.designSystem?.mainTitle || '¡Lo que estabas esperando en México!'}
                            </div>
                          </div>

                          {/* Capa inferior con datos de marca y CTA */}
                          <div className="relative z-10 space-y-2 pb-1 text-white">
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>🦊</span>
                              <span>@foxdrop.mx</span>
                              <span className="text-[10px] text-[#E3B888]">✓ Oficial</span>
                            </div>
                            <p className="text-[11px] text-stone-200 leading-snug line-clamp-2">
                              {mktStrategy?.tiktokReel?.caption || mktStrategy?.storeWideStrategy?.valueProposition || 'Tu atajo seguro al mundo. Envíos protegidos a todo México ⚡'}
                            </p>
                            <div className="bg-white/15 backdrop-blur-md rounded-xl p-2.5 flex items-center justify-between text-[11px] border border-white/10">
                              <div>
                                <span className="block font-black text-[#E3B888]">foxdrop.mx/tienda</span>
                                <span className="text-[10px] text-stone-300">Envíos asegurados</span>
                              </div>
                              <span className="bg-[#E65F2B] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
                                Comprar
                              </span>
                            </div>
                          </div>

                          {/* Botón de Publicación TikTok */}
                          <div className="relative z-20 pt-2">
                            <button
                              onClick={() => handlePublishMarketingPost('tiktok')}
                              disabled={mktPublishing || !mktStrategy}
                              className="w-full py-2.5 bg-[#E65F2B] hover:bg-[#d04f1f] text-white font-black text-xs rounded-xl shadow-lg transition disabled:opacity-50"
                            >
                              {mktPublishing ? 'Publicando...' : 'Publicar en TikTok'}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                    )}
                  </div>

                </div>

          </div>
        )}

        {/* 12.1 SECCIÓN WEAVY STUDIO (LIENZO DE NODOS INFINITO) */}
        {crmSubTab === 'weavy' && (
          <div className="space-y-4">
            <WeavyStudio products={products} />
          </div>
        )}

          {/* 12.2 SECCIÓN CAMPAÑAS Y CUPONES QR PHYGITAL */}
          {crmSubTab === 'campaigns' && (
            <div className="space-y-4">
              <AdminCampaignsTab />
            </div>
          )}

        {/* 13. SECCIÓN WHATSAPP CENTRAL FOXDROP (MULTI-SOCIO EN TIEMPO REAL) */}
        {crmSubTab === 'whatsapp' && (() => {
          const emailLower = (adminSession?.email || '').toLowerCase();
          const currentPartner = emailLower.includes('nydia') ? 'Nydia' : 'Mario';

          return (
            <div className="w-full h-full min-h-screen md:min-h-0">
              <AdminWhatsAppTab
                orders={orders}
                clients={clients}
                adminSessionName={currentPartner}
                initialPhone={whatsappTarget?.phone}
                initialMessage={whatsappTarget?.message}
                onClose={() => setCrmSubTab('inventory')}
                onSelectAnyChat={() => {
                  if (whatsappTarget) setWhatsappTarget(null);
                }}
              />
            </div>
          );
        })()}

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
                  src={getSafeAdminImageUrl(soldProduct.images[0])}
                  alt={soldProduct.title}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{soldProduct.title}</h4>
                  <span className="text-[10px] text-slate-400 block font-semibold">SKU: {soldProduct.sku || 'N/A'}</span>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-[#E65F2B]"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-[#E65F2B]"
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
                    <strong className="font-semibold">{Math.max(0, soldProduct.stock - soldQuantity)} piezas</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-900">
                    <span>Total que se sumará a tus ventas:</span>
                    <strong className="font-semibold text-sm font-black text-emerald-800">
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

        {/* MODAL ALTA / EDICIÓN DE ARTÍCULO OPTIMIZADO */}
        {/* MODAL DETALLE DE MODELOS / VARIANTES DEL PRODUCTO DE CJ */}
        {previewingVariantsProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={previewingVariantsProduct.images?.[0] || '/no-image.svg'}
                    alt={previewingVariantsProduct.title}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {previewingVariantsProduct.title}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {previewingVariantsProduct.variants?.length || 0} modelos configurados • SKU: {previewingVariantsProduct.sku}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingVariantsProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {previewingVariantsProduct.variants && previewingVariantsProduct.variants.length > 0 ? (
                  previewingVariantsProduct.variants.map((v: any, vIdx: number) => {
                    const vCost = Number(v.costMxn || v.cost_mxn) || 0;
                    const vPrice = Number(v.publicPrice || v.public_price || previewingVariantsProduct.publicPrice) || 0;
                    const vProfit = vPrice - vCost;
                    const vMargin = vPrice > 0 ? Math.round((vProfit / vPrice) * 100) : 0;
                    return (
                      <div
                        key={v.id || vIdx}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative group/thumb shrink-0 cursor-zoom-in" onClick={() => setZoomedImage({ url: v.image || previewingVariantsProduct.images?.[0] || '/no-image.svg', title: v.name })}>
                            <img
                              src={v.image || previewingVariantsProduct.images?.[0] || '/no-image.svg'}
                              alt={v.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 bg-white shadow-2xs group-hover/thumb:border-indigo-500 group-hover/thumb:scale-105 transition duration-150"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white p-0.5 rounded-md opacity-0 group-hover/thumb:opacity-100 transition text-[9px] font-bold">
                              🔍
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {translateVariantName(v.name) || ('Opción ' + (vIdx + 1))}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {v.sku || ('CJ-VAR-' + (vIdx + 1))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">
                              ${vPrice.toFixed(2)} MXN
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              Costo: ${vCost.toFixed(2)}
                            </div>
                            <div className={'text-[9px] font-bold ' + (vProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                              {vProfit >= 0 ? '+' : ''}${vProfit.toFixed(2)} ({vMargin}%)
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={deletingVariantKey === String(v.id || vIdx)}
                            onClick={() => handleDeleteVariant(previewingVariantsProduct, vIdx, v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer disabled:opacity-40"
                            title="Eliminar este modelo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Este producto no tiene variantes registradas.</p>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  Para cambiar precios o títulos, usa el botón "Editar" en la tabla.
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewingVariantsProduct(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl relative max-h-[92vh] flex flex-col my-auto border border-slate-200">
              {/* Header compacto */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${isEditingCjProduct ? 'bg-indigo-600' : 'bg-[#E65F2B]'}`}></span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingProductId
                      ? (isEditingCjProduct ? 'Editar Artículo de Importación (CJ Dropshipping)' : 'Editar Artículo de Boutique (Stock Físico)')
                      : (isEditingCjProduct ? 'Alta de Artículo Internacional CJ' : 'Dar de Alta Artículo en Bodega')}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isEditingCjProduct
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-orange-50 text-[#E65F2B] border-orange-200'
                  }`}>
                    {isEditingCjProduct ? '✈️ Catálogo Internacional (Sin Lotes)' : '📦 Stock Físico Boutique'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario scrolleable interno para evitar desbordes en cualquier pantalla */}
              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs">
                {/* 1. Nombre y SKU en 2 columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <label className="text-slate-700 font-bold block mb-1">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Body mist Be Enchanted..."
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-medium focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold block">SKU / Código</label>
                      {!isEditingCjProduct && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleGenerateAutoSku()}
                            className="text-blue-600 hover:text-blue-700 font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 transition cursor-pointer"
                            title="Generar SKU automático"
                          >
                            Generar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScannerContext('sku_input');
                              setShowCameraScanner(true);
                            }}
                            className="text-[#E65F2B] font-bold text-[10px] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 transition cursor-pointer"
                            title="Escanear con cámara"
                          >
                            Escanear
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="7501000123456"
                      value={newSku}
                      onChange={e => setNewSku(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold text-xs focus:outline-none focus:border-[#E65F2B]"
                    />
                  </div>
                </div>

                  {/* 1.1 Descripción detallada del Producto con Reescritura IA (Para Boutique y Envío Internacional) */}
                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <label className="text-slate-800 font-bold block text-xs">
                          Descripción y Características (Visible para el cliente)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {isEditingCjProduct
                            ? 'Incluye resumen, beneficios principales y especificaciones técnicas'
                            : 'Incluye notas, beneficios principales y detalles del producto'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAiRewriteHintInput(prev => !prev)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 transition cursor-pointer"
                          title="Darle una indicación o enfoque especial a la IA"
                        >
                          {showAiRewriteHintInput ? '✕ Cerrar sugerencia' : '💡 Dar indicación a IA'}
                        </button>
                        <button
                          type="button"
                          disabled={rewritingDescriptionAi}
                          onClick={() => handleAiRewriteDescription()}
                          className="px-3 py-1 rounded-xl text-[11px] font-black bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${rewritingDescriptionAi ? 'animate-spin' : ''}`} />
                          <span>{rewritingDescriptionAi ? 'Reescribiendo...' : '✨ Reescribir con IA'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Panel opcional para pedirle a la IA un enfoque o sugerencia */}
                    {showAiRewriteHintInput && (
                      <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-800">Sugerencias rápidas:</span>
                          {[
                            'Más persuasivo y comercial',
                            'Enfoque de regalo / Navidad',
                            'Resaltar medidas y ficha técnica',
                            'Más breve y directo al grano',
                          ].map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              disabled={rewritingDescriptionAi}
                              onClick={() => {
                                setAiRewriteHint(suggestion);
                                handleAiRewriteDescription(suggestion);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 text-[10px] font-bold transition cursor-pointer"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="O escribe tu instrucción (ej. 'Destaca que usa puerto USB y mide 2 metros')..."
                            value={aiRewriteHint}
                            onChange={e => setAiRewriteHint(e.target.value)}
                            className="flex-1 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={rewritingDescriptionAi}
                            onClick={() => handleAiRewriteDescription(aiRewriteHint)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      rows={5}
                      placeholder="Resumen atractivo, beneficios principales (•) y especificaciones técnicas o detalles del producto..."
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-[#E65F2B] resize-y leading-relaxed whitespace-pre-line"
                    />
                  </div>

                {/* 2. Categoría, Stock y Encendido/Apagado */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Tienda / Marca Oficial */}
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold block text-xs">
                        {isEditingCjProduct ? '✈️ Proveedor / Origen' : '🏬 Tienda / Marca Oficial'}
                      </label>
                      {!isEditingCjProduct && (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewBrand(!isAddingNewBrand)}
                          className="text-[#DF7F2D] text-[10px] font-bold hover:underline cursor-pointer"
                        >
                          {isAddingNewBrand ? '✕ Cancelar' : '+ Nueva Tienda'}
                        </button>
                      )}
                    </div>
                    {isAddingNewBrand && !isEditingCjProduct ? (
                      <div className="space-y-1 bg-amber-50/50 p-2 rounded-xl border border-amber-200">
                        <input
                          type="text"
                          placeholder="Nombre de la tienda (ej. Bath & Body Works, Nike, Zara)..."
                          value={customNewBrandName}
                          onChange={e => setCustomNewBrandName(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="URL del logo (opcional)..."
                            value={customNewBrandLogo}
                            onChange={e => setCustomNewBrandLogo(e.target.value)}
                            className="flex-1 bg-white border border-amber-200 rounded-lg px-2 py-1 text-[11px] text-slate-900"
                          />
                          <button
                            type="button"
                            disabled={creatingBrandLoading || !customNewBrandName.trim()}
                            onClick={async () => {
                              if (!customNewBrandName.trim()) return;
                              setCreatingBrandLoading(true);
                              try {
                                const saved = await saveOfficialBrand({
                                  name: customNewBrandName.trim(),
                                  logo_url: customNewBrandLogo.trim() || undefined,
                                });
                                setOfficialBrands(prev => [...prev.filter(b => b.id !== saved.id), saved]);
                                setNewBrand(saved.name);
                                setCustomNewBrandName('');
                                setCustomNewBrandLogo('');
                                setIsAddingNewBrand(false);
                                alert('✅ ¡Tienda dada de alta con éxito!');
                              } catch (err: any) {
                                alert(err.message || 'Error guardando tienda');
                              } finally {
                                setCreatingBrandLoading(false);
                              }
                            }}
                            className="bg-[#0F3E36] hover:bg-[#0b2f29] text-white font-bold px-3 py-1 rounded-lg text-xs cursor-pointer"
                          >
                            {creatingBrandLoading ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={newBrand}
                        onChange={e => setNewBrand(e.target.value)}
                        className="w-full bg-amber-50/30 border border-amber-200 rounded-xl p-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#DF7F2D] cursor-pointer"
                      >
                        {Array.from(new Set([
                          ...(isEditingCjProduct ? ['CJ Dropshipping'] : []),
                          ...officialBrands.map(b => b.name),
                          'Bath & Body Works',
                          'FoxDrop Oficial',
                        ])).map(brandName => (
                          <option key={brandName} value={brandName}>{brandName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Categoría */}
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold block">Categoría</label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                        className="text-[#E65F2B] text-[10px] font-bold hover:underline"
                      >
                        {isAddingNewCategory ? '✕ Cancelar' : '+ Nueva'}
                      </button>
                    </div>
                    {isAddingNewCategory ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Nueva categoría..."
                          value={customNewCategoryName}
                          onChange={e => setCustomNewCategoryName(e.target.value)}
                          className="flex-1 bg-white border border-orange-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                        />
                        <button
                          type="button"
                          disabled={creatingCategoryLoading || !customNewCategoryName.trim()}
                          onClick={async () => {
                            if (!customNewCategoryName.trim()) return;
                            setCreatingCategoryLoading(true);
                            try {
                              const created = await createAdminCategory(customNewCategoryName.trim());
                              setDbCategories(prev => [...prev, created]);
                              setNewCategory(created.name);
                              setCustomNewCategoryName('');
                              setIsAddingNewCategory(false);
                            } catch (err: any) {
                              alert(`Error: ${err.message || 'Error al guardar'}`);
                            } finally {
                              setCreatingCategoryLoading(false);
                            }
                          }}
                          className="bg-[#2D4A58] text-white font-bold px-2 py-1 rounded-lg text-xs shrink-0"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-medium"
                      >
                        {Array.from(new Set([
                          ...dbCategories.map(c => c.name),
                          ...products.map(p => p.category).filter(Boolean),
                          'Navidad', 'Gadgets & Novedades', 'Cosmética', 'Juguetes', 'Electrónica', 'Moda', 'Hogar'
                        ])).map(cat => (
                          <option key={cat} value={cat}>{cat === 'Navidad' ? '🎄 Navidad' : cat}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Stock */}
                  <div className="sm:col-span-3">
                    <label className="text-slate-700 font-bold block mb-1">
                      {isEditingCjProduct ? 'Cupo Virtual' : (isCombo ? 'Stock Combo' : 'Stock Piezas')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newStock}
                      onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-bold text-center"
                    />
                  </div>

                  {/* Interruptor Encendido en Tienda */}
                  <div className="sm:col-span-4 flex items-center justify-between p-2 rounded-xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Power className={`w-3.5 h-3.5 ${newIsActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-[11px] font-bold text-slate-800">
                        {newIsActive ? 'Visible Tienda' : 'Pausado'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewIsActive(!newIsActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        newIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          newIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Asignación a Lote de Importación (SOLO para Inventario Físico Boutique) */}
                {!isEditingCjProduct && (
                  <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#E65F2B]" /> Lote de Importación (Prorrateo):
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedBatchId && batches.find(b => b.id === selectedBatchId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const b = batches.find(item => item.id === selectedBatchId);
                              if (b) handleOpenEditBatch(b);
                            }}
                            className="text-blue-600 font-bold text-[10px] hover:underline cursor-pointer"
                          >
                            ✎ Editar Lote
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleOpenCreateBatch}
                          className="text-[#E65F2B] font-bold text-[10px] hover:underline cursor-pointer"
                        >
                          + Nuevo Lote
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-8">
                        <select
                          value={selectedBatchId}
                          onChange={e => setSelectedBatchId(e.target.value)}
                          className="w-full bg-white border border-orange-200 rounded-lg p-1.5 text-xs text-slate-900 font-medium"
                        >
                          {batches.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.batchName} (+${b.costPerUnit.toFixed(2)} flete/ud)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4 text-right">
                        <span className="text-[11px] font-black text-orange-950 font-semibold">
                          +${shippingPerUnit.toFixed(2)} MXN flete
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Costo y Precio de Venta: Diferenciado entre Catálogo Internacional CJ (3 Niveles) vs Boutique (Slider 100%-190%) */}
                {isEditingCjProduct ? (
                  (() => {
                    const cjLaunchPrice = Math.max(99, Math.round(totalCostUnitMxn * 1.22));
                    const cjOptimalPrice = Math.max(119, Math.round(totalCostUnitMxn * 1.32));
                    const cjMaxPrice = Math.max(149, Math.round(totalCostUnitMxn * 1.45));
                    return (
                      <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-200/80 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Costo Puesto en México (Ya calculado de CJ: Producto + Envío CJ) */}
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-800 font-bold text-xs">
                                {costInputMode === 'mxn' ? 'Costo Puesto en MX (Prod + Envío CJ):' : 'Costo Total CJ (USD):'}
                              </label>
                              <button
                                type="button"
                                onClick={() => setCostInputMode(costInputMode === 'mxn' ? 'usd' : 'mxn')}
                                className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                              >
                                {costInputMode === 'mxn' ? 'Ver en USD' : 'Ver en MXN'}
                              </button>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                              {costInputMode === 'mxn' ? (
                                <input
                                  type="number"
                                  step="1"
                                  value={newCostMxnDirect}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setNewCostMxnDirect(val);
                                    setNewPublicPrice(Math.max(99, Math.round(val * (1 + priceMarkupPercent / 100))));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-6 text-slate-900 font-bold text-sm"
                                />
                              ) : (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={newCostUsd}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setNewCostUsd(val);
                                    const autoCost = val * usdRate;
                                    setNewPublicPrice(Math.max(99, Math.round(autoCost * (1 + priceMarkupPercent / 100))));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-6 text-slate-900 font-bold text-sm"
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-indigo-600/90 font-semibold block mt-1">
                              ✓ Incluye costo de artículo CJ + envío internacional a México (sin lotes)
                            </span>
                          </div>

                          {/* Precio Venta Público Editable: Solo si NO tiene múltiples variantes */}
                          {editingVariants.length <= 1 && (
                            <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-slate-800 font-bold text-xs">Precio Público en Tienda (MXN):</label>
                                <span className="font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  +{priceMarkupPercent}% sobre costo CJ
                                </span>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                <input
                                  type="number"
                                  value={newPublicPrice}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setNewPublicPrice(val);
                                    if (totalCostUnitMxn > 0) {
                                      const calculatedMarkup = Math.round(((val - totalCostUnitMxn) / totalCostUnitMxn) * 100);
                                      setPriceMarkupPercent(Math.max(5, Math.min(300, calculatedMarkup)));
                                    }
                                  }}
                                  className="w-full bg-emerald-50/40 border border-emerald-300 rounded-lg p-2 pl-6 text-emerald-950 font-black text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                                Elige abajo uno de los 3 precios sugeridos de CJ o edítalo libremente
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Selector de 3 Niveles de Precio CJ: Solo cuando es producto único sin variantes */}
                        {editingVariants.length <= 1 && (
                          <div>
                            <span className="text-[11px] font-bold text-indigo-950 block mb-1.5">
                              Estrategia de Precio CJ (Competitivo vs Temu / TikTok Shop):
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPublicPrice(cjLaunchPrice);
                                  setPriceMarkupPercent(22);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  Math.abs(newPublicPrice - cjLaunchPrice) <= 2
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                                    : 'bg-white hover:bg-emerald-50/60 text-slate-800 border-slate-200'
                                }`}
                              >
                                <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - cjLaunchPrice) <= 2 ? 'text-emerald-100' : 'text-emerald-600'}`}>
                                  🔥 Introducción (+22%)
                                </span>
                                <span className="text-sm font-black block mt-0.5">${cjLaunchPrice} MXN</span>
                                <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - cjLaunchPrice) <= 2 ? 'text-emerald-100' : 'text-slate-500'}`}>
                                  Ganas +${Math.max(0, cjLaunchPrice - totalCostUnitMxn).toFixed(0)} MXN
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setNewPublicPrice(cjOptimalPrice);
                                  setPriceMarkupPercent(32);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  Math.abs(newPublicPrice - cjOptimalPrice) <= 2
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/30'
                                    : 'bg-white hover:bg-indigo-50/60 text-slate-800 border-slate-200'
                                }`}
                              >
                                <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - cjOptimalPrice) <= 2 ? 'text-indigo-100' : 'text-indigo-600'}`}>
                                  ⚖️ Óptimo (+32%)
                                </span>
                                <span className="text-sm font-black block mt-0.5">${cjOptimalPrice} MXN</span>
                                <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - cjOptimalPrice) <= 2 ? 'text-indigo-100' : 'text-slate-500'}`}>
                                  Ganas +${Math.max(0, cjOptimalPrice - totalCostUnitMxn).toFixed(0)} MXN
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setNewPublicPrice(cjMaxPrice);
                                  setPriceMarkupPercent(45);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  Math.abs(newPublicPrice - cjMaxPrice) <= 2
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/30'
                                    : 'bg-white hover:bg-amber-50/60 text-slate-800 border-slate-200'
                                }`}
                              >
                                <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - cjMaxPrice) <= 2 ? 'text-amber-100' : 'text-amber-600'}`}>
                                  💎 Máximo (+45%)
                                </span>
                                <span className="text-sm font-black block mt-0.5">${cjMaxPrice} MXN</span>
                                <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - cjMaxPrice) <= 2 ? 'text-amber-100' : 'text-slate-500'}`}>
                                  Ganas +${Math.max(0, cjMaxPrice - totalCostUnitMxn).toFixed(0)} MXN
                                </span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Resumen de Ganancia Libre CJ */}
                        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-600 block text-[11px]">
                              Costo Total Puesto en MX (Producto + Envío CJ): <strong className="text-slate-900 font-semibold">${totalCostUnitMxn.toFixed(2)} MXN</strong>
                            </span>
                            <span className="text-xs font-black text-emerald-700 font-semibold">
                              Ganancia Libre por Venta: +${profitUnit.toFixed(2)} MXN (+{priceMarkupPercent}% sobre costo CJ)
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase">Margen Libre</span>
                            <span className="text-sm font-black text-slate-900 font-semibold">{marginPercent.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Editor individual de precios por modelo / variante */}
                        {editingVariants.length > 0 && (
                          <div className="bg-slate-50/90 border border-indigo-200/80 rounded-2xl p-3 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200/70 pb-2">
                              <div>
                                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <span>🎨 Modelos / Variantes ({editingVariants.length})</span>
                                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                    Precios Individuales
                                  </span>
                                </span>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Modifica el precio público de cada opción o aplica un margen masivo a todas.
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-slate-400 font-semibold mr-1">Margen masivo:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariants(prev => prev.map(v => {
                                      const cost = Number(v.costMxn || v.cost_mxn) || totalCostUnitMxn;
                                      return { ...v, publicPrice: Math.max(99, Math.round(cost * 1.25)) };
                                    }));
                                  }}
                                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                  +25%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariants(prev => prev.map(v => {
                                      const cost = Number(v.costMxn || v.cost_mxn) || totalCostUnitMxn;
                                      return { ...v, publicPrice: Math.max(99, Math.round(cost * 1.35)) };
                                    }));
                                  }}
                                  className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                  +35%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariants(prev => prev.map(v => {
                                      const cost = Number(v.costMxn || v.cost_mxn) || totalCostUnitMxn;
                                      return { ...v, publicPrice: Math.max(99, Math.round(cost * 1.50)) };
                                    }));
                                  }}
                                  className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                  +50%
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                              {editingVariants.map((v: any, vIdx: number) => {
                                const vCost = Number(v.costMxn || v.cost_mxn) || totalCostUnitMxn;
                                const vPrice = Number(v.publicPrice || v.public_price || newPublicPrice) || 0;
                                const vProfit = vPrice - vCost;
                                const vProfitPct = vCost > 0 ? Math.round((vProfit / vCost) * 100) : 0;
                                const vImg = v.image || newImages[0] || '/no-image.svg';

                                return (
                                  <div
                                    key={v.id || vIdx}
                                    className="flex items-center justify-between gap-2.5 p-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="relative group/thumb shrink-0 cursor-zoom-in" onClick={() => setZoomedImage({ url: getSafeAdminImageUrl(vImg), title: v.name })}>
                                        <img
                                          src={getSafeAdminImageUrl(vImg)}
                                          alt={v.name}
                                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 shrink-0 bg-slate-50 shadow-2xs group-hover/thumb:border-indigo-500 group-hover/thumb:scale-105 transition duration-150"
                                        />
                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white p-0.5 rounded-md opacity-0 group-hover/thumb:opacity-100 transition text-[9px] font-bold">
                                          🔍
                                        </span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-slate-800 truncate" title={v.name}>
                                          {translateVariantName(v.name) || ('Opción ' + (vIdx + 1))}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          Costo: <strong className="text-slate-700">${vCost.toFixed(0)} MXN</strong>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-slate-400">$</span>
                                          <input
                                            type="number"
                                            value={vPrice}
                                            onChange={(e) => {
                                              const newP = Number(e.target.value);
                                              setEditingVariants(prev => prev.map((item, idx) => {
                                                if (idx === vIdx) return { ...item, publicPrice: newP };
                                                return item;
                                              }));
                                            }}
                                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-right"
                                          />
                                          <span className="text-[10px] font-bold text-slate-500">MXN</span>
                                        </div>
                                        <span className={'text-[9px] font-bold ' + (vProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                          {vProfit >= 0 ? '+' : ''}${vProfit.toFixed(0)} ({vProfitPct}%)
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const vName = v.name || ('Opción ' + (vIdx + 1));
                                          if (window.confirm(`¿Deseas quitar la variante "${vName}" de la lista?`)) {
                                            setEditingVariants(prev => prev.filter((_, idx) => idx !== vIdx));
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer ml-0.5"
                                        title="Eliminar esta variante"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Costo Base */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-700 font-bold text-xs">
                            {costInputMode === 'mxn' ? 'Costo Base (MXN):' : 'Costo Base (USD):'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setCostInputMode(costInputMode === 'mxn' ? 'usd' : 'mxn')}
                            className="text-[10px] text-[#E65F2B] hover:underline font-bold cursor-pointer"
                          >
                            {costInputMode === 'mxn' ? 'Cambiar a USD' : 'Cambiar a MXN'}
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                          {costInputMode === 'mxn' ? (
                            <input
                              type="number"
                              step="1"
                              value={newCostMxnDirect}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setNewCostMxnDirect(val);
                                // Al escribir costo base, recalcular precio de venta con el margen actual
                                const autoTotalCost = val + shippingPerUnit;
                                setNewPublicPrice(Math.round(autoTotalCost * (1 + priceMarkupPercent / 100)));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-slate-900 font-bold text-sm"
                            />
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={newCostUsd}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setNewCostUsd(val);
                                const autoTotalCost = (val * usdRate) + shippingPerUnit;
                                setNewPublicPrice(Math.round(autoTotalCost * (1 + priceMarkupPercent / 100)));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-slate-900 font-bold text-sm"
                            />
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold">
                            {costInputMode === 'mxn'
                              ? `Aprox. $${(newCostMxnDirect / (usdRate || 20)).toFixed(2)} USD`
                              : `Equivale a $${costMxn.toFixed(2)} MXN`}
                          </span>
                          <span className="text-slate-600 font-bold font-semibold">
                            +${shippingPerUnit.toFixed(2)} flete = <strong className="text-slate-900">${totalCostUnitMxn.toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Precio Venta con Deslizante (Slider 100% a 190%) */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-700 font-bold text-xs">Precio Venta Público (MXN):</label>
                          <span className="font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                            +{priceMarkupPercent}% sobre costo
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            value={newPublicPrice}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setNewPublicPrice(val);
                              if (totalCostUnitMxn > 0) {
                                const calculatedMarkup = Math.round(((val - totalCostUnitMxn) / totalCostUnitMxn) * 100);
                                setPriceMarkupPercent(Math.max(10, Math.min(300, calculatedMarkup)));
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-slate-900 font-bold text-sm"
                          />
                        </div>

                        {/* Deslizante interactivo de 100% a 190% */}
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                            <span>100% (Duplicar)</span>
                            <span className="font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {priceMarkupPercent}%
                            </span>
                            <span>190% (Casi el triple)</span>
                          </div>
                          <input
                            type="range"
                            min={100}
                            max={190}
                            step={5}
                            value={Math.max(100, Math.min(190, priceMarkupPercent))}
                            onChange={e => {
                              const newMarkup = parseInt(e.target.value);
                              setPriceMarkupPercent(newMarkup);
                              const calculatedPrice = Math.round(totalCostUnitMxn * (1 + newMarkup / 100));
                              setNewPublicPrice(calculatedPrice);
                            }}
                            className="w-full accent-[#E65F2B] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                          />
                          <div className="flex items-center justify-between text-[9px] text-slate-400">
                            <span>+$100% ($ {(totalCostUnitMxn * 2).toFixed(0)})</span>
                            <span className="font-bold text-emerald-600">Ganancia: +${profitUnit.toFixed(2)} MXN</span>
                            <span>+$190% ($ {(totalCostUnitMxn * 2.9).toFixed(0)})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Banner de Resultado Financiero Regular */}
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-600 block text-[11px]">
                          Costo Total: <strong className="text-slate-900 font-semibold">${totalCostUnitMxn.toFixed(2)} MXN</strong> (Base ${costMxn.toFixed(2)} + Flete ${shippingPerUnit.toFixed(2)})
                        </span>
                        <span className="text-xs font-black text-emerald-700 font-semibold">
                          Ganancia Neta en Pesos: +${profitUnit.toFixed(2)} MXN (+{priceMarkupPercent}% de incremento)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Margen Bruto</span>
                        <span className="text-sm font-black text-slate-900 font-semibold">{marginPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </>
                )}

                {/* 5. SECCIÓN DE OFERTAS Y PROMOCIONES (Descuento con Piso de Seguridad de Utilidad >= 50%) */}
                <div className={`p-3 rounded-2xl border transition-all ${
                  newDiscountPercent > 0 
                    ? isPromoMarginSafe ? 'bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white border-orange-300 shadow-2xs' : 'bg-rose-50/70 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Percent className={`w-3.5 h-3.5 ${newDiscountPercent > 0 ? 'text-[#E65F2B]' : 'text-slate-400'}`} />
                      <span className="font-bold text-slate-800 text-xs">
                        Descuento de Oferta / Promoción:
                      </span>
                      {newDiscountPercent > 0 && (
                        <span className="bg-[#E65F2B] text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                          -{newDiscountPercent}% OFF ACTIVO
                        </span>
                      )}
                    </div>
                    {/* Botón rápido para apagar promo */}
                    {newDiscountPercent > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewDiscountPercent(0)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        ✕ Quitar Oferta
                      </button>
                    )}
                  </div>

                  {/* Botones de porcentaje de descuento recomendados */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'Sin Oferta (0%)', val: 0 },
                      { label: '10% OFF', val: 10 },
                      { label: '15% OFF', val: 15 },
                      { label: '20% OFF', val: 20 },
                      { label: '25% OFF', val: 25 },
                      { label: '30% OFF', val: 30 },
                      { label: '40% OFF', val: 40 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setNewDiscountPercent(item.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          newDiscountPercent === item.val
                            ? 'bg-[#E65F2B] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {/* Input para descuento libre personalizado */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">Otro %:</span>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={newDiscountPercent > 0 && ![10, 15, 20, 25, 30, 40].includes(newDiscountPercent) ? newDiscountPercent : ''}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(80, parseInt(e.target.value) || 0));
                          setNewDiscountPercent(val);
                        }}
                        placeholder="%"
                        className="w-10 text-xs font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Panel de resultado con el descuento aplicado */}
                  {newDiscountPercent > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-orange-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Precio de Oferta al Cliente:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 line-through text-xs">${newPublicPrice}</span>
                          <span className="text-sm font-black text-[#E65F2B] font-semibold">${promoPrice} MXN</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Ganancia Tras Descuento:</span>
                        <span className="text-xs font-black text-emerald-700 font-semibold">
                          +${promoProfit.toFixed(2)} MXN
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-500 block">Margen de Ganancia:</span>
                        <div className="inline-flex items-center gap-1">
                          <span className={`text-xs font-black font-semibold ${isPromoMarginSafe ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {promoMarginPercent.toFixed(1)}%
                          </span>
                          {isPromoMarginSafe ? (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200">
                              {isEditingCjProduct ? '✓ Con ganancia' : '✓ Seguro (≥50%)'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full border border-rose-200">
                              {isEditingCjProduct ? '⚠️ Sin ganancia' : '⚠️ Menor a 50%'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Fotografías del Producto (Compacto) */}
                <div className="space-y-1.5 border border-slate-200 bg-slate-50/60 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-bold block text-xs flex items-center gap-1">
                      <span>Fotos del Producto</span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/80 px-1.5 py-0.2 rounded-full">
                        {newImages.length}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSearchImageOnGoogle}
                      className="text-slate-600 hover:text-slate-900 font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs transition"
                    >
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span>Buscar en Google</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-center gap-1.5 text-slate-700 transition shadow-2xs">
                      <Camera className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold text-[11px] truncate">Cámara</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleMultipleFilesUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-center gap-1.5 text-slate-700 transition shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-[#E65F2B] shrink-0" />
                      <span className="font-semibold text-[11px] truncate">
                        {uploadingImage ? '...' : 'Galería'}
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

                    <button
                      type="button"
                      onClick={() => handlePasteImage()}
                      disabled={uploadingImage}
                      className="bg-white hover:bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-center gap-1.5 text-slate-700 transition font-semibold text-[11px] shadow-2xs truncate"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Pegar</span>
                    </button>
                  </div>

                  {/* Miniaturas de fotos ampliadas y con zoom */}
                  {newImages.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">
                          Fotos cargadas ({newImages.length}) — <span className="text-slate-400 font-normal">Haz clic sobre cualquier foto para verla en grande</span>
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto py-2 px-1">
                        {newImages.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className={`relative group rounded-2xl overflow-hidden border-2 bg-white w-24 h-24 sm:w-28 sm:h-28 shrink-0 shadow-xs flex flex-col justify-between p-1.5 transition-all duration-150 hover:shadow-md ${
                              idx === 0 ? 'border-[#E65F2B] ring-2 ring-orange-200' : 'border-slate-200 hover:border-indigo-400'
                            }`}
                          >
                            <img
                              src={getSafeAdminImageUrl(imgUrl)}
                              alt=""
                              onClick={() => setZoomedImage({ url: getSafeAdminImageUrl(imgUrl), title: `Foto ${idx + 1} de ${newImages.length}` })}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                              className="w-full h-full object-cover rounded-xl absolute inset-0 z-0 cursor-zoom-in group-hover:scale-105 transition duration-200"
                            />
                            <div className="relative z-10 flex items-center justify-between w-full pointer-events-none">
                              <div className="pointer-events-auto">
                                {idx === 0 ? (
                                  <span className="bg-[#E65F2B] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                    ⭐ Portada
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = [imgUrl, ...newImages.filter((_, i) => i !== idx)];
                                      setNewImages(updated);
                                      setNewImageUrl(imgUrl);
                                    }}
                                    className="bg-slate-900/80 hover:bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md cursor-pointer transition shadow-xs"
                                    title="Poner esta foto como portada principal"
                                  >
                                    Portada
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = newImages.filter((_, i) => i !== idx);
                                  setNewImages(updated);
                                  if (updated.length > 0) setNewImageUrl(updated[0]);
                                  else setNewImageUrl('');
                                }}
                                className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white rounded-full p-1 cursor-pointer ml-auto shadow-md hover:scale-110 transition"
                                title="Eliminar esta foto"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="relative z-10 self-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                              <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                                🔍 Ver grande
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 shrink-0">+ URL:</span>
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
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 6. Modalidad Combo (Opcional, discreto) */}
                <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#E65F2B]" />
                    <span className="font-bold text-[11px] text-slate-800">¿Es un Combo de productos?</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCombo(false)}
                      className={`px-2 py-0.5 text-xs font-bold rounded-lg transition ${
                        !isCombo ? 'bg-[#2D4A58] text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCombo(true)}
                      className={`px-2 py-0.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                        isCombo ? 'bg-[#E65F2B] text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" /> Combo
                    </button>
                  </div>
                </div>

                {isCombo && (
                  <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-2.5 space-y-1.5 animate-in fade-in duration-200">
                    <span className="text-[11px] font-bold text-orange-950 block">
                      Selecciona los productos que integran este combo:
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1 bg-white border border-orange-200 rounded-lg p-1.5">
                      {products
                        .filter(p => !editingProductId || p.id !== editingProductId)
                        .map(p => {
                          const isSelected = selectedComboProductIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs ${
                                isSelected ? 'bg-orange-50 border border-orange-300' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedComboProductIds(prev => [...prev, p.id]);
                                    else setSelectedComboProductIds(prev => prev.filter(id => id !== p.id));
                                  }}
                                  className="rounded text-[#E65F2B] w-3.5 h-3.5"
                                />
                                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{p.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">Stock: {p.stock}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Botón de Enviar Fijo al Final */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || uploadingImage}
                    className="flex-2 bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-gray-400 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{editingProductId ? 'Actualizar Artículo' : 'Guardar en Catálogo'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CREAR / EDITAR LOTE DE IMPORTACIÓN */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
              <button 
                onClick={() => {
                  setShowBatchModal(false);
                  setEditingBatch(null);
                }} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#E65F2B]" /> 
                  {editingBatch ? 'Editar Lote de Importación' : 'Nuevo Lote de Importación'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingBatch 
                    ? `Modifica los costos o unidades del lote (${editingBatch.batchName}). El flete unitario se recalculará automáticamente.`
                    : 'Ingresa el costo total de envío pagado por la caja o remesa para que el sistema calcule el prorrateo automático.'}
                </p>
              </div>

              <form onSubmit={handleSaveBatch} className="space-y-3 text-xs">
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
                      min={0}
                      step="any"
                      placeholder="0"
                      value={batchShippingCostInput}
                      onChange={e => setBatchShippingCostInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Unidades del Lote:</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="1"
                      value={batchUnitsInput}
                      onChange={e => setBatchUnitsInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-orange-950 font-bold">Flete Calculado por Pieza:</span>
                  <span className="text-base font-black text-[#E65F2B]">
                    +${(() => {
                      const u = parseInt(batchUnitsInput, 10) || 0;
                      const s = parseFloat(batchShippingCostInput) || 0;
                      return (u > 0 ? s / u : 0).toFixed(2);
                    })()} MXN
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
                  className="w-full bg-[#2D4A58] hover:bg-[#203641] text-white font-bold py-3 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {savingBatch ? 'Guardando en Base de Datos...' : (editingBatch ? 'Actualizar Lote' : 'Guardar Lote de Importación')}
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
                        <span className="font-black text-slate-900 text-sm">
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
                              src={getSafeAdminImageUrl(prod.images[0])}
                              alt=""
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
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
                            <span className="text-[10px] font-semibold text-slate-400">
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
                          <p className="text-[10px] text-slate-500 font-semibold">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                    <span className="font-black text-sm text-[#E65F2B]">{posCompletedTicket.orderNumber}</span>
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
                    <span className="font-bold text-sky-700">{posCompletedTicket.clientPhone}</span>
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
                          <span className="font-bold text-slate-900 shrink-0">
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
                      <span className="font-black text-xl text-[#0F3E36]">
                        ${posCompletedTicket.total.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>

                  {/* Banner Club FoxDrop */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      ⭐ Club FoxDrop:
                    </span>
                    <span className="font-black text-sm text-[#E65F2B]">
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
              {/* Confirmación de envío automático por WhatsApp */}
              {posCompletedTicket.clientPhone && posCompletedTicket.clientPhone !== 'Mostrador' && posCompletedTicket.clientPhone.replace(/\D/g, '').length >= 10 ? (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl py-2.5 px-3 flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                  <span>Ticket enviado automáticamente por WhatsApp ✓</span>
                </div>
              ) : (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold">
                  <span>Venta en mostrador sin teléfono registrado</span>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    let downloadUrl = posCompletedTicket.ticketImageUrl;
                    if (!downloadUrl) {
                      try {
                        downloadUrl = await generateTicketCanvasDataUrl(posCompletedTicket);
                      } catch (cErr) {
                        console.warn("Fallo canvas en descarga:", cErr);
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
                        <span className="font-semibold">{viewingTicketOrder.clientPhone}</span>
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
                          const cleanPhone = (viewingTicketOrder.clientPhone || '').replace(/\D/g, '');
                          if (cleanPhone && cleanPhone !== 'Mostrador' && cleanPhone.length >= 10) {
                            try {
                              await fetch("/api/whatsapp", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "status_update",
                                  orderNumber: viewingTicketOrder.id,
                                  clientName: viewingTicketOrder.clientName,
                                  clientPhone: viewingTicketOrder.clientPhone,
                                  newStatus: "delivered",
                                  shippingType: "pos_in_store",
                                  total: viewingTicketOrder.total,
                                  ticketImageUrl: ticketImg,
                                  loyaltyStars: Math.floor(viewingTicketOrder.total / 10),
                                }),
                              });
                            } catch (err) {
                              console.warn("Aviso: reintento de envío de ticket por API:", err);
                            }
                          }

                          const msg = `🦊 *Foxdrop - Tu atajo al mundo*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *COMPROBANTE OFICIAL DE COMPRA*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 *Folio de Venta:* ${viewingTicketOrder.id}
👤 *Cliente:* ${viewingTicketOrder.clientName}
📱 *Teléfono:* ${viewingTicketOrder.clientPhone}
💰 *TOTAL PAGADO:* $${viewingTicketOrder.total.toFixed(2)} MXN
⭐ *Puntos Club Ganados:* +${Math.floor(viewingTicketOrder.total / 10)} pts

🧾 *Imagen oficial del ticket:*
${ticketImg}

✨ *¡Tus puntos Club FoxDrop están acreditados!*`;

                          sendWhatsAppNotification(viewingTicketOrder.clientPhone, msg);
                          setViewingTicketOrder(null);
                        }}
                        className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-2.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Enviar Ticket por WhatsApp FoxDrop</span>
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
                      type="button"
                      disabled={regeneratingTicket}
                      onClick={() => handleRegenerateTicketOrder(viewingTicketOrder)}
                      className="w-full bg-orange-50 hover:bg-orange-100 text-[#E65F2B] border border-orange-200 font-bold py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs transition disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regeneratingTicket ? 'animate-spin' : ''}`} />
                      <span>{regeneratingTicket ? 'Regenerando Ticket en HD...' : '🔄 Re-generar Ticket Gráfico (HD)'}</span>
                    </button>

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
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-bold">
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
                <span className={`text-base font-black ${
                  kardexProduct.stock <= 0 ? 'text-rose-600' : kardexProduct.stock <= 3 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {kardexProduct.stock} pzas
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Costo Unitario</span>
                <span className="text-base font-black text-slate-800">
                  ${kardexProduct.totalCostMxn?.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-emerald-600 block uppercase">Precio Público</span>
                <span className="text-base font-black text-emerald-700">
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
                          <span className="font-black text-rose-600 text-sm block">
                            -{m.qty} {m.qty === 1 ? 'pza' : 'pzas'}
                          </span>
                          <span className="font-semibold text-[10px] text-slate-500">
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
      {showBulkBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DF7F2D] to-amber-500 flex items-center justify-center text-white shadow-md">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Asignar Tienda / Marca en Lote</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Se aplicará a <strong>{selectedProductIds.length}</strong> artículos seleccionados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkBrandModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Selecciona la Tienda Oficial a asignar:
                </label>
                <select
                  value={bulkTargetBrand}
                  onChange={e => setBulkTargetBrand(e.target.value)}
                  className="w-full bg-amber-50/50 border-2 border-amber-300 rounded-xl p-3 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#DF7F2D] cursor-pointer"
                >
                  {Array.from(new Set([
                    ...officialBrands.map(b => b.name),
                    'Bath & Body Works',
                    'FoxDrop Oficial',
                  ])).map(brandName => (
                    <option key={brandName} value={brandName}>{brandName}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 Tip de organización:</p>
                <p>Todos los productos seleccionados quedarán clasificados bajo <strong>{bulkTargetBrand}</strong> de forma permanente.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkBrandModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingBulkBrand || !bulkTargetBrand.trim()}
                onClick={handleApplyBulkBrand}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-600 to-[#DF7F2D] hover:from-amber-500 hover:to-[#e68835] transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingBulkBrand ? 'Asignando...' : `Asignar a ${selectedProductIds.length} artículos`}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <span className="text-[10px] text-slate-400 font-semibold">Actual: {p.category}</span>
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
      {/* MODAL OFERTA / DESCUENTO MASIVO EN LOTE */}
      {/* ======================================================== */}
      {showBulkDiscountModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowBulkDiscountModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#E65F2B] shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Aplicar Descuento / Oferta en Lote
                </h3>
                <p className="text-xs text-slate-500">
                  Activará o desactivará la promoción en <span className="font-bold text-[#E65F2B]">{selectedProductIds.length}</span> producto(s) seleccionados.
                </p>
              </div>
            </div>

            {/* Lista previa de los primeros artículos seleccionados */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Productos seleccionados:</span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs text-slate-700">
                {products
                  .filter(p => selectedProductIds.includes(p.id))
                  .map(p => {
                    const previewPromo = bulkDiscountSelected > 0 ? Math.round(p.publicPrice * (1 - bulkDiscountSelected / 100)) : p.publicPrice;
                    const previewProfit = previewPromo - (p.totalCostMxn || 0);
                    const previewMargin = previewPromo > 0 ? (previewProfit / previewPromo) * 100 : 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <span className="font-bold truncate max-w-[200px]">{p.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through font-semibold">${p.publicPrice}</span>
                          <span className="font-black text-[#E65F2B] font-semibold">${previewPromo}</span>
                          <span className={`text-[10px] font-bold ${previewMargin >= 50 ? 'text-emerald-700' : 'text-amber-600'}`}>
                            ({previewMargin.toFixed(0)}% util.)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                Selecciona el Porcentaje de Descuento Promocional:
              </label>

              {/* Botones de porcentajes predefinidos */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { label: '10% OFF', val: 10 },
                  { label: '15% OFF', val: 15 },
                  { label: '20% OFF', val: 20 },
                  { label: '25% OFF', val: 25 },
                  { label: '30% OFF', val: 30 },
                  { label: '40% OFF', val: 40 },
                  { label: 'Quitar Oferta (0%)', val: 0, fullCol: true },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setBulkDiscountSelected(item.val)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      item.fullCol ? 'col-span-3 sm:col-span-2' : ''
                    } ${
                      bulkDiscountSelected === item.val
                        ? item.val === 0 
                          ? 'bg-slate-800 text-white shadow-xs' 
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                        : item.val === 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Input porcentaje libre */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-xs font-bold text-slate-600">O escribe otro porcentaje manual:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={bulkDiscountSelected > 0 && ![10, 15, 20, 25, 30, 40].includes(bulkDiscountSelected) ? bulkDiscountSelected : ''}
                    onChange={(e) => setBulkDiscountSelected(Math.max(0, Math.min(80, parseInt(e.target.value) || 0)))}
                    placeholder="25"
                    className="w-12 text-xs font-bold text-slate-900 outline-none text-right font-semibold"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Advertencia de política de piso de utilidad 50% */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Regla de negocio FoxDrop:</strong> Al aplicar promociones en la tienda, el sistema mostrará el precio tachado y badge <strong>-{bulkDiscountSelected}%</strong>, asegurando que la utilidad neta se mantenga lo más cercana o por encima del 50%.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDiscountModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingBulkDiscount}
                  onClick={() => handleApplyBulkDiscount(bulkDiscountSelected)}
                  className="flex-1 py-2.5 bg-[#E65F2B] hover:bg-[#D45321] text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingBulkDiscount ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Aplicando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {bulkDiscountSelected === 0 
                          ? `Quitar oferta de ${selectedProductIds.length} art.`
                          : `Aplicar -${bulkDiscountSelected}% a ${selectedProductIds.length} art.`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
      {/* Se oculta cuando estamos dentro de la pestaña de WhatsApp para dar experiencia 100% de app */}
      {/* ======================================================== */}
      {crmSubTab !== 'whatsapp' && (
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

            {/* ACCIÓN: CHAT DE WHATSAPP */}
            <button
              type="button"
              onClick={() => {
                try { soundManager.triggerHaptic('light'); } catch {}
                setShowFloatingWhatsApp(false);
                setCrmSubTab('whatsapp');
              }}
              className="flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 text-slate-400 hover:text-white"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">WhatsApp</span>
            </button>
          </div>
        </nav>
      )}

      {/* ======================================================== */}
      {/* BURBUJAS FLOTANTES: WHATSAPP Y ASISTENTE FOX */}
      {/* Ocultas en móvil (<768px) para no tapar texto ni botones táctiles */}
      {crmSubTab !== 'whatsapp' && (
        <aside
          aria-label="Accesos directos flotantes"
          style={{
            transform: `translate3d(${bubblePos.x}px, ${bubblePos.y}px, 0)`,
            touchAction: 'none',
          }}
          className="hidden md:flex fixed bottom-8 right-6 z-50 flex-col items-center gap-2 select-none"
        >
        {/* Manija de arrastre / Grip superior táctil */}
        <div
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            dragStartRef.current = {
              mouseX: e.clientX,
              mouseY: e.clientY,
              initialX: bubblePos.x,
              initialY: bubblePos.y,
            };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isDraggingRef.current) return;
            const deltaX = e.clientX - dragStartRef.current.mouseX;
            const deltaY = e.clientY - dragStartRef.current.mouseY;
            setBubblePos({
              x: dragStartRef.current.initialX + deltaX,
              y: dragStartRef.current.initialY + deltaY,
            });
          }}
          onPointerUp={(e) => {
            if (isDraggingRef.current) {
              isDraggingRef.current = false;
              updateBubblePosition(bubblePos);
              try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
            }
          }}
          onDoubleClick={() => {
            // Doble clic para restablecer al rincón original
            updateBubblePosition({ x: 0, y: 0 });
          }}
          className="bg-slate-900/90 text-white/80 hover:text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-grab active:cursor-grabbing border border-white/20 shadow-lg flex items-center gap-1.5 transition active:scale-95 touch-none"
          title="Arrastra para mover o doble clic para restablecer posición"
        >
          <span>⠿</span>
          <span className="hidden sm:inline">Mover</span>
          <div className="flex items-center gap-0.5 ml-1 border-l border-white/20 pl-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextSize = bubbleSize === 'sm' ? 'md' : bubbleSize === 'md' ? 'lg' : 'sm';
                updateBubbleSize(nextSize);
              }}
              className="text-[9px] text-emerald-400 hover:text-emerald-300 font-semibold px-1 rounded hover:bg-white/10"
              title={`Tamaño burbuja actual: ${bubbleSize.toUpperCase()}. Clic para cambiar.`}
            >
              {bubbleSize === 'sm' ? 'S' : bubbleSize === 'md' ? 'M' : 'G'}
            </button>
          </div>
        </div>

        {/* 1. Burbuja Flotante de Acceso Directo a WhatsApp Central */}
        <div className="relative group flex items-center">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/95 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xl border border-emerald-500/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute right-16 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{showFloatingWhatsApp ? 'Cerrar WhatsApp Flotante' : 'Abrir WhatsApp Flotante'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('medium'); } catch {}
              setShowFloatingWhatsApp(!showFloatingWhatsApp);
            }}
            title="Abrir WhatsApp en ventana flotante"
            className={`rounded-full text-white flex items-center justify-center shadow-2xl border-2 transition-all duration-200 cursor-pointer relative active:scale-95 ${
              bubbleSize === 'sm'
                ? 'w-10 h-10'
                : bubbleSize === 'lg'
                ? 'w-16 h-16'
                : 'w-13 h-13'
            } ${
              showFloatingWhatsApp
                ? 'bg-gradient-to-tr from-emerald-700 to-teal-600 border-emerald-300 ring-4 ring-emerald-400/50 scale-105'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-white hover:scale-105'
            }`}
          >
            <MessageSquare className={`drop-shadow ${
              bubbleSize === 'sm' ? 'w-4 h-4' : bubbleSize === 'lg' ? 'w-7 h-7' : 'w-6 h-6'
            }`} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            </span>
          </button>
        </div>

        {/* 2. Burbuja Flotante de Fox (Asistente IA) */}
        <div className="relative group flex items-center">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/95 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xl border border-orange-500/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute right-16 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>{showFloatingFox ? 'Cerrar Fox Flotante' : 'Hablar con Fox (Ventana)'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              try { soundManager.triggerHaptic('medium'); } catch {}
              setShowFloatingFox(!showFloatingFox);
              setFloatingFoxMinimised(false);
            }}
            title="Abrir asistente Fox en ventana flotante"
            className={`rounded-full text-white flex items-center justify-center shadow-2xl border-2 transition-all duration-200 cursor-pointer relative active:scale-95 ${
              bubbleSize === 'sm'
                ? 'w-10 h-10'
                : bubbleSize === 'lg'
                ? 'w-16 h-16'
                : 'w-13 h-13'
            } ${
              showFloatingFox
                ? 'bg-gradient-to-tr from-[#E65F2B] via-[#FF8A00] to-amber-500 border-amber-300 ring-4 ring-orange-400/50 scale-105'
                : 'bg-gradient-to-tr from-[#E65F2B] via-[#FF8A00] to-amber-500 border-white hover:scale-105'
            }`}
          >
            <img
              src={FOX_LOGO_BASE64 || "/fox-logo-head-3d.png"}
              alt="Fox"
              className={`object-contain drop-shadow select-none pointer-events-none ${
                bubbleSize === 'sm' ? 'w-5 h-5' : bubbleSize === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
              }`}
            />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            </span>
          </button>
        </div>
      </aside>
      )}

      {/* ======================================================== */}
      {/* VENTANA FLOTANTE 1: WHATSAPP CENTRAL (SIN SALIR DE TU PESTAÑA) */}
      {/* ======================================================== */}
      {showFloatingWhatsApp && crmSubTab !== 'whatsapp' && (
        <div className={`fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-6 md:right-10 z-50 max-w-[98vw] max-h-[95vh] bg-white sm:rounded-3xl shadow-2xl sm:border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 transition-all ${
          floatingWhatsAppSize === 'compact'
            ? 'w-full sm:w-[500px] md:w-[580px] h-full sm:h-[540px]'
            : floatingWhatsAppSize === 'normal'
            ? 'w-full sm:w-[680px] md:w-[780px] h-full sm:h-[640px]'
            : 'w-full sm:w-[780px] md:w-[940px] lg:w-[1100px] h-full sm:h-[720px]'
        }`}>
          {/* Barra de título de la ventana flotante */}
          <div className="bg-[#0F3E36] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-xs select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-extrabold text-xs tracking-wide">WhatsApp Central • FoxDrop</span>
              <span className="hidden sm:inline-block text-[10px] text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full font-bold">
                Ventana Flotante
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Selector de tamaño de ventana: Compacto (S), Mediano (M), Grande (G) */}
              <div className="hidden sm:flex items-center bg-emerald-950/60 rounded-lg p-0.5 border border-emerald-800/60 mr-1">
                <button
                  type="button"
                  onClick={() => updateFloatingWhatsAppSize('compact')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    floatingWhatsAppSize === 'compact'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Tamaño Compacto (más pequeño para multitarea)"
                >
                  Chico
                </button>
                <button
                  type="button"
                  onClick={() => updateFloatingWhatsAppSize('normal')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    floatingWhatsAppSize === 'normal'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Tamaño Mediano"
                >
                  Medio
                </button>
                <button
                  type="button"
                  onClick={() => updateFloatingWhatsAppSize('expanded')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    floatingWhatsAppSize === 'expanded'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Tamaño Grande (máxima amplitud para leer y redactar mensajes)"
                >
                  Grande
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowFloatingWhatsApp(false);
                  setCrmSubTab('whatsapp');
                }}
                className="text-xs text-emerald-200 hover:text-white px-2 py-0.5 rounded-lg hover:bg-emerald-800/60 transition cursor-pointer"
                title="Maximizar a pantalla completa de CRM"
              >
                Abrir en Grande ↗
              </button>
              <button
                type="button"
                onClick={() => setShowFloatingWhatsApp(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <AdminWhatsAppTab
              orders={orders}
              clients={clients}
              adminSessionName={(adminSession?.email || '').toLowerCase().includes('nydia') ? 'Nydia' : 'Mario'}
              initialPhone={whatsappTarget?.phone}
              initialMessage={whatsappTarget?.message}
              onClose={() => setShowFloatingWhatsApp(false)}
              onSelectAnyChat={() => {
                if (whatsappTarget) setWhatsappTarget(null);
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VENTANA FLOTANTE 2: ASISTENTE FOX AI (CHAT SIN SALIR DE TU PESTAÑA) */}
      {/* ======================================================== */}
      {showFloatingFox && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-24 z-50 w-full sm:w-[480px] md:w-[540px] h-full sm:h-[620px] bg-white sm:rounded-3xl shadow-2xl sm:border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {/* Cabecera de la Ventana Fox */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-4 py-3 flex items-center justify-between border-b border-indigo-900/40 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E65F2B] to-[#FF8A00] flex items-center justify-center text-white shadow-md">
                <img
                  src={FOX_LOGO_BASE64 || "/fox-logo-head-3d.png"}
                  alt="Fox"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white leading-tight flex items-center gap-1.5">
                  <span>Fox Copilot AI</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-[10px] text-orange-200/80">Pregúntale stock, ventas o crea posts</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowFloatingFox(false);
                  setCrmSubTab('agent');
                  setAgentActiveTab('chat');
                }}
                className="text-xs text-orange-200 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Maximizar a sección completa"
              >
                Abrir en Grande ↗
              </button>
              <button
                type="button"
                onClick={() => setShowFloatingFox(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo del Chat con Fox */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
            {agentChatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E65F2B] to-[#FF8A00] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    🦊
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#2D4A58] text-white rounded-tr-none shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                }`}>
                  <div className="whitespace-pre-line font-normal">{msg.text}</div>
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/40">
                    <span className={`text-[9px] font-semibold ${msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Acciones sugeridas de Fox */}
                  {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {msg.actionSuggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendAgentChatMessage(sug)}
                            className="text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:border-orange-400 hover:text-orange-600 px-2 py-0.5 rounded-lg transition text-left"
                          >
                            💬 {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {agentChatLoading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-[#E65F2B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  🦊
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#E65F2B]" />
                  <span>Fox está pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Formulario de Input en la ventana flotante */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendAgentChatMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceListening}
                title={isVoiceListening ? "Detener micrófono" : "Hablar con Fox"}
                className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 border ${
                  isVoiceListening
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-[#E65F2B] border-slate-200'
                }`}
              >
                {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#E65F2B]" />}
              </button>

              <input
                type="text"
                value={agentInputText}
                onChange={e => setAgentInputText(e.target.value)}
                placeholder={isVoiceListening ? "🎙️ Escuchando..." : "Pregúntale a Fox..."}
                disabled={agentChatLoading}
                className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#E65F2B] text-slate-800"
              />

              <button
                type="submit"
                disabled={agentChatLoading || !agentInputText.trim()}
                className="p-2.5 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-xl text-xs flex items-center justify-center transition shadow-xs disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. MODAL BUSCADOR GLOBAL INTELIGENTE (CMD / CTRL + K)    */}
      {/* ======================================================== */}
      {showCommandPalette && (
        <div 
          onClick={() => setShowCommandPalette(false)}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            {/* Input Barra de Búsqueda */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
                placeholder="Busca productos, pedidos, clientes por nombre, teléfono o SKU..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {commandQuery && (
                <button
                  type="button"
                  onClick={() => setCommandQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block bg-white border border-slate-200 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded shadow-2xs">
                ESC
              </kbd>
            </div>

            {/* Resultados Dinámicos */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
              {(() => {
                const q = commandQuery.trim().toLowerCase();

                const matchedProducts = products.filter(p => 
                  !q || p.title.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q))
                ).slice(0, 5);

                const matchedOrders = orders.filter(o => 
                  !q || o.id.toLowerCase().includes(q) || o.clientName?.toLowerCase().includes(q) || o.clientPhone?.includes(q)
                ).slice(0, 4);

                const matchedClients = clients.filter(c => 
                  !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q)
                ).slice(0, 4);

                const hasResults = matchedProducts.length > 0 || matchedOrders.length > 0 || matchedClients.length > 0;

                if (!hasResults) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-slate-600">No se encontraron resultados para &quot;{commandQuery}&quot;</p>
                      <p className="text-[11px] text-slate-400 mt-1">Prueba con un SKU, folio de orden o número de teléfono.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Productos */}
                    {matchedProducts.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                          Productos en Catálogo ({matchedProducts.length})
                        </span>
                        <div className="space-y-1">
                          {matchedProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setCrmSubTab('inventory');
                                setSearchTerm(p.sku || p.title);
                                setShowCommandPalette(false);
                              }}
                              className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-between text-left group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0 border border-slate-200/60">
                                  {p.images?.[0] ? (
                                    <img
                                      src={getSafeAdminImageUrl(p.images[0])}
                                      alt={p.title}
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 group-hover:text-[#E65F2B] truncate">{p.title}</p>
                                  <p className="text-[11px] text-slate-400 font-semibold">SKU: {p.sku || 'Sin SKU'} • Stock: {p.stock} pzas</p>
                                </div>
                              </div>
                              <span className="font-bold font-semibold text-slate-900">${p.publicPrice.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pedidos */}
                    {matchedOrders.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                          Pedidos & Ventas ({matchedOrders.length})
                        </span>
                        <div className="space-y-1">
                          {matchedOrders.map(o => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => {
                                setCrmSubTab(o.status === 'delivered' || o.id.startsWith('FX-POS') ? 'order_history' : 'orders');
                                setShowCommandPalette(false);
                              }}
                              className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-between text-left group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 group-hover:text-[#E65F2B] font-semibold">{o.id}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{o.clientName} • {o.clientPhone}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold font-semibold text-slate-900 block">${o.total.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 capitalize">{o.status}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clientes */}
                    {matchedClients.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                          Clientes Registrados ({matchedClients.length})
                        </span>
                        <div className="space-y-1">
                          {matchedClients.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCrmSubTab('clients');
                                setSelectedClientForModal(c);
                                setShowCommandPalette(false);
                              }}
                              className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-between text-left group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-[#2D4A58] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 group-hover:text-[#E65F2B]">{c.name}</p>
                                  <p className="text-[11px] text-slate-400 font-semibold">{c.phone}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                                {c.loyaltyPoints || 0} pts
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Footer Atajos */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
              <span>Navegación instantánea en FoxDrop</span>
              <span>Presiona <strong>ESC</strong> para salir</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MODAL GENERADOR DE GUÍA DE ENVÍO / REMISIÓN IMPRIMIBLE */}
      {/* ======================================================== */}
      {shippingLabelOrder && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-[#E65F2B]" />
                <h3 className="font-bold text-sm">Etiqueta de Envío & Remisión de Empaque</h3>
              </div>
              <button
                type="button"
                onClick={() => setShippingLabelOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Imprimible (Guía / Packing Slip) */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 bg-white" id="printable-shipping-slip">
              {/* Encabezado FoxDrop */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">FOXDROP PUEBLA</h1>
                  <p className="text-[11px] text-slate-500">Comercializadora & Envíos Directos</p>
                  <p className="text-[10px] text-slate-400">Puebla, Pue. • WhatsApp: 221 216 4504</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Folio de Pedido</span>
                  <span className="text-base font-black font-semibold text-slate-900 block">{shippingLabelOrder.id}</span>
                  <span className="text-[10px] text-slate-500">{new Date(shippingLabelOrder.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Datos de Entrega / Destinatario */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Destinatario
                  </span>
                  <p className="font-bold text-sm text-slate-900">{shippingLabelOrder.clientName}</p>
                  <p className="font-semibold text-xs text-slate-700 mt-0.5">{shippingLabelOrder.clientPhone}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tipo de Entrega
                  </span>
                  <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900 text-white">
                    {(shippingLabelOrder.shippingType === 'international_shipping' || (shippingLabelOrder.notes && (shippingLabelOrder.notes.includes('[IMPORTACION') || shippingLabelOrder.notes.includes('[CJ-ORDER:')))) ? '✈️ Importación Internacional' : (shippingLabelOrder.shippingType === 'puebla_local' ? '📍 Entrega Local (Puebla)' : '📦 Paquetería Nacional')}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 capitalize">
                    Método de Pago: <strong>{shippingLabelOrder.paymentMethod}</strong>
                  </p>
                </div>

                {/* Dirección o Referencias del Pedido */}
                {(() => {
                  const o = shippingLabelOrder as any;
                  const addr = o.shippingAddress || o.address;
                  if (addr) {
                    return (
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Dirección de Entrega
                        </span>
                        <p className="text-slate-800 font-medium">
                          {[addr.street, addr.number, addr.colonia ? `Col. ${addr.colonia}` : '', addr.postalCode || addr.zip ? `C.P. ${addr.postalCode || addr.zip}` : '', addr.city, addr.state].filter(Boolean).join(', ')}
                        </p>
                        {addr.references && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">Ref: {addr.references}</p>
                        )}
                      </div>
                    );
                  }
                  if (shippingLabelOrder.pickupPoint) {
                    return (
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Punto de Entrega Acordado
                        </span>
                        <p className="text-slate-800 font-medium">📍 {shippingLabelOrder.pickupPoint}</p>
                      </div>
                    );
                  }
                  if (shippingLabelOrder.notes) {
                    return (
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Notas del Pedido / Entrega
                        </span>
                        {(() => {
                          const cleanNotes = shippingLabelOrder.notes
                            .replace(/\[IMPORTACION[^\]]*\]/g, '')
                            .replace(/\[CARD:[^\]]*\]/g, '')
                            .replace(/\[CJ-ORDER:[^\]]*\]/g, '')
                            .trim();
                          return cleanNotes ? (
                            <p className="text-slate-800 font-medium italic">{cleanNotes}</p>
                          ) : (
                            <p className="text-slate-500 font-normal">Sin notas adicionales de entrega.</p>
                          );
                        })()}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Lista de Empaque (Picking List) */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Artículos a Empacar (Picking List)
                </span>
                <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Cant</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-3 text-right">P. Unit</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {shippingLabelOrder.order_items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-900">{item.quantity}x</td>
                        <td className="py-2 px-3 font-sans text-slate-800">{item.product_title}</td>
                        <td className="py-2 px-3 text-right">${item.price_at_sale?.toFixed(2) || '0.00'}</td>
                        <td className="py-2 px-3 text-right font-bold">${((item.price_at_sale || 0) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-sans">Total del Pedido:</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-sm text-[#E65F2B]">${shippingLabelOrder.total.toFixed(2)} MXN</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notas de Empaque */}
              <div className="border-t border-dashed border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                <span>Inspeccionado y empacado por FoxDrop Team</span>
                <span>¡Gracias por tu compra!</span>
              </div>
            </div>

            {/* Footer con Botón Imprimir */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShippingLabelOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#E65F2B] hover:bg-[#D45321] text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiqueta / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL CORTE DE CAJA DIARIO (Z-REPORT)                 */}
      {/* ======================================================== */}
      {showZReportModal && (() => {
        const selectedDateOrders = orders.filter(o => {
          if (o.status === 'cancelled') return false;
          if (!o.createdAt) return false;
          const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
          return orderDate === zReportDate;
        });

        const posOrders = selectedDateOrders.filter(o => o.id.startsWith('FX-POS'));
        const onlineOrders = selectedDateOrders.filter(o => !o.id.startsWith('FX-POS'));

        const totalCash = posOrders.filter(o => o.paymentMethod === 'cash').reduce((acc, o) => acc + o.total, 0);
        const totalCard = posOrders.filter(o => o.paymentMethod === 'card').reduce((acc, o) => acc + o.total, 0);
        const totalSpei = selectedDateOrders.filter(o => o.paymentMethod === 'spei').reduce((acc, o) => acc + o.total, 0);

        const totalDayRevenue = selectedDateOrders.reduce((acc, o) => acc + o.total, 0);
        const totalDayCost = selectedDateOrders.reduce((acc, o) => {
          const orderCost = o.order_items?.reduce((cAcc, it) => cAcc + ((it.product_cost || 0) * it.quantity), 0) || 0;
          return acc + orderCost;
        }, 0);
        const totalDayProfit = totalDayRevenue - totalDayCost;

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm">Corte de Caja Diario (Z-Report)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowZReportModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Fecha */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Fecha del Corte:</span>
                <input
                  type="date"
                  value={zReportDate}
                  onChange={e => setZReportDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Métricas del Día */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Resumen Principal */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ventas del Día</span>
                    <span className="text-xl font-black text-slate-900 font-semibold">${totalDayRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{selectedDateOrders.length} transacciones</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Costo Estimado</span>
                    <span className="text-xl font-black text-slate-600 font-semibold">${totalDayCost.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Base + flete</span>
                  </div>

                  <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Utilidad Neta</span>
                    <span className="text-xl font-black text-emerald-700 font-semibold">+${totalDayProfit.toFixed(2)}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                      {totalDayRevenue > 0 ? `${((totalDayProfit / totalDayRevenue) * 100).toFixed(1)}% margen` : '0%'}
                    </span>
                  </div>
                </div>

                {/* Desglose por Método de Pago */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Desglose por Método de Cobro
                  </span>
                  <div className="space-y-1.5 font-semibold">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-sans text-slate-700 font-medium flex items-center gap-2">
                        💵 Efectivo en Mostrador (POS):
                      </span>
                      <span className="font-bold text-slate-900">${totalCash.toFixed(2)} MXN</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-sans text-slate-700 font-medium flex items-center gap-2">
                        💳 Tarjeta (Terminal POS):
                      </span>
                      <span className="font-bold text-slate-900">${totalCard.toFixed(2)} MXN</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-sans text-slate-700 font-medium flex items-center gap-2">
                        🏦 Transferencia SPEI (Web / Directo):
                      </span>
                      <span className="font-bold text-slate-900">${totalSpei.toFixed(2)} MXN</span>
                    </div>
                  </div>
                </div>

                {/* Listado de Pedidos de la fecha */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pedidos Registrados en {zReportDate} ({selectedDateOrders.length})
                  </span>
                  {selectedDateOrders.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                      No hay transacciones registradas en esta fecha.
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                      {selectedDateOrders.map(o => (
                        <div key={o.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-900">{o.id}</span>
                            <span className="text-slate-500 font-sans ml-2">{o.clientName}</span>
                          </div>
                          <span className="font-bold text-slate-900">${o.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowZReportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir Corte de Caja</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 4. MODAL DIÁLOGO DE CONFIRMACIÓN SEGURA (ESTILO SHOPIFY)  */}
      {/* ======================================================== */}
      {confirmDeleteModal.isOpen && (
        <div 
          onClick={() => setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                {confirmDeleteModal.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {confirmDeleteModal.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteModal.onConfirm}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL AJUSTE MASIVO DE STOCK                           */}
      {/* ======================================================== */}
      {showBulkStockModal && (
        <div 
          onClick={() => setShowBulkStockModal(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ajustar Stock Masivo</h3>
                  <p className="text-[11px] text-slate-500">{selectedProductIds.length} artículos seleccionados</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBulkStockModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Indica cuántas piezas deseas <strong>sumar</strong> o <strong>restar</strong> a cada uno de los artículos marcados:
              </p>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Cantidad a aplicar (delta):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bulkStockDeltaInput}
                    onChange={e => setBulkStockDeltaInput(parseInt(e.target.value) || 0)}
                    placeholder="Ej. +5 o -2"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold text-sm font-bold text-center focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Botones rápidos */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[-5, -1, 5, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBulkStockDeltaInput(val)}
                    className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkStockModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingBulkStock || bulkStockDeltaInput === 0}
                onClick={handleApplyBulkStock}
                className="py-2.5 px-4 bg-[#E65F2B] hover:bg-[#D45321] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
              >
                {savingBulkStock ? 'Aplicando...' : 'Aplicar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL IMPRESIÓN DE ETIQUETAS DE PRECIO & CÓDIGO BARRAS */}
      {/* ======================================================== */}
      {showBarcodePrintModal && (
        <div 
          onClick={() => setShowBarcodePrintModal(false)}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header y Selector de Modo de Impresión */}
            <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm">Etiquetas de Precios y Código de Barras</h3>
                  <p className="text-[11px] text-slate-400">
                    {(() => {
                      const totalCopies = barcodePrintProducts.reduce((acc, p) => acc + (barcodePrintCopiesMode === 'by_stock' ? Math.max(1, p.stock || 1) : 1), 0);
                      return `${barcodePrintProducts.length} producto(s) • ${totalCopies} etiqueta(s) a imprimir`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex text-xs">
                  <button
                    type="button"
                    onClick={() => setBarcodePrintCopiesMode('single')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      barcodePrintCopiesMode === 'single'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1 por producto
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodePrintCopiesMode('by_stock')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      barcodePrintCopiesMode === 'by_stock'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Según Stock (Piezas)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBarcodePrintModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido Imprimible de Etiquetas */}
            <div className="p-6 overflow-y-auto space-y-4 print:p-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {barcodePrintProducts.flatMap((p) => {
                  const copies = barcodePrintCopiesMode === 'by_stock' ? Math.max(1, p.stock || 1) : 1;
                  return Array.from({ length: copies }).map((_, cIdx) => ({
                    ...p,
                    copyIndex: cIdx,
                    totalCopies: copies,
                  }));
                }).map((p: any, idx) => {
                  const displaySku = p.sku || `FX-${p.id.slice(0, 8).toUpperCase()}`;
                  return (
                    <div 
                      key={`${p.id}-${p.copyIndex}-${idx}`}
                      className="border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-col justify-between items-center text-center bg-white shadow-2xs space-y-2 page-break-inside-avoid"
                    >
                      {/* Logo / Nombre Tienda */}
                      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="font-black text-[9px] tracking-wider uppercase text-slate-800">FOXDROP</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{p.category}</span>
                      </div>

                      {/* Título */}
                      <p className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                        {p.title}
                      </p>

                      {/* Código de Barras Visual Estilizado (SVG) */}
                      <div className="w-full py-1 flex flex-col items-center">
                        <svg className="w-full h-9" viewBox="0 0 160 36">
                          {/* Generación de barras simuladas estándar Code128 limpias */}
                          <rect x="5" y="0" width="3" height="36" fill="#000" />
                          <rect x="11" y="0" width="2" height="36" fill="#000" />
                          <rect x="16" y="0" width="4" height="36" fill="#000" />
                          <rect x="23" y="0" width="2" height="36" fill="#000" />
                          <rect x="28" y="0" width="5" height="36" fill="#000" />
                          <rect x="36" y="0" width="2" height="36" fill="#000" />
                          <rect x="42" y="0" width="3" height="36" fill="#000" />
                          <rect x="48" y="0" width="4" height="36" fill="#000" />
                          <rect x="55" y="0" width="2" height="36" fill="#000" />
                          <rect x="60" y="0" width="5" height="36" fill="#000" />
                          <rect x="68" y="0" width="3" height="36" fill="#000" />
                          <rect x="74" y="0" width="2" height="36" fill="#000" />
                          <rect x="79" y="0" width="4" height="36" fill="#000" />
                          <rect x="86" y="0" width="2" height="36" fill="#000" />
                          <rect x="91" y="0" width="5" height="36" fill="#000" />
                          <rect x="99" y="0" width="2" height="36" fill="#000" />
                          <rect x="104" y="0" width="4" height="36" fill="#000" />
                          <rect x="111" y="0" width="2" height="36" fill="#000" />
                          <rect x="116" y="0" width="5" height="36" fill="#000" />
                          <rect x="124" y="0" width="3" height="36" fill="#000" />
                          <rect x="130" y="0" width="2" height="36" fill="#000" />
                          <rect x="135" y="0" width="4" height="36" fill="#000" />
                          <rect x="142" y="0" width="2" height="36" fill="#000" />
                          <rect x="147" y="0" width="4" height="36" fill="#000" />
                          <rect x="154" y="0" width="2" height="36" fill="#000" />
                        </svg>
                        <span className="font-semibold text-[9px] font-bold text-slate-600 tracking-widest mt-0.5">
                          {displaySku}
                        </span>
                      </div>

                      {/* Precio */}
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">PRECIO:</span>
                        <span className="text-sm font-black text-slate-900 font-semibold">
                          ${p.publicPrice.toFixed(2)} MXN
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer con botón imprimir */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBarcodePrintModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas (Térmica / Carta)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
