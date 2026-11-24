'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X, ChevronRight, Check } from 'lucide-react';

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<string | null>('pending');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('foxdrop_cookie_consent');
      if (saved) {
        setConsent(saved);
      } else {
        setConsent(null);
      }
    } catch {
      setConsent(null);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('foxdrop_cookie_consent', 'all');
      localStorage.setItem('foxdrop_cookie_consent_date', new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    setConsent('all');
    setShowDetails(false);

    // Actualizar Google Consent Mode si está activo
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem('foxdrop_cookie_consent', 'essential');
      localStorage.setItem('foxdrop_cookie_consent_date', new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    setConsent('essential');
    setShowDetails(false);

    // Consentimiento limitado solo a necesarias
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  };

  if (!mounted || consent !== null) {
    return null;
  }

  return (
    <>
      {/* BANNER FLOTANTE INFERIOR */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-40">
        <div className="bg-[#0F3E36] text-white p-4 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.16)] border border-white/[0.12] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 stroke-[1.5] text-[#E3B888] shrink-0" />
              <h4 className="font-medium text-xs text-white">
                Privacidad y cookies
              </h4>
            </div>
            <button
              onClick={handleAcceptEssential}
              className="text-white/60 hover:text-white p-1 rounded-md transition-colors duration-150 cursor-pointer"
              title="Cerrar y aceptar solo necesarias"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          <p className="text-xs text-white/75 leading-relaxed">
            Usamos cookies para mantener tu carrito y medir visitas de forma anónima.{' '}
            <Link href="/privacidad" className="text-[#E3B888] font-medium hover:underline">
              Aviso de privacidad
            </Link>
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={handleAcceptAll}
              className="flex-1 h-8 bg-[#E65F2B] hover:bg-[#D45321] text-white font-medium px-3 rounded-lg text-xs transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Aceptar</span>
            </button>
            <button
              onClick={handleAcceptEssential}
              className="h-8 bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium px-3 rounded-lg text-xs transition-colors duration-150 border border-white/[0.12] cursor-pointer whitespace-nowrap"
            >
              Solo necesarias
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DETALLES DE COOKIES */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0F3E36]" />
                <h3 className="font-black text-base text-[#0F3E36]">Configuración de Cookies</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-800 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Cookies Técnicas y Esenciales</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Siempre activas</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Imprescindibles para que puedas navegar, guardar artículos en tu carrito y autenticarte de forma segura vía OTP.
                </p>
              </div>

              <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Cookies de Rendimiento y Analítica</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Opcionales</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Nos permiten saber de forma agregada y 100% anónima qué productos son los más buscados para mejorar el catálogo y la velocidad de la tienda.
                </p>
              </div>

              <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Cookies de Marketing y Conversión</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Opcionales</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Ayudan a medir la efectividad de campañas en Google y Meta para mostrarte únicamente ofertas relevantes sin saturarte de publicidad.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleAcceptEssential}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Solo necesarias
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 bg-[#0F3E36] hover:bg-[#185348] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
