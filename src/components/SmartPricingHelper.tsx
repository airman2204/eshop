'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { LOTE3_FREIGHT_RULES, SmartPriceSuggestions, FreightCategoryRule } from '@/lib/pricingEngine';

interface SmartPricingHelperProps {
  isLote3Selected: boolean;
  activeFreightRule: FreightCategoryRule | null;
  autoDetectedRule: FreightCategoryRule | null;
  selectedFreightRuleKey: string;
  onSelectFreightRuleKey: (key: string) => void;
  smartPricing: SmartPriceSuggestions;
  newPublicPrice: number;
  onApplyPrice: (price: number, markupPct: number) => void;
  shippingPerUnit: number;
  currentBatchCostPerUnit: number;
}

export default function SmartPricingHelper({
  isLote3Selected,
  activeFreightRule,
  autoDetectedRule,
  selectedFreightRuleKey,
  onSelectFreightRuleKey,
  smartPricing,
  newPublicPrice,
  onApplyPrice,
  shippingPerUnit,
  currentBatchCostPerUnit,
}: SmartPricingHelperProps) {
  return (
    <div className="space-y-2.5">
      {/* 1. Selector de Regla de Prorrateo si es Lote 3 */}
      {isLote3Selected && (
        <div className="bg-orange-50/90 border border-orange-200/90 p-2.5 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
              <span>⚖️ Categoría de Peso y Flete (Lote 3):</span>
            </span>
            <span className="text-[10px] text-orange-800 font-black bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
              {activeFreightRule
                ? `$${activeFreightRule.allocatedFreightMxn} MXN flete (${activeFreightRule.weightG}g)`
                : `$${currentBatchCostPerUnit.toFixed(2)} MXN lineal`}
            </span>
          </div>

          <select
            value={selectedFreightRuleKey}
            onChange={(e) => onSelectFreightRuleKey(e.target.value)}
            className="w-full bg-white border border-orange-200 rounded-lg p-1.5 text-xs text-slate-800 font-semibold"
          >
            <option value="auto">
              🤖 Detección Automática {autoDetectedRule ? `(${autoDetectedRule.label} → $${autoDetectedRule.allocatedFreightMxn} MXN)` : '(Sin detectar)'}
            </option>
            {LOTE3_FREIGHT_RULES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} (+${r.allocatedFreightMxn} MXN | Mercado MX: ${r.mexicoMarketRefMin}-${r.mexicoMarketRefMax})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Tarjetas de Sugerencia de Precios Inteligentes vs Mercado Departamental en México */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-orange-50/50 p-3 rounded-2xl border border-indigo-200/90 space-y-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-slate-900">
              Asistente de Precios y Mercado en México:
            </span>
          </div>
          <div className="text-[10px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            🇲🇽 Mercado Departamental: <strong className="text-slate-900">${smartPricing.marketRange.min} - ${smartPricing.marketRange.max} MXN</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Nivel 1: Rápida Salida */}
          <button
            type="button"
            onClick={() => onApplyPrice(smartPricing.tiers.quickSale.price, smartPricing.tiers.quickSale.markupPct)}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
              Math.abs(newPublicPrice - smartPricing.tiers.quickSale.price) <= 5
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white hover:bg-emerald-50/70 text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - smartPricing.tiers.quickSale.price) <= 5 ? 'text-emerald-100' : 'text-emerald-600'}`}>
              {smartPricing.tiers.quickSale.label}
            </span>
            <span className="text-base font-black block mt-0.5">${smartPricing.tiers.quickSale.price} MXN</span>
            <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - smartPricing.tiers.quickSale.price) <= 5 ? 'text-emerald-100' : 'text-slate-500'}`}>
              Ganas +${smartPricing.tiers.quickSale.profit.toFixed(0)} MXN (+{smartPricing.tiers.quickSale.markupPct}%)
            </span>
          </button>

          {/* Nivel 2: Recomendado FoxDrop */}
          <button
            type="button"
            onClick={() => onApplyPrice(smartPricing.tiers.optimal.price, smartPricing.tiers.optimal.markupPct)}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
              Math.abs(newPublicPrice - smartPricing.tiers.optimal.price) <= 5
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40'
                : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - smartPricing.tiers.optimal.price) <= 5 ? 'text-indigo-100' : 'text-indigo-600'}`}>
              {smartPricing.tiers.optimal.label}
            </span>
            <span className="text-base font-black block mt-0.5">${smartPricing.tiers.optimal.price} MXN</span>
            <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - smartPricing.tiers.optimal.price) <= 5 ? 'text-indigo-100' : 'text-slate-500'}`}>
              Ganas +${smartPricing.tiers.optimal.profit.toFixed(0)} MXN (+{smartPricing.tiers.optimal.markupPct}%)
            </span>
          </button>

          {/* Nivel 3: Margen Boutique */}
          <button
            type="button"
            onClick={() => onApplyPrice(smartPricing.tiers.boutique.price, smartPricing.tiers.boutique.markupPct)}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
              Math.abs(newPublicPrice - smartPricing.tiers.boutique.price) <= 5
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white hover:bg-amber-50/70 text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            <span className={`text-[10px] font-black uppercase block ${Math.abs(newPublicPrice - smartPricing.tiers.boutique.price) <= 5 ? 'text-amber-100' : 'text-amber-600'}`}>
              {smartPricing.tiers.boutique.label}
            </span>
            <span className="text-base font-black block mt-0.5">${smartPricing.tiers.boutique.price} MXN</span>
            <span className={`text-[10px] font-semibold block ${Math.abs(newPublicPrice - smartPricing.tiers.boutique.price) <= 5 ? 'text-amber-100' : 'text-slate-500'}`}>
              Ganas +${smartPricing.tiers.boutique.profit.toFixed(0)} MXN (+{smartPricing.tiers.boutique.markupPct}%)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
