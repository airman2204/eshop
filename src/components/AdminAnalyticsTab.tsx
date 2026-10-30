'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle2, 
  Search, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Globe, 
  Tag, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  ArrowUpRight, 
  Clock, 
  Sliders, 
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { AnalyticsMetricsSummary, AnalyticsSettings, TrafficChannel, UserSessionSummary } from '@/types';
import { fetchAdminApi } from '@/lib/adminAuth';

interface AdminAnalyticsTabProps {
  onNotify?: (msg: string) => void;
}

export default function AdminAnalyticsTab({ onNotify }: AdminAnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
  const [metrics, setMetrics] = useState<AnalyticsMetricsSummary | null>(null);
  const [selectedSession, setSelectedSession] = useState<UserSessionSummary | null>(null);

  // Settings de Pixels y SEO
  const [settings, setSettings] = useState<AnalyticsSettings>({
    gaMeasurementId: '',
    gtmId: '',
    metaPixelId: '',
    tiktokPixelId: '',
    googleSearchConsoleTag: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Cargar métricas
  const loadMetrics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchAdminApi({
        endpoint: `/api/admin/analytics?range=${range}`,
        method: 'GET',
      });
      if (res.ok) {
        const data: AnalyticsMetricsSummary = await res.json();
        setMetrics(data);
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Error cargando analíticas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [range]);

  // Guardar configuración de Pixels
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetchAdminApi({
        endpoint: '/api/admin/analytics',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsSavedNotice(true);
        setTimeout(() => setSettingsSavedNotice(false), 3000);
        if (onNotify) onNotify('Configuraciones de medición y Pixels guardadas');
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const getChannelBadge = (ch: TrafficChannel) => {
    switch (ch) {
      case 'organic_seo':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">🔍 SEO Orgánico</span>;
      case 'paid_sem':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">🎯 SEM / Anuncios</span>;
      case 'social':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">📱 Redes Sociales</span>;
      case 'physical_qr':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">🏷️ QR / Sticker</span>;
      case 'direct':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">🌐 Directo</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">🔗 Referencia</span>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#E65F2B]" />
        <p className="text-sm font-medium">Cargando métricas de tráfico y trazabilidad...</p>
      </div>
    );
  }

  const funnel = metrics?.funnel || {
    totalSessions: 0,
    viewedItemSessions: 0,
    cartSessions: 0,
    checkoutSessions: 0,
    purchaseSessions: 0,
    viewItemRate: 0,
    cartRate: 0,
    checkoutRate: 0,
    conversionRate: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E65F2B] to-[#FF8C61] flex items-center justify-center text-white shadow-md shadow-[#E65F2B]/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Analíticas, SEO & Trazabilidad
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  En Vivo
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitorea el origen de tus clientes (SEO vs Campañas SEM), comportamiento en la tienda y embudo de conversión.
              </p>
            </div>
          </div>
        </div>

        {/* SELECTOR DE RANGO Y RECARGA */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            {(['24h', '7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 font-medium rounded-lg transition-all ${
                  range === r
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === '24h' ? 'Hoy / 24h' : r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : 'Todo'}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#E65F2B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* TARJETAS KPI PRINCIPALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Sesiones de Visita</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics?.totalVisits || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {metrics?.uniqueVisitors || 0} usuarios únicos
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Páginas Vistas</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics?.pageviews || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Promedio: <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics?.avgPagesPerVisit || 1}</span> págs/sesión
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Búsquedas en Tienda</span>
            <Search className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics?.totalSearches || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Consultas en el buscador interno
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Tasa de Conversión</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {funnel.conversionRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {funnel.purchaseSessions} compras en {funnel.totalSessions} visitas
          </div>
        </div>
      </div>

      {/* EMBUDO DE CONVERSIÓN (FUNNEL) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#E65F2B]" />
          Embudo de Conversión de la Tienda (E-Commerce Funnel)
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Trazabilidad desde que un visitante entra hasta que finaliza su compra en FoxDrop.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Paso 1: Entrada */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 relative">
            <div className="text-[10px] uppercase font-bold text-slate-400">Paso 1: Entraron</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
              {funnel.totalSessions}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">100% de visitantes</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Paso 2: Vieron Producto */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 relative">
            <div className="text-[10px] uppercase font-bold text-slate-400">Paso 2: Vieron Producto</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
              {funnel.viewedItemSessions}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{funnel.viewItemRate}% del total</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, funnel.viewItemRate)}%` }} />
            </div>
          </div>

          {/* Paso 3: Agregaron al Carrito */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 relative">
            <div className="text-[10px] uppercase font-bold text-slate-400">Paso 3: Carrito</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
              {funnel.cartSessions}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{funnel.cartRate}% del total</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, funnel.cartRate)}%` }} />
            </div>
          </div>

          {/* Paso 4: Iniciaron Pago */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 relative">
            <div className="text-[10px] uppercase font-bold text-slate-400">Paso 4: Inició Checkout</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
              {funnel.checkoutSessions}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{funnel.checkoutRate}% del total</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#E65F2B] h-full rounded-full" style={{ width: `${Math.min(100, funnel.checkoutRate)}%` }} />
            </div>
          </div>

          {/* Paso 5: Compra Exitosa */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 relative">
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Paso 5: Compraron</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {funnel.purchaseSessions}
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">{funnel.conversionRate}% conversión final</div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, funnel.conversionRate)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2 COLUMNAS: CANALES DE TRÁFICO (SEO/SEM) & DISPOSITIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DESGLOSE DE FUENTES (SEO vs SEM vs Redes vs Directo) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Canales de Tráfico (SEO vs SEM vs Redes Sociales)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Compara de dónde provienen tus visitas y cuántas ventas genera cada canal publicitario.
          </p>

          <div className="space-y-3">
            {metrics?.channels && Object.entries(metrics.channels).map(([key, val]) => {
              const ch = key as TrafficChannel;
              const totalV = metrics.totalVisits || 1;
              const pct = Math.round((val.visits / totalV) * 100);

              return (
                <div key={ch} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {getChannelBadge(ch)}
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {val.visits} visitas ({pct}%)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {val.conversions} ventas
                      </span>
                      {val.revenue > 0 && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold ml-2">
                          {formatCurrency(val.revenue)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        ch === 'paid_sem' ? 'bg-blue-500' :
                        ch === 'organic_seo' ? 'bg-emerald-500' :
                        ch === 'social' ? 'bg-purple-500' :
                        ch === 'physical_qr' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} 
                      style={{ width: `${Math.max(3, pct)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLA DE CAMPAÑAS SEM / UTM ESPECÍFICAS */}
          {metrics?.topCampaigns && metrics.topCampaigns.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                🎯 Campañas Publicitarias con UTM (Google Ads / Meta Ads)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2 font-medium">Campaña (`utm_campaign`)</th>
                      <th className="pb-2 font-medium">Fuente</th>
                      <th className="pb-2 font-medium text-right">Visitas</th>
                      <th className="pb-2 font-medium text-right">Ventas</th>
                      <th className="pb-2 font-medium text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.topCampaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2 font-semibold text-slate-800 dark:text-slate-200">{c.campaign}</td>
                        <td className="py-2 text-slate-500">{c.source}</td>
                        <td className="py-2 text-right font-medium">{c.visits}</td>
                        <td className="py-2 text-right font-bold text-emerald-600">{c.conversions}</td>
                        <td className="py-2 text-right font-bold">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* DISPOSITIVOS & PRODUCTOS MÁS VISTOS */}
        <div className="space-y-6">
          {/* Dispositivos */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              Dispositivos de Entrada
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Distribución de pantallas usadas por tus clientes.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Smartphone className="w-4 h-4 text-blue-500" /> Móviles (iPhone/Android)
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{metrics?.devices.mobile || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Laptop className="w-4 h-4 text-purple-500" /> Computadoras (Desktop)
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{metrics?.devices.desktop || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Tablet className="w-4 h-4 text-amber-500" /> Tablets / iPads
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{metrics?.devices.tablet || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Búsquedas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" />
              Términos Buscados en Tienda
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Lo que los clientes escriben en el buscador interno.
            </p>

            {metrics?.topSearchTerms && metrics.topSearchTerms.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {metrics.topSearchTerms.map((s, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span>{s.term}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {s.count}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aún no hay búsquedas registradas en este periodo.</p>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCTOS MÁS VISTOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-500" />
          Productos con Mayor Interés y Tráfico
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Artículos con más aperturas de ficha y clics de compra.
        </p>

        {metrics?.topProductsViewed && metrics.topProductsViewed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.topProductsViewed.map((p, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>👁️ {p.views} vistas</span>
                    <span>🛒 {p.addToCartCount} carritos</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-[#E65F2B]">
                    #{i + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Aún no hay aperturas de producto registradas en este periodo.</p>
        )}
      </div>

      {/* TABLA DE TRAZABILIDAD EN VIVO (SESIONES RECIENTES) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Trazabilidad en Vivo de Visitantes Recientes
            </h2>
            <p className="text-xs text-slate-500">
              Haz clic en cualquier sesión para ver la ruta paso a paso del visitante.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Mostrando las últimas {metrics?.recentSessions?.length || 0} sesiones
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="pb-3 font-medium">Hora</th>
                <th className="pb-3 font-medium">Canal / Procedencia</th>
                <th className="pb-3 font-medium">Dispositivo & País</th>
                <th className="pb-3 font-medium">Páginas</th>
                <th className="pb-3 font-medium">Artículos Vistos</th>
                <th className="pb-3 font-medium text-center">Estado Funnel</th>
                <th className="pb-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics?.recentSessions && metrics.recentSessions.length > 0 ? (
                metrics.recentSessions.map((s) => (
                  <tr 
                    key={s.sessionId}
                    onClick={() => setSelectedSession(s)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-2.5 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(s.lastActiveAt)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {getChannelBadge(s.channel)}
                        {s.utm?.campaign && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[150px]">
                            {s.utm.campaign}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {s.deviceType === 'desktop' ? <Laptop className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                        <span>{s.os || s.deviceType}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{s.country || 'MX'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {s.pageviewsCount}
                    </td>
                    <td className="py-2.5 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                      {s.productsViewed.length > 0 ? s.productsViewed.join(', ') : '-'}
                    </td>
                    <td className="py-2.5 text-center">
                      {s.purchased ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Compró ({formatCurrency(s.revenue)})
                        </span>
                      ) : s.beganCheckout ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Inició Checkout
                        </span>
                      ) : s.addedToCart ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Añadió al Carrito
                        </span>
                      ) : s.productsViewed.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Viendo Catálogo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400">
                          Navegando
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Aún no hay visitas registradas con el nuevo tracker. En cuanto los clientes naveguen foxdrop.mx aparecerán aquí al instante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLES DE SESIÓN (TRAZABILIDAD PASO A PASO) */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Trazabilidad de la Sesión
                  {getChannelBadge(selectedSession.channel)}
                </h3>
                <p className="text-xs text-slate-500">
                  ID: <span className="font-mono text-[10px]">{selectedSession.sessionId}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block">Inicio:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(selectedSession.startedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dispositivo / SO:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSession.deviceType} ({selectedSession.os})</span>
                </div>
                {selectedSession.utm?.campaign && (
                  <div>
                    <span className="text-slate-400 block">Campaña SEM:</span>
                    <span className="font-semibold text-blue-600">{selectedSession.utm.campaign}</span>
                  </div>
                )}
                {selectedSession.referrer && (
                  <div>
                    <span className="text-slate-400 block">Referrer:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">{selectedSession.referrer}</span>
                  </div>
                )}
              </div>

              {/* Línea de tiempo de eventos */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Ruta del Visitante (Línea de tiempo)
                </h4>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {selectedSession.events.map((evt, idx) => (
                    <div key={idx} className="relative flex items-start gap-3 pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#E65F2B]" />
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex-1 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-bold text-[#E65F2B] uppercase">
                            {evt.eventType}
                          </span>
                          <span>{new Date(evt.timestamp).toLocaleTimeString('es-MX')}</span>
                        </div>
                        {evt.productTitle && (
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Producto: {evt.productTitle}
                          </div>
                        )}
                        {evt.searchTerm && (
                          <div className="font-semibold text-amber-600 dark:text-amber-400">
                            Buscó: "{evt.searchTerm}"
                          </div>
                        )}
                        {evt.path && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Ruta: {evt.path}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURACIÓN DE PIXELS & HERRAMIENTAS SEO / SEM */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-[#E65F2B]" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Conexión de Medición Externa (Pixels, GA4 & Search Console)
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Configura aquí tus IDs oficiales para alimentar tus algoritmos de pauta en Facebook/Instagram Ads, Google Ads y Google Analytics 4.
        </p>

        {settingsSavedNotice && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Configuraciones de medición actualizadas exitosamente en la tienda.
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Analytics 4 (Measurement ID)
              </label>
              <input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={settings.gaMeasurementId || ''}
                onChange={(e) => setSettings({ ...settings, gaMeasurementId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Ejemplo: G-1234567890</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Meta Pixel ID (Facebook & Instagram Ads)
              </label>
              <input
                type="text"
                placeholder="123456789012345"
                value={settings.metaPixelId || ''}
                onChange={(e) => setSettings({ ...settings, metaPixelId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Número de Pixel de tu Administrador de Anuncios Meta</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Tag Manager ID (Opcional)
              </label>
              <input
                type="text"
                placeholder="GTM-XXXXXXX"
                value={settings.gtmId || ''}
                onChange={(e) => setSettings({ ...settings, gtmId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Search Console (Etiqueta HTML de verificación)
              </label>
              <input
                type="text"
                placeholder="google-site-verification=..."
                value={settings.googleSearchConsoleTag || ''}
                onChange={(e) => setSettings({ ...settings, googleSearchConsoleTag: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E65F2B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-[#E65F2B] hover:bg-[#d45120] text-white text-xs font-bold transition shadow-md shadow-[#E65F2B]/20 flex items-center gap-2"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Guardar Medición & Pixels
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
