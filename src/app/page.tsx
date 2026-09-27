import Link from 'next/link';
import { ShoppingBag, LayoutDashboard, ArrowRight, ShieldCheck, Zap, MapPin } from 'lucide-react';

export default function LandingPortal() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 selection:bg-slate-900 selection:text-white">
      
      <div className="max-w-4xl w-full text-center space-y-8">
        
        {/* LOGO & TITULAR */}
        <div className="space-y-3">
          <span className="inline-block bg-slate-200/80 text-slate-800 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wider uppercase">
            Plataforma de Comercio Electrónico & CRM
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            MERKATO <span className="font-light text-slate-500">STUDIO</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Gestión completa de catálogo, tienda en línea para clientes y panel de control administrativo para inventario, costos y logística.
          </p>
        </div>

        {/* 2 APLICATIVOS TOTALMENTE INDEPENDIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* APLICATIVO 1: TIENDA CLIENTE */}
          <Link
            href="/tienda"
            className="group bg-white border border-slate-200 hover:border-slate-400 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Aplicativo #1</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-slate-700 transition">
                  Tienda Cliente
                </h2>
                <p className="text-slate-500 text-xs mt-2.5 leading-relaxed">
                  Catálogo con buscador en tiempo real, filtros, solicitudes de pedidos especiales, puntos de entrega en Puebla, validación de cuenta por código y pago en línea.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Ingresar a la Tienda</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* APLICATIVO 2: CRM / ERP ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="group bg-white border border-slate-200 hover:border-slate-400 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Aplicativo #2</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-slate-700 transition">
                  Panel de Control CRM
                </h2>
                <p className="text-slate-500 text-xs mt-2.5 leading-relaxed">
                  Control de inventario, prorrateo de fletes de envío por lote, cálculo automático de márgenes y ganancias netas, pedidos y carritos inactivos con WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Ingresar al CRM</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition" />
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
