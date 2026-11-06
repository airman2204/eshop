'use client';

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Send, 
  Flame, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  Smartphone, 
  Square, 
  Megaphone, 
  CheckCircle2, 
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  Tag,
  Sliders,
  DollarSign,
  Palette
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';

interface ProductItem {
  id: string;
  title: string;
  publicPrice?: number;
  price?: number;
  image?: string;
  images?: string[];
  stock?: number;
  category?: string;
  sku?: string;
  description?: string;
}

interface AdConcept {
  headline: string;
  subheadline: string;
  badge: string;
  urgencyText: string;
  callToAction: string;
  aestheticScene: {
    backgroundStyle: "luxury_marble" | "tropical_fresh" | "neon_night" | "minimal_pastel" | "warm_cozy" | "clean_studio";
    lighting: string;
    props: string[];
    accentColor: string;
    mood: string;
  };
  copyVariations: {
    hook: string;
    body: string;
    ctaButton: string;
    whatsappMessage: string;
  }[];
  suggestedAudience: {
    interests: string[];
    ageRange: string;
    locations: string[];
  };
}

interface SaleAdsTabProps {
  products: ProductItem[];
  adminWhatsAppPhone?: string;
}

export default function SaleAdsTab({ products, adminWhatsAppPhone = '522212345678' }: SaleAdsTabProps) {
  // Estado de selección de producto
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ángulo e idea libre
  const [userIdea, setUserIdea] = useState('');
  const [selectedPresetAngle, setSelectedPresetAngle] = useState<string>('desire');
  
  // Formato visual (1:1 Cuadrado Feed vs 9:16 Vertical Stories/TikTok)
  const [formatRatio, setFormatRatio] = useState<'1:1' | '9:16'>('1:1');
  const [targetGoal, setTargetGoal] = useState<'whatsapp' | 'store'>('whatsapp');
  
  // Estado de generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [adResult, setAdResult] = useState<AdConcept | null>(null);
  const [selectedCopyIndex, setSelectedCopyIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  
  // Personalización del Render en vivo
  const [customHeadline, setCustomHeadline] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [activeBackground, setActiveBackground] = useState<string>('luxury_marble');

  // Conexiones Meta & TikTok
  const [metaConnected, setMetaConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Referencia para exportar la imagen
  const adCardRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Presets de ideas de venta rápida
  const presetAngles = [
    { id: 'desire', label: '✨ Deseo / Sensorial', idea: 'Aroma irresistible que dura todo el día y te hace destacar a donde vayas.' },
    { id: 'gift', label: '🎁 Regalo / Detalle', idea: 'El detalle perfecto y elegante para tu novia, amiga o intercambio por menos de $100.' },
    { id: 'urgency', label: '🔥 Stock Limitado', idea: 'Últimas piezas en stock físico para entrega inmediata en Puebla hoy mismo.' },
    { id: 'pocket', label: '👜 Lujo de Bolsillo', idea: 'Tu perfume favorito en versión portátil para llevar a la oficina o universidad.' },
  ];

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleApplyPreset = (angleId: string, ideaText: string) => {
    setSelectedPresetAngle(angleId);
    setUserIdea(ideaText);
  };

  const getProductPrice = (p?: ProductItem | null) => {
    if (!p) return 0;
    return p.publicPrice !== undefined ? p.publicPrice : (p.price || 0);
  };

  const handleGenerateAd = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setAdResult(null);

    const price = getProductPrice(selectedProduct);

    try {
      const res = await fetch('/api/admin/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            title: selectedProduct.title,
            price: price,
            stock: selectedProduct.stock || 1,
            category: selectedProduct.category,
            description: selectedProduct.description,
          },
          userIdea: userIdea.trim(),
          targetGoal,
        }),
      });

      const data = await res.json();
      if (data.success && data.ad) {
        setAdResult(data.ad);
        setCustomHeadline(data.ad.headline);
        setCustomBadge(data.ad.badge);
        setCustomPrice(price);
        setActiveBackground(data.ad.aestheticScene.backgroundStyle || 'luxury_marble');
        setSelectedCopyIndex(0);
      } else {
        alert(data.error || 'Error al generar la campaña');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error de conexión al generar el anuncio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCreative = async () => {
    if (!adCardRef.current) return;
    setDownloadingImg(true);
    try {
      const dataUrl = await toJpeg(adCardRef.current, {
        quality: 0.95,
        pixelRatio: 2, // Ultra HD
      });
      const link = document.createElement('a');
      link.download = `FoxAds_${selectedProduct?.title.slice(0, 15).replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exportando creativo:', err);
      alert('No se pudo descargar la imagen');
    } finally {
      setDownloadingImg(false);
    }
  };

  const handleCopyCopywriting = () => {
    if (!adResult) return;
    const currentCopy = adResult.copyVariations[selectedCopyIndex] || adResult.copyVariations[0];
    const fullText = `${currentCopy.hook}\n\n${currentCopy.body}\n\n👉 ${
      targetGoal === 'whatsapp'
        ? `Pide el tuyo por WhatsApp aquí: https://wa.me/${adminWhatsAppPhone}?text=${encodeURIComponent(currentCopy.whatsappMessage)}`
        : `Consíguelo en línea con entrega inmediata: https://foxdrop.mx/producto/${selectedProduct?.id}`
    }`;

    navigator.clipboard.writeText(fullText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Fondos publicitarios dinámicos
  const backgroundThemes: Record<string, string> = {
    luxury_marble: 'bg-gradient-to-br from-stone-900 via-stone-800 to-black text-white border-amber-500/20',
    tropical_fresh: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white border-teal-500/20',
    neon_night: 'bg-gradient-to-br from-purple-950 via-slate-900 to-black text-white border-purple-500/30',
    minimal_pastel: 'bg-gradient-to-br from-amber-50 via-rose-50 to-orange-100 text-stone-900 border-orange-200',
    warm_cozy: 'bg-gradient-to-br from-stone-800 via-amber-950 to-stone-900 text-white border-amber-600/30',
    clean_studio: 'bg-gradient-to-b from-slate-100 to-white text-stone-900 border-slate-300 shadow-2xl',
  };

  const isLightBackground = activeBackground === 'minimal_pastel' || activeBackground === 'clean_studio';

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ENCABEZADO Y STATUS ESTILO SALEADS */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">FoxAds AI</h2>
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider">
                SaleADS Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generador autónomo de creativos publicitarios, copys de alta conversión y campañas multicanal.
            </p>
          </div>
        </div>

        {/* Canales Conectados */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowConnectModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
              metaConnected 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-blue-500/50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${metaConnected ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
            Meta Ads (IG & FB)
          </button>

          <button
            onClick={() => setShowConnectModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
              tiktokConnected 
                ? 'bg-pink-600/20 text-pink-400 border-pink-500/40' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-pink-500/50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${tiktokConnected ? 'bg-pink-400 animate-pulse' : 'bg-slate-500'}`} />
            TikTok Ads
          </button>
        </div>
      </div>

      {/* 2. LAYOUT PRINCIPAL: CREADOR (IZQ) & PREVIEW VIVO (DER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: CONTROLES DEL ANUNCIO (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* PASO 1: SELECCIONAR PRODUCTO DEL STOCK */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#E65F2B]" /> 1. Elige el Producto de tu Bodega
              </label>
              <span className="text-[11px] font-medium text-stone-400">
                {products.length} productos disponibles
              </span>
            </div>

            {/* Buscador Rápido */}
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-[#E65F2B] transition"
            />

            {/* Grid de productos para selección con 1 clic */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
              {filteredProducts.slice(0, 12).map((p) => {
                const isSelected = p.id === selectedProductId;
                const img = p.image || p.images?.[0] || '/logo.png';
                const pPrice = getProductPrice(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setCustomPrice(pPrice);
                    }}
                    className={`p-2 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      isSelected
                        ? 'border-[#E65F2B] bg-orange-50/60 shadow-sm ring-1 ring-[#E65F2B]'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={img} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-stone-900 truncate">{p.title}</p>
                      <p className="text-[10px] font-black text-[#E65F2B]">${pPrice} MXN</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 2: ÁNGULO E IDEA DE CAMPAÑA */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> 2. ¿Cuál es la Idea o Ángulo de este Anuncio?
              </label>
              <span className="text-[11px] text-stone-400">SaleADS Prompting</span>
            </div>

            {/* Botones de Ángulos Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presetAngles.map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => handleApplyPreset(angle.id, angle.idea)}
                  className={`p-2 rounded-xl text-left border text-[11px] font-bold transition ${
                    selectedPresetAngle === angle.id
                      ? 'border-[#E65F2B] bg-orange-50 text-[#E65F2B]'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>

            {/* Input de Idea Libre */}
            <div>
              <textarea
                rows={2}
                placeholder="Escribe la idea libre del post o déjalo así para usar el ángulo seleccionado..."
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-[#E65F2B] transition"
              />
            </div>

            {/* Formato y Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] font-bold text-stone-700 block mb-1.5">Formato del Creativo</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormatRatio('1:1')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      formatRatio === '1:1'
                        ? 'border-[#E65F2B] bg-orange-50 text-[#E65F2B]'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" /> 1:1 Feed
                  </button>
                  <button
                    onClick={() => setFormatRatio('9:16')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      formatRatio === '9:16'
                        ? 'border-[#E65F2B] bg-orange-50 text-[#E65F2B]'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> 9:16 Story
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-stone-700 block mb-1.5">Destino de la Venta</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTargetGoal('whatsapp')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      targetGoal === 'whatsapp'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => setTargetGoal('store')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      targetGoal === 'store'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Tienda Web
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÓN DISPARADOR DE LA IA */}
            <button
              onClick={handleGenerateAd}
              disabled={isGenerating || !selectedProduct}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#E65F2B] to-[#ff7d4d] text-white font-black text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Diseñando Escena & Redactando Campaña...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar Anuncio de Alto Rendimiento
                </>
              )}
            </button>
          </div>

          {/* PASO 3: COPYWRITING PERSUASIVO */}
          {adResult && (
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-blue-600" /> Textos del Anuncio (Copywriting AIDA)
                </label>
                <button
                  onClick={handleCopyCopywriting}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Texto Completo
                    </>
                  )}
                </button>
              </div>

              {/* Selector de Variaciones */}
              <div className="flex items-center gap-2">
                {adResult.copyVariations.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCopyIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      selectedCopyIndex === idx
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    Variación #{idx + 1}
                  </button>
                ))}
              </div>

              {/* Caja del Copy Activo */}
              {adResult.copyVariations[selectedCopyIndex] && (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Gancho de los primeros 3 segundos (Hook)
                    </span>
                    <p className="font-black text-stone-900 mt-0.5">
                      {adResult.copyVariations[selectedCopyIndex].hook}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Cuerpo del Anuncio
                    </span>
                    <p className="text-stone-700 whitespace-pre-line mt-0.5">
                      {adResult.copyVariations[selectedCopyIndex].body}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Send className="w-3 h-3" /> Mensaje automático que enviará el cliente:
                    </span>
                    <span className="text-stone-500 italic max-w-xs truncate">
                      "{adResult.copyVariations[selectedCopyIndex].whatsappMessage}"
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA: PREVIEW EN VIVO Y RENDER (5 COLS) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-600" /> Vista Previa del Creativo
              </span>

              {/* Botón Descargar HD */}
              <button
                onClick={handleDownloadCreative}
                disabled={downloadingImg || !selectedProduct}
                className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
              >
                {downloadingImg ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Descargar HD
              </button>
            </div>

            {/* SELECTOR DE ESTILOS DE FONDO */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
              {Object.keys(backgroundThemes).map((bgKey) => (
                <button
                  key={bgKey}
                  onClick={() => setActiveBackground(bgKey)}
                  className={`px-2.5 py-1 rounded-lg border capitalize whitespace-nowrap transition ${
                    activeBackground === bgKey
                      ? 'border-[#E65F2B] bg-orange-50 text-[#E65F2B]'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {bgKey.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* LIENZO / CARD DEL ANUNCIO RENDERIZABLE */}
            <div className="flex justify-center bg-stone-100 p-3 rounded-2xl border border-stone-200 overflow-hidden">
              <div
                ref={adCardRef}
                className={`relative overflow-hidden transition-all duration-300 flex flex-col justify-between p-6 shadow-2xl border ${
                  formatRatio === '1:1' ? 'w-[340px] h-[340px] rounded-3xl' : 'w-[280px] h-[497px] rounded-3xl'
                } ${backgroundThemes[activeBackground] || backgroundThemes.luxury_marble}`}
              >
                {/* 1. Header del Anuncio: Badge & Urgencia */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="bg-[#E65F2B] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    {customBadge || 'EDICIÓN ESPECIAL'}
                  </span>
                  <span className={`text-[9px] font-bold tracking-tight opacity-90 ${isLightBackground ? 'text-stone-700' : 'text-stone-300'}`}>
                    {adResult?.urgencyText || 'Stock Físico en Puebla'}
                  </span>
                </div>

                {/* 2. Cuerpo Central: Foto Flotante del Producto con Efectos */}
                <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                  <div className="relative group">
                    {/* Resplandor de fondo */}
                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-90" />
                    <img
                      src={selectedProduct?.image || selectedProduct?.images?.[0] || '/logo.png'}
                      alt={selectedProduct?.title}
                      className="relative z-10 max-h-36 object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] transform hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Sello de Precio Gigante */}
                  <div className="mt-2 text-center">
                    <span className="inline-block bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20 text-white font-black text-sm shadow-xl">
                      ${customPrice || getProductPrice(selectedProduct)} MXN
                    </span>
                  </div>
                </div>

                {/* 3. Footer del Anuncio: Titular + CTA */}
                <div className="relative z-10 space-y-2 text-center">
                  <div>
                    <h3 className={`text-base font-black leading-tight tracking-tight ${isLightBackground ? 'text-stone-900' : 'text-white'}`}>
                      {customHeadline || selectedProduct?.title || 'Fragancia Original'}
                    </h3>
                    {adResult?.subheadline && (
                      <p className={`text-[10px] mt-0.5 line-clamp-1 opacity-80 ${isLightBackground ? 'text-stone-600' : 'text-stone-300'}`}>
                        {adResult.subheadline}
                      </p>
                    )}
                  </div>

                  {/* Botón CTA Visual */}
                  <div className="w-full py-2 px-4 rounded-xl bg-white text-stone-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider">
                    {targetGoal === 'whatsapp' ? (
                      <>
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        {adResult?.callToAction || 'Pedir por WhatsApp'}
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 text-[#E65F2B]" />
                        {adResult?.callToAction || 'Comprar en Tienda'}
                      </>
                    )}
                  </div>
                </div>

                {/* Textura o Marca de Agua Discreta */}
                <div className="absolute bottom-2 right-3 z-0 opacity-20 text-[9px] font-black uppercase tracking-widest text-white">
                  FoxDrop.mx
                </div>
              </div>
            </div>

            {/* EDICIÓN RÁPIDA DE TEXTOS DEL CREATIVO */}
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <span className="text-[11px] font-bold text-stone-700 block">Personalizar Titulares del Creativo:</span>
              <input
                type="text"
                placeholder="Titular en el anuncio"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Sello (Badge)"
                  value={customBadge}
                  onChange={(e) => setCustomBadge(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50"
                />
                <input
                  type="number"
                  placeholder="Precio especial"
                  value={customPrice || ''}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL DE CONEXIÓN A META ADS Y TIKTOK ADS */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#E65F2B]" /> Conectar Canales de Pauta
              </h3>
              <button 
                onClick={() => setShowConnectModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Conecta tus cuentas oficiales para lanzar tus anuncios y campañas directamente desde FoxDrop con 1 clic sin entrar al Administrador de Anuncios:
            </p>

            <div className="space-y-3">
              {/* META ADS */}
              <div className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                    f
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Meta Ads (Instagram & Facebook)</h4>
                    <p className="text-[10px] text-stone-500">Páginas, Catálogo & WhatsApp Ads</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMetaConnected(!metaConnected);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    metaConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {metaConnected ? 'Conectado ✓' : 'Conectar'}
                </button>
              </div>

              {/* TIKTOK ADS */}
              <div className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black">
                    ♪
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">TikTok for Business</h4>
                    <p className="text-[10px] text-stone-500">TikTok Feed & Spark Ads</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTiktokConnected(!tiktokConnected);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    tiktokConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-black text-white hover:bg-stone-800'
                  }`}
                >
                  {tiktokConnected ? 'Conectado ✓' : 'Conectar'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              💡 <strong>Modo Asistido Activo:</strong> Puedes descargar los creativos en alta resolución y copiar los textos hoy mismo para publicar en Instagram Reels, Historias, Marketplace o tus estados de WhatsApp sin costo alguno.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
