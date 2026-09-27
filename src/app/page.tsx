import Link from 'next/link';
import { ShoppingBag, LayoutDashboard, ArrowRight, ShieldCheck, Zap, Sparkles, MapPin, Truck, HeartHandshake } from 'lucide-react';

export default function LandingPortal() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-rose-500 selection:text-white">
      
      {/* GLOW DECORATIVO DE FONDO */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-8 relative z-10">
        
        {/* LOGO & TITULAR */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-slate-800 text-rose-400 text-xs font-black px-4 py-1.5 rounded-full tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Plataforma E-Commerce & CRM Profesional
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            USA Import <span className="bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">Boutique</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Sistema integral para la importación y comercialización de productos americanos. Entregas en Puebla y envíos nacionales con $0 USD de costo operativo en software.
          </p>
        </div>

        {/* 2 APLICATIVOS TOTALMENTE INDEPENDIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* APLICATIVO 1: TIENDA CLIENTE */}
          <Link
            href="/tienda"
            className="group bg-slate-900/90 border border-slate-800/80 hover:border-rose-500/60 rounded-3xl p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/5">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest block">Aplicativo #1 (PWA & Web)</span>
                <h2 className="text-2xl font-black text-white mt-1 group-hover:text-rose-400 transition">
                  Tienda Cliente
                </h2>
                <p className="text-slate-400 text-xs mt-2.5 leading-relaxed">
                  Catálogo con búsqueda en tiempo real, filtros avanzados, solicitudes de encargos especiales, puntos de encuentro en Puebla, autenticación por código OTP y pasarela de compra.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-rose-400">
              <span>Abrir Tienda Cliente</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* APLICATIVO 2: CRM / ERP ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="group bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/60 rounded-3xl p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block">Aplicativo #2 (Panel Privado)</span>
                <h2 className="text-2xl font-black text-white mt-1 group-hover:text-indigo-400 transition">
                  CRM & Control ERP
                </h2>
                <p className="text-slate-400 text-xs mt-2.5 leading-relaxed">
                  Calculadora de prorrateo de fletes USA-México, control de ganancia neta y margen en tiempo real, gestión de carritos abandonados con cupón por WhatsApp y seguimiento de pedidos.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-indigo-400">
              <span>Abrir Panel CRM</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

        </div>

        {/* DISTINTIVOS DE CALIDAD Y CONFIANZA */}
        <div className="pt-6 border-t border-slate-900 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-400" /> Puntos Seguros Puebla</span>
          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Registro Seguro con OTP</span>
          <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Rendimiento Ultra Rápido</span>
        </div>

      </div>
    </div>
  );
}
