import Link from 'next/link';
import { ShoppingBag, LayoutDashboard, ArrowRight, ShieldCheck, Zap, MapPin, Sparkles } from 'lucide-react';

export default function LandingPortal() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 selection:bg-slate-900 selection:text-white">
      
      <div className="max-w-5xl w-full text-center space-y-8">
        
        {/* LOGO & TITULAR */}
        <div className="space-y-3">
          <span className="inline-block bg-slate-200/80 text-slate-800 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wider uppercase">
            Plataforma de Comercio Electrónico & CRM
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            PANEL DE ACCESO
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Hemos preparado 2 propuestas de diseño para la Tienda Cliente y el panel administrativo CRM.
          </p>
        </div>

        {/* 3 OPCIONES VISUALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* OPCIÓN 1: TIENDA KRONO (ESTILO MARKETPLACE MODERNO) */}
          <Link
            href="/tienda"
            className="group bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block">Propuesta A</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition">
                  Tienda Dinámica (KRONO)
                </h2>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Estilo marketplace moderno: fondo neutro claro, cabecera azul marino con buscador directo, badges de entrega en Puebla y barra de navegación inferior móvil.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Ver Propuesta A</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* OPCIÓN 2: TIENDA MAISON (ESTILO EDITORIAL MINIMALISTA) */}
          <Link
            href="/tienda/v2"
            className="group bg-[#FDFBF7] border border-[#EAE6DF] hover:border-black rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EFECE6] text-black flex items-center justify-center font-serif text-lg font-bold">
                M
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest block">Propuesta B</span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1 group-hover:text-black transition">
                  Tienda Editorial (Maison)
                </h2>
                <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                  Estilo nórdico / revista: fondo crema suave (#FDFBF7), tipografía serif refinada, fichas limpias de producto y estética serena de estudio.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#EAE6DF] flex items-center justify-between text-xs font-bold text-stone-900">
              <span>Ver Propuesta B</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* OPCIÓN 3: PANEL CRM ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="group bg-white border border-slate-200 hover:border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Control Operativo</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1 group-hover:text-slate-700 transition">
                  Panel de Control CRM
                </h2>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Calculadora de prorrateo de fletes por lote, control de ganancia neta y margen en tiempo real, pedidos y carritos inactivos con WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Ingresar al CRM</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

        </div>

        {/* DISTINTIVOS */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-700" /> Puntos de Encuentro en Puebla</span>
          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Verificación Segura por Código</span>
          <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-slate-700" /> $0 Costo Fijo Mensual</span>
        </div>

      </div>
    </div>
  );
}
