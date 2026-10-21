'use client';

import { useState, useEffect } from 'react';
import { Search, Globe, Plus, Check, Loader2, DollarSign, Package, ExternalLink, Sparkles, AlertCircle, Flame, Layers, Maximize2, X, ChevronLeft, ChevronRight, Info, Share2, Copy, Bookmark, Heart, ThumbsUp, ThumbsDown, Trash2, Truck } from 'lucide-react';
import { getStoredAdminToken } from '@/lib/adminAuth';

interface CjItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceUsd: number;
  categoryName?: string;
  listedNum?: number;
  countryCode?: string;
}

export interface WishlistItem extends CjItem {
  addedBy?: string;
  addedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

interface Props {
  usdRate: number;
  onProductImported: (product: any) => void;
}

const getSafeImageUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return '/no-image.svg';
  // Servir a través de nuestro endpoint interno de proxy para que NINGÚN navegador o red bloquee el CDN de China
  return `/api/whatsapp/image-proxy?url=${encodeURIComponent(url)}`;
};

const CJ_POPULAR_CATEGORIES = [
  { id: '', name: '🔥 Todo en Tendencia' },
  { id: '52FC6CA5-669B-4D0B-B1AC-415675931399', name: '🏠 Hogar & Cocina' },
  { id: '2C7D4A0B-1AB2-41EC-8F9E-13DC31B1C902', name: '💄 Belleza & Cuidado' },
  { id: 'D9E66BF8-4E81-4CAB-A425-AEDEC5FBFBF2', name: '⚡ Electrónica & Gadgets' },
  { id: '2409110611570657700', name: '🐾 Mascotas' },
  { id: 'A50A92FA-BCB3-4716-9BD9-BEC629BEE735', name: '🧸 Juguetes & Niños' },
  { id: 'A2F799BE-FB59-428E-A953-296AA2673FCF', name: '🚗 Autos & Accesorios' },
  { id: '4B397425-26C1-4D0E-B6D2-96B0B03689DB', name: '⚽ Deporte & Outdoor' },
  { id: '2837816E-2FEA-4455-845C-6F40C6D70D1E', name: '⌚ Relojes & Joyería' },
];

const CJ_TREND_TAGS = [
  { label: '🌬️ Ventiladores', query: 'portable fan' },
  { label: '💡 Luces & Lámparas', query: 'sunset lamp led' },
  { label: '🍳 Gadgets Cocina', query: 'kitchen gadgets' },
  { label: '🚗 Accesorios Auto', query: 'car phone holder' },
  { label: '💄 Rodillos & Skincare', query: 'beauty roller' },
  { label: '🧸 Peluches & Antiestrés', query: 'squishy plush toy' },
  { label: '⌚ Smartwatches', query: 'smart watch' },
  { label: '🎧 Audífonos Bluetooth', query: 'wireless earbuds' },
  { label: '🐱 Juguetes Mascotas', query: 'pet laser toy' },
  { label: '💧 Humidificadores', query: 'flame humidifier' },
  { label: '🎒 Mochilas Antirrobo', query: 'anti theft backpack' },
  { label: '🧹 Mini Aspiradoras', query: 'mini vacuum cleaner' },
];

export default function AdminCjTab({ usdRate, onProductImported }: Props) {
  // Pestaña interna: Explorador CJ vs Wishlist Preselección
  const [cjViewMode, setCjViewMode] = useState<'catalog' | 'wishlist'>('catalog');
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistFilter, setWishlistFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'MX'>('ALL');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CjItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados de importación por producto
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
  const [modalItem, setModalItem] = useState<CjItem | null>(null);

  // Modal Vista Previa en Grande (Estilo CJ Dropshipping)
  const [previewItem, setPreviewItem] = useState<CjItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<{
    images: string[];
    description: string;
    variants: any[];
    weight?: string;
  } | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);

  // Bloquear el scroll de la página principal cuando el modal esté abierto
  useEffect(() => {
    if (previewItem || modalItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [previewItem, modalItem]);

  const handleSearch = async (targetPage = 1, overrideQuery?: string, overrideCategory?: string, overrideCountry?: 'ALL' | 'MX') => {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : selectedCategory;
    const countryToUse = overrideCountry !== undefined ? overrideCountry : selectedCountry;
    
    // Si no hay texto ni categoría seleccionada, buscar tendencias generales
    const finalQuery = (queryToUse || '').trim();
    setSearching(true);
    setHasSearched(true);
    try {
      const token = getStoredAdminToken() || '';
      const resCj = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'search_products',
          query: finalQuery,
          categoryId: catToUse || undefined,
          countryCode: countryToUse === 'MX' ? 'MX' : undefined,
          page: targetPage,
          size: 18,
          adminToken: token,
        }),
      });

      const data = await resCj.json();
      if (resCj.ok && data.success && Array.isArray(data.products)) {
        setResults(data.products);
        setTotalRecords(data.total || data.products.length);
        setPage(targetPage);
      } else {
        alert(data.error || 'No se encontraron productos en CJ Dropshipping');
      }
    } catch (err: any) {
      alert(`Error buscando en CJ Dropshipping: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setSearching(false);
    }
  };

  // Cargar Wishlist compartida desde Supabase
  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const token = getStoredAdminToken() || '';
      const res = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'get_wishlist', adminToken: token }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.wishlist)) {
        setWishlist(data.wishlist);
      }
    } catch {
      // Ignorar fallo silencioso
    } finally {
      setLoadingWishlist(false);
    }
  };

  const persistWishlist = async (updated: WishlistItem[]) => {
    setWishlist(updated);
    try {
      const token = getStoredAdminToken() || '';
      await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'save_wishlist', wishlist: updated, adminToken: token }),
      });
    } catch {
      // Fallback
    }
  };

  const handleToggleWishlist = async (item: CjItem) => {
    const exists = wishlist.some(w => w.id === item.id);
    let updated: WishlistItem[];
    if (exists) {
      updated = wishlist.filter(w => w.id !== item.id);
    } else {
      const newItem: WishlistItem = {
        ...item,
        addedAt: new Date().toISOString(),
        status: 'pending',
      };
      updated = [newItem, ...wishlist];
    }
    await persistWishlist(updated);
  };

  const handleUpdateWishlistStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    const updated = wishlist.map(w => w.id === id ? { ...w, status } : w);
    await persistWishlist(updated);
  };

  const handleRemoveFromWishlist = async (id: string) => {
    const updated = wishlist.filter(w => w.id !== id);
    await persistWishlist(updated);
  };

  // Carga inicial automática de productos virales/novedades globales o abrir producto compartido por URL
  useEffect(() => {
    loadWishlist();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedPid = urlParams.get('cj_pid');
      if (sharedPid) {
        // Abrir directamente el producto compartido cargando su detalle completo por PID
        handleOpenPreview({
          id: sharedPid,
          name: 'Cargando producto...',
          sku: '',
          image: '',
          priceUsd: 0,
        });
      }
    }

    if (!hasSearched && results.length === 0) {
      handleSearch(1, '', '');
    }
  }, []);

  const handleShareProduct = (item: CjItem) => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    // Enlace super corto y limpio usando solo el ID del producto
    const shareUrl = `${origin}/admin?tab=cj_dropship&cj_pid=${encodeURIComponent(item.id)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } else {
      prompt('Copia este enlace para compartir el producto:', shareUrl);
    }
  };

  const handleOpenPreview = async (item: CjItem) => {
    setPreviewItem(item);
    setSelectedPreviewImage(item.image);
    setPreviewLoading(true);
    setPreviewDetail(null);

    try {
      const token = getStoredAdminToken() || '';
      const res = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'get_product_detail',
          pid: item.id,
          adminToken: token,
        }),
      });

      const data = await res.json();
      if (data.success && data.detail?.data) {
        const d = data.detail.data;
        const imgSet: string[] = Array.isArray(d.productImageSet) && d.productImageSet.length > 0
          ? d.productImageSet
          : (d.bigImage ? [d.bigImage] : [item.image]);
        
        // Actualizar datos del producto si venía solo con PID
        setPreviewItem(prev => prev ? {
          ...prev,
          name: d.productNameEn || d.productName || prev.name,
          sku: d.productSku || prev.sku,
          image: d.bigImage || prev.image,
          priceUsd: Number(d.sellPrice) || prev.priceUsd,
          categoryName: d.categoryName || prev.categoryName,
        } : prev);

        setPreviewDetail({
          images: imgSet,
          description: d.description || '',
          variants: Array.isArray(d.variants) ? d.variants : [],
          weight: d.productWeight ? `${d.productWeight} ${d.productUnit || 'g'}` : undefined,
        });
        if (imgSet.length > 0) {
          setSelectedPreviewImage(imgSet[0]);
        }
      }
    } catch {
      // Si falla, se muestra al menos con la foto principal
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenImportModal = (item: CjItem, extraDetail?: any) => {
    setModalItem(item);
    const safeUsd = typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) ? item.priceUsd : 0;
    const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
    const costMxn = Math.round(safeUsd * safeRate);
    // Precio sugerido: costo * 2.2 aprox
    const suggestedPrice = Math.max(99, Math.round(costMxn * 2.2));
    setCustomPrices(prev => ({ ...prev, [item.id]: suggestedPrice }));
    setCustomTitles(prev => ({ ...prev, [item.id]: item.name }));

    // Si viene la descripción detallada del modal grande, guardarla
    if (extraDetail?.description) {
      const cleanDesc = extraDetail.description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      setCustomDescriptions(prev => ({
        ...prev,
        [item.id]: cleanDesc ? `📦 ${cleanDesc}\n\n✈️ Entrega internacional: 10 a 15 días hábiles.` : ''
      }));
    }
  };

  const handleConfirmImport = async () => {
    if (!modalItem) return;
    const item = modalItem;
    setImportingId(item.id);

    const safeUsd = typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) ? item.priceUsd : 0;
    const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
    const costMxn = Math.round(safeUsd * safeRate);
    const salePrice = customPrices[item.id] || Math.round(costMxn * 2.2);
    const finalTitle = customTitles[item.id]?.trim() || item.name;
    const finalDescription = customDescriptions[item.id]?.trim() || `📦 Producto viral de importación directa a tu domicilio. Tiempo de entrega internacional: 10 a 15 días hábiles con guía de rastreo. SKU CJ: ${item.sku}.`;

    try {
      const token = getStoredAdminToken() || '';
      const res = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'import_cj_product',
          adminToken: token,
          importProduct: {
            title: finalTitle,
            sku: item.sku || `CJ-${Date.now().toString().slice(-6)}`,
            categoryName: item.categoryName || 'Novedades & Gadgets',
            baseCostUsd: safeUsd,
            baseCostMxn: costMxn,
            publicPrice: salePrice,
            imageUrl: item.image,
            images: previewDetail?.images && previewDetail.images.length > 0 ? previewDetail.images : [item.image],
            description: finalDescription,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.product) {
        setImportedIds(prev => [...prev, item.id]);
        onProductImported(data.product);
        setModalItem(null);
      } else {
        alert(`Error al importar: ${data.error || 'Intenta de nuevo'}`);
      }
    } catch (err: any) {
      alert(`Error al importar: ${err.message || 'Error de conexión'}`);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
            <Globe className="w-3.5 h-3.5" />
            <span>Catálogo Global CJ Dropshipping Conectado</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Importador de Novedades & Gadgets Virales
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Busca millones de productos de fábrica, guárdalos en su Wishlist compartida para revisarlos juntos y luego apruébalos para publicarlos con tu propio precio en FoxDrop.
          </p>
        </div>

        {/* TIPO DE CAMBIO EN VIVO */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center shrink-0 min-w-[170px]">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tipo de Cambio</span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">
            ${usdRate.toFixed(2)} MXN
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">1 USD = ${usdRate.toFixed(2)} Pesos</span>
        </div>
      </div>

      {/* SELECTOR DE MODO: EXPLORADOR CJ VS WISHLIST COMPARTIDA */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
        <button
          type="button"
          onClick={() => setCjViewMode('catalog')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            cjViewMode === 'catalog'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Explorar Catálogo CJ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCjViewMode('wishlist');
            loadWishlist();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer relative ${
            cjViewMode === 'wishlist'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>Wishlist Compartida (Preselección)</span>
          {wishlist.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              cjViewMode === 'wishlist' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
            }`}>
              {wishlist.length}
            </span>
          )}
        </button>
      </div>

      {/* CONTENIDO CONDICIONAL: EXPLORADOR CJ VS WISHLIST COMPARTIDA */}
      {cjViewMode === 'wishlist' ? (
        <div className="space-y-6">
          {/* HEADER DE WISHLIST */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span>Mesa de Trabajo: Productos Preseleccionados</span>
              </h3>
              <p className="text-xs text-slate-500">
                Aquí se guardan los productos que tú o tu socia marcaron con corazón para votar y decidir cuáles importar.
              </p>
            </div>

            {/* FILTROS DE ESTADO */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 text-xs font-bold">
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
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE PRODUCTOS DE LA WISHLIST */}
          {loadingWishlist ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Cargando lista compartida...</p>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
              <Heart className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">Tu Wishlist está vacía</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Explora el catálogo de CJ y haz clic en el icono de <strong>Corazón</strong> en cualquier producto que te guste para agregarlo aquí y revisarlo con tu socia.
              </p>
              <button
                type="button"
                onClick={() => setCjViewMode('catalog')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Ir a Explorar Catálogo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wishlist
                .filter(w => wishlistFilter === 'all' || w.status === wishlistFilter)
                .map(item => {
                  const safeUsd = typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) ? item.priceUsd : 0;
                  const costMxn = Math.round(safeUsd * (usdRate || 18));
                  const suggestedSale = Math.max(99, Math.round(costMxn * 2.2));
                  const isImported = importedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                        item.status === 'approved'
                          ? 'border-emerald-300 ring-2 ring-emerald-100 bg-emerald-50/10'
                          : item.status === 'rejected'
                          ? 'border-rose-200 bg-rose-50/10 opacity-75'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* FOTO Y ESTADO */}
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 relative group">
                          <img
                            src={getSafeImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
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
                            onClick={() => handleRemoveFromWishlist(item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition cursor-pointer"
                            title="Quitar de Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* TÍTULO */}
                        <h4
                          onClick={() => handleOpenPreview(item)}
                          className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight hover:text-indigo-600 cursor-pointer"
                          title={item.name}
                        >
                          {item.name}
                        </h4>

                        {/* COSTOS */}
                        <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-[11px] border border-slate-100">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Costo Fábrica:</span>
                            <span className="font-mono font-bold text-slate-700">
                              ${safeUsd.toFixed(2)} USD (~${costMxn} MXN)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-indigo-700 font-bold">
                            <span>Venta sugerida:</span>
                            <span className="font-mono">${suggestedSale} MXN</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-600 font-black text-[10px] pt-1 border-t border-slate-200/60">
                            <span>Ganancia estimada:</span>
                            <span>+${Math.max(0, suggestedSale - costMxn)} MXN</span>
                          </div>
                        </div>
                      </div>

                      {/* VOTACIÓN Y ACCIONES */}
                      <div className="pt-3 space-y-2 border-t border-slate-100 mt-3">
                        {/* BOTONES DE APROBACIÓN */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.id, 'approved')}
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
                            onClick={() => handleUpdateWishlistStatus(item.id, 'rejected')}
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

                        {/* BOTÓN IMPORTAR SI ESTÁ APROBADO O DISPONIBLE */}
                        {isImported ? (
                          <div className="w-full py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            <span>Ya en Tienda FoxDrop</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenImportModal(item)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Importar a Tienda FoxDrop</span>
                          </button>
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
      {/* BUSCADOR Y CATEGORÍAS */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* SELECTOR DE ORIGEN / BODEGA */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setSelectedCountry('ALL');
              setPage(1);
              handleSearch(1, searchQuery, selectedCategory, 'ALL');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedCountry === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>✈️ Catálogo Global Fábrica (China - 10 a 15 Días)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCountry('MX');
              setPage(1);
              handleSearch(1, searchQuery, selectedCategory, 'MX');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedCountry === 'MX'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100/50'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>🇲🇽 En Bodega México (Entrega Exprés 2 a 5 Días)</span>
          </button>
        </div>

        {/* FILA DE CATEGORÍAS PRINCIPALES (ENVOLVENTES) */}
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Explorar por Categoría de Fábrica:</span>
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                  handleSearch(1, searchQuery, '');
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Limpiar filtro de categoría
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {CJ_POPULAR_CATEGORIES.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                    handleSearch(1, searchQuery, cat.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs border ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/80 text-slate-700 border-slate-200/90 hover:border-indigo-300'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* INPUT DE BÚSQUEDA */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(1);
          }}
          className="flex flex-col sm:flex-row items-center gap-3 pt-1 border-t border-slate-100"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palabra clave (ej. humidifier, projector, organizer, smartwatch)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-2xl transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buscando en CJ...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Buscar Productos</span>
              </>
            )}
          </button>
        </form>

        {/* ETIQUETAS DE BÚSQUEDA RÁPIDA DE TENDENCIAS VIRALES (ENVOLVENTES) */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Productos Más Vendidos y Virales en Redes:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {CJ_TREND_TAGS.map(tag => {
              const active = searchQuery.toLowerCase() === tag.query.toLowerCase();
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag.query);
                    setPage(1);
                    handleSearch(1, tag.query, selectedCategory);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    active
                      ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-xs'
                      : 'bg-slate-100/90 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESULTADOS DE PRODUCTOS */}
      {searching ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Consultando catálogo global de CJ Dropshipping...</p>
          <p className="text-xs text-slate-400">Trayendo precios de fábrica, fotos HD y existencias en tiempo real</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>{totalRecords} productos encontrados en CJ</span>
            <span>Página {page}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {results.map(prod => {
              const isImported = importedIds.includes(prod.id);
              const safePriceUsd = typeof prod.priceUsd === 'number' && !isNaN(prod.priceUsd) ? prod.priceUsd : 0;
              const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
              const costMxn = Math.round(safePriceUsd * safeRate);
              const suggestedSale = Math.max(99, Math.round(costMxn * 2.2));
              const estimatedProfit = Math.max(0, suggestedSale - costMxn);

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-2xl border p-3 flex flex-col justify-between transition-all hover:shadow-lg ${
                    isImported ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-2">
                    {/* FOTO DEL PRODUCTO (CLICK PARA VER EN GRANDE) */}
                    <div
                      onClick={() => handleOpenPreview(prod)}
                      className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 relative group cursor-pointer"
                      title="Clic para ver fotos en grande y detalle completo"
                    >
                      <img
                        src={getSafeImageUrl(prod.image)}
                        alt={prod.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                      />
                      <span className={`absolute top-1.5 left-1.5 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 ${
                        prod.countryCode === 'MX' || selectedCountry === 'MX'
                          ? 'bg-emerald-700/90'
                          : 'bg-black/75'
                      }`}>
                        {prod.countryCode === 'MX' || selectedCountry === 'MX' ? '🇲🇽 Stock MX (2-5d)' : '✈️ Dropship'}
                      </span>

                      {/* BOTÓN WISHLIST CORAZÓN */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWishlist(prod);
                        }}
                        className={`absolute top-1.5 right-1.5 z-20 p-1.5 rounded-full backdrop-blur-md transition shadow-sm ${
                          wishlist.some(w => w.id === prod.id)
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600'
                        }`}
                        title={wishlist.some(w => w.id === prod.id) ? 'En Wishlist de preselección' : 'Guardar en Wishlist compartida'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${wishlist.some(w => w.id === prod.id) ? 'fill-current' : ''}`} />
                      </button>

                      {/* OVERLAY INDICADOR DE ZOOM */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                        <Maximize2 className="w-4 h-4 text-white" />
                        <span>Ver en grande</span>
                      </div>
                    </div>

                    {/* TÍTULO */}
                    <div className="space-y-1">
                      {prod.listedNum && prod.listedNum > 10 ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-800">
                          <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Top Ventas ({prod.listedNum} tiendas)</span>
                        </div>
                      ) : null}
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight" title={prod.name}>
                        {prod.name}
                      </h4>
                    </div>

                    {/* COSTOS Y BENEFICIO */}
                    <div className="bg-slate-50 rounded-xl p-2 space-y-1 text-[11px] border border-slate-100">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Costo Fábrica:</span>
                        <span className="font-mono font-bold text-slate-700">
                          ${safePriceUsd.toFixed(2)} USD (~${costMxn} MXN)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-indigo-700 font-bold">
                        <span>Venta sugerida:</span>
                        <span className="font-mono">${suggestedSale} MXN</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600 font-black text-[10px] pt-0.5 border-t border-slate-200/60">
                        <span>Ganancia neta:</span>
                        <span>+${estimatedProfit} MXN</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN DE IMPORTACIÓN */}
                  <div className="pt-3">
                    {isImported ? (
                      <div className="w-full py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>En Catálogo FoxDrop</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenImportModal(prod)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Importar a FoxDrop</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINACIÓN */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              disabled={page <= 1 || searching}
              onClick={() => handleSearch(page - 1)}
              className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              ← Anterior
            </button>
            <span className="text-xs font-bold text-slate-500">Página {page}</span>
            <button
              type="button"
              disabled={searching || results.length < 18}
              onClick={() => handleSearch(page + 1)}
              className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No se encontraron productos con esa palabra clave.</p>
          <p className="text-xs text-slate-400">Intenta buscar en inglés (ej. "fan", "led", "phone case", "smart watch")</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <Globe className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
          <h3 className="text-base font-bold text-slate-800">Escribe lo que quieres buscar arriba</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Prueba buscando artículos virales de TikTok o novedades de bajo costo para atraer miles de visitas a FoxDrop.
          </p>
        </div>
      )}
      </>
      )}

      {/* MODAL VISTA PREVIA EN GRANDE (ESTILO CJ DROPSHIPPING) */}
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
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Catálogo Oficial CJ Dropshipping
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate" title={previewItem.name}>
                  {previewItem.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleWishlist(previewItem)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                    wishlist.some(w => w.id === previewItem.id)
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-200 hover:border-rose-300'
                  }`}
                  title="Guardar en lista de preselección para revisar juntos"
                >
                  <Heart className={`w-3.5 h-3.5 ${wishlist.some(w => w.id === previewItem.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{wishlist.some(w => w.id === previewItem.id) ? 'En Wishlist' : 'A Wishlist'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareProduct(previewItem)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                    copiedShare
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-300'
                  }`}
                  title="Copiar enlace corto de este producto"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COLUMNA IZQUIERDA: GALERÍA DE FOTOS EN GRANDE */}
              <div className="space-y-3">
                {/* FOTO PRINCIPAL ENORME */}
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group flex items-center justify-center shadow-inner">
                  {previewLoading && !selectedPreviewImage ? (
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  ) : (
                    <img
                      src={getSafeImageUrl(selectedPreviewImage || previewItem.image)}
                      alt={previewItem.name}
                      className="w-full h-full object-contain transition duration-200"
                    />
                  )}
                </div>

                {/* MINIATURAS DEL SET DE FOTOS DE CJ */}
                {previewDetail?.images && previewDetail.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {previewDetail.images.map((img, idx) => {
                      const isSelected = selectedPreviewImage === img;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPreviewImage(img)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 ring-2 ring-indigo-200'
                              : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={getSafeImageUrl(img)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA: DATOS DE FÁBRICA Y RENTABILIDAD */}
              <div className="space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* PRECIOS Y COSTOS */}
                  {(() => {
                    const isMexicoStock = previewItem.countryCode === 'MX' || selectedCountry === 'MX';
                    const safeUsd = previewItem.priceUsd;
                    const costMxn = Math.round(safeUsd * (usdRate || 18));
                    // Si está en bodega México, el envío es nacional (desde $0 o $99 nacional)
                    const estimatedFreightMxn = isMexicoStock ? 0 : 130;
                    // Precio sugerido: en productos nacionales de alto valor no inflar por 2.2 si son equipos pesados, margen saludable
                    const suggestedSale = isMexicoStock 
                      ? Math.round(costMxn * 1.5) 
                      : Math.max(99, Math.round(costMxn * 2.2));
                    const estimatedProfit = Math.max(0, suggestedSale - costMxn - estimatedFreightMxn);

                    return (
                      <div className={`p-4 rounded-2xl border space-y-2.5 ${
                        isMexicoStock 
                          ? 'bg-gradient-to-br from-emerald-50/60 to-slate-50 border-emerald-200' 
                          : 'bg-gradient-to-br from-indigo-50/50 to-slate-50 border-indigo-100'
                      }`}>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{isMexicoStock ? 'Costo en Bodega México:' : 'Costo Fábrica (China):'}</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ${safeUsd.toFixed(2)} USD (~${costMxn} MXN)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{isMexicoStock ? 'Paquetería Nacional (Estafeta / Fedex MX):' : 'Flete Internacional Estándar (CJPacket):'}</span>
                          <span className={`font-mono font-bold ${isMexicoStock ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {isMexicoStock ? '✓ Flete Incluido / Nacional' : '~$130 MXN'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Tiempo de Entrega al Cliente:</span>
                          <span className="font-bold text-slate-800">
                            {isMexicoStock ? '⚡ 2 a 5 Días Hábiles (Nacional)' : '✈️ 10 a 15 Días Hábiles (Internacional)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-indigo-700 font-bold border-t border-slate-200/80 pt-2">
                          <span>Venta sugerida en FoxDrop:</span>
                          <span className="font-mono text-base font-black text-indigo-900">
                            ${suggestedSale} MXN
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-bold flex items-center justify-between bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                          <span>Tu ganancia estimada por venta:</span>
                          <span className="font-mono">
                            +${estimatedProfit} MXN
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ESPECIFICACIONES TÉCNICAS */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block">Ficha del Fabricante:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">SKU Fábrica:</span>
                        <span className="font-mono font-bold text-slate-800 break-all">{previewItem.sku || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Categoría:</span>
                        <span className="font-bold text-slate-800 truncate block">{previewItem.categoryName || 'Novedades'}</span>
                      </div>
                      {previewDetail?.weight && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                          <span className="text-slate-400 block font-medium">Peso del paquete:</span>
                          <span className="font-mono font-bold text-slate-800">{previewDetail.weight}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESCRIPCIÓN TÉCNICA DEL FABRICANTE */}
                  {previewDetail?.description && (
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 block">
                        Descripción y Especificaciones:
                      </span>
                      <div 
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 text-[11px] leading-relaxed [&_img]:hidden [&_p]:mb-1 [&_br]:content-['']"
                        dangerouslySetInnerHTML={{ __html: previewDetail.description }}
                      />
                    </div>
                  )}

                  {/* VARIANTES DEL PRODUCTO */}
                  {previewDetail?.variants && previewDetail.variants.length > 0 && (
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 block">
                        Variantes disponibles ({previewDetail.variants.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewDetail.variants.slice(0, 12).map((v: any, i: number) => (
                          <div key={i} className="px-2.5 py-1 bg-slate-100/90 rounded-lg text-[11px] text-slate-700 font-medium border border-slate-200/80 flex items-center gap-1.5">
                            <span className="truncate max-w-[150px]">{v.variantKey || v.variantNameEn || v.variantSku || `Opción ${i+1}`}</span>
                            <span className="font-mono font-bold text-indigo-700">${Number(v.variantSellPrice || previewItem.priceUsd).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÓN DE ACCIÓN: IMPORTAR */}
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
                      const item = previewItem;
                      const detail = previewDetail;
                      setPreviewItem(null);
                      handleOpenImportModal(item, detail);
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Importar este producto a FoxDrop</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR PRECIO Y PUBLICAR */}
      {modalItem && (
        <div 
          onClick={() => setModalItem(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200 cursor-default"
          >
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Importar Producto a FoxDrop</span>
            </h3>

            <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <img
                src={getSafeImageUrl(modalItem.image)}
                alt={modalItem.name}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 line-clamp-2">{modalItem.name}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Costo CJ: ${modalItem.priceUsd.toFixed(2)} USD (~${Math.round(modalItem.priceUsd * usdRate)} MXN)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Título comercial en español:
                </label>
                <input
                  type="text"
                  value={customTitles[modalItem.id] || modalItem.name}
                  onChange={(e) => setCustomTitles(prev => ({ ...prev, [modalItem.id]: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Precio de venta al público en FoxDrop (MXN):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    value={customPrices[modalItem.id] || 199}
                    onChange={(e) => setCustomPrices(prev => ({ ...prev, [modalItem.id]: Number(e.target.value) }))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                  <span className="text-slate-400">
                    Costo: ~${Math.round((typeof modalItem.priceUsd === 'number' && !isNaN(modalItem.priceUsd) ? modalItem.priceUsd : 0) * (usdRate || 18))} MXN
                  </span>
                  <span className="text-emerald-600 font-bold">
                    Tu Ganancia: +${Math.max(0, (customPrices[modalItem.id] || 199) - Math.round((typeof modalItem.priceUsd === 'number' && !isNaN(modalItem.priceUsd) ? modalItem.priceUsd : 0) * (usdRate || 18)))} MXN por venta
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(importingId)}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {importingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en catálogo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Publicar en Tienda FoxDrop</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
