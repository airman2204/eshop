'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Megaphone, Plus, Calendar, Tag, Percent, QrCode, Eye, CheckCircle2, 
  XCircle, Clock, Printer, Download, RefreshCw, Search, Sliders, 
  ExternalLink, Sparkles, AlertTriangle, Check, Layers, ChevronRight, X,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { MarketingCampaign, CampaignCoupon } from '@/types';
import { fetchAdminCustomApi } from '@/lib/adminAuth';
import { uploadProductImage } from '@/lib/storage';

interface AdminCampaignsTabProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}


export type PaperFormat = 'tabloide' | 'carta' | 'oficio' | 'a4';

interface PaperSpec {
  id: PaperFormat;
  name: string;
  shortName: string;
  widthMm: number;
  heightMm: number;
  sizeDesc: string;
  cols: number;
  rows: number;
  stickersCount: number;
  stickerDiameterMm: number;
  gapMm: string;
  paddingMm: string;
}

const PAPER_SPECS: Record<PaperFormat, PaperSpec> = {
  tabloide: {
    id: 'tabloide',
    name: 'Tabloide (11 × 17 in)',
    shortName: 'Tabloide',
    widthMm: 279,
    heightMm: 432,
    sizeDesc: '27.9 × 43.2 cm',
    cols: 3,
    rows: 4,
    stickersCount: 12,
    stickerDiameterMm: 76,
    gapMm: '8mm 6mm',
    paddingMm: '16mm 14mm',
  },
  carta: {
    id: 'carta',
    name: 'Carta (Letter)',
    shortName: 'Carta',
    widthMm: 216,
    heightMm: 279,
    sizeDesc: '21.6 × 27.9 cm',
    cols: 2,
    rows: 3,
    stickersCount: 6,
    stickerDiameterMm: 68,
    gapMm: '7mm 6mm',
    paddingMm: '12mm 10mm',
  },
  oficio: {
    id: 'oficio',
    name: 'Oficio (Legal)',
    shortName: 'Oficio',
    widthMm: 216,
    heightMm: 356,
    sizeDesc: '21.6 × 35.6 cm',
    cols: 2,
    rows: 4,
    stickersCount: 8,
    stickerDiameterMm: 70,
    gapMm: '8mm 6mm',
    paddingMm: '14mm 10mm',
  },
  a4: {
    id: 'a4',
    name: 'A4 Estándar',
    shortName: 'A4',
    widthMm: 210,
    heightMm: 297,
    sizeDesc: '21.0 × 29.7 cm',
    cols: 2,
    rows: 3,
    stickersCount: 6,
    stickerDiameterMm: 68,
    gapMm: '8mm 6mm',
    paddingMm: '12mm 10mm',
  },
};

export default function AdminCampaignsTab({ onNotify }: AdminCampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState<'calabaza' | 'vampiro' | 'hechicero' | null>(null);

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
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('tabloide');
  const [qrPosition, setQrPosition] = useState<'free' | 'center_bottom' | 'center_total' | 'bottom_right'>('free');
  const [qrOffsetX, setQrOffsetX] = useState<number>(0);
  const [qrOffsetY, setQrOffsetY] = useState<number>(26);
  const [qrSizeMm, setQrSizeMm] = useState<number>(24); // 24 mm = 2.4 cm
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generatingQrs, setGeneratingQrs] = useState(false);
  const [isDraggingQr, setIsDraggingQr] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initOffsetX: number; initOffsetY: number } | null>(null);

  const handleQrMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingQr(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initOffsetX: qrOffsetX,
      initOffsetY: qrOffsetY,
    };
  };

  useEffect(() => {
    if (!isDraggingQr) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      // Sensitivity factor: 1px movement ~ 0.5% offset
      const newX = Math.round(Math.max(-75, Math.min(75, dragStartRef.current.initOffsetX + deltaX * 0.55)));
      const newY = Math.round(Math.max(-75, Math.min(75, dragStartRef.current.initOffsetY + deltaY * 0.55)));

      setQrOffsetX(newX);
      setQrOffsetY(newY);
    };

    const handleMouseUp = () => {
      setIsDraggingQr(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingQr]);


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

  const handleUploadCouponDesign = async (variant: 'calabaza' | 'vampiro' | 'hechicero', file: File) => {
    if (!currentCampaign) return;
    setUploadingDesign(variant);
    try {
      const publicUrl = await uploadProductImage(file);
      const newDesigns = {
        ...(currentCampaign.couponDesigns || {}),
        [variant]: publicUrl,
      };
      await handleUpdateSettings({ couponDesigns: newDesigns });
      if (onNotify) onNotify(`Arte de ${variant} actualizado con éxito`, 'success');
    } catch (err: any) {
      console.error('Error al subir diseño de cupón:', err);
      if (onNotify) onNotify(err.message || 'Error al subir la imagen', 'error');
    } finally {
      setUploadingDesign(null);
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

  // Configuración dinámica según el formato de hoja seleccionado (Tabloide, Carta, Oficio, A4)
  const currentPaper = PAPER_SPECS[paperFormat];
  const stickersPerSheet = currentPaper.stickersCount;
  const totalTabloidSheets = Math.ceil(totalQrs / stickersPerSheet) || 1;
  const currentSheetCoupons = (currentCampaign?.coupons || []).slice(
    tabloidSheetIndex * stickersPerSheet,
    (tabloidSheetIndex + 1) * stickersPerSheet
  );

  const STICKER_VARIANTS = [
    { name: 'Hechicero', img: '/campaigns/stickers/hechicero.png' },
    { name: 'Vampiro', img: '/campaigns/stickers/vampiro.png' },
    { name: 'Calabaza', img: '/campaigns/stickers/calabaza.png' },
  ];

  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentPaper = PAPER_SPECS[paperFormat];

    // Build stickers markup cleanly with inline styles and exact mm measurements for the selected paper
    const stickersHtml = currentSheetCoupons.map((coupon, i) => {
      const variant = STICKER_VARIANTS[i % STICKER_VARIANTS.length];
      const qrImg = qrDataUrls[coupon.code] || '';
      const qrWidthMm = qrSizeMm;
      const diameterMm = currentPaper.stickerDiameterMm;

      return `
        <div class="sticker-cell">
          <div class="sticker-circle" style="width: ${diameterMm}mm; height: ${diameterMm}mm;">
            <img class="sticker-img" src="${variant.img}" alt="${variant.name}" />
            ${qrImg ? `
              <div class="sticker-qr" style="
                width: ${qrWidthMm}mm;
                height: ${qrWidthMm}mm;
                left: calc(50% + (${qrOffsetX} * ${(diameterMm / 100).toFixed(2)}mm) - (${qrWidthMm}mm / 2));
                top: calc(50% + (${qrOffsetY} * ${(diameterMm / 100).toFixed(2)}mm) - (${qrWidthMm}mm / 2));
              ">
                <img src="${qrImg}" alt="QR" />
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FoxDrop Stickers ${currentPaper.shortName} ${tabloidSheetIndex + 1}</title>
  <style>
    @page {
      size: ${currentPaper.widthMm}mm ${currentPaper.heightMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${currentPaper.widthMm}mm !important;
      height: ${currentPaper.heightMm}mm !important;
      background: #FFFFFF !important;
      overflow: hidden;
    }
    .sheet-container {
      width: ${currentPaper.widthMm}mm;
      height: ${currentPaper.heightMm}mm;
      padding: ${currentPaper.paddingMm};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #FFFFFF !important;
    }
    .stickers-grid {
      display: grid;
      grid-template-columns: repeat(${currentPaper.cols}, 1fr);
      grid-template-rows: repeat(${currentPaper.rows}, 1fr);
      gap: ${currentPaper.gapMm};
      width: 100%;
      height: 100%;
      align-items: center;
      justify-items: center;
    }
    .sticker-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    .sticker-circle {
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      background: #0d2a23;
    }
    .sticker-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .sticker-qr {
      position: absolute;
      background: #ffffff;
      padding: 2px;
      border-radius: 5px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }
    .sticker-qr img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <div class="stickers-grid">
      ${stickersHtml}
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

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
              Genera stickers con QRs únicos de un solo uso, vigencia personalizada y hojas tabloide para imprenta
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
            <span>Centro de Impresión de Stickers (Tabloide, Carta, Oficio)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#E65F2B] hover:bg-[#d45322] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Campaña QR</span>
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

            {/* Gestión de Artes de Cupones Digitales (Popup de Escaneo) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <ImageIcon className="w-3.5 h-3.5" /> Artes de Cupones Digitales (Popup al Escanear QR)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Sube o personaliza los 3 artes gráficos (1024 × 572 px) vinculados a cada personaje del sticker.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'calabaza' as const, name: 'Calabaza', emoji: '🎃', defaultImg: '/campaigns/coupons/calabaza.png' },
                  { key: 'vampiro' as const, name: 'Vampiro', emoji: '🧛', defaultImg: '/campaigns/coupons/vampiro.png' },
                  { key: 'hechicero' as const, name: 'Mago / Hechicero', emoji: '🧙‍♂️', defaultImg: '/campaigns/coupons/hechicero.png' },
                ].map((item) => {
                  const currentImg = currentCampaign.couponDesigns?.[item.key] || item.defaultImg;
                  const isUploading = uploadingDesign === item.key;

                  return (
                    <div key={item.key} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{item.emoji}</span> {item.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          {currentCampaign.couponDesigns?.[item.key] ? 'Personalizado' : 'Por defecto'}
                        </span>
                      </div>

                      {/* Preview del diseño */}
                      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={currentImg} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Cambiar Arte</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadCouponDesign(item.key, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className={`w-full py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          isUploading 
                            ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500/50'
                        }`}>
                          {isUploading ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                              <span>Subiendo a Storage...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3 h-3 text-amber-400" />
                              <span>Subir Nuevo Diseño</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadCouponDesign(item.key, file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  <h3 className="font-black text-white text-base">Impresión de Stickers (Tabloide, Carta, Oficio, A4)</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      Hoja {tabloidSheetIndex + 1} de {totalTabloidSheets} • {currentPaper.stickersCount} stickers por hoja ({currentPaper.sizeDesc})
                    </span>
                  </div>
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

            {/* Barra de Ajuste de Diseño (Posición Libre X / Y y Tamaño del QR) */}
            <div className="p-3 sm:px-6 bg-[#181e30] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Desplazamiento X (Horizontal) */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 flex items-center gap-1">✋ Arrastra con el cursor o:</span><span className="font-bold text-slate-300 ml-1">X:</span>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    value={qrOffsetX}
                    onChange={e => setQrOffsetX(parseInt(e.target.value, 10))}
                    className="w-20 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-amber-300 font-bold w-10 text-right">{qrOffsetX > 0 ? `+${qrOffsetX}` : qrOffsetX}%</span>
                </div>

                {/* Desplazamiento Y (Vertical) */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">Posición Y:</span>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    value={qrOffsetY}
                    onChange={e => setQrOffsetY(parseInt(e.target.value, 10))}
                    className="w-20 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-amber-300 font-bold w-10 text-right">{qrOffsetY > 0 ? `+${qrOffsetY}` : qrOffsetY}%</span>
                </div>

                {/* Tamaño QR */}
                <div className="flex items-center gap-2 border-l border-slate-700/80 pl-3">
                  <span className="font-bold text-slate-300">Tamaño:</span>
                  <input
                    type="range"
                    min="14"
                    max="45"
                    value={qrSizeMm}
                    onChange={e => setQrSizeMm(parseInt(e.target.value, 10))}
                    className="w-24 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-amber-300 font-bold w-12">{qrSizeMm} mm</span>
                </div>

                {/* Botones de Atajos Rápidos */}
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setQrOffsetX(0); setQrOffsetY(26); }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Abajo en el centro"
                  >
                    Abajo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQrOffsetX(0); setQrOffsetY(0); }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Centro exacto"
                  >
                    Centro
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQrOffsetX(55); setQrOffsetY(6); }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Derecha"
                  >
                    Derecha
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQrOffsetX(-55); setQrOffsetY(6); }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Izquierda"
                  >
                    Izquierda
                  </button>
                </div>
              </div>

              
              {/* Selector de Tamaño de Papel */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Papel:</span>
                {(['tabloide', 'carta', 'oficio', 'a4'] as PaperFormat[]).map(fmt => {
                  const spec = PAPER_SPECS[fmt];
                  const isSelected = paperFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => {
                        setPaperFormat(fmt);
                        setTabloidSheetIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 shadow-sm' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {spec.shortName}
                    </button>
                  );
                })}
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
                className="bg-white text-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col justify-center items-center border border-slate-300 select-none"
                style={{
                  width: '100%',
                  maxWidth: '780px',
                  minHeight: '1080px',
                  aspectRatio: `${currentPaper.widthMm} / ${currentPaper.heightMm}`,
                }}
              >
                {/* Cabecera Técnica para la Imprenta */}
                

                {/* MATRIZ DE STICKERS (COLUMNAS x FILAS SEGÚN EL FORMATO DE PAPEL) */}
                <div 
                  className={`grid gap-y-4 gap-x-4 w-full flex-1 items-center justify-items-center ${
                    currentPaper.cols === 2 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}
                >
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
                              onMouseDown={handleQrMouseDown}
                              onTouchStart={handleQrMouseDown}
                              className={`absolute z-20 flex flex-col items-center justify-center bg-white p-0.5 rounded-lg shadow-lg border-2 transition-shadow select-none ${
                                isDraggingQr 
                                  ? 'cursor-grabbing border-amber-500 ring-2 ring-amber-400/50 scale-105' 
                                  : 'cursor-grab border-slate-400 hover:border-amber-500'
                              }`}
                              style={{
                                width: `${qrSizeMm * 2.2}px`,
                                height: `${qrSizeMm * 2.2}px`,
                                left: `calc(50% + ${(qrOffsetX * 0.975)}px - ${(qrSizeMm * 2.2) / 2}px)`,
                                top: `calc(50% + ${(qrOffsetY * 0.975)}px - ${(qrSizeMm * 2.2) / 2}px)`,
                                touchAction: 'none',
                              }}
                              title="¡Arrastra libremente con el mouse o dedo dentro del sticker!"
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
                <p className="text-xs text-slate-400">Genera la cantidad exacta de cupones únicos para tus stickers físicos</p>
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
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Ej. {newPrefix || 'PROMO'}-001 ... {newQuantity}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cantidad de Cupones / QRs</label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={newQuantity}
                    onChange={e => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Cualquier cantidad (ej. 150, 200, 500)</span>
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
