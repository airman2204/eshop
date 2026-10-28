'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Megaphone, Plus, Calendar, Tag, Percent, QrCode, Eye, CheckCircle2, 
  XCircle, Clock, Printer, Download, RefreshCw, Search, Sliders, 
  ExternalLink, Sparkles, AlertTriangle, Check, Layers, ChevronRight, X
} from 'lucide-react';
import { MarketingCampaign, CampaignCoupon } from '@/types';
import { fetchAdminCustomApi } from '@/lib/adminAuth';

interface AdminCampaignsTabProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AdminCampaignsTab({ onNotify }: AdminCampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtros de cupones
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scanned' | 'redeemed' | 'disabled'>('all');

  // Modal para nueva campaña
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('Halloween 2026 - Stickers Dulce o Truco');
  const [newPrefix, setNewPrefix] = useState('HAL-FOX');
  const [newQuantity, setNewQuantity] = useState(100);
  const [newDiscount, setNewDiscount] = useState(15);
  const [newExpiresAt, setNewExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(23, 59, 59, 0);
    return d.toISOString().slice(0, 16);
  });

  // Modal de Impresión Tabloide
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [tabloidSheetIndex, setTabloidSheetIndex] = useState(0);
  const [qrPosition, setQrPosition] = useState<'center_bottom' | 'center_total' | 'bottom_right'>('center_bottom');
  const [qrSizeMm, setQrSizeMm] = useState<number>(24); // 24 mm = 2.4 cm
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generatingQrs, setGeneratingQrs] = useState(false);

  // Cargar campañas desde la API
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetchAdminCustomApi('/api/admin/campaigns');
      const res = await response.json();
      if (res && res.success && Array.isArray(res.campaigns)) {
        setCampaigns(res.campaigns);
        if (res.campaigns.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(res.campaigns[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error cargando campañas:', err);
      if (onNotify) onNotify('Error al cargar campañas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  // Generar dataURLs para los códigos QR cuando se abre el modal de impresión
  useEffect(() => {
    if (showPrintModal && currentCampaign && currentCampaign.coupons?.length > 0) {
      generateAllQrImages(currentCampaign.coupons);
    }
  }, [showPrintModal, currentCampaign?.id]);

  const generateAllQrImages = async (coupons: CampaignCoupon[]) => {
    setGeneratingQrs(true);
    const map: Record<string, string> = {};
    try {
      for (const coupon of coupons) {
        const url = coupon.qrPayloadUrl || `https://foxdrop.mx/?promo=${coupon.code}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
        map[coupon.code] = dataUrl;
      }
      setQrDataUrls(map);
    } catch (err) {
      console.warn('Error generando imágenes QR:', err);
    } finally {
      setGeneratingQrs(false);
    }
  };

  // Crear nueva campaña
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setSaving(true);
    try {
      const response = await fetchAdminCustomApi('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: newCampaignName,
          prefix: newPrefix,
          quantity: newQuantity,
          discountPercent: newDiscount,
          expiresAt: new Date(newExpiresAt).toISOString(),
          bannerTitle: '🎃 ¡Dulce o Truco FoxDrop!',
          bannerMessage: `¡Felicidades! Escaneaste tu sticker exclusivo. Tienes ${newDiscount}% de descuento aplicado a tu compra.`,
          ctaText: '¡Aprovechar Descuento!',
          singleUse: true,
        }),
      });
      const res = await response.json();

      if (res && res.success && res.campaign) {
        if (onNotify) onNotify(`Campaña creada con ${res.campaign.totalQrs} cupones QRs`, 'success');
        setShowNewModal(false);
        await loadCampaigns();
        setSelectedCampaignId(res.campaign.id);
      } else {
        throw new Error(res?.error || 'Error al crear campaña');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Guardar cambios de configuración de la campaña seleccionada
  const handleUpdateSettings = async (updates: Partial<MarketingCampaign>) => {
    if (!currentCampaign) return;
    setSaving(true);
    try {
      const response = await fetchAdminCustomApi('/api/admin/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({
          campaignId: currentCampaign.id,
          action: 'update_settings',
          updates,
        }),
      });
      const res = await response.json();

      if (res && res.success) {
        if (onNotify) onNotify('Configuración de campaña actualizada', 'success');
        setCampaigns(prev => prev.map(c => c.id === currentCampaign.id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
      }
    } catch (err: any) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Activar/Desactivar un cupón individual
  const handleToggleCoupon = async (code: string, currentState: boolean) => {
    if (!currentCampaign) return;
    try {
      const nextState = !currentState;
      // Optimistic update
      setCampaigns(prev => prev.map(c => {
        if (c.id === currentCampaign.id) {
          return {
            ...c,
            coupons: c.coupons.map(cp => cp.code === code ? { ...cp, isActive: nextState } : cp),
          };
        }
        return c;
      }));

      await fetchAdminCustomApi('/api/admin/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({
          campaignId: currentCampaign.id,
          action: 'toggle_coupon',
          couponCode: code,
          activeState: nextState,
        }),
      });
    } catch (err: any) {
      console.warn('Error al cambiar estado de cupón:', err);
      loadCampaigns();
    }
  };

  // Activar o desactivar todos
  const handleToggleAllCoupons = async (activeState: boolean) => {
    if (!currentCampaign) return;
    if (!confirm(`¿Seguro que deseas ${activeState ? 'ACTIVAR' : 'DESACTIVAR'} todos los cupones de esta campaña?`)) return;

    try {
      setCampaigns(prev => prev.map(c => {
        if (c.id === currentCampaign.id) {
          return {
            ...c,
            coupons: c.coupons.map(cp => ({ ...cp, isActive: activeState })),
          };
        }
        return c;
      }));

      await fetchAdminCustomApi('/api/admin/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({
          campaignId: currentCampaign.id,
          action: 'toggle_all_coupons',
          activeState,
        }),
      });
      if (onNotify) onNotify(`Cupones ${activeState ? 'activados' : 'desactivados'} en lote`, 'info');
    } catch (err: any) {
      console.warn('Error en toggle masivo:', err);
      loadCampaigns();
    }
  };

  // Filtrado de cupones
  const filteredCoupons = (currentCampaign?.coupons || []).filter(c => {
    const matchesSearch = !searchTerm || c.code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'active') return c.isActive && !c.redeemed;
    if (statusFilter === 'scanned') return (c.scanCount || 0) > 0;
    if (statusFilter === 'redeemed') return c.redeemed;
    if (statusFilter === 'disabled') return !c.isActive && !c.redeemed;
    return true;
  });

  // Cálculos de métricas de la campaña activa
  const totalQrs = currentCampaign?.coupons?.length || 0;
  const totalScans = (currentCampaign?.coupons || []).reduce((sum, c) => sum + (c.scanCount || 0), 0);
  const totalRedemptions = (currentCampaign?.coupons || []).filter(c => c.redeemed).length;
  const conversionRate = totalScans > 0 ? ((totalRedemptions / totalScans) * 100).toFixed(1) : '0';
  const activeAvailable = (currentCampaign?.coupons || []).filter(c => c.isActive && !c.redeemed).length;

  // Distribución de stickers por hoja Tabloide (12 stickers por hoja: 3 columnas x 4 filas)
  const STICKERS_PER_TABLOID = 12;
  const totalTabloidSheets = Math.ceil(totalQrs / STICKERS_PER_TABLOID) || 1;
  const currentSheetCoupons = (currentCampaign?.coupons || []).slice(
    tabloidSheetIndex * STICKERS_PER_TABLOID,
    (tabloidSheetIndex + 1) * STICKERS_PER_TABLOID
  );

  const STICKER_VARIANTS = [
    { name: 'Hechicero', img: '/campaigns/stickers/hechicero.png' },
    { name: 'Vampiro', img: '/campaigns/stickers/vampiro.png' },
    { name: 'Calabaza', img: '/campaigns/stickers/calabaza.png' },
  ];

  const handlePrintSheet = () => {
    const sheetEl = document.getElementById('printable-tabloid-sheet');
    if (!sheetEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const cleanSheet = sheetEl.cloneNode(true) as HTMLElement;

    const htmlContent = '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '<meta charset="utf-8">' +
      '<title>FoxDrop - Hoja Tabloide ' + (tabloidSheetIndex + 1) + ' (27.9 x 43.2 cm)</title>' +
      '<style>' +
      '  @page {' +
      '    size: 27.9cm 43.2cm;' +
      '    margin: 0;' +
      '  }' +
      '  html, body {' +
      '    margin: 0 !important;' +
      '    padding: 0 !important;' +
      '    width: 27.9cm !important;' +
      '    height: 43.2cm !important;' +
      '    background: #FAF6F0 !important;' +
      '    -webkit-print-color-adjust: exact !important;' +
      '    print-color-adjust: exact !important;' +
      '    box-sizing: border-box;' +
      '    display: flex;' +
      '    justify-content: center;' +
      '    align-items: center;' +
      '    overflow: hidden;' +
      '    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '  }' +
      '  * { box-sizing: border-box; }' +
      '  #printable-tabloid-sheet {' +
      '    width: 27.9cm !important;' +
      '    height: 43.2cm !important;' +
      '    max-width: 27.9cm !important;' +
      '    max-height: 43.2cm !important;' +
      '    padding: 1.6cm 1.5cm !important;' +
      '    margin: 0 !important;' +
      '    border: none !important;' +
      '    box-shadow: none !important;' +
      '    display: flex !important;' +
      '    flex-direction: column !important;' +
      '    justify-content: space-between !important;' +
      '    background: #FAF6F0 !important;' +
      '  }' +
      '  .tabloid-grid {' +
      '    display: grid !important;' +
      '    grid-template-columns: repeat(3, 1fr) !important;' +
      '    gap: 1.0cm 0.8cm !important;' +
      '    align-items: center !important;' +
      '    justify-items: center !important;' +
      '    width: 100% !important;' +
      '  }' +
      '</style>' +
      '<script src="https://cdn.tailwindcss.com"></script>' +
      '</head>' +
      '<body>' +
      cleanSheet.outerHTML +
      '<script>' +
      '  setTimeout(function() { window.print(); }, 600);' +
      '</script>' +
      '</body>' +
      '</html>';

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  return (
    <div className="space-y-6">

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. ENCABEZADO Y ACCIONES PRINCIPALES */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700/80 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white tracking-tight">Campañas & Cupones QR</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] border border-amber-500/30">
                Marketing Phygital
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera 100 stickers con QRs únicos de un solo uso, vigencia y hojas tabloide para imprenta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            disabled={!currentCampaign || totalQrs === 0}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Centro de Impresión Tabloide (27.9 × 43.2 cm)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#E65F2B] hover:bg-[#d45322] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Campaña (100 QRs)</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. SELECTOR DE CAMPAÑA & TARJETAS DE MÉTRICAS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {campaigns.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 shrink-0">Campaña:</span>
          {campaigns.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCampaignId(c.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
                c.id === currentCampaign?.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              {c.name} ({c.discountPercent}% OFF)
            </button>
          ))}
        </div>
      )}

      {currentCampaign && (
        <>
          {/* Tarjetas de Métricas en Tiempo Real */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-indigo-400" /> QRs Totales
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">{totalQrs}</span>
                <span className="text-[10px] text-slate-500 block">Stickers generados</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-400" /> Escaneos Reales
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-sky-400">{totalScans}</span>
                <span className="text-[10px] text-slate-500 block">Visitas a tienda con QR</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Canjeados (Ventas)
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-400">{totalRedemptions}</span>
                <span className="text-[10px] text-slate-500 block">Pedidos completados</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-400" /> Conversión
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-amber-300">{conversionRate}%</span>
                <span className="text-[10px] text-slate-500 block">Escaneo vs Compra</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" /> Disponibles
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-teal-400">{activeAvailable}</span>
                <span className="text-[10px] text-slate-500 block">Listos para redimir</span>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* 3. PANEL DE CONFIGURACIÓN DE LA CAMPAÑA (EDITABLE EN TIEMPO REAL) */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Configuración de Campaña: {currentCampaign.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica el descuento, la vigencia y el banner en cualquier momento sin alterar los QRs impresos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                  currentCampaign.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {currentCampaign.isActive ? '🟢 Campaña Activa' : '🔴 Campaña Pausada'}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ isActive: !currentCampaign.isActive })}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  {currentCampaign.isActive ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Porcentaje de Descuento */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Porcentaje de Descuento Exclusivo
                </label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleUpdateSettings({ discountPercent: pct })}
                      className={`flex-1 py-2 rounded-xl font-black text-xs transition border ${
                        currentCampaign.discountPercent === pct
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  ))}
                  <div className="relative w-20">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={currentCampaign.discountPercent}
                      onChange={e => handleUpdateSettings({ discountPercent: parseInt(e.target.value, 10) || 10 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-center text-xs font-black text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Vigencia / Fecha de Expiración */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Vigencia (Fecha y Hora Límite)
                </label>
                <input
                  type="datetime-local"
                  value={currentCampaign.expiresAt ? currentCampaign.expiresAt.slice(0, 16) : ''}
                  onChange={e => {
                    if (e.target.value) {
                      handleUpdateSettings({ expiresAt: new Date(e.target.value).toISOString() });
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Un solo uso toggle */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Regla de Redención
                </label>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Un solo uso por cupón</span>
                    <span className="text-[10px] text-slate-400">Se desactiva al completar compra</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                    Activado
                  </span>
                </div>
              </div>
            </div>

            {/* Banner de Bienvenida preview */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎃</span>
                <div>
                  <span className="font-extrabold text-amber-300 block">
                    Banner de bienvenida que ve el cliente al escanear:
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    "{currentCampaign.bannerTitle} — {currentCampaign.bannerMessage}"
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg shrink-0">
                Auto-aplica {currentCampaign.discountPercent}% en Carrito
              </span>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* 4. LISTA Y GESTIÓN DE LOS 100 CUPONES */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Listado de Cupones ({filteredCoupons.length})</h3>
                <span className="text-[11px] text-slate-500 font-mono">1 por cada sticker impreso</span>
              </div>

              {/* Buscador y Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar código..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 w-36 sm:w-44"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Activos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('scanned')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusFilter === 'scanned' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Escaneados
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('redeemed')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusFilter === 'redeemed' ? 'bg-slate-300 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Redimidos
                  </button>
                </div>

                {/* Acciones masivas */}
                <button
                  type="button"
                  onClick={() => handleToggleAllCoupons(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-extrabold border border-slate-700"
                  title="Activar todos los cupones no redimidos"
                >
                  Activar Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllCoupons(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-[10px] font-extrabold border border-slate-700"
                  title="Pausar todos los cupones"
                >
                  Pausar Todos
                </button>
              </div>
            </div>

            {/* Tabla de cupones */}
            <div className="overflow-x-auto max-h-[500px] rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/90 text-slate-400 font-extrabold text-[10px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Código</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Escaneos</th>
                    <th className="py-2.5 px-3">Último Escaneo</th>
                    <th className="py-2.5 px-3">Redención / Pedido</th>
                    <th className="py-2.5 px-3 text-right">Interruptor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron cupones con ese filtro
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon, idx) => (
                      <tr key={coupon.code} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-mono font-black text-amber-300 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-normal">#{idx + 1}</span>
                          <span>{coupon.code}</span>
                          <a
                            href={coupon.qrPayloadUrl || `https://foxdrop.mx/?promo=${coupon.code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-amber-400 p-0.5 rounded transition"
                            title="Probar enlace de escaneo"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>

                        <td className="py-2.5 px-3">
                          {coupon.redeemed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-extrabold text-[10px] border border-slate-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Redimido (Usado)
                            </span>
                          ) : !coupon.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 font-bold text-[10px] border border-rose-800/60">
                              <XCircle className="w-3 h-3" /> Desactivado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-bold text-[10px] border border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-bold">
                          <span className={`${coupon.scanCount > 0 ? 'text-sky-400 font-black' : 'text-slate-500'}`}>
                            {coupon.scanCount || 0} {coupon.scanCount === 1 ? 'escaneo' : 'escaneos'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {coupon.lastScannedAt ? (
                            <span>{new Date(coupon.lastScannedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {coupon.redeemed ? (
                            <div>
                              <span className="font-extrabold text-emerald-400 block">{coupon.orderNumber || 'Pedido web'}</span>
                              <span className="text-[10px] text-slate-500">
                                {coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">Sin canjear</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            disabled={coupon.redeemed}
                            onClick={() => handleToggleCoupon(coupon.code, coupon.isActive)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition disabled:opacity-30 ${
                              coupon.isActive
                                ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700'
                                : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700'
                            }`}
                          >
                            {coupon.isActive ? 'Pausar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: CENTRO DE IMPRESIÓN TABLOIDE (11 X 17 PULGADAS / 27.9 X 43.2 CM) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showPrintModal && currentCampaign && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#121624] border border-slate-700 rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header del modal */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Hojas Tabloide (27.9 × 43.2 cm) — Medio Corte Stickers</h3>
                  <p className="text-xs text-slate-400">
                    Hoja {tabloidSheetIndex + 1} de {totalTabloidSheets} • 12 stickers redondos por hoja tabloide
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSheet}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Ajuste de Diseño (Posición y Tamaño del QR) */}
            <div className="p-3 sm:px-6 bg-[#181e30] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="font-bold text-slate-300">Acomodo del QR:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setQrPosition('center_bottom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${qrPosition === 'center_bottom' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Centrado Abajo (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrPosition('center_total')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${qrPosition === 'center_total' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Centro Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrPosition('bottom_right')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${qrPosition === 'bottom_right' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Original (Derecha)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">Tamaño QR:</span>
                  <input
                    type="range"
                    min="18"
                    max="32"
                    value={qrSizeMm}
                    onChange={e => setQrSizeMm(parseInt(e.target.value, 10))}
                    className="w-24 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-amber-300 font-bold">{qrSizeMm} mm</span>
                </div>
              </div>

              {/* Selector de Hoja Tabloide */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={tabloidSheetIndex === 0}
                  onClick={() => setTabloidSheetIndex(prev => Math.max(0, prev - 1))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold"
                >
                  ‹ Anterior
                </button>
                <span className="font-mono text-slate-300 font-bold px-2">
                  Hoja {tabloidSheetIndex + 1} / {totalTabloidSheets}
                </span>
                <button
                  type="button"
                  disabled={tabloidSheetIndex >= totalTabloidSheets - 1}
                  onClick={() => setTabloidSheetIndex(prev => Math.min(totalTabloidSheets - 1, prev + 1))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold"
                >
                  Siguiente ›
                </button>
              </div>
            </div>

            {/* Contenedor Imprimible de la Hoja Tabloide (11 x 17 in) */}
            <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-950">
              
              {/* LIENZO TABLOIDE (ESCALADO VISUALMENTE, LISTO PARA IMPRIMIR) */}
              <div 
                id="printable-tabloid-sheet"
                className="bg-[#FAF6F0] text-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col justify-between border border-slate-300 print:border-none print:shadow-none print:m-0"
                style={{
                  width: '100%',
                  maxWidth: '780px',
                  minHeight: '1080px',
                  aspectRatio: '11 / 17',
                }}
              >
                {/* Cabecera Técnica para la Imprenta */}
                <div className="border-b-2 border-slate-300 pb-3 mb-4 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-black text-[#0F3E36] text-sm uppercase tracking-wider">
                      FOXDROP MÉXICO — HOJA TABLOIDE (27.9 × 43.2 cm)
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Campaña: <strong>{currentCampaign.name}</strong> • Medio Corte / Suaje Circular • Hoja {tabloidSheetIndex + 1} de {totalTabloidSheets}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#E65F2B] text-xs">Descuento: {currentCampaign.discountPercent}% OFF</span>
                    <span className="block text-[10px] text-slate-500">Cada QR es único e intransferible</span>
                  </div>
                </div>

                {/* MATRIZ DE 12 STICKERS (3 COLUMNAS x 4 FILAS) */}
                <div className="tabloid-grid grid grid-cols-3 gap-y-6 gap-x-4 flex-1 items-center justify-items-center">
                  {currentSheetCoupons.map((coupon, i) => {
                    const variant = STICKER_VARIANTS[i % STICKER_VARIANTS.length];
                    const qrImg = qrDataUrls[coupon.code];

                    return (
                      <div
                        key={coupon.code}
                        className="relative flex flex-col items-center justify-center p-2 group"
                        style={{ width: '100%', maxWidth: '210px' }}
                      >
                        {/* Círculo Guía de Medio Corte / Troquel */}
                        <div className="relative rounded-full aspect-square w-full max-w-[195px] overflow-hidden shadow-md border-2 border-dashed border-[#DF7F2D]/60 flex items-center justify-center bg-[#0d2a23]">
                          
                          {/* Ilustración del Sticker */}
                          <img
                            src={variant.img}
                            alt={variant.name}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />

                          {/* QR SOBREPUESTO EN ALTA DEFINICIÓN SEGÚN LA POSICIÓN ELEGIDA */}
                          {qrImg && (
                            <div
                              className={`absolute z-10 flex flex-col items-center justify-center bg-white p-1 rounded-xl shadow-lg border border-slate-300 ${
                                qrPosition === 'center_bottom'
                                  ? 'bottom-3 inset-x-0 mx-auto'
                                  : qrPosition === 'center_total'
                                  ? 'inset-0 m-auto'
                                  : 'top-1/2 -translate-y-1/2 right-3'
                              }`}
                              style={{
                                width: `${qrSizeMm * 2.2}px`,
                                height: `${qrSizeMm * 2.2}px`,
                              }}
                            >
                              <img
                                src={qrImg}
                                alt={`QR ${coupon.code}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>

                        
                      </div>
                    );
                  })}
                </div>

                {/* Pie de Página para Imprenta */}
                <div className="border-t-2 border-slate-300 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>Preparado para Impresión en Vinil Adhesivo / Papel Sticker • Resolución 300 DPI</span>
                  <span>FOXDROP MÉXICO • www.foxdrop.mx</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: NUEVA CAMPAÑA */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">Crear Nueva Campaña QR</h3>
                <p className="text-xs text-slate-400">Genera 100 cupones únicos para tus stickers físicos</p>
              </div>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nombre de la Campaña</label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  placeholder="Ej. Halloween 2026 - Stickers Dulce o Truco"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Prefijo de Código</label>
                  <input
                    type="text"
                    required
                    value={newPrefix}
                    onChange={e => setNewPrefix(e.target.value.toUpperCase())}
                    placeholder="HAL-FOX"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Ej. HAL-FOX-001 ... 100</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cantidad de Stickers</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newQuantity}
                    onChange={e => setNewQuantity(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Descuento (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={newDiscount}
                      onChange={e => setNewDiscount(parseInt(e.target.value, 10) || 15)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">% OFF</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Fecha de Expiración</label>
                  <input
                    type="datetime-local"
                    value={newExpiresAt}
                    onChange={e => setNewExpiresAt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Generando QRs...' : 'Generar 100 Cupones'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
