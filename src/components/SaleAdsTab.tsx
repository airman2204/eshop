'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Download, CheckCircle2, AlertCircle, Camera, Video, Zap } from 'lucide-react';

interface CampaignConcept {
  title: string;
  hook3s: string;
  script10s: string;
  copyAndCta: string;
  fluxPrompt: string;
}

export default function SaleAdsTab({ products: _products }: { products?: any[] }) {
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [objective, setObjective] = useState(
    'Atraer tráfico masivo a nuestra comunidad privada Ventas Flash ⚡ FoxDrop destacando Drops exclusivos, hallazgos curados y lanzamientos de piezas limitadas con precios preferenciales'
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [concepts, setConcepts] = useState<CampaignConcept[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  const handleSuggestObjective = () => {
    const ideas =
      platform === 'tiktok'
        ? [
            'Viralizar en TikTok el acceso a nuestra comunidad privada Ventas Flash ⚡ FoxDrop donde caen Drops exclusivos y hallazgos curados cada semana',
            'Atraer tráfico masivo en TikTok con CTA "comenta ATAJO" para entrar al grupo VIP de lanzamientos sorpresa de piezas limitadas antes de que se agoten',
            'Captar amantes de fragancias, cuidado personal y accesorios virales originales con precios preferenciales dentro de la comunidad FoxDrop',
          ]
        : [
            'Llenar la comunidad privada Ventas Flash ⚡ FoxDrop desde Instagram Reels y Stories destacando Drops exclusivos y lanzamientos sorpresa cada semana',
            'Atraer amantes de hallazgos curados (fragancias, cuidado personal y accesorios originales) en Instagram con CTA "comenta VIP" para enviarles acceso privado',
            'Posicionar a FoxDrop ("Tu atajo al mundo") en Instagram Ads como el lugar de lanzamientos de piezas limitadas con precios preferenciales en todo México',
          ];
    const nextIdea = ideas.find((i) => i !== objective) || ideas[0];
    setObjective(nextIdea);
    setToast({ type: 'ok', msg: 'Sofía te propuso un nuevo objetivo ganador 🦊✨' });
  };

  const handleGenerate = async () => {
    if (!objective.trim()) {
      setToast({ type: 'err', msg: 'Escribe un objetivo para generar la campaña.' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/ads/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: objective.trim(), platform }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error generando campaña');

      setCampaignName(json.strategy?.campaignName || 'Campaña FoxDrop');
      setConcepts(Array.isArray(json.strategy?.concepts) ? json.strategy.concepts : []);
      setImageUrl(json.imageUrl || '');
      setToast({ type: 'ok', msg: '¡3 conceptos de Growth Marketing + creativo FLUX listos! 🦊⚡' });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al generar campaña' });
    } finally {
      setLoading(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    setToast({ type: 'ok', msg: `${label} copiado al portapapeles ✅` });
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `foxdrop-${platform}-ad.jpg`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#14352F] to-[#0B201C] text-white p-5 rounded-2xl border border-emerald-800/40 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D96B27] to-amber-500 flex items-center justify-center shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              FoxAds AI — Growth Marketing &quot;Tu atajo al mundo&quot;
            </h2>
            <p className="text-xs text-emerald-100/80">
              Genera 3 conceptos virales (Instagram / TikTok) + creativo FLUX enfocados en llenar Ventas Flash ⚡ FoxDrop.
            </p>
          </div>
        </div>

        <div className="flex bg-white/10 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setPlatform('instagram')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
              platform === 'instagram' ? 'bg-white text-[#14352F] shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Instagram (4:5)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('tiktok')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
              platform === 'tiktok' ? 'bg-white text-[#14352F] shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            TikTok (9:16)
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            toast.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Input de Objetivo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Objetivo de tu campaña ({platform === 'instagram' ? 'Instagram' : 'TikTok'})
          </label>
          <button
            type="button"
            onClick={handleSuggestObjective}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D96B27]" />
            Que Sofía sugiera el objetivo
          </button>
        </div>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          placeholder="Ej. Llenar el grupo privado de WhatsApp destacando ahorros en lotes de EUA y encargos directos a todo México..."
          className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              'Llenar la comunidad VIP con Drops exclusivos y hallazgos curados',
              'Atraer compradores buscando lanzamientos sorpresa de piezas limitadas',
              'Destacar precios preferenciales en fragancias, cuidado personal y accesorios',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setObjective(preset)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                + {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D96B27] to-amber-500 hover:opacity-95 text-white text-sm font-black shadow-md disabled:opacity-50 transition"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Diseñando campaña + FLUX...' : 'Generar 3 Conceptos + Creativo'}
          </button>
        </div>
      </div>

      {/* Resultados: Creativo FLUX + 3 Conceptos */}
      {(imageUrl || concepts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Creativo FLUX */}
          {imageUrl && (
            <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 h-fit">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Creativo FLUX ({platform === 'tiktok' ? '9:16' : '4:5'})
                </span>
                <button
                  type="button"
                  onClick={downloadImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar HD
                </button>
              </div>
              <img
                src={imageUrl}
                alt={campaignName}
                className="w-full rounded-xl border border-slate-200 shadow-sm"
              />
            </div>
          )}

          {/* Columna Derecha: 3 Conceptos */}
          <div className={`${imageUrl ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
            {campaignName && (
              <h3 className="text-base font-black text-slate-900">📌 {campaignName}</h3>
            )}
            {concepts.map((c, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-black text-[#14352F]">
                    Concepto {idx + 1}: {c.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => copyText(c.copyAndCta, `Copy Concepto ${idx + 1}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Copy
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-[#D96B27]">⚡ Gancho (3 seg): </span>
                    <span className="font-semibold text-slate-900">{c.hook3s}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">🎬 Guion / Texto en pantalla (7-10 seg): </span>
                    <p className="mt-0.5 text-slate-600 whitespace-pre-line">{c.script10s}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">📝 Copy + CTA:</span>
                    <p className="text-slate-700 whitespace-pre-line">{c.copyAndCta}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-400 truncate flex-1">
                      🎨 FLUX: {c.fluxPrompt}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(c.fluxPrompt, 'Prompt FLUX')}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 shrink-0"
                    >
                      Copiar Prompt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
