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
  Filter
} from 'lucide-react';
import { fetchAdminApi } from '@/lib/adminAuth';
import { Product } from '@/types';

interface RakutenItem {
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
  shopUrl: string;
  itemUrl: string;
  affiliateUrl: string;
  availability: boolean;
  reviewAverage: number;
  reviewCount: number;
}

interface Props {
  existingProducts?: Product[];
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

const QUICK_JAPAN_TAGS = [
  { label: '🔥 Pokémon TCG & Merch', query: 'pokemon card box' },
  { label: '🏴‍☠️ One Piece Figuras', query: 'one piece grandista figure' },
  { label: '🌸 Sanrio & Hello Kitty', query: 'sanrio plush' },
  { label: '🍵 Té Matcha Ceremonial', query: 'matcha powder uji' },
  { label: '👼 Sonny Angel', query: 'sonny angel mini figure' },
  { label: '🐉 Dragon Ball Z', query: 'dragon ball figure masterlise' },
  { label: '🍙 Snacks & KitKat Japón', query: 'kitkat japan limited' },
  { label: '✨ Studio Ghibli', query: 'ghibli totoro' },
  { label: '🎮 Nintendo & Retro', query: 'nintendo switch japan' },
  { label: '💄 Skincare & J-Beauty', query: 'hada labo premium' },
];

export default function AdminJapanTab({ existingProducts = [], onProductImported }: Props) {
  const [searchQuery, setSearchQuery] = useState('pokemon card box');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RakutenItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  // Modal de importación y traducción
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

  // Buscar en Rakuten
  const handleSearch = async (targetQuery = searchQuery, targetPage = 1) => {
    setLoading(true);
    setSearchQuery(targetQuery);
    setPage(targetPage);

    try {
      const res = await fetchAdminApi({
        endpoint: `/api/admin/rakuten?q=${encodeURIComponent(targetQuery)}&page=${targetPage}&hits=24`,
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
    handleSearch('pokemon card box', 1);
  }, []);

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
              Explora más de 200 millones de productos de las tiendas oficiales de Japón. Importa directo a FoxDrop con traducción automática de IA y conversión de Yenes (JPY) a Pesos (MXN).
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
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Se encontraron <strong className="text-slate-900 dark:text-white">{totalCount.toLocaleString('es-MX')}</strong> productos disponibles en Japón
        </span>
        <span>Página {page} de {pageCount}</span>
      </div>

      {/* GRILLA DE PRODUCTOS JAPONESES */}
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-red-500/40 transition group"
              >
                <div>
                  {/* FOTO DEL PRODUCTO */}
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden flex items-center justify-center">
                    <img
                      src={getSafeJapanImageUrl(item.images[0])}
                      alt={item.itemNameEs || item.itemName}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/no-image.svg'; }}
                    />
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                      ¥{item.priceJpy.toLocaleString()} JPY
                    </span>
                    {already && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                        ✓ En Tienda
                      </span>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="p-3">
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-red-500 transition" title={item.itemName}>
                      {item.itemNameEs || item.itemName}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      🏪 {item.shopName}
                    </p>

                    {/* COSTEO Y PRECIO FOXDROP */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Costo MXN:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">${item.baseCostMxn}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Venta Sug:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">${item.suggestedPublicPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÓN IMPORTAR */}
                <div className="p-3 pt-0">
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
                    <span>{already ? 'Reimportar' : 'Importar'}</span>
                  </button>
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

      {/* MODAL DE IMPORTACIÓN & TRADUCCIÓN IA */}
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
                    Traducción con Gemini IA & Cálculo de Utilidad
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
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{importing ? 'Publicando...' : 'Publicar en FoxDrop'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
