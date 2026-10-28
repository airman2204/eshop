'use client';

import React, { useEffect, useState } from 'react';

/**
 * Componente atmosférico de Halloween para FoxDrop
 * Inspirado en la noche de luna mística, rayos tenues de fondo y murciélagos con aleteo suave.
 *
 * Características:
 * - pointer-events: none (no bloquea clics, scroll ni carrito)
 * - Murciélagos vectoriales SVG animados con CSS puro (60 FPS, peso ultra ligero, sin saturación)
 * - Destellos de relámpago sutiles (ambient light flash, 8-14% opacidad) cada 12-20s
 * - Luna mística azulada con resplandor en la esquina superior
 */
export default function HalloweenAtmosphere() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* 1. Fondo atmosférico de noche mística (degradado sutil que se funde con el contenido) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/90 via-[#05111B]/60 to-transparent" />

      {/* 2. Luna plateada/azulada en la esquina superior derecha */}
      <div className="absolute -top-12 -right-12 sm:top-4 sm:right-12 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-cyan-100/35 via-blue-200/20 to-transparent blur-2xl animate-pulse duration-1000" />
      <div className="absolute top-2 right-6 sm:top-8 sm:right-20 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-radial from-[#dff2fc]/40 via-[#9cc5df]/20 to-transparent shadow-[0_0_60px_rgba(156,197,223,0.25)] opacity-85" />

      {/* 3. Relámpago ambiental tenue (destellos intermitentes suaves) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-300/10 via-amber-200/5 to-transparent animate-lightning" />

      {/* 4. Murciélagos volando con aleteo fluido en distintas trayectorias y profundidades */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Murciélago 1: Grande, trayectoria diagonal media, cruza de derecha a izquierda */}
        <div className="absolute bat-flight-1">
          <BatSvg className="w-10 h-7 text-stone-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] opacity-80" />
        </div>

        {/* Murciélago 2: Mediano, trayectoria ondulante alta */}
        <div className="absolute bat-flight-2">
          <BatSvg className="w-7 h-5 text-stone-950 opacity-70" flapSpeed="0.32s" />
        </div>

        {/* Murciélago 3: Pequeño (en la lejanía, cerca de la luna) */}
        <div className="absolute bat-flight-3">
          <BatSvg className="w-5 h-3.5 text-slate-900 opacity-60" flapSpeed="0.25s" />
        </div>

        {/* Murciélago 4: Mediano, cruce de izquierda a derecha en sector medio */}
        <div className="absolute bat-flight-4">
          <BatSvg className="w-8 h-5.5 text-stone-900 opacity-75" flapSpeed="0.36s" />
        </div>

        {/* Murciélago 5: Enjambre lejano en lo alto */}
        <div className="absolute bat-flight-5">
          <BatSvg className="w-4 h-3 text-slate-950 opacity-50" flapSpeed="0.28s" />
        </div>
      </div>
    </div>
  );
}

/**
 * SVG de Murciélago con alas articuladas animadas por keyframes de CSS puro
 */
function BatSvg({ 
  className = "w-8 h-6", 
  flapSpeed = "0.35s" 
}: { 
  className?: string; 
  flapSpeed?: string;
}) {
  return (
    <svg 
      viewBox="0 0 100 60" 
      className={className} 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ala Izquierda articulada */}
      <path
        d="M 50 35 C 40 20, 25 10, 5 18 C 12 30, 18 36, 25 35 C 32 44, 42 42, 50 35 Z"
        className="origin-[50px_35px] animate-bat-wing-left"
        style={{ animationDuration: flapSpeed }}
      />
      {/* Ala Derecha articulada */}
      <path
        d="M 50 35 C 60 20, 75 10, 95 18 C 88 30, 82 36, 75 35 C 68 44, 58 42, 50 35 Z"
        className="origin-[50px_35px] animate-bat-wing-right"
        style={{ animationDuration: flapSpeed }}
      />
      {/* Cuerpo y Orejitas */}
      <path 
        d="M 50 20 C 47 20, 44 24, 44 32 C 44 42, 47 48, 50 52 C 53 48, 56 42, 56 32 C 56 24, 53 20, 50 20 Z" 
      />
      {/* Oreja Izquierda */}
      <polygon points="45,24 43,14 48,22" />
      {/* Oreja Derecha */}
      <polygon points="55,24 57,14 52,22" />
    </svg>
  );
}
