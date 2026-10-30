'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  Check, 
  ArrowRight, 
  SlidersHorizontal, 
  X, 
  ShoppingBag, 
  Flame, 
  ShieldCheck, 
  AlertCircle,
  Truck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  Maximize2,
  Heart,
  Share2,
  Package,
  Zap,
  Star,
  Award,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Loader2,
  Lock,
  MessageSquare
} from 'lucide-react';
import { fetchAdminApi, getWishlistChannelForUser, isSellerJapanUser } from '@/lib/adminAuth';
import { Product } from '@/types';

export interface RakutenItem {
  itemCode: string;
  itemName: string;
  itemNameEs?: string;
  catchcopy: string;
  caption: string;
  priceJpy: number;
  baseCostMxn: number;
  estimatedShippingMxn: number;
  totalCostMxn: number;
  suggestedPublicPrice: number;
  images: string[];
  shopName: string;
  shopCode?: string;
  shopUrl: string;
  itemUrl: string;
  affiliateUrl: string;
  availability: boolean;
  reviewAverage: number;
  reviewCount: number;
  shopOfTheYear?: boolean;
  asurakuFastShipping?: boolean;
  freeJapanShipping?: boolean;
}

export interface JapanWishlistItem extends RakutenItem {
  addedBy?: string;
  addedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

interface Props {
  existingProducts?: Product[];
  currentUserEmail?: string;
  currentUserRole?: string;
  onProductImported?: () => void;
}

const getSafeJapanImageUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '/no-image.svg';
  let clean = url.trim();
  if (clean.startsWith('/api/whatsapp/image-proxy') || clean.startsWith('data:') || clean.startsWith('/')) return clean;
  if (clean.startsWith('//')) clean = 'https:' + clean;
  if (!clean.startsWith('http')) return '/no-image.svg';
  // Redimensionar imagen de Rakuten a 500x500 si tiene _ex=
  if (clean.includes('_ex=')) {
    clean = clean.replace(/_ex=\d+x\d+/, '_ex=500x500');
  }
  // Pasar por proxy para garantizar que ningún navegador ni política de referer la bloquee
  return `/api/whatsapp/image-proxy?url=${encodeURIComponent(clean)}`;
};

const JAPAN_CANDY_FILTERS = [
  { label: '🍬 Todos los Dulces & Snacks', query: 'お菓子 詰め合わせ' },
  { label: '🍫 KitKat & Chocolates Japón', query: 'キットカット 日本' },
  { label: '🍓 Gomitas & Frutales (Gummy)', query: '日本 グミ 果実' },
  { label: '🍡 Dulces Tradicionales (Wagashi)', query: '和菓子 ギフト' },
  { label: '📦 Cajas Variadas (Dagashi / Surtido)', query: '駄菓子 詰め合わせ 大量' },
  { label: '🍘 Senbei & Galletas de Arroz', query: 'せんべい 詰め合わせ' },
  { label: '🍵 Dulces de Matcha & Té Verde', query: '抹茶 スイーツ お菓子' },
  { label: '✨ Poki & Palitos Pocky Japón', query: 'ポッキー 日本' },
];

const QUICK_JAPAN_TAGS = [
  { label: '🔥 Tendencias & Más Vendidos', query: 'ランキング 人気' },
  { label: '🍬 Dulces & Snacks Japoneses', query: 'お菓子 詰め合わせ' },
  { label: '⚡ Pokémon TCG & Merch', query: 'pokemon card box' },
  { label: '🍫 KitKat Edición Japón', query: 'キットカット 日本' },
  { label: '🍓 Gomitas Japonesas (Gummy)', query: '日本 グミ 果実' },
  { label: '🍡 Dulces Tradicionales (Wagashi)', query: '和菓子 ギフト' },
  { label: '🏴‍☠️ One Piece Figuras', query: 'one piece grandista figure' },
  { label: '🌸 Sanrio & Hello Kitty', query: 'sanrio plush' },
  { label: '🍵 Té Matcha Ceremonial', query: 'matcha powder uji' },
  { label: '👼 Sonny Angel', query: 'sonny angel mini figure' },
  { label: '🐉 Dragon Ball Z', query: 'dragon ball figure masterlise' },
  { label: '✨ Studio Ghibli', query: 'ghibli totoro' },
  { label: '🎮 Nintendo & Retro', query: 'nintendo switch japan' },
  { label: '💄 Skincare & J-Beauty', query: 'hada labo premium' },
];

export default function AdminJapanTab({ existingProducts = [], currentUserEmail, currentUserRole, onProductImported }: Props) {
  // Detectar canal de Wishlist y rol de vendedora
  const isSeller = isSellerJapanUser(currentUserEmail, currentUserRole);
  const userChannel = getWishlistChannelForUser(currentUserEmail);

  // Conmutador de modo: 'catalog' vs 'wishlist' (Igual que CJ Dropshipping)
  const [japanViewMode, setJapanViewMode] = useState<'catalog' | 'wishlist'>('catalog');

  // Si es Super Admin (Mario), permite alternar entre el canal de Vero y el canal de Nydia
  const [selectedChannel, setSelectedChannel] = useState<'vero' | 'nydia'>(() => {
    if (userChannel === 'nydia') return 'nydia';
    return 'vero';
  });

  // Estados de Wishlist compartida
  const [wishlist, setWishlist] = useState<JapanWishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [wishlistFilter, setWishlistFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingNoteCode, setEditingNoteCode] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('ランキング 人気');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RakutenItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  // Filtros de Calidad y Proveedores
  const [sortOrder, setSortOrder] = useState<string>('-reviewCount'); // Más vendidos / más populares por default
  const [verifiedShopOnly, setVerifiedShopOnly] = useState(false); // Shop Of The Year
  const [fastShipOnly, setFastShipOnly] = useState(false); // Asuraku (<24h despacho)
  const [hasReviewsOnly, setHasReviewsOnly] = useState(false); // Calificaciones > 4 estrellas

  // Modal Vista Previa en Grande (Estilo CJ Dropshipping)
  const [previewItem, setPreviewItem] = useState<RakutenItem | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string>('');
  const [previewMarginMult, setPreviewMarginMult] = useState<number>(1.35); // 35% margen
  const [copiedShare, setCopiedShare] = useState(false);

  // Modal de importación y traducción Gemini
  const [selectedItem, setSelectedItem] = useState<RakutenItem | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState<{
    title: string;
    description: string;
    category: string;
  } | null>(null);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customShipping, setCustomShipping] = useState<number>(120);
  const [customStock, setCustomStock] = useState<number>(20);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Cargar Wishlist privada desde backend según canal activo
  const loadWishlist = async (targetChannel?: 'vero' | 'nydia') => {
    const channelToLoad = targetChannel || (userChannel === 'both' ? selectedChannel : (userChannel || 'vero'));
    setLoadingWishlist(true);
    try {
      const res = await fetchAdminApi({
        endpoint: '/api/admin/rakuten',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_wishlist',
          channel: channelToLoad,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.wishlist)) {
          setWishlist(data.wishlist);
        }
      }
    } catch (err) {
      console.warn('Aviso cargando Wishlist de Japón:', err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Guardar Wishlist en backend
  const persistWishlist = async (updated: JapanWishlistItem[], targetChannel?: 'vero' | 'nydia') => {
    const channelToSave = targetChannel || (userChannel === 'both' ? selectedChannel : (userChannel || 'vero'));
    setWishlist(updated);
    try {
      await fetchAdminApi({
        endpoint: '/api/admin/rakuten',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_wishlist',
          channel: channelToSave,
          wishlist: updated,
        }),
      });
    } catch (err) {
      console.warn('Aviso guardando Wishlist de Japón:', err);
    }
  };

  // Agregar o retirar de la Wishlist
  const handleToggleWishlist = async (item: RakutenItem) => {
    const exists = wishlist.some(w => w.itemCode === item.itemCode);
    let updated: JapanWishlistItem[];
    if (exists) {
      updated = wishlist.filter(w => w.itemCode !== item.itemCode);
    } else {
      const newItem: JapanWishlistItem = {
        ...item,
        addedBy: currentUserEmail || (isSeller ? 'Veronica' : 'Administración'),
        addedAt: new Date().toISOString(),
        status: 'pending',
      };
      updated = [newItem, ...wishlist];
    }
    await persistWishlist(updated);
  };

  const handleUpdateWishlistStatus = async (itemCode: string, status: 'approved' | 'rejected' | 'pending') => {
    const updated = wishlist.map(w => w.itemCode === itemCode ? { ...w, status } : w);
    await persistWishlist(updated);
  };

  const handleRemoveFromWishlist = async (itemCode: string) => {
    const updated = wishlist.filter(w => w.itemCode !== itemCode);
    await persistWishlist(updated);
  };

  const handleSaveItemNote = async (itemCode: string) => {
    const updated = wishlist.map(w => w.itemCode === itemCode ? { ...w, note: noteInput.trim() } : w);
    await persistWishlist(updated);
    setEditingNoteCode(null);
    setNoteInput('');
  };

  const isItemInWishlist = (itemCode: string): boolean => {
    return wishlist.some(w => w.itemCode === itemCode);
  };

  // Buscar en Rakuten
  const handleSearch = async (
    targetQuery = searchQuery, 
    targetPage = 1,
    currentSort = sortOrder,
    currentVerified = verifiedShopOnly,
    currentFast = fastShipOnly,
    currentReviews = hasReviewsOnly
  ) => {
    setLoading(true);
    setSearchQuery(targetQuery);
    setPage(targetPage);

    try {
      let endpoint = `/api/admin/rakuten?q=${encodeURIComponent(targetQuery)}&page=${targetPage}&hits=24&sort=${encodeURIComponent(currentSort)}`;
      if (currentVerified) endpoint += `&shopOfTheYearFlag=1`;
      if (currentFast) endpoint += `&asurakuFlag=1`;
      if (currentReviews) endpoint += `&hasReviewFlag=1`;

      const res = await fetchAdminApi({
        endpoint,
        method: 'GET',
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalCount(data.count || 0);
        setPageCount(data.pageCount || 1);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al consultar catálogo de Japón');
      }
    } catch (err: any) {
      console.error('Error buscando en Rakuten:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('ランキング 人気', 1, '-reviewCount');
    loadWishlist();
  }, []);

  // Recargar wishlist cuando el Super Admin cambia de canal
  useEffect(() => {
    if (userChannel === 'both') {
      loadWishlist(selectedChannel);
    }
  }, [selectedChannel]);

  // Abrir Vista Previa en Grande estilo CJ
  const handleOpenPreview = (item: RakutenItem) => {
    setPreviewItem(item);
    setSelectedPreviewImage(item.images[0] || '');
    setPreviewMarginMult(1.35);
  };

  // Abrir modal de importación con traducción Gemini
  const handleOpenImportModal = async (item: RakutenItem) => {
    setSelectedItem(item);
    setCustomPrice(item.suggestedPublicPrice);
    setCustomShipping(item.estimatedShippingMxn);
    setSelectedImages(item.images.slice(0, 6));
    setTranslating(true);
    setTranslatedData(null);

    try {
      const res = await fetchAdminApi({
        endpoint: '/api/admin/rakuten',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          title: item.itemName,
          caption: item.caption,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTranslatedData({
          title: data.title,
          description: data.description,
          category: data.category || 'Figuras & Coleccionables',
        });
      }
    } catch (err) {
      console.error('Error traduciendo con Gemini:', err);
    } finally {
      setTranslating(false);
    }
  };

  // Confirmar importación
  const handleConfirmImport = async () => {
    if (!selectedItem || !translatedData) return;
    setImporting(true);

    try {
      const res = await fetchAdminApi({
        endpoint: '/api/admin/rakuten',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          itemCode: selectedItem.itemCode,
          title: translatedData.title,
          description: translatedData.description,
          categoryName: translatedData.category,
          priceJpy: selectedItem.priceJpy,
          baseCostMxn: selectedItem.baseCostMxn,
          shippingCostMxn: customShipping,
          publicPrice: customPrice,
          stock: customStock,
          images: selectedImages,
          rakutenUrl: selectedItem.itemUrl,
          shopName: selectedItem.shopName,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessNotice(`¡Producto de Japón importado con éxito: ${translatedData.title}!`);
        setSelectedItem(null);
        if (onProductImported) onProductImported();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al importar producto');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setImporting(false);
    }
  };

  // Saber si un producto ya fue importado
  const isAlreadyImported = (itemCode: string) => {
    const clean = itemCode.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    return existingProducts.some(p => p.sku && p.sku.includes(clean));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL ESTILO JAPÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-red-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-2xl shadow-lg shadow-red-600/30 shrink-0">
            🎌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Catálogo Oficial Japón (Rakuten Ichiba)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                En Vivo Tokio
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Explora más de 200 millones de productos de las tiendas oficiales de Japón. Filtra por los mejores proveedores de calidad y abre cualquier artículo en grande para ver detalles exactos e importar con traducción de IA a FoxDrop.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Tipo de Cambio</span>
            <span className="text-xs font-black text-rose-300 font-mono">1 MXN ≈ 8.35 JPY</span>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{successNotice}</span>
        </div>
      )}

      {/* SELECTOR DE MODO: EXPLORAR CATÁLOGO TOKIO VS WISHLIST COMPARTIDA (IDÉNTICO A CJ) */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setJapanViewMode('catalog')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            japanViewMode === 'catalog'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Explorar Catálogo Tokio</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setJapanViewMode('wishlist');
            loadWishlist();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer relative ${
            japanViewMode === 'wishlist'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>
            {isSeller ? '❤️ Mi Wishlist con Mario (Preselección)' : '❤️ Wishlist Preselección Japón'}
          </span>
          {wishlist.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              japanViewMode === 'wishlist' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
            }`}>
              {wishlist.length}
            </span>
          )}
        </button>
      </div>

      {/* CONTENIDO CONDICIONAL: VISTA DE WISHLIST COMPARTIDA VS VISTA DE CATÁLOGO */}
      {japanViewMode === 'wishlist' ? (
        <div className="space-y-6">
          {/* HEADER DE WISHLIST & SELECTOR DE CANALES PARA SUPER ADMIN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span>
                  {isSeller
                    ? 'Mesa de Trabajo Privada: Vero & Mario'
                    : userChannel === 'both'
                    ? (selectedChannel === 'vero' ? 'Mesa Privada: Vero & Mario' : 'Mesa Privada: Nydia & Mario')
                    : 'Mesa de Trabajo Privada'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isSeller
                  ? 'Aquí guardas los productos de Japón marcados con corazón para que Mario los revise y los publique.'
                  : 'Productos preseleccionados de Japón para votar, anotar detalles y decidir qué importar.'}
              </p>
            </div>

            {/* CONMUTADOR DE CANALES EXCLUSIVO PARA SUPER ADMIN (MARIO) */}
            {userChannel === 'both' && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('vero')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    selectedChannel === 'vero'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>🦊 Mesa Vero</span>
                  {selectedChannel === 'vero' && (
                    <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.2 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('nydia')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    selectedChannel === 'nydia'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>🌸 Mesa Nydia</span>
                  {selectedChannel === 'nydia' && (
                    <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.2 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* FILTROS DE ESTADO (TODOS, PENDIENTES, APROBADOS, DESCARTADOS) */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 text-xs font-bold">
              {[
                { id: 'all', label: `Todos (${wishlist.length})` },
                { id: 'pending', label: `Pendientes (${wishlist.filter(w => w.status === 'pending').length})` },
                { id: 'approved', label: `Aprobados (${wishlist.filter(w => w.status === 'approved').length})` },
                { id: 'rejected', label: `Descartados (${wishlist.filter(w => w.status === 'rejected').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setWishlistFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    wishlistFilter === f.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE TARJETAS DE LA WISHLIST */}
          {loadingWishlist ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Cargando Wishlist de Japón...</p>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Heart className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Esta Wishlist está vacía</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Explora el catálogo de Japón y presiona el botón de <strong>Corazón</strong> en cualquier producto para guardarlo aquí y revisarlo juntos.
              </p>
              <button
                type="button"
                onClick={() => setJapanViewMode('catalog')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Explorar Catálogo Tokio</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wishlist
                .filter(w => wishlistFilter === 'all' || w.status === wishlistFilter)
                .map(item => {
                  const isImported = isAlreadyImported(item.itemCode);

                  return (
                    <div
                      key={item.itemCode}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                        item.status === 'approved'
                          ? 'border-emerald-300 ring-2 ring-emerald-100 bg-emerald-50/10'
                          : item.status === 'rejected'
                          ? 'border-rose-200 bg-rose-50/10 opacity-75'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* FOTO, BADGES Y BORRAR */}
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative group">
                          <img
                            src={getSafeJapanImageUrl(item.images[0])}
                            alt={item.itemName}
                            className="w-full h-full object-contain transition duration-300 group-hover:scale-105 cursor-pointer"
                            onClick={() => handleOpenPreview(item)}
                          />
                          <span className={`absolute top-2 left-2 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                            item.status === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : item.status === 'rejected'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {item.status === 'approved' ? '✓ Aprobado' : item.status === 'rejected' ? '✕ Descartado' : '⏳ Pendiente'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromWishlist(item.itemCode)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition cursor-pointer"
                            title="Quitar de Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* TÍTULO */}
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200/80 text-[10px] font-bold text-red-900">
                            <span>🎌 {item.shopName}</span>
                          </div>
                          <h4
                            onClick={() => handleOpenPreview(item)}
                            className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight hover:text-red-600 cursor-pointer"
                            title={item.itemName}
                          >
                            {item.itemNameEs || item.itemName}
                          </h4>
                        </div>

                        {/* COSTOS (SEGUN ROL) */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 space-y-1 text-[11px] border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Costo Japón:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              ¥{item.priceJpy.toLocaleString()} (~${item.baseCostMxn} MXN)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Flete aéreo:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              +${item.estimatedShippingMxn} MXN
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-red-700 font-bold border-t border-slate-200 dark:border-slate-700 pt-1">
                            <span>Costo Total:</span>
                            <span className="font-black">${item.totalCostMxn} MXN</span>
                          </div>

                          {/* SOLO PARA ADMINS (NO VENDEDORA VERO): PRECIO PÚBLICO Y GANANCIA */}
                          {!isSeller && (
                            <>
                              <div className="flex items-center justify-between text-indigo-700 font-bold">
                                <span>Venta sugerida:</span>
                                <span className="font-semibold">${item.suggestedPublicPrice} MXN</span>
                              </div>
                              <div className="flex items-center justify-between text-emerald-600 font-black text-[10px] pt-1 border-t border-slate-200/60">
                                <span>Ganancia libre:</span>
                                <span>+${Math.max(0, item.suggestedPublicPrice - item.totalCostMxn)} MXN</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* NOTA INTERNA COLABORATIVA */}
                        <div className="pt-1">
                          {editingNoteCode === item.itemCode ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                autoFocus
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                placeholder="Escribe un comentario..."
                                className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteCode(null)}
                                  className="px-2 py-0.5 text-[10px] text-slate-400"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveItemNote(item.itemCode)}
                                  className="px-2 py-0.5 text-[10px] bg-red-600 text-white font-bold rounded"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingNoteCode(item.itemCode);
                                setNoteInput(item.note || '');
                              }}
                              className="text-[11px] p-2 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 rounded-lg cursor-pointer hover:border-amber-400 text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1"
                              title="Clic para editar nota"
                            >
                              <span className="italic truncate">{item.note || '+ Agregar nota o comentario...'}</span>
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* VOTACIÓN Y ACCIONES */}
                      <div className="pt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 mt-3">
                        {/* BOTONES DE APROBACIÓN (DISPONIBLES PARA AMBOS O PRINCIPALMENTE MARIO) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'approved')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                              item.status === 'approved'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'rejected')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                              item.status === 'rejected'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>
                        </div>

                        {/* BOTÓN IMPORTAR (SOLO PARA ADMINS, OCULTO PARA VERO) */}
                        {!isSeller && (
                          isImported ? (
                            <div className="w-full py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              <span>Ya publicado en FoxDrop</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenImportModal(item)}
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Importar a Tienda</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* BARRA DE BÚSQUEDA Y TAGS RÁPIDOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery, 1); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en Japón por nombre en español, inglés o japonés (ej. One Piece, Matcha, Sonny Angel, Pokemon 151)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-red-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Buscar en Japón</span>
          </button>
        </form>

        {/* ETIQUETAS DE ACCESO RÁPIDO */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-red-500" /> Tendencias:
          </span>
          {QUICK_JAPAN_TAGS.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSearch(tag.query, 1)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer border ${
                searchQuery === tag.query
                  ? 'bg-red-500 text-white border-red-500 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700 hover:border-red-400 hover:text-red-500'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* FILTROS ESPECÍFICOS DE DULCES & SNACKS JAPONESES */}
        <div className="p-3 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <span>🍬 Especial de Dulces & Confitería Japonesa:</span>
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
              Directo de Tokio, Kioto y Osaka
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {JAPAN_CANDY_FILTERS.map((candy, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSearch(candy.query, 1)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  searchQuery === candy.query
                    ? 'bg-gradient-to-r from-amber-500 to-[#E65F2B] text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-amber-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50'
                }`}
              >
                {candy.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTROS AVANZADOS DE PROVEEDORES Y CALIDAD DE JAPÓN (IGUAL QUE EN CJ) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700 dark:text-slate-200">Filtros de Calidad y Fiabilidad en Tokio:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tienda del Año / Proveedor Oficial Auditado */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !verifiedShopOnly;
                setVerifiedShopOnly(nextVal);
                handleSearch(searchQuery, 1, sortOrder, nextVal, fastShipOnly, hasReviewsOnly);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                verifiedShopOnly
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Filtra tiendas premiadas 'Shop of the Year' con máxima reputación oficial en Japón"
            >
              <Award className="w-3.5 h-3.5" />
              <span>🏆 Tiendas Oficiales (Shop of the Year)</span>
              {verifiedShopOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Asuraku / Despacho Inmediato (<24h) */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !fastShipOnly;
                setFastShipOnly(nextVal);
                handleSearch(searchQuery, 1, sortOrder, verifiedShopOnly, nextVal, hasReviewsOnly);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                fastShipOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Artículos con envío express prioritario dentro de Japón"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ Despacho Rápido Japón (Asuraku)</span>
              {fastShipOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Mejor Calificados (Con Opiniones) */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !hasReviewsOnly;
                setHasReviewsOnly(nextVal);
                handleSearch(searchQuery, 1, sortOrder, verifiedShopOnly, fastShipOnly, nextVal);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                hasReviewsOnly
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Filtra productos que cuentan con calificaciones verificadas de compradores japoneses"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>⭐ Con Reseñas de Clientes</span>
              {hasReviewsOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Ordenamiento */}
            <select
              value={sortOrder}
              onChange={(e) => {
                const nextSort = e.target.value;
                setSortOrder(nextSort);
                handleSearch(searchQuery, 1, nextSort, verifiedShopOnly, fastShipOnly, hasReviewsOnly);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="standard">🎯 Relevancia Estándar</option>
              <option value="-reviewCount">🔥 Más Vendidos / Más Reseñas</option>
              <option value="+itemPrice">💵 Precio: Menor a Mayor</option>
              <option value="-itemPrice">💎 Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Se encontraron <strong className="text-slate-900 dark:text-white">{totalCount.toLocaleString('es-MX')}</strong> productos disponibles en Japón
        </span>
        <span>Página {page} de {pageCount}</span>
      </div>

      {/* GRILLA DE PRODUCTOS JAPONESES (CLIC EN LA IMAGEN ABRE VISTA COMPLETA EN GRANDE) */}
      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-xs font-semibold">Consultando inventario en los servidores de Tokio...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="min-h-[350px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center">
          <span className="text-4xl mb-2">🏯</span>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">No se encontraron productos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Prueba buscando con palabras en inglés como "figure", "plush", "card", o selecciona una de las etiquetas rápidas de arriba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => {
            const already = isAlreadyImported(item.itemCode);

            return (
              <div
                key={item.itemCode}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-red-500/40 transition group p-3"
              >
                <div className="space-y-2">
                  {/* FOTO DEL PRODUCTO (CLIC PARA ABRIR EN GRANDE ESTILO CJ) */}
                  <div 
                    onClick={() => handleOpenPreview(item)}
                    className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center group cursor-pointer"
                    title="Clic para ver fotos en grande y detalle del proveedor"
                  >
                    <img
                      src={getSafeJapanImageUrl(item.images[0])}
                      alt={item.itemNameEs || item.itemName}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                    />

                    {/* BADGE PAÍS & PRECIO JPY */}
                    <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10">
                      🇯🇵 ¥{item.priceJpy.toLocaleString()} JPY
                    </span>

                    {/* BOTÓN DE CORAZÓN / WISHLIST RÁPIDO */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(item);
                      }}
                      className={`absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-md transition z-20 cursor-pointer shadow-xs ${
                        isItemInWishlist(item.itemCode)
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-black/50 text-white hover:bg-rose-500 hover:text-white'
                      }`}
                      title={isItemInWishlist(item.itemCode) ? 'Quitar de mi Wishlist' : 'Guardar en mi Wishlist'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isItemInWishlist(item.itemCode) ? 'fill-current' : ''}`} />
                    </button>

                    {/* BADGES DE CALIDAD PROVEEDOR */}
                    <div className="absolute bottom-1.5 left-1.5 z-10 flex flex-wrap gap-1">
                      {item.shopOfTheYear && (
                        <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                          <Award className="w-2.5 h-2.5" />
                          <span>Oficial</span>
                        </span>
                      )}
                      {item.asurakuFastShipping && (
                        <span className="bg-amber-500/95 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>&lt;24h</span>
                        </span>
                      )}
                    </div>

                    {already && !isSeller && (
                      <span className="absolute bottom-1.5 right-1.5 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs z-10">
                        ✓ En Tienda
                      </span>
                    )}

                    {/* OVERLAY INDICADOR DE ZOOM */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                      <Maximize2 className="w-4 h-4 text-white" />
                      <span>Ver en grande</span>
                    </div>
                  </div>

                  {/* INFO Y TÍTULO TRADUCIDO */}
                  <div>
                    <h3 
                      onClick={() => handleOpenPreview(item)}
                      className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-red-500 transition cursor-pointer" 
                      title={item.itemName}
                    >
                      {item.itemNameEs || item.itemName}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="truncate max-w-[110px]" title={item.shopName}>🏪 {item.shopName}</span>
                      {item.reviewCount > 0 && (
                        <span className="font-bold text-amber-500 flex items-center gap-0.5">
                          ★ {item.reviewAverage ? item.reviewAverage.toFixed(1) : '5.0'} ({item.reviewCount})
                        </span>
                      )}
                    </div>

                    {/* COSTEO Y PRECIO (RESTRICTO PARA VENDEDORA) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Costo MXN:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">${item.baseCostMxn}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Flete Aéreo:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">+${item.estimatedShippingMxn}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-red-700 font-bold">Costo Total:</span>
                        <span className="font-black text-red-700 font-mono">${item.totalCostMxn}</span>
                      </div>

                      {/* SOLO PARA ADMIN GENERAL (NO PARA VERO) */}
                      {!isSeller && (
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-slate-500 font-semibold">Venta Sug:</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">${item.suggestedPublicPrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTÓN INFERIOR: IMPORTAR PARA ADMIN / VER DETALLE Y PRESELECCIONAR PARA VERO */}
                <div className="pt-3">
                  {isSeller ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(item)}
                      className="w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Fotos & Detalle</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenImportModal(item)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        already
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{already ? 'Reimportar' : 'Importar a FoxDrop'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINACIÓN */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => handleSearch(searchQuery, page - 1)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs font-bold text-slate-500">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => handleSearch(searchQuery, page + 1)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL VISTA PREVIA EN GRANDE (RÉPLICA EXACTA DE CJ DROPSHIPPING)               */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {previewItem && (
        <div 
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 cursor-default"
          >
            {/* CABECERA MODAL */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/90">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Catálogo Oficial Rakuten Japón 🎌
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate" title={previewItem.itemName}>
                  {previewItem.itemNameEs || previewItem.itemName}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border bg-white text-slate-700 border-slate-200 hover:text-red-600 hover:border-red-300"
                  title="Abrir publicación original en Rakuten Tokio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver en Rakuten</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* COLUMNA IZQUIERDA: GALERÍA DE FOTOS EN ALTA RESOLUCIÓN */}
              <div className="space-y-3">
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative flex items-center justify-center shadow-inner">
                  <img
                    src={getSafeJapanImageUrl(selectedPreviewImage || previewItem.images[0])}
                    alt={previewItem.itemName}
                    className="w-full h-full object-contain transition duration-200"
                  />
                </div>

                {/* MINIATURAS HD DE JAPÓN */}
                {previewItem.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {previewItem.images.map((img, idx) => {
                      const isSelected = (selectedPreviewImage || previewItem.images[0]) === img;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPreviewImage(img)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer bg-white ${
                            isSelected
                              ? 'border-red-600 ring-2 ring-red-200'
                              : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={getSafeJapanImageUrl(img)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA: DATOS DEL PROVEEDOR, COSTOS Y DESGLOSE FINANCIERO */}
              <div className="space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* BADGES Y REPUTACIÓN DEL PROVEEDOR EN TOKIO */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">
                        Proveedor Oficial en Japón:
                      </span>
                      {previewItem.shopOfTheYear ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <Award className="w-3 h-3" /> Shop of the Year (Auditoría Máxima)
                        </span>
                      ) : (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Tienda Verificada Rakuten
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">🏪 {previewItem.shopName}</span>
                      <span className="text-amber-500 font-black">
                        ★ {previewItem.reviewAverage > 0 ? previewItem.reviewAverage.toFixed(2) : '5.0'} / 5.0 ({previewItem.reviewCount} opiniones)
                      </span>
                    </div>
                  </div>

                  {/* DESGLOSE MATEMÁTICO PASO A PASO */}
                  {(() => {
                    const priceJpy = previewItem.priceJpy;
                    const costMxn = previewItem.baseCostMxn;
                    const estimatedFreightMxn = previewItem.estimatedShippingMxn;
                    const totalLandedMxn = costMxn + estimatedFreightMxn;

                    const launchSale = Math.max(149, Math.round(totalLandedMxn * 1.25));
                    const standardSale = Math.max(149, Math.round(totalLandedMxn * 1.35));
                    const highSale = Math.max(149, Math.round(totalLandedMxn * 1.50));

                    const currentSale = Math.max(149, Math.round(totalLandedMxn * previewMarginMult));
                    const netProfit = currentSale - totalLandedMxn;
                    const marginPercent = Math.round((previewMarginMult - 1) * 100);

                    return (
                      <div className="p-4 rounded-2xl border bg-gradient-to-br from-red-50/60 to-slate-50 border-red-200/90 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">
                            Cálculo Exacto Paso a Paso (Tipo de Cambio: 1 MXN ≈ 8.35 JPY)
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            Inventario Original Japón
                          </span>
                        </div>

                        {/* PASO A: COSTO EN JAPÓN */}
                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <span><strong>A)</strong> Costo Tienda Japón:</span>
                          <span className="font-black text-slate-900 font-mono">
                            ¥{priceJpy.toLocaleString()} JPY = <span className="text-red-700 font-bold">${costMxn} MXN</span>
                          </span>
                        </div>

                        {/* PASO B: FLETE INTERNACIONAL */}
                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <span><strong>B)</strong> Flete Aéreo Japón ➔ México (Asegurado):</span>
                          <span className="font-black text-slate-900 font-mono">
                            +${estimatedFreightMxn} MXN
                          </span>
                        </div>

                        {/* PASO C: COSTO TOTAL */}
                        <div className="flex items-center justify-between text-xs text-slate-900 font-black bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                          <span><strong>C) Costo Total (A + B):</strong></span>
                          <span className="text-red-700 text-sm font-mono font-black">${totalLandedMxn} MXN</span>
                        </div>

                        {/* SI ES VENDEDORA (VERO): TODO LO DEMÁS QUEDA OCULTO */}
                        {!isSeller && (
                          <>
                            {/* SELECTOR DE MARGEN PARA COMPARAR EN VIVO */}
                            <div className="pt-1 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-600 block">
                                <strong>D) Elige el margen para comparar el precio final:</strong>
                              </span>
                              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setPreviewMarginMult(1.25)}
                                  className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                    previewMarginMult === 1.25
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  🔥 +25% (${launchSale})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewMarginMult(1.35)}
                                  className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                    previewMarginMult === 1.35
                                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                      : 'bg-white hover:bg-red-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  ⚖️ +35% (${standardSale})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewMarginMult(1.50)}
                                  className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                    previewMarginMult === 1.50
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                      : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  💎 +50% (${highSale})
                                </button>
                              </div>
                            </div>

                            {/* PRECIO FINAL FOXDROP */}
                            <div className="flex items-center justify-between text-xs text-red-900 font-bold border-t border-slate-200 pt-2">
                              <div>
                                <span className="block text-slate-900 font-black">Precio Final Sugerido en FoxDrop:</span>
                                <span className="text-[10px] font-medium text-slate-500">
                                  ${totalLandedMxn} Costo Total × {previewMarginMult.toFixed(2)} (+{marginPercent}% margen)
                                </span>
                              </div>
                              <span className="text-xl font-black text-red-700 font-mono">
                                ${currentSale.toLocaleString('es-MX')} MXN
                              </span>
                            </div>

                            {/* UTILIDAD ESTIMADA */}
                            <div className="text-[11px] text-emerald-900 font-bold flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                              <div>
                                <span className="block">Tu Ganancia Libre Estimada:</span>
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  ${currentSale} Venta − ${totalLandedMxn} Costo Total
                                </span>
                              </div>
                              <span className="font-black text-sm text-emerald-700 font-mono">
                                +${netProfit.toLocaleString('es-MX')} MXN
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                          <span>Tiempo de Entrega al Cliente en México:</span>
                          <span className="font-black text-slate-900">
                            ✈️ 10 a 15 Días Hábiles (Importación Express)
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FICHA TÉCNICA DEL PRODUCTO JAPONÉS */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block">Ficha Oficial del Proveedor:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold">Código Japón:</span>
                        <span className="font-black text-slate-900 break-all">{previewItem.itemCode}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold">Disponibilidad en Bodega:</span>
                        <span className="font-black text-emerald-700">✓ En Existencia Tokio</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÓN DE ACCIÓN: GUARDAR EN WISHLIST (VERO) O IMPORTAR A TIENDA (ADMIN) */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleToggleWishlist(previewItem);
                    }}
                    className={`px-4 py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isItemInWishlist(previewItem.itemCode)
                        ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isItemInWishlist(previewItem.itemCode) ? 'fill-current text-rose-600' : ''}`} />
                    <span>{isItemInWishlist(previewItem.itemCode) ? 'Quitar de Wishlist' : 'Guardar en Wishlist'}</span>
                  </button>

                  {!isSeller && (
                    <button
                      type="button"
                      onClick={() => {
                        const item = previewItem;
                        setPreviewItem(null);
                        handleOpenImportModal(item);
                      }}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Importar este producto a FoxDrop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL CONFIGURAR PRECIO Y PUBLICAR CON TRADUCCIÓN GEMINI                       */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎌</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Importador de Japón a FoxDrop
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Traducción con Gemini IA & Cálculo de Margen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-300"
              >
                ✕
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {translating ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <Sparkles className="w-8 h-8 animate-spin text-red-500" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Traduciendo ficha de Japón con Gemini IA...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Adaptando al español mexicano comercial y clasificando categoría.
                  </p>
                </div>
              ) : translatedData ? (
                <>
                  {/* FOTOS SELECTOR */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fotografías HD desde Japón (Seleccionadas: {selectedImages.length})
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedItem.images.map((img, i) => {
                        const isSel = selectedImages.includes(img);
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              if (isSel) setSelectedImages(selectedImages.filter(x => x !== img));
                              else setSelectedImages([...selectedImages, img]);
                            }}
                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer relative bg-slate-100 ${
                              isSel ? 'border-red-500 shadow-md' : 'border-transparent opacity-50'
                            }`}
                          >
                            <img src={getSafeJapanImageUrl(img)} alt="" className="w-full h-full object-cover" />
                            {isSel && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TÍTULO EDITABLE */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título en Español FoxDrop:
                    </label>
                    <input
                      type="text"
                      value={translatedData.title}
                      onChange={(e) => setTranslatedData({ ...translatedData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                      Original Japón: {selectedItem.itemName}
                    </span>
                  </div>

                  {/* CATEGORÍA */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Categoría en Tienda:
                    </label>
                    <input
                      type="text"
                      value={translatedData.category}
                      onChange={(e) => setTranslatedData({ ...translatedData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* PRECIOS Y COSTOS */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Costo Producto Japón</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white font-mono">
                        ${selectedItem.baseCostMxn} MXN
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">¥{selectedItem.priceJpy} JPY</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Flete Int. Estimado</label>
                      <input
                        type="number"
                        value={customShipping}
                        onChange={(e) => setCustomShipping(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 font-mono font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 mb-0.5">Precio de Venta</label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 font-mono font-black text-emerald-600 text-xs"
                      />
                    </div>
                  </div>

                  {/* MARGEN LIBRE */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                    <span>Tu Utilidad Neta Estimada:</span>
                    <span className="font-mono text-sm">
                      +${customPrice - (selectedItem.baseCostMxn + customShipping)} MXN ({Math.round(((customPrice - (selectedItem.baseCostMxn + customShipping)) / customPrice) * 100)}%)
                    </span>
                  </div>

                  {/* DESCRIPCIÓN */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ficha y Descripción en Español:
                    </label>
                    <textarea
                      rows={5}
                      value={translatedData.description}
                      onChange={(e) => setTranslatedData({ ...translatedData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <a
                href={selectedItem.itemUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-500 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Ver en Rakuten Japón</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={importing || translating || !translatedData}
                  onClick={handleConfirmImport}
                  className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{importing ? 'Importando...' : 'Confirmar e Importar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
