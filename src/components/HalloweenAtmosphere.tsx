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
      {/* 1. Telaraña gótica izquierda superior (exacta del diseño) */}
      <div 
        className="absolute top-0 left-0 w-44 sm:w-64 h-24 sm:h-36 opacity-35 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 0% 0%, transparent 0%, transparent 20px, rgba(255, 255, 255, 0.08) 21px, transparent 22px), repeating-radial-gradient(circle at 0% 0%, transparent 0, transparent 28px, rgba(255,255,255,0.06) 29px, transparent 30px)'
        }}
      >
        <svg viewBox="0 0 100 60" className="w-full h-full text-slate-400/40" fill="none" stroke="currentColor" strokeWidth="0.75">
          <path d="M0,0 Q30,25 70,15 T100,0" />
          <path d="M0,0 Q25,35 50,45 T70,60" />
          <path d="M0,0 Q15,45 25,60" />
          <path d="M20,12 Q35,28 45,35" strokeDasharray="1,1" />
          <path d="M40,16 Q52,32 60,45" strokeDasharray="1,1" />
          <path d="M60,15 Q72,25 85,20" strokeDasharray="1,1" />
          <line x1="0" y1="0" x2="100" y2="25" />
          <line x1="0" y1="0" x2="60" y2="60" />
          <line x1="0" y1="0" x2="25" y2="60" />
        </svg>
      </div>

      {/* 2. Telaraña gótica derecha superior (exacta del diseño) */}
      <div className="absolute top-0 right-0 w-44 sm:w-64 h-24 sm:h-36 opacity-35 pointer-events-none transform -scale-x-100">
        <svg viewBox="0 0 100 60" className="w-full h-full text-slate-400/40" fill="none" stroke="currentColor" strokeWidth="0.75">
          <path d="M0,0 Q30,25 70,15 T100,0" />
          <path d="M0,0 Q25,35 50,45 T70,60" />
          <path d="M0,0 Q15,45 25,60" />
          <path d="M20,12 Q35,28 45,35" strokeDasharray="1,1" />
          <path d="M40,16 Q52,32 60,45" strokeDasharray="1,1" />
          <path d="M60,15 Q72,25 85,20" strokeDasharray="1,1" />
          <line x1="0" y1="0" x2="100" y2="25" />
          <line x1="0" y1="0" x2="60" y2="60" />
          <line x1="0" y1="0" x2="25" y2="60" />
        </svg>
      </div>

      {/* 3. Luces de Candil / Linternas Cálidas a los costados del Hero */}
      <div className="absolute top-28 sm:top-36 left-4 sm:left-12 lg:left-24 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-gradient-to-br from-[#E67E22]/25 via-[#D35400]/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-28 sm:top-36 right-4 sm:right-12 lg:right-24 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-gradient-to-bl from-[#E67E22]/25 via-[#D35400]/10 to-transparent blur-3xl pointer-events-none" />

      {/* 4. Murciélagos vectoriales en movimiento suave */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bat-flight-1">
          <BatSvg className="w-9 h-6 text-stone-900/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" flapSpeed="0.32s" />
        </div>
        <div className="absolute bat-flight-2">
          <BatSvg className="w-7 h-5 text-stone-950/70 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" flapSpeed="0.28s" />
        </div>
        <div className="absolute bat-flight-4">
          <BatSvg className="w-8 h-5 text-stone-900/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" flapSpeed="0.30s" />
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
