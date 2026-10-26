'use client';

import { useState, useEffect } from 'react';
import { Search, Globe, Plus, Check, Loader2, DollarSign, Package, ExternalLink, Sparkles, AlertCircle, Flame, Layers, Maximize2, X, ChevronLeft, ChevronRight, Info, Share2, Copy, Bookmark, Heart, ThumbsUp, ThumbsDown, Trash2, Truck, ShieldCheck, Zap, Video, CheckCircle2 } from 'lucide-react';
import { getStoredAdminToken, getStoredAdminEmail, fetchAdminCjApi } from '@/lib/adminAuth';

interface CjItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceUsd: number;
  maxPriceUsd?: number;
  priceRangeStr?: string;
  categoryName?: string;
  listedNum?: number;
  countryCode?: string;
  stock?: number;
  verifiedWarehouse?: boolean;
  readyToShip?: boolean;
  hasVideo?: boolean;
}

export interface WishlistItem extends CjItem {
  addedBy?: string;
  addedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

interface Props {
  usdRate: number;
  existingProducts?: any[];
  storeCategories?: string[];
  onProductImported: (product: any) => void;
}

const getSafeImageUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '/no-image.svg';
  let clean = url.trim();
  if (clean.startsWith('/api/whatsapp/image-proxy') || clean.startsWith('data:') || clean.startsWith('/')) return clean;
  if (clean.startsWith('//')) clean = 'https:' + clean;
  if (!clean.startsWith('http')) return '/no-image.svg';
  // Servir a través de nuestro endpoint interno de proxy para que NINGÚN navegador o red bloquee el CDN de China
  return `/api/whatsapp/image-proxy?url=${encodeURIComponent(clean)}`;
};

const getSafeVideoUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  let clean = url.trim();
  if (clean.startsWith('/api/admin/cj/video-proxy') || clean.startsWith('data:') || (clean.startsWith('/') && !clean.startsWith('//'))) return clean;
  if (clean.startsWith('//')) clean = 'https:' + clean;
  if (!clean.startsWith('http')) return '';
  // Pasar por el video proxy para inyectar el header Referer de CJ y evitar 403 Forbidden
  return `/api/admin/cj/video-proxy?url=${encodeURIComponent(clean)}`;
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

export default function AdminCjTab({ usdRate, existingProducts = [], storeCategories = [], onProductImported }: Props) {
  // Pestaña interna: Explorador CJ vs Wishlist Preselección
  const [cjViewMode, setCjViewMode] = useState<'catalog' | 'wishlist'>('catalog');
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistFilter, setWishlistFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'MX'>('ALL');
  const [sortOrder, setSortOrder] = useState<'sales_desc' | 'sales_asc' | 'price_asc' | 'price_desc'>('sales_desc');
  const [readyToShipOnly, setReadyToShipOnly] = useState(false);
  const [verifiedWarehouseOnly, setVerifiedWarehouseOnly] = useState(false);
  const [minStockFilter, setMinStockFilter] = useState<number>(0);
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
  const [customCategories, setCustomCategories] = useState<Record<string, string>>({});
  const [isCreatingModalCategory, setIsCreatingModalCategory] = useState(false);
  const [newModalCategoryName, setNewModalCategoryName] = useState('');
  const [localExtraCategories, setLocalExtraCategories] = useState<string[]>([]);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<CjItem | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, boolean>>({});
  const [variantCustomPrices, setVariantCustomPrices] = useState<Record<string, number>>({});

  // Categorías disponibles en tienda (combinando las de BD + sugeridas como Navidad)
  const availableStoreCategories = Array.from(new Set([
    'Navidad',
    'Gadgets & Novedades',
    'Hogar & Cocina',
    'Mascotas',
    'Juguetes & Niños',
    'Belleza & Cuidado',
    'Electrónica',
    'Autos & Accesorios',
    ...storeCategories,
    ...localExtraCategories,
  ])).filter(Boolean);

  // Detecta de forma persistente si un producto de CJ ya está publicado en la tienda FoxDrop
  const isItemAlreadyInStore = (item: CjItem): boolean => {
    if (importedIds.includes(item.id)) return true;
    if (!existingProducts || existingProducts.length === 0) return false;
    const itemSku = (item.sku || '').trim().toUpperCase();
    return existingProducts.some((p: any) => {
      const pSku = (p.sku || '').trim().toUpperCase();
      if (itemSku && pSku && (pSku === itemSku || pSku.startsWith(itemSku + '-'))) return true;
      return false;
    });
  };

  // Modal Vista Previa en Grande (Estilo CJ Dropshipping)
  const [previewItem, setPreviewItem] = useState<CjItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadingModalDetail, setLoadingModalDetail] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<{
    pid?: string;
    images: string[];
    videos?: { id: string; url: string; coverUrl?: string; duration?: string }[];
    description: string;
    variants: any[];
    weight?: string;
    realFreightToMx?: {
      cheapestUsd: number;
      logisticName: string;
      logisticAging?: string;
      allOptions?: any[];
    };
  } | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string>('');
  const [selectedPreviewVideo, setSelectedPreviewVideo] = useState<string | null>(null);
  const [selectedPreviewVariantIdx, setSelectedPreviewVariantIdx] = useState<number>(0);
  const [selectedShippingMethodName, setSelectedShippingMethodName] = useState<string>('');
  const [previewMarginMult, setPreviewMarginMult] = useState<number>(1.22);
  const [copiedShare, setCopiedShare] = useState(false);
  const [calculatingVariantFreight, setCalculatingVariantFreight] = useState(false);

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

  const handleSearch = async (
    targetPage = 1,
    overrideQuery?: string,
    overrideCategory?: string,
    overrideCountry?: 'ALL' | 'MX',
    overrideSortOrder?: 'sales_desc' | 'sales_asc' | 'price_asc' | 'price_desc',
    overrideReadyToShip?: boolean,
    overrideVerified?: boolean,
    overrideMinStock?: number
  ) => {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : selectedCategory;
    const countryToUse = overrideCountry !== undefined ? overrideCountry : selectedCountry;
    const sortToUse = overrideSortOrder !== undefined ? overrideSortOrder : sortOrder;
    const readyToShipToUse = overrideReadyToShip !== undefined ? overrideReadyToShip : readyToShipOnly;
    const verifiedToUse = overrideVerified !== undefined ? overrideVerified : verifiedWarehouseOnly;
    const minStockToUse = overrideMinStock !== undefined ? overrideMinStock : minStockFilter;
    
    // Si no hay texto ni categoría seleccionada, buscar tendencias generales
    const finalQuery = (queryToUse || '').trim();
    setSearching(true);
    setHasSearched(true);
    try {
      const resCj = await fetchAdminCjApi({
        action: 'search_products',
        query: finalQuery,
        categoryId: catToUse || undefined,
        countryCode: countryToUse === 'MX' ? 'MX' : undefined,
        sortOrder: sortToUse,
        readyToShipOnly: readyToShipToUse,
        verifiedWarehouseOnly: verifiedToUse,
        minStock: minStockToUse > 0 ? minStockToUse : undefined,
        page: targetPage,
        size: 18,
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
      const res = await fetchAdminCjApi({ action: 'get_wishlist' });
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
      await fetchAdminCjApi({ action: 'save_wishlist', wishlist: updated });
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

  // Carga inicial automática de productos virales/novedades globales
  useEffect(() => {
    loadWishlist();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedPid = urlParams.get('cj_pid');
      if (sharedPid) {
        // Limpiar el parámetro de la URL inmediatamente para que no vuelva a abrirse en bucle
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);

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
    setSelectedPreviewVideo(null);
    setSelectedPreviewVariantIdx(0);
    setSelectedShippingMethodName('');
    setPreviewMarginMult(1.22);
    setPreviewLoading(true);
    setPreviewDetail(null);

    try {
      const res = await fetchAdminCjApi({
        action: 'get_product_detail',
        pid: item.id,
      });

      const data = await res.json();
      if (data.success && data.detail?.data) {
        const d = data.detail.data;
        const imgSet: string[] = Array.isArray(d.productImageSet) && d.productImageSet.length > 0
          ? d.productImageSet
          : (d.bigImage ? [d.bigImage] : [item.image]);
        
        const variantsArr = Array.isArray(d.variants) ? d.variants : [];
        const videosArr = Array.isArray(d.videos) ? d.videos : [];
        let maxVarUsd = 0;
        let minVarUsd = 0;
        if (variantsArr.length > 0) {
          const prices = variantsArr
            .map((v: any) => Number(v.variantSellPrice))
            .filter((n: number) => !isNaN(n) && n > 0);
          if (prices.length > 0) {
            minVarUsd = Math.min(...prices);
            maxVarUsd = Math.max(...prices);
          }
        }

        // Actualizar datos del producto con los precios reales de variantes
        setPreviewItem(prev => prev ? {
          ...prev,
          name: d.productNameEn || d.productName || prev.name,
          sku: d.productSku || prev.sku,
          image: d.bigImage || prev.image,
          priceUsd: minVarUsd || Number(d.sellPrice) || prev.priceUsd,
          maxPriceUsd: maxVarUsd || prev.maxPriceUsd || minVarUsd || prev.priceUsd,
          priceRangeStr: d.sellPrice ? String(d.sellPrice) : prev.priceRangeStr,
          categoryName: d.categoryName || prev.categoryName,
          listedNum: Number(d.listedNum) || prev.listedNum || 0,
        } : prev);

        // Extraer atributos técnicos adicionales de la ficha oficial de CJ (Material, Empaque, Peso, Opciones/Medidas)
        const extraTechLines: string[] = [];
        if (d.materialNameEn) {
          extraTechLines.push(`Material: ${Array.isArray(d.materialNameEn) ? d.materialNameEn.join(', ') : d.materialNameEn}`);
        }
        if (d.packingNameEn) {
          extraTechLines.push(`Packaging: ${Array.isArray(d.packingNameEn) ? d.packingNameEn.join(', ') : d.packingNameEn}`);
        }
        if (d.productWeight) {
          extraTechLines.push(`Weight: ${d.productWeight} ${d.productUnit || 'g'}`);
        }
        if (variantsArr.length > 0) {
          const sampleVarKeys = variantsArr
            .slice(0, 6)
            .map((v: any) => v.variantKey || v.variantNameEn)
            .filter(Boolean)
            .join(' | ');
          if (sampleVarKeys) {
            extraTechLines.push(`Available Models / Sizes / Specs: ${sampleVarKeys}`);
          }
          const firstStd = variantsArr.find((v: any) => v.variantStandard)?.variantStandard;
          if (firstStd) {
            extraTechLines.push(`Dimensions / Standard: ${firstStd}`);
          }
        }
        const enrichedHtmlDesc = [
          d.description || '',
          extraTechLines.length > 0 ? `<br/><strong>Technical Specs:</strong><br/>${extraTechLines.join('<br/>')}` : '',
        ].filter(Boolean).join('\n');

        setPreviewDetail({
          pid: item.id,
          images: imgSet,
          videos: videosArr,
          description: enrichedHtmlDesc,
          variants: variantsArr,
          weight: d.productWeight ? `${d.productWeight} ${d.productUnit || 'g'}` : undefined,
          realFreightToMx: d.realFreightToMx || undefined,
        });
        if (d.realFreightToMx?.logisticName) {
          setSelectedShippingMethodName(d.realFreightToMx.logisticName);
        }
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

  const handleSelectPreviewVariant = async (i: number, v: any) => {
    setSelectedPreviewVariantIdx(i);
    if (v.variantImage) {
      setSelectedPreviewVideo(null);
      setSelectedPreviewImage(v.variantImage);
    }
    // Si la variante tiene su propio vid y no está calculada aún para este vid, cotizar su flete en tiempo real
    if (v.vid && previewDetail?.pid && (!previewDetail.realFreightToMx || (previewDetail.realFreightToMx as any).calculatedForVid !== v.vid)) {
      setCalculatingVariantFreight(true);
      try {
        const res = await fetchAdminCjApi({
          action: 'calculate_variant_freight',
          vid: v.vid,
        });
        const data = await res.json();
        if (data.success && data.realFreightToMx) {
          setPreviewDetail(prev => prev ? {
            ...prev,
            realFreightToMx: data.realFreightToMx,
          } : prev);
          if (data.realFreightToMx.logisticName) {
            setSelectedShippingMethodName(data.realFreightToMx.logisticName);
          }
        }
      } catch {
        // En caso de error de red, mantener el flete actual de referencia
      } finally {
        setCalculatingVariantFreight(false);
      }
    }
  };

  const triggerTranslation = async (item: CjItem, baseDesc?: string) => {
    setTranslatingId(item.id);
    try {
      const res = await fetchAdminCjApi({
        action: 'translate_item',
        title: item.name,
        description: baseDesc || '',
      });
      const data = await res.json();
      if (data.success) {
        if (data.title) {
          setCustomTitles(prev => ({ ...prev, [item.id]: data.title }));
        }
        if (data.description) {
          setCustomDescriptions(prev => ({ ...prev, [item.id]: data.description }));
        }
      }
    } catch (err) {
      console.warn('Error traduciendo con Gemini:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleOpenImportModal = async (item: CjItem, extraDetail?: any) => {
    setModalItem(item);
    const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
    const baseUsd = typeof item.maxPriceUsd === 'number' && item.maxPriceUsd > item.priceUsd ? item.maxPriceUsd : (typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) ? item.priceUsd : 0);
    const costMxn = Math.round(baseUsd * safeRate);

    // IMPORTANTE: Solo reutilizar detalle previo si corresponde EXACTAMENTE al mismo producto (pid === item.id)
    const matchedDetail = extraDetail?.pid === item.id
      ? extraDetail
      : (previewDetail?.pid === item.id ? previewDetail : null);

    if (!matchedDetail) {
      // Limpiar inmediatamente cualquier detalle residual de un producto anterior
      setPreviewDetail(null);
    }

    // Si tenemos la cotización real de flete a México desde CJ para ESTE producto, incluirla en el costo total real
    const realFreightUsd = matchedDetail?.realFreightToMx?.cheapestUsd || 0;
    const freightMxn = realFreightUsd > 0 ? Math.round(realFreightUsd * safeRate) : (item.countryCode === 'MX' ? 0 : 140);
    const totalLandedCostMxn = costMxn + freightMxn;

    // Precio sugerido modo LANZAMIENTO (+22% sobre costo total) para competir contra Temu / TikTok Shop sin perder dinero
    const suggestedPrice = Math.max(99, Math.round(totalLandedCostMxn * 1.22));
    setCustomPrices(prev => ({ ...prev, [item.id]: suggestedPrice }));
    setCustomTitles(prev => ({ ...prev, [item.id]: item.name }));
    setCustomDescriptions(prev => ({ ...prev, [item.id]: '' }));

    // Sugerir categoría inteligente (ej. Navidad si el nombre o búsqueda contiene términos navideños)
    const lowerCheck = `${item.name || ''} ${searchQuery || ''}`.toLowerCase();
    const defaultCat = /christmas|xmas|santa|snowman|reindeer|elk|navidad|holiday tree/.test(lowerCheck)
      ? 'Navidad'
      : 'Gadgets & Novedades';
    setCustomCategories(prev => ({ ...prev, [item.id]: prev[item.id] || defaultCat }));
    setIsCreatingModalCategory(false);
    setNewModalCategoryName('');

    // Pre-seleccionar todas las variantes por defecto y calcular precio sugerido
    const initialVarMap: Record<string, boolean> = {};
    const initialPriceMap: Record<string, number> = {};
    const matchedVars = matchedDetail?.variants || [];
    matchedVars.forEach((v: any, idx: number) => {
      const vKey = String(v.vid || `var-${idx}`);
      initialVarMap[vKey] = true;
      const vCostUsd = Number(v.variantSellPrice) || baseUsd;
      const vLandedMxn = Math.round((vCostUsd + realFreightUsd) * safeRate);
      initialPriceMap[vKey] = Math.max(99, Math.round(vLandedMxn * 1.25));
    });
    setSelectedVariantIds(initialVarMap);
    setVariantCustomPrices(initialPriceMap);

    if (matchedDetail) {
      // Ya tenemos la descripción real de ESTE producto: traducir y estructurar con IA de inmediato
      const rawDesc = matchedDetail.description || '';
      triggerTranslation(item, rawDesc);
    } else {
      // Abrió directo desde la tarjeta: consultar primero el detalle real de ESTE producto (fotos, variantes, flete y ficha técnica propia)
      setLoadingModalDetail(true);
      try {
        const res = await fetchAdminCjApi({
          action: 'get_product_detail',
          pid: item.id,
        });
        const data = await res.json();
        if (data.success && data.detail?.data) {
          const d = data.detail.data;
          const variantsArr = Array.isArray(d.variants) ? d.variants : [];
          let entryVarUsd = baseUsd;
          if (variantsArr.length > 0) {
            const prices = variantsArr.map((v: any) => Number(v.variantSellPrice)).filter((n: number) => !isNaN(n) && n > 0);
            if (prices.length > 0) entryVarUsd = Math.min(...prices);
          }
          const fUsd = d.realFreightToMx?.cheapestUsd || 0;
          const updatedLandedMxn = Math.round((entryVarUsd + fUsd) * safeRate);
          const updatedSuggested = Math.max(99, Math.round(updatedLandedMxn * 1.22));
          const realName = d.productNameEn || d.productName || item.name;

          const extraTechLines: string[] = [];
          if (d.materialNameEn) {
            extraTechLines.push(`Material: ${Array.isArray(d.materialNameEn) ? d.materialNameEn.join(', ') : d.materialNameEn}`);
          }
          if (d.packingNameEn) {
            extraTechLines.push(`Packaging: ${Array.isArray(d.packingNameEn) ? d.packingNameEn.join(', ') : d.packingNameEn}`);
          }
          if (d.productWeight) {
            extraTechLines.push(`Weight: ${d.productWeight} ${d.productUnit || 'g'}`);
          }
          if (variantsArr.length > 0) {
            const sampleVarKeys = variantsArr
              .slice(0, 6)
              .map((v: any) => v.variantKey || v.variantNameEn)
              .filter(Boolean)
              .join(' | ');
            if (sampleVarKeys) {
              extraTechLines.push(`Available Models / Sizes / Specs: ${sampleVarKeys}`);
            }
            const firstStd = variantsArr.find((v: any) => v.variantStandard)?.variantStandard;
            if (firstStd) {
              extraTechLines.push(`Dimensions / Standard: ${firstStd}`);
            }
          }
          const realDesc = [
            d.description || '',
            extraTechLines.length > 0 ? `<br/><strong>Technical Specs:</strong><br/>${extraTechLines.join('<br/>')}` : '',
          ].filter(Boolean).join('\n');

          setCustomPrices(prev => ({ ...prev, [item.id]: updatedSuggested }));
          setModalItem(prev => prev && prev.id === item.id ? { ...prev, name: realName, priceUsd: entryVarUsd, maxPriceUsd: entryVarUsd } : prev);
          setPreviewDetail({
            pid: item.id,
            images: Array.isArray(d.productImageSet) && d.productImageSet.length > 0 ? d.productImageSet : [item.image],
            videos: Array.isArray(d.videos) ? d.videos : [],
            description: realDesc,
            variants: variantsArr,
            weight: d.productWeight ? `${d.productWeight} ${d.productUnit || 'g'}` : undefined,
            realFreightToMx: d.realFreightToMx || undefined,
          });

          // Pre-seleccionar todas las variantes recién cargadas por la API y calcular precios
          const newVarMap: Record<string, boolean> = {};
          const newPriceMap: Record<string, number> = {};
          variantsArr.forEach((v: any, idx: number) => {
            const vKey = String(v.vid || `var-${idx}`);
            newVarMap[vKey] = true;
            const vCostUsd = Number(v.variantSellPrice) || entryVarUsd;
            const vLandedMxn = Math.round((vCostUsd + fUsd) * safeRate);
            newPriceMap[vKey] = Math.max(99, Math.round(vLandedMxn * 1.25));
          });
          setSelectedVariantIds(newVarMap);
          setVariantCustomPrices(newPriceMap);

          triggerTranslation({ ...item, name: realName }, realDesc);
        } else {
          triggerTranslation(item, '');
        }
      } catch {
        triggerTranslation(item, '');
      } finally {
        setLoadingModalDetail(false);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!modalItem) return;
    const item = modalItem;
    setImportingId(item.id);

    // Garantizar que solo se use el detalle si pertenece estrictamente al producto actual
    const activeDetail = previewDetail?.pid === item.id ? previewDetail : null;

    const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
    const baseUsd = typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) && item.priceUsd > 0 ? item.priceUsd : (item.maxPriceUsd || 0);
    const realFreightUsd = activeDetail?.realFreightToMx?.cheapestUsd || 0;
    const totalUsd = baseUsd + realFreightUsd;
    const costMxn = Math.round(totalUsd * safeRate);
    const salePrice = customPrices[item.id] || Math.round(costMxn * 1.22);
    const finalTitle = customTitles[item.id]?.trim() || item.name;
    const finalDescription = customDescriptions[item.id]?.trim() || `Producto de importación directa a tu domicilio. Tiempo de entrega: 10 a 15 días hábiles.`;

    // Preparar videos e importar variantes con sus costos y precios calculados proporcionalmente al margen elegido
    const videoUrls = (activeDetail?.videos || []).map((v: any) => v.url).filter(Boolean);
    const ratio = costMxn > 0 ? salePrice / costMxn : 1.22;
    const allVariants = activeDetail?.variants || [];
    
    // Filtrar solo las variantes habilitadas por el usuario
    const filteredVariants = allVariants.filter((v: any, idx: number) => {
      const vKey = String(v.vid || `var-${idx}`);
      return selectedVariantIds[vKey] !== false;
    });
    const finalVariantsToUse = filteredVariants.length > 0 ? filteredVariants : allVariants;

    const mappedVariants = finalVariantsToUse.map((v: any, idx: number) => {
      const vKey = String(v.vid || `var-${idx}`);
      const varCostUsd = Number(v.variantSellPrice) || baseUsd;
      const varLandedUsd = varCostUsd + realFreightUsd;
      const varLandedMxn = Math.round(varLandedUsd * safeRate);
      const customVarPrice = variantCustomPrices[vKey];
      const varPublicPrice = (customVarPrice && customVarPrice > 0)
        ? customVarPrice
        : Math.max(varLandedMxn + 25, Math.round(varLandedMxn * Math.max(1.15, ratio)));
      return {
        id: vKey,
        name: String(v.variantKey || v.variantNameEn || v.variantSku || `Opción ${idx + 1}`),
        sku: String(v.variantSku || `${item.sku}-${idx + 1}`),
        image: v.variantImage || item.image,
        costUsd: Number(varLandedUsd.toFixed(2)),
        costMxn: varLandedMxn,
        publicPrice: varPublicPrice,
      };
    });

    // El precio público general del producto será el precio más accesible de las variantes activas
    const minVariantPrice = mappedVariants.length > 0
      ? Math.min(...mappedVariants.map(v => v.publicPrice))
      : salePrice;

    const chosenCategory = (isCreatingModalCategory && newModalCategoryName.trim())
      ? newModalCategoryName.trim()
      : (customCategories[item.id]?.trim() || 'Gadgets & Novedades');

    if (isCreatingModalCategory && newModalCategoryName.trim()) {
      const cleanNewCat = newModalCategoryName.trim();
      setLocalExtraCategories(prev => prev.includes(cleanNewCat) ? prev : [cleanNewCat, ...prev]);
    }

    try {
      const res = await fetchAdminCjApi({
        action: 'import_cj_product',
        importProduct: {
          pid: item.id,
          title: finalTitle,
          sku: item.sku || `CJ-${Date.now().toString().slice(-6)}`,
          categoryName: chosenCategory,
          baseCostUsd: Number(totalUsd.toFixed(2)),
          baseCostMxn: costMxn,
          publicPrice: minVariantPrice || salePrice,
          imageUrl: item.image,
          images: activeDetail?.images && activeDetail.images.length > 0 ? activeDetail.images : [item.image],
          videos: videoUrls,
          variants: mappedVariants,
          description: finalDescription,
        },
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
          <span className="text-2xl font-black text-amber-400 font-semibold mt-0.5 block">
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
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                  const isMx = item.countryCode === 'MX';
                  const baseFreightMxn = isMx ? 0 : 120;
                  const suggestedSale = isMx ? Math.round(costMxn * 1.35) : Math.max(99, Math.round((costMxn + baseFreightMxn) * 1.22));
                  const isImported = isItemAlreadyInStore(item);

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
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-900">
                            <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>
                              {item.listedNum && item.listedNum > 0
                                ? `${item.listedNum.toLocaleString()} tiendas vendiéndolo`
                                : 'Novedad preseleccionada'}
                            </span>
                          </div>
                          <h4
                            onClick={() => handleOpenPreview(item)}
                            className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight hover:text-indigo-600 cursor-pointer"
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                        </div>

                        {/* COSTOS */}
                        <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-[11px] border border-slate-100">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Costo Fábrica:</span>
                            <span className="font-bold text-slate-700">
                              ${safeUsd.toFixed(2)} USD (~${costMxn} MXN)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-indigo-700 font-bold">
                            <span>Venta sugerida:</span>
                            <span className="font-semibold">${suggestedSale} MXN</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-600 font-black text-[10px] pt-1 border-t border-slate-200/60">
                            <span>Ganancia libre estimada:</span>
                            <span>+${Math.max(0, suggestedSale - costMxn - baseFreightMxn)} MXN</span>
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
            <span>🇲🇽 En Bodega México (Envío Exprés 2 a 5 Días a Domicilio)</span>
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
              placeholder="Buscar por nombre o SKU de CJ (ej. CJJT1318735, humidifier, trash can, smartwatch)..."
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

        {/* ORDENAMIENTO GLOBAL Y FILTROS POR VOLUMEN DE VENTAS */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Ordenar catálogo globalmente por:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/80">
            {[
              { id: 'sales_desc', label: '🔥 Más Vendidos Global (Mayor a Menor)' },
              { id: 'sales_asc', label: '🌱 Menos Vendidos Global (0 Ventas / Oportunidades)' },
              { id: 'price_asc', label: '💲 Precio: Menor a Mayor' },
              { id: 'price_desc', label: '💎 Precio: Mayor a Menor' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const newSort = opt.id as any;
                  setSortOrder(newSort);
                  setPage(1);
                  handleSearch(1, searchQuery, selectedCategory, selectedCountry, newSort);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sortOrder === opt.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTROS AVANZADOS DE CONFIABILIDAD Y CALIDAD FOXDROP */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700">Filtros de Calidad y Fiabilidad para Cliente:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ready to Ship */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !readyToShipOnly;
                setReadyToShipOnly(nextVal);
                setPage(1);
                handleSearch(1, searchQuery, selectedCategory, selectedCountry, sortOrder, nextVal, verifiedWarehouseOnly, minStockFilter);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                readyToShipOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Filtra solo artículos con stock listo para despacho inmediato (<48h)"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ Ready to Ship (Despacho &lt; 48h)</span>
              {readyToShipOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Verified Warehouse / Supplier */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !verifiedWarehouseOnly;
                setVerifiedWarehouseOnly(nextVal);
                setPage(1);
                handleSearch(1, searchQuery, selectedCategory, selectedCountry, sortOrder, readyToShipOnly, nextVal, minStockFilter);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                verifiedWarehouseOnly
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Filtra proveedores y almacenes auditados con baja tasa de defectos"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🛡️ Proveedores Verificados</span>
              {verifiedWarehouseOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Stock mínimo > 100 unidades */}
            <button
              type="button"
              onClick={() => {
                const nextVal = minStockFilter > 0 ? 0 : 100;
                setMinStockFilter(nextVal);
                setPage(1);
                handleSearch(1, searchQuery, selectedCategory, selectedCountry, sortOrder, readyToShipOnly, verifiedWarehouseOnly, nextVal);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                minStockFilter > 0
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Asegura que el proveedor tenga más de 100 unidades en inventario físico real"
            >
              <Package className="w-3.5 h-3.5" />
              <span>📦 Stock &gt; 100 Unidades</span>
              {minStockFilter > 0 && <Check className="w-3.5 h-3.5" />}
            </button>
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
            {[...results]
              .sort((a, b) => {
                if (sortOrder === 'sales_desc') {
                  return (b.listedNum || 0) - (a.listedNum || 0);
                }
                if (sortOrder === 'sales_asc') {
                  return (a.listedNum || 0) - (b.listedNum || 0);
                }
                if (sortOrder === 'price_asc') {
                  return (a.priceUsd || 0) - (b.priceUsd || 0);
                }
                if (sortOrder === 'price_desc') {
                  return (b.priceUsd || 0) - (a.priceUsd || 0);
                }
                return 0;
              })
              .map(prod => {
              const isImported = isItemAlreadyInStore(prod);
              const safePriceUsd = typeof prod.priceUsd === 'number' && !isNaN(prod.priceUsd) ? prod.priceUsd : 0;
              const maxPriceUsd = typeof prod.maxPriceUsd === 'number' && prod.maxPriceUsd > safePriceUsd ? prod.maxPriceUsd : safePriceUsd;
              const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
              const minCostMxn = Math.round(safePriceUsd * safeRate);
              const costMxn = minCostMxn;
              const isMx = prod.countryCode === 'MX';
              const baseFreightMxn = isMx ? 0 : 120;
              const suggestedSale = isMx ? Math.round(minCostMxn * 1.35) : Math.max(99, Math.round((minCostMxn + baseFreightMxn) * 1.22));
              const estimatedProfit = Math.max(0, suggestedSale - minCostMxn - baseFreightMxn);

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
                        prod.countryCode === 'MX'
                          ? 'bg-emerald-700/90'
                          : 'bg-black/75'
                      }`}>
                        {prod.countryCode === 'MX' ? '🇲🇽 Stock MX (2-5d)' : '✈️ Dropship'}
                      </span>

                      {/* BADGES DE CALIDAD */}
                      <div className="absolute bottom-1.5 left-1.5 z-10 flex flex-wrap gap-1">
                        {prod.readyToShip && (
                          <span className="bg-amber-500/95 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            <span>&lt;48h</span>
                          </span>
                        )}
                        {prod.verifiedWarehouse && (
                          <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Verificado</span>
                          </span>
                        )}
                      </div>

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
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-900">
                        <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>
                          {prod.listedNum && prod.listedNum > 0
                            ? `${prod.listedNum.toLocaleString()} tiendas vendiéndolo`
                            : 'Novedad recién agregada'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight" title={prod.name}>
                        {prod.name}
                      </h4>
                    </div>

                    {/* COSTOS Y BENEFICIO */}
                    <div className="bg-slate-50 rounded-xl p-2 space-y-1 text-[11px] border border-slate-100">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Costo Fábrica:</span>
                        <span className="font-bold text-slate-700">
                          {maxPriceUsd > safePriceUsd
                            ? `$${safePriceUsd.toFixed(2)}-${maxPriceUsd.toFixed(2)} USD (~$${costMxn} MXN)`
                            : `$${safePriceUsd.toFixed(2)} USD (~$${costMxn} MXN)`}
                        </span>
                      </div>
                      {typeof prod.stock === 'number' && prod.stock > 0 && (
                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <span>Stock almacén:</span>
                          <span className="font-semibold text-slate-700">{prod.stock.toLocaleString()} pzas</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-indigo-700 font-bold">
                        <span>Venta sugerida:</span>
                        <span className="font-semibold">${suggestedSale} MXN</span>
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
              {/* COLUMNA IZQUIERDA: GALERÍA DE FOTOS Y VIDEOS EN GRANDE */}
              <div className="space-y-3">
                {/* FOTO O VIDEO PRINCIPAL ENORME */}
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group flex items-center justify-center shadow-inner">
                  {previewLoading && !selectedPreviewImage ? (
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  ) : selectedPreviewVideo ? (
                    <video
                      key={selectedPreviewVideo}
                      src={getSafeVideoUrl(selectedPreviewVideo)}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={getSafeImageUrl(selectedPreviewImage || previewItem.image)}
                      alt={previewItem.name}
                      className="w-full h-full object-contain transition duration-200"
                    />
                  )}
                </div>

                {/* MINIATURAS DE VIDEOS Y FOTOS DE CJ */}
                {((previewDetail?.videos && previewDetail.videos.length > 0) || (previewDetail?.images && previewDetail.images.length > 1)) && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {previewDetail?.videos?.map((vid, vIdx) => {
                      const isVidSelected = selectedPreviewVideo === vid.url;
                      return (
                        <button
                          key={`vid-${vIdx}`}
                          type="button"
                          onClick={() => setSelectedPreviewVideo(vid.url)}
                          className={`px-3 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer flex flex-col items-center justify-center bg-slate-900 text-white ${
                            isVidSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-300'
                              : 'border-slate-700 hover:border-indigo-400 opacity-90 hover:opacity-100'
                          }`}
                          title="Reproducir video oficial del producto"
                        >
                          <span className="text-xs font-black">🎬 Video {vIdx + 1}</span>
                          {vid.duration && <span className="text-[9px] text-slate-300">{vid.duration}</span>}
                        </button>
                      );
                    })}
                    {previewDetail?.images?.map((img, idx) => {
                      const isSelected = !selectedPreviewVideo && selectedPreviewImage === img;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedPreviewVideo(null);
                            setSelectedPreviewImage(img);
                            if (previewDetail?.variants && previewDetail.variants.length > 0) {
                              const matchedIdx = previewDetail.variants.findIndex(
                                (v: any) => v.variantImage && v.variantImage.trim() === img.trim()
                              );
                              if (matchedIdx !== -1) {
                                setSelectedPreviewVariantIdx(matchedIdx);
                              }
                            }
                          }}
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

              {/* COLUMNA DERECHA: DATOS DE FÁBRICA Y RENTABILIDAD EN VIVO POR OPCIÓN */}
              <div className="space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* SELECTOR DE OPCIONES / VARIANTES ARRIBA PARA CAMBIAR COSTOS EN VIVO */}
                  {previewDetail?.variants && previewDetail.variants.length > 0 && (
                    <div className="space-y-2 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">
                          1. Elige una Opción / Modelo ({previewDetail.variants.length} disponibles):
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/70">
                          Clic para ver su costo exacto
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {previewDetail.variants.map((v: any, i: number) => {
                          const isSelectedVar = selectedPreviewVariantIdx === i;
                          const vUsd = Number(v.variantSellPrice || previewItem.priceUsd);
                          const fUsd = previewDetail?.realFreightToMx?.cheapestUsd || 0;
                          const safeR = usdRate || 18;
                          const vCostMxn = Math.round(vUsd * safeR);
                          const vFreightMxn = fUsd > 0 ? Math.round(fUsd * safeR) : 120;
                          const vLandedMxn = vCostMxn + vFreightMxn;
                          const vSaleMxn = Math.max(99, Math.round(vLandedMxn * previewMarginMult));
                          const vLabel = v.variantKey || v.variantNameEn || v.variantSku || `Opción ${i + 1}`;

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectPreviewVariant(i, v)}
                              className={`p-2 rounded-xl text-[11px] font-medium border flex items-center gap-2.5 transition cursor-pointer text-left ${
                                isSelectedVar
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                                  : 'bg-white hover:bg-indigo-50/60 text-slate-700 border-slate-200/90 hover:border-indigo-300'
                              }`}
                            >
                              {v.variantImage && (
                                <img
                                  src={getSafeImageUrl(v.variantImage)}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/10 bg-white"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <span className={`font-black block truncate text-xs ${isSelectedVar ? 'text-white' : 'text-slate-900'}`} title={vLabel}>
                                  {vLabel}
                                </span>
                                <span className={`text-[10px] block ${isSelectedVar ? 'text-indigo-100' : 'text-slate-500'}`}>
                                  Fábrica: <strong>${vUsd.toFixed(2)} USD</strong> (~${vCostMxn}) → Venta: <strong>${vSaleMxn} MXN</strong>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DESGLOSE MATEMÁTICO PASO A PASO DE LA OPCIÓN SELECCIONADA */}
                  {(() => {
                    const isMexicoStock = previewItem.countryCode === 'MX';
                    const safeRate = usdRate || 18;
                    const variantsList = previewDetail?.variants || [];
                    const activeVariant = variantsList[selectedPreviewVariantIdx] || variantsList[0] || null;
                    const activeVariantName = activeVariant
                      ? (activeVariant.variantKey || activeVariant.variantNameEn || activeVariant.variantSku || `Opción ${selectedPreviewVariantIdx + 1}`)
                      : 'Modelo Estándar';

                    // Costo en USD de la opción seleccionada (si hay variantes, usa el de la variante activa; si no, el del producto)
                    const activeUsd = activeVariant && Number(activeVariant.variantSellPrice) > 0
                      ? Number(activeVariant.variantSellPrice)
                      : previewItem.priceUsd;
                    const activeCostMxn = Math.round(activeUsd * safeRate);

                    // Rango general por si tiene varias opciones
                    const minUsd = previewItem.priceUsd;
                    const maxUsd = previewItem.maxPriceUsd && previewItem.maxPriceUsd > minUsd ? previewItem.maxPriceUsd : minUsd;

                    // Cotización real de flete desde CJ hacia México
                    const realFreight = previewDetail?.realFreightToMx;
                    const availableFreightOptions = realFreight?.allOptions || [];
                    const activeFreightOption = availableFreightOptions.find((o: any) => o.logisticName === selectedShippingMethodName) || availableFreightOptions[0] || null;
                    const realFreightUsd = activeFreightOption ? activeFreightOption.logisticPrice : (realFreight?.cheapestUsd || 0);
                    const realFreightAging = activeFreightOption?.logisticAging || realFreight?.logisticAging || '14–16';
                    const activeFreightName = activeFreightOption?.logisticName || realFreight?.logisticName || 'CJPacket Ordinary';
                    const realFreightMxn = realFreightUsd > 0 ? Math.round(realFreightUsd * safeRate) : (isMexicoStock ? 0 : 120);

                    // Suma EXACTA de la opción seleccionada + flete
                    const totalLandedUsd = activeUsd + (isMexicoStock ? 0 : realFreightUsd);
                    const totalLandedMxn = activeCostMxn + realFreightMxn;
                    const isHighShipping = !isMexicoStock && realFreightMxn > 300;

                    // Precios según los 3 niveles de margen para comparar
                    const launchSale = isMexicoStock ? Math.round(activeCostMxn * 1.35) : Math.max(99, Math.round(totalLandedMxn * 1.22));
                    const standardSale = isMexicoStock ? Math.round(activeCostMxn * 1.45) : Math.max(119, Math.round(totalLandedMxn * 1.32));
                    const highSale = isMexicoStock ? Math.round(activeCostMxn * 1.60) : Math.max(149, Math.round(totalLandedMxn * 1.45));

                    const suggestedSale = isMexicoStock
                      ? Math.round(activeCostMxn * 1.35)
                      : Math.max(99, Math.round(totalLandedMxn * previewMarginMult));
                    const estimatedProfit = Math.max(0, suggestedSale - totalLandedMxn);
                    const marginPercentLabel = Math.round((previewMarginMult - 1) * 100);

                    return (
                      <div className={`p-4 rounded-2xl border space-y-2.5 ${
                        isHighShipping
                          ? 'bg-gradient-to-br from-amber-50/70 to-rose-50/30 border-amber-300'
                          : isMexicoStock 
                          ? 'bg-gradient-to-br from-emerald-50/60 to-slate-50 border-emerald-200' 
                          : 'bg-gradient-to-br from-indigo-50/50 to-slate-50 border-indigo-100'
                      }`}>
                        {/* ENCABEZADO DEL CÁLCULO: INDICA QUÉ OPCIÓN SE ESTÁ CALCULANDO */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                              Cálculo paso a paso (TC: ${safeRate.toFixed(2)} MXN/USD)
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate block" title={activeVariantName}>
                              Opción activa: {activeVariantName}
                            </span>
                          </div>
                          {maxUsd > minUsd && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-white/90 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                              Rango total: ${minUsd.toFixed(2)} – ${maxUsd.toFixed(2)} USD
                            </span>
                          )}
                        </div>

                        {/* PASO A: COSTO DE FÁBRICA DE LA OPCIÓN SELECCIONADA */}
                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <span>
                            <strong>A)</strong> {isMexicoStock ? 'Costo Bodega MX (esta opción):' : 'Costo Fábrica China (esta opción):'}
                          </span>
                          <span className="font-black text-slate-900 text-sm">
                            ${activeUsd.toFixed(2)} USD × ${safeRate.toFixed(2)} = <span className="text-indigo-700">${activeCostMxn} MXN</span>
                          </span>
                        </div>

                        {/* PASO B: FLETE REAL CJ + SELECTOR DE MÉTODO DE ENVÍO */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-700">
                            <span>
                              <strong>B)</strong>{' '}
                              {isMexicoStock
                                ? 'Paquetería Nacional:'
                                : 'Flete CJ a México:'}
                            </span>
                            <span className={`font-black ${isMexicoStock ? 'text-emerald-700' : isHighShipping ? 'text-rose-700' : 'text-slate-900'}`}>
                              {isMexicoStock
                                ? '✓ $0 MXN (Incluido)'
                                : (previewLoading || calculatingVariantFreight)
                                ? 'Cotizando en CJ...'
                                : realFreightUsd > 0
                                ? `+$${realFreightUsd.toFixed(2)} USD × $${safeRate.toFixed(2)} = +$${realFreightMxn} MXN`
                                : `+$${realFreightMxn} MXN`}
                            </span>
                          </div>

                          {!isMexicoStock && availableFreightOptions.length > 0 && (
                            <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                Paquetería CJ:
                              </span>
                              <select
                                value={activeFreightName}
                                onChange={(e) => setSelectedShippingMethodName(e.target.value)}
                                className="w-full text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer p-0"
                              >
                                {availableFreightOptions.map((opt: any, optIdx: number) => {
                                  const optMxn = Math.round(opt.logisticPrice * safeRate);
                                  return (
                                    <option key={optIdx} value={opt.logisticName}>
                                      {opt.logisticName} • ${opt.logisticPrice.toFixed(2)} USD (~${optMxn} MXN) • {opt.logisticAging || '13-20'} días
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* PASO C: SUMA COSTO TOTAL REAL (A + B) */}
                        {!isMexicoStock && (
                          <div className="flex items-center justify-between text-xs text-slate-900 font-black bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                            <span>
                              <strong>C) Costo Total (A + B):</strong> (${activeCostMxn} + ${realFreightMxn} MXN)
                            </span>
                            <span className="text-slate-900 text-sm">
                              ${totalLandedUsd.toFixed(2)} USD = <span className="text-rose-700">${totalLandedMxn} MXN</span>
                            </span>
                          </div>
                        )}

                        {isHighShipping && (
                          <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2 leading-snug">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black block">⚠️ Producto voluminoso o pesado ({previewDetail?.weight || 'Alto volumen'})</span>
                              <span>El flete aéreo desde China cuesta <strong>~${realFreightMxn} MXN</strong>. El precio de venta sugerido ya incluye este flete para proteger tu ganancia.</span>
                            </div>
                          </div>
                        )}

                        {/* SELECTOR DE MARGEN PARA COMPARAR EN VIVO */}
                        {!isMexicoStock && (
                          <div className="pt-1 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 block">
                              <strong>D) Elige el margen para comparar el precio final:</strong>
                            </span>
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setPreviewMarginMult(1.22)}
                                className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                  previewMarginMult === 1.22
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                🔥 +22% (${launchSale})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewMarginMult(1.32)}
                                className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                  previewMarginMult === 1.32
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                ⚖️ +32% (${standardSale})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewMarginMult(1.45)}
                                className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                                  previewMarginMult === 1.45
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                    : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                💎 +45% (${highSale})
                              </button>
                            </div>
                          </div>
                        )}

                        {/* FÓRMULA DEL PRECIO DE VENTA SUGERIDO */}
                        <div className="flex items-center justify-between text-xs text-indigo-800 font-bold border-t border-slate-200/80 pt-2">
                          <div>
                            <span className="block">Precio Final Sugerido en FoxDrop:</span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Fórmula: ${totalLandedMxn} MXN Costo Total × {previewMarginMult.toFixed(2)} (+{marginPercentLabel}% margen)
                            </span>
                          </div>
                          <span className="text-lg font-black text-indigo-950">
                            ${suggestedSale.toLocaleString('es-MX')} MXN
                          </span>
                        </div>

                        {/* FÓRMULA DE LA GANANCIA LIBRE */}
                        <div className="text-[11px] text-emerald-800 font-bold flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200/90">
                          <div>
                            <span className="block">Tu Ganancia Libre Estimada:</span>
                            <span className="text-[10px] font-semibold text-emerald-700">
                              Fórmula: ${suggestedSale} Venta − ${totalLandedMxn} Costo Total (Prod + Envío)
                            </span>
                          </div>
                          <span className="font-black text-sm text-emerald-700">
                            +${estimatedProfit.toLocaleString('es-MX')} MXN
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Tiempo de Entrega al Cliente:</span>
                          <span className="font-bold text-slate-800">
                            {isMexicoStock
                              ? '⚡ 2 a 5 Días Hábiles (Nacional)'
                              : realFreightAging
                              ? `✈️ ${realFreightAging} Días Hábiles (${activeFreightName})`
                              : '✈️ 13 a 20 Días Hábiles (Internacional)'}
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
                        <span className="font-bold text-slate-800 break-all">{previewItem.sku || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Categoría:</span>
                        <span className="font-bold text-slate-800 truncate block">{previewItem.categoryName || 'Novedades'}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80">
                        <span className="text-amber-700 block font-bold">Popularidad Global:</span>
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>{previewItem.listedNum && previewItem.listedNum > 0 ? `${previewItem.listedNum} tiendas vendiéndolo` : 'Producto en tendencia'}</span>
                        </span>
                      </div>
                      {previewDetail?.weight && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                          <span className="text-slate-400 block font-medium">Peso del paquete:</span>
                          <span className="font-bold text-slate-800">{previewDetail.weight}</span>
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
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200 cursor-default"
          >
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Importar Producto a FoxDrop</span>
            </h3>

            {(() => {
              const safeRate = usdRate || 18;
              const matchedDetail = previewDetail?.pid === modalItem.id ? previewDetail : null;
              const baseUsd = modalItem.priceUsd && modalItem.priceUsd > 0 ? modalItem.priceUsd : (modalItem.maxPriceUsd || 0);
              const freightUsd = matchedDetail?.realFreightToMx?.cheapestUsd || 0;
              const totalLandedMxn = Math.round((baseUsd + freightUsd) * safeRate);

              const launchPrice = Math.max(99, Math.round(totalLandedMxn * 1.22));
              const standardPrice = Math.max(119, Math.round(totalLandedMxn * 1.32));
              const highMarginPrice = Math.max(149, Math.round(totalLandedMxn * 1.45));

              return (
                <>
                  <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <img
                      src={getSafeImageUrl(modalItem.image)}
                      alt={modalItem.name}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">{modalItem.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Costo Base: ${baseUsd.toFixed(2)} USD {loadingModalDetail ? '• Cotizando flete CJ...' : (freightUsd > 0 ? `+ Flete CJ: $${freightUsd.toFixed(2)} USD` : '')}
                      </p>
                      <p className="text-[11px] text-slate-800 font-extrabold">
                        Costo Total Puesto en México: ~${totalLandedMxn} MXN
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* SELECTOR DE CATEGORÍA EN FOXDROP + CREAR NUEVA CATEGORÍA */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Categoría en tu Tienda FoxDrop:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingModalCategory(prev => !prev);
                            setNewModalCategoryName('');
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isCreatingModalCategory ? 'Elegir existente' : 'Crear nueva categoría (ej. Navidad)'}</span>
                        </button>
                      </div>

                      {isCreatingModalCategory ? (
                        <input
                          type="text"
                          autoFocus
                          placeholder="Escribe el nombre de la nueva categoría (ej. Navidad, Juguetes...)"
                          value={newModalCategoryName}
                          onChange={(e) => setNewModalCategoryName(e.target.value)}
                          className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                      ) : (
                        <select
                          value={customCategories[modalItem.id] || 'Gadgets & Novedades'}
                          onChange={(e) => setCustomCategories(prev => ({ ...prev, [modalItem.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                          {availableStoreCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat === 'Navidad' ? '🎄 Navidad' : cat}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Título comercial en español:
                        </label>
                        <button
                          type="button"
                          disabled={Boolean(translatingId) || loadingModalDetail}
                          onClick={() => triggerTranslation(modalItem, matchedDetail?.description || '')}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                        >
                          <Sparkles className={`w-3 h-3 ${translatingId || loadingModalDetail ? 'animate-spin' : ''}`} />
                          <span>{translatingId || loadingModalDetail ? 'Traduciendo...' : 'Re-traducir con IA'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customTitles[modalItem.id] || modalItem.name}
                        onChange={(e) => setCustomTitles(prev => ({ ...prev, [modalItem.id]: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Descripción y Ficha Técnica en español (Beneficios + Especificaciones):
                        </label>
                        {(translatingId || loadingModalDetail) && (
                          <span className="text-[10px] text-indigo-500 font-semibold animate-pulse">
                            {loadingModalDetail ? 'Extrayendo ficha técnica CJ...' : 'Estructurando beneficios y ficha técnica...'}
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={7}
                        placeholder="Resumen breve, beneficios principales y especificaciones técnicas (longitud, voltaje, material, contenido)..."
                        value={customDescriptions[modalItem.id] !== undefined ? customDescriptions[modalItem.id] : ''}
                        onChange={(e) => setCustomDescriptions(prev => ({ ...prev, [modalItem.id]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y leading-relaxed whitespace-pre-line"
                      />
                    </div>

                    {/* SELECCIÓN DE VARIANTES / PAQUETES A IMPORTAR */}
                    {matchedDetail?.variants && matchedDetail.variants.length > 0 && (
                      <div className="space-y-2 bg-slate-50/90 p-3 rounded-2xl border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-slate-800">
                              Variantes y Precios por Modelo ({matchedDetail.variants.length} disponibles):
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Configura el precio de venta individual para cada modelo y desmarca los que no quieras ofrecer.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-semibold mr-1">Margen rápido:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newMap: Record<string, number> = {};
                                matchedDetail.variants.forEach((v: any, idx: number) => {
                                  const vKey = String(v.vid || `var-${idx}`);
                                  const vUsd = Number(v.variantSellPrice) || baseUsd;
                                  const vLanded = Math.round((vUsd + freightUsd) * safeRate);
                                  newMap[vKey] = Math.max(99, Math.round(vLanded * 1.25));
                                });
                                setVariantCustomPrices(newMap);
                              }}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition cursor-pointer"
                            >
                              +25%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newMap: Record<string, number> = {};
                                matchedDetail.variants.forEach((v: any, idx: number) => {
                                  const vKey = String(v.vid || `var-${idx}`);
                                  const vUsd = Number(v.variantSellPrice) || baseUsd;
                                  const vLanded = Math.round((vUsd + freightUsd) * safeRate);
                                  newMap[vKey] = Math.max(99, Math.round(vLanded * 1.40));
                                });
                                setVariantCustomPrices(newMap);
                              }}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition cursor-pointer"
                            >
                              +40%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newMap: Record<string, number> = {};
                                matchedDetail.variants.forEach((v: any, idx: number) => {
                                  const vKey = String(v.vid || `var-${idx}`);
                                  const vUsd = Number(v.variantSellPrice) || baseUsd;
                                  const vLanded = Math.round((vUsd + freightUsd) * safeRate);
                                  newMap[vKey] = Math.max(99, Math.round(vLanded * 1.60));
                                });
                                setVariantCustomPrices(newMap);
                              }}
                              className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md hover:bg-purple-100 transition cursor-pointer"
                            >
                              +60%
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {matchedDetail.variants.map((v: any, idx: number) => {
                            const vKey = String(v.vid || `var-${idx}`);
                            const isChecked = selectedVariantIds[vKey] !== false;
                            const vName = v.variantKey || v.variantNameEn || v.variantSku || `Opción ${idx + 1}`;
                            const vUsd = Number(v.variantSellPrice) || baseUsd;
                            const vLandedUsd = vUsd + freightUsd;
                            const vCostMxn = Math.round(vLandedUsd * safeRate);
                            const vImg = v.variantImage || modalItem.image;
                            const currentPrice = variantCustomPrices[vKey] ?? Math.max(99, Math.round(vCostMxn * 1.25));
                            const profit = currentPrice - vCostMxn;
                            const profitPct = vCostMxn > 0 ? Math.round((profit / vCostMxn) * 100) : 0;

                            return (
                              <div
                                key={vKey}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                                  isChecked
                                    ? 'bg-white border-indigo-200 shadow-2xs'
                                    : 'bg-slate-100/70 border-slate-200/80 opacity-50'
                                }`}
                              >
                                <label className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const nextChecked = e.target.checked;
                                      setSelectedVariantIds(prev => ({
                                        ...prev,
                                        [vKey]: nextChecked,
                                      }));
                                    }}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                  />
                                  {vImg && (
                                    <img
                                      src={getSafeImageUrl(vImg)}
                                      alt={vName}
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 bg-white"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-800 truncate" title={vName}>
                                      {vName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-semibold">
                                      Costo landed: <strong className="text-slate-700">${vCostMxn} MXN</strong>
                                    </p>
                                  </div>
                                </label>

                                {isChecked && (
                                  <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                                    <div className="flex flex-col items-end">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-slate-500">Precio MXN:</span>
                                        <div className="relative w-24">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">$</span>
                                          <input
                                            type="number"
                                            value={currentPrice}
                                            onChange={(e) => {
                                              const val = Number(e.target.value);
                                              setVariantCustomPrices(prev => ({
                                                ...prev,
                                                [vKey]: val,
                                              }));
                                            }}
                                            className="w-full pl-5 pr-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-right"
                                          />
                                        </div>
                                      </div>
                                      <span className={`text-[9px] font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {profit >= 0 ? '+' : ''}${profit} ({profitPct}%)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700">
                          Precio de venta al público en FoxDrop (MXN):
                        </label>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          🔥 Modo Lanzamiento Activo
                        </span>
                      </div>

                      {/* BOTONES RÁPIDOS DE ESTRATEGIA DE PRECIO */}
                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setCustomPrices(prev => ({ ...prev, [modalItem.id]: launchPrice }))}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                            customPrices[modalItem.id] === launchPrice
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          🔥 Lanzamiento (${launchPrice})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomPrices(prev => ({ ...prev, [modalItem.id]: standardPrice }))}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                            customPrices[modalItem.id] === standardPrice
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          ⚖️ Estándar (${standardPrice})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomPrices(prev => ({ ...prev, [modalItem.id]: highMarginPrice }))}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                            customPrices[modalItem.id] === highMarginPrice
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          💎 Alto (${highMarginPrice})
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={customPrices[modalItem.id] || launchPrice}
                          onChange={(e) => setCustomPrices(prev => ({ ...prev, [modalItem.id]: Number(e.target.value) }))}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                        <span className="text-slate-500 font-medium">
                          Costo Real (Prod + Envío CJ): ~${totalLandedMxn} MXN
                        </span>
                        <span className={`font-bold ${(customPrices[modalItem.id] || launchPrice) - totalLandedMxn > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Tu Ganancia Libre: {(customPrices[modalItem.id] || launchPrice) - totalLandedMxn >= 0 ? '+' : ''}${(customPrices[modalItem.id] || launchPrice) - totalLandedMxn} MXN por venta
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

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
                disabled={Boolean(importingId) || loadingModalDetail}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {importingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en catálogo...</span>
                  </>
                ) : loadingModalDetail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando fotos y variantes...</span>
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
