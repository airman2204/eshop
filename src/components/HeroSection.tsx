'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageCircle, ArrowDown, Sparkles, ShieldCheck, Truck, Zap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const WHATSAPP_VIP_GROUP_URL =
  'https://chat.whatsapp.com/BFB3Fo9akFBAAQ6RjMYhWo?s=cl&p=i&iam=2';

interface HeroSectionProps {
  onExploreCatalog?: () => void;
  mascotImageSrc?: string;
}

const titleWords = [
  'Importación',
  'Original',
  'y',
  'Skincare',
  'Coreano',
  'Directo',
  'a',
  'tu',
  'Puerta',
];

export default function HeroSection({
  onExploreCatalog,
  mascotImageSrc = '/fox-hero.png',
}: HeroSectionProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const mascotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      if (mascotRef.current && heroRef.current) {
        gsap.to(mascotRef.current, {
          y: -36,
          rotation: 2,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.2,
          },
        });
      }
    });

    return () => mm.revert();
  }, []);

  const handleExplore = () => {
    if (onExploreCatalog) {
      onExploreCatalog();
      return;
    }
    const el = document.getElementById('catalog-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#14352F] via-[#102B26] to-[#0B201C] text-white"
    >
      {/* Fondo ambiental sutil */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#D96B27]/15 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-8 md:pt-14 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Propuesta de Valor + CTAs */}
          <div className="lg:col-span-7 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-200 backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D96B27]" />
              <span>100% Original · Importación Directa de EUA 🇺🇸</span>
            </motion.div>

            {/* H1 con staggered text reveal */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]">
              {titleWords.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.42,
                    delay: i * 0.045,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`inline-block mr-2.5 ${
                    word === 'Original' || word === 'Coreano'
                      ? 'bg-gradient-to-r from-amber-300 to-[#D96B27] bg-clip-text text-transparent'
                      : 'text-white'
                  }`}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="text-sm sm:text-base text-emerald-100/90 max-w-xl leading-relaxed"
            >
              Liquidación en lotes limitados y encargos directos de EUA 🇺🇸. Pago contra entrega hoy en{' '}
              <strong className="text-white">Puebla y San Andrés Cholula</strong>, o envíos seguros a todo México.
            </motion.p>

            {/* CTAs principales con Framer Motion spring */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.36 }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <motion.a
                href={WHATSAPP_VIP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D96B27] to-amber-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#D96B27]/30 ring-2 ring-amber-300/40"
              >
                <span className="absolute -inset-0.5 rounded-2xl bg-[#D96B27]/40 blur-md opacity-60 animate-pulse -z-10" />
                <MessageCircle className="h-4 w-4" />
                <span>💬 Unirme al grupo de WhatsApp</span>
              </motion.a>

              <motion.button
                type="button"
                onClick={handleExplore}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15 transition"
              >
                <span>Explorar Catálogo</span>
                <ArrowDown className="h-4 w-4" />
              </motion.button>
            </motion.div>

            {/* Micro-badges de confianza */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-emerald-200/80">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-300" /> Mercado Pago & SPEI
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-amber-300" /> Contra entrega Puebla / Cholula
              </span>
            </div>
          </div>

          {/* Columna Derecha: Mascota Zorro 3D con GSAP Parallax */}
          <div className="lg:col-span-5 flex justify-center">
            <div ref={mascotRef} className="relative w-64 sm:w-80 lg:w-96">
              <div className="absolute inset-6 rounded-full bg-[#D96B27]/20 blur-2xl" />
              <img
                src={mascotImageSrc}
                alt="FoxDrop Mascota Zorro 3D"
                className="relative z-10 w-full h-auto drop-shadow-[0_24px_38px_rgba(0,0,0,0.45)] select-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. BANNER PUENTE HACIA LA COMUNIDAD VIP (ABOVE THE FOLD) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 rounded-2xl border border-amber-300/25 bg-white/10 p-4 sm:p-5 backdrop-blur-xl shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D96B27] to-amber-500 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white">
                    Ventas Flash ⚡ FoxDrop — Comunidad VIP
                  </h2>
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200 border border-emerald-400/30">
                    GRATIS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/85 mt-0.5">
                  Entra al grupo de WhatsApp para alcanzar remates relámpago, lotes limitados de Bath &amp; Body Works y preventas exclusivas antes de que se agoten.
                </p>
              </div>
            </div>

            <motion.a
              href={WHATSAPP_VIP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs sm:text-sm font-black text-[#14352F] shadow-md hover:bg-amber-50 transition"
            >
              <span>Entrar al Grupo VIP ⚡</span>
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
