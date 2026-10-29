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
      {/* 1. Luna llena mágica bajada para verse completa y deslumbrante debajo de la barra */}
      <div className="absolute top-28 sm:top-24 right-4 sm:right-16 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-radial from-amber-100/50 via-amber-200/25 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute top-32 sm:top-28 right-8 sm:right-24 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#FFF8E7] via-[#FFE29A] to-[#F59E0B] shadow-[0_0_60px_rgba(245,158,11,0.55)] opacity-95 border-2 border-amber-200/60" />

      {/* 2. Relámpago ambiental blanco/azulado bien visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100/20 via-cyan-100/10 to-transparent animate-lightning pointer-events-none" />

      {/* 3. Murciélagos naranjas brillantes con glow volando en capas con alto contraste */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Murciélago 1: Grande naranja neón con glow */}
        <div className="absolute bat-flight-1">
          <BatSvg className="w-12 h-9 text-[#FF7A1A] drop-shadow-[0_0_14px_rgba(255,122,26,0.95)]" flapSpeed="0.32s" />
        </div>

        {/* Murciélago 2: Mediano naranja ámbar */}
        <div className="absolute bat-flight-2">
          <BatSvg className="w-9 h-7 text-[#FB923C] drop-shadow-[0_0_12px_rgba(251,146,60,0.9)]" flapSpeed="0.28s" />
        </div>

        {/* Murciélago 3: Cerca de la luna */}
        <div className="absolute bat-flight-3">
          <BatSvg className="w-7 h-5 text-[#F59E0B] drop-shadow-[0_0_10px_rgba(245,158,11,0.85)]" flapSpeed="0.24s" />
        </div>

        {/* Murciélago 4: Mediano cruce opuesto */}
        <div className="absolute bat-flight-4">
          <BatSvg className="w-10 h-7 text-[#EA580C] drop-shadow-[0_0_12px_rgba(234,88,12,0.9)]" flapSpeed="0.30s" />
        </div>

        {/* Murciélago 5: Rápido en lo alto */}
        <div className="absolute bat-flight-5">
          <BatSvg className="w-6 h-4 text-[#F97316] drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" flapSpeed="0.22s" />
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
