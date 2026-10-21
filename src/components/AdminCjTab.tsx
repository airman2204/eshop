'use client';

import { useState, useEffect } from 'react';
import { Search, Globe, Plus, Check, Loader2, DollarSign, Package, ExternalLink, Sparkles, AlertCircle, Flame, Layers } from 'lucide-react';
import { getStoredAdminToken } from '@/lib/adminAuth';

interface CjItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceUsd: number;
  categoryName?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
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
  const [modalItem, setModalItem] = useState<CjItem | null>(null);

  const handleSearch = async (targetPage = 1, overrideQuery?: string, overrideCategory?: string) => {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : selectedCategory;
    
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

  // Carga inicial automática de productos virales/novedades globales
  useEffect(() => {
    if (!hasSearched && results.length === 0) {
      handleSearch(1, '', '');
    }
  }, []);

  const handleOpenImportModal = (item: CjItem) => {
    setModalItem(item);
    const safeUsd = typeof item.priceUsd === 'number' && !isNaN(item.priceUsd) ? item.priceUsd : 0;
    const safeRate = typeof usdRate === 'number' && !isNaN(usdRate) && usdRate > 0 ? usdRate : 18;
    const costMxn = Math.round(safeUsd * safeRate);
    // Precio sugerido: costo * 2.2 aprox
    const suggestedPrice = Math.max(99, Math.round(costMxn * 2.2));
    setCustomPrices(prev => ({ ...prev, [item.id]: suggestedPrice }));
    setCustomTitles(prev => ({ ...prev, [item.id]: item.name }));
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
            images: [item.image],
            description: `📦 Producto viral de importación directa a tu domicilio. Tiempo de entrega internacional: 10 a 15 días hábiles con guía de rastreo. SKU CJ: ${item.sku}.`,
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
            Busca millones de productos directamente de fábrica en China. Con 1 clic impórtalos a FoxDrop con tu propio precio en pesos. CJ los envía directo a tu cliente en México.
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

      {/* BUSCADOR Y CATEGORÍAS */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* FILA DE CATEGORÍAS PRINCIPALES */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Explorar por Categoría de Fábrica:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
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
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer text-xs border ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-indigo-50/70 text-slate-700 border-slate-200/90'
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

        {/* ETIQUETAS DE BÚSQUEDA RÁPIDA DE TENDENCIAS VIRALES */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Productos Más Vendidos y Virales en Redes:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer border ${
                    active
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-slate-100/80 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200/80'
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
                    {/* FOTO DEL PRODUCTO */}
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 relative group">
                      <img
                        src={getSafeImageUrl(prod.image)}
                        alt={prod.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ✈️ Dropship
                      </span>
                    </div>

                    {/* TÍTULO */}
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight" title={prod.name}>
                      {prod.name}
                    </h4>

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

      {/* MODAL CONFIGURAR PRECIO Y PUBLICAR */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200">
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
