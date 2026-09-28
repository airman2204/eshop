import Link from 'next/link';
import FoxDropLogo from '@/components/FoxDropLogo';
import { ShoppingBag, LayoutDashboard, ArrowRight, ShieldCheck, Zap, MapPin, Sparkles } from 'lucide-react';

export default function LandingPortal() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#222E3C] flex flex-col justify-center items-center p-6 selection:bg-[#E65F2B] selection:text-white">
      
      <div className="max-w-4xl w-full text-center space-y-8">
        
        {/* LOGO & TITULAR */}
        <div className="space-y-4 flex flex-col items-center">
          <FoxDropLogo size="xl" className="mb-2" />
          <span className="inline-block bg-[#2D4A58] text-white text-xs font-semibold px-4 py-1.5 rounded-full tracking-wider uppercase">
            Plataforma de Importación & CRM Puebla
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-[#1F2D3D] tracking-tight leading-tight">
            BIENVENIDO A FOXDROP
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Tu Atajo al Mundo. Accede a la tienda oficial de artículos internacionales o al panel administrativo CRM para control de fletes e inventario.
          </p>
        </div>

        {/* 2 OPCIONES: TIENDA OFICIAL Y CRM ADMIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
          
          {/* OPCIÓN 1: TIENDA OFICIAL FOXDROP */}
          <Link
            href="/tienda"
            className="group bg-white border-2 border-[#E65F2B] hover:border-[#D45321] rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E65F2B] flex items-center justify-center font-bold">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#E65F2B] uppercase tracking-widest block">Catálogo Oficial</span>
                <h2 className="text-xl font-black text-[#1F2D3D] mt-1 group-hover:text-[#E65F2B] transition">
                  Tienda FoxDrop
                </h2>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Catálogo de productos internacionales, carrusel panorámico, programa de lealtad Club Foxdrop y checkout con retiro gratis en Puebla.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#E65F2B]">
              <span>Ingresar a la Tienda</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* OPCIÓN 2: CRM ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="group bg-white border-2 border-[#2D4A58] hover:border-[#203641] rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#2D4A58]/10 text-[#2D4A58] flex items-center justify-center font-bold">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#2D4A58] uppercase tracking-widest block">Operaciones & Finanzas</span>
                <h2 className="text-xl font-black text-[#1F2D3D] mt-1 group-hover:text-[#2D4A58] transition">
                  Panel CRM Admin
                </h2>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Alta de artículos, cotizador USD/MXN en tiempo real, calculadora de fletes prorrateados, pedidos y notificaciones WhatsApp automáticas.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#2D4A58]">
              <span>Abrir Panel CRM</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </Link>

        </div>

        {/* PIE CON DISTINTIVOS */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#E65F2B]" /> Puntos de Encuentro Puebla
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2D4A58]" /> Verificación por Código
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-600" /> WhatsApp Cloud API Activo
          </span>
        </div>

      </div>

    </div>
  );
}
