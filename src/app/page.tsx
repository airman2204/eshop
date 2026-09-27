import Link from 'next/link';
import { ShoppingBag, LayoutDashboard, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPortal() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        
        {/* LOGO & BADGE */}
        <div className="space-y-3">
          <span className="inline-block bg-blue-500/10 text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full border border-blue-500/20">
            🇺🇸 PLATAFORMA DE PRODUCTOS AMERICANOS
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Acceso a los 2 Aplicativos
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Selecciona la aplicación a la que deseas ingresar. La tienda y el panel de control CRM operan de forma independiente.
          </p>
        </div>

        {/* 2 TARJETAS DE APLICATIVOS INDEPENDIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* APLICATIVO 1: TIENDA CLIENTE */}
          <Link
            href="/tienda"
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Aplicativo #1</span>
                <h2 className="text-xl font-extrabold text-white mt-1 group-hover:text-blue-400 transition">
                  Tienda Cliente (Web & PWA Móvil)
                </h2>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Experiencia de compra para clientes. Catálogo de snacks, cosméticos, cotizador de envíos locales en Puebla y checkout por WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-400">
              <span>Ingresar a la Tienda</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* APLICATIVO 2: CRM / ERP ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Aplicativo #2</span>
                <h2 className="text-xl font-extrabold text-white mt-1 group-hover:text-indigo-400 transition">
                  CRM & ERP Administrativo
                </h2>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Panel de administración exclusivo. Calculadora de costeo prorrateado de envíos EE.UU., control de utilidades, inventario y carritos abandonados.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400">
              <span>Ingresar al CRM Administrador</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

        </div>

        {/* FOOTER INFO */}
        <div className="pt-6 border-t border-slate-900 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Seguridad RLS & Datos Protegidos</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Infraestructura $0 USD Fijos</span>
        </div>

      </div>
    </div>
  );
}
