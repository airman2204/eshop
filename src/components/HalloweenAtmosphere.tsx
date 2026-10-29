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
  const [vibrateLeft, setVibrateLeft] = useState(false);
  const [vibrateRight, setVibrateRight] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerWebLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVibrateLeft(true);
    setTimeout(() => setVibrateLeft(false), 650);
  };

  const triggerWebRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVibrateRight(true);
    setTimeout(() => setVibrateRight(false), 650);
  };

  if (!mounted) return null;

  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none"
    >
      {/* 0. Telaraña interactiva superior izquierda (reacciona al clic / hover) */}
      <div 
        onClick={triggerWebLeft}
        className={`pointer-events-auto absolute top-0 left-0 w-44 sm:w-64 h-28 sm:h-40 cursor-pointer transition-transform duration-300 group ${
          vibrateLeft ? 'animate-web-vibrate' : 'animate-web-sway hover:scale-105'
        }`}
        title="¡Toca la telaraña!"
      >
        <svg viewBox="0 0 100 65" className="w-full h-full text-slate-300/40 group-hover:text-amber-400/70 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" strokeWidth="0.8">
          {/* Hilos radiales principales */}
          <line x1="0" y1="0" x2="100" y2="20" />
          <line x1="0" y1="0" x2="80" y2="45" />
          <line x1="0" y1="0" x2="50" y2="65" />
          <line x1="0" y1="0" x2="20" y2="65" />
          {/* Espirales concéntricas */}
          <path d="M 0 12 Q 10 11 16 7" strokeDasharray="1,0.5" />
          <path d="M 0 25 Q 22 22 36 14 Q 48 10 50 0" strokeDasharray="1.2,0.6" />
          <path d="M 0 42 Q 28 38 48 24 Q 68 18 78 0" strokeDasharray="1.5,0.8" />
          <path d="M 0 60 Q 38 52 68 32 Q 88 22 100 12" strokeDasharray="1.5,0.8" />
          {/* Arañita colgante interactiva */}
          <g className="origin-[38px_28px] animate-bounce duration-1000">
            <line x1="38" y1="20" x2="38" y2="34" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="38" cy="36" r="2.2" fill="#E65F2B" />
            <circle cx="38" cy="34" r="1.4" fill="#D97706" />
            <path d="M 36 35 Q 33 34 31 36 M 40 35 Q 43 34 45 36 M 36 37 Q 33 38 31 40 M 40 37 Q 43 38 45 40" stroke="#E65F2B" strokeWidth="0.5" />
          </g>
        </svg>
      </div>

      {/* 0.1 Telaraña interactiva superior derecha (reacciona al clic / hover) */}
      <div 
        onClick={triggerWebRight}
        className={`pointer-events-auto absolute top-0 right-0 w-44 sm:w-64 h-28 sm:h-40 cursor-pointer transition-transform duration-300 group transform -scale-x-100 ${
          vibrateRight ? 'animate-web-vibrate' : 'animate-web-sway-right hover:scale-105'
        }`}
        title="¡Toca la telaraña!"
      >
        <svg viewBox="0 0 100 65" className="w-full h-full text-slate-300/40 group-hover:text-amber-400/70 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" strokeWidth="0.8">
          <line x1="0" y1="0" x2="100" y2="20" />
          <line x1="0" y1="0" x2="80" y2="45" />
          <line x1="0" y1="0" x2="50" y2="65" />
          <line x1="0" y1="0" x2="20" y2="65" />
          <path d="M 0 12 Q 10 11 16 7" strokeDasharray="1,0.5" />
          <path d="M 0 25 Q 22 22 36 14 Q 48 10 50 0" strokeDasharray="1.2,0.6" />
          <path d="M 0 42 Q 28 38 48 24 Q 68 18 78 0" strokeDasharray="1.5,0.8" />
          <path d="M 0 60 Q 38 52 68 32 Q 88 22 100 12" strokeDasharray="1.5,0.8" />
          <g className="origin-[42px_30px] animate-bounce duration-1000">
            <line x1="42" y1="22" x2="42" y2="36" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="42" cy="38" r="2.2" fill="#E65F2B" />
            <circle cx="42" cy="36" r="1.4" fill="#D97706" />
            <path d="M 40 37 Q 37 36 35 38 M 44 37 Q 47 36 49 38 M 40 39 Q 37 40 35 42 M 44 39 Q 47 40 49 42" stroke="#E65F2B" strokeWidth="0.5" />
          </g>
        </svg>
      </div>

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

        {/* Murciélago 6: Cruce adicional en sector medio */}
        <div className="absolute bat-flight-6">
          <BatSvg className="w-11 h-8 text-[#FF8533] drop-shadow-[0_0_13px_rgba(255,133,51,0.9)]" flapSpeed="0.31s" />
        </div>

        {/* Murciélago 7: Suave y ondulante */}
        <div className="absolute bat-flight-7">
          <BatSvg className="w-8 h-6 text-[#FFA366] drop-shadow-[0_0_11px_rgba(255,163,102,0.85)]" flapSpeed="0.26s" />
        </div>

        {/* Murciélago 8: Rápido cruzando la luna */}
        <div className="absolute bat-flight-8">
          <BatSvg className="w-6 h-4.5 text-[#F59E0B] drop-shadow-[0_0_9px_rgba(245,158,11,0.85)]" flapSpeed="0.21s" />
        </div>

        {/* Murciélago 9: Grande en trayectoria baja */}
        <div className="absolute bat-flight-9">
          <BatSvg className="w-13 h-9.5 text-[#FF7A1A] drop-shadow-[0_0_15px_rgba(255,122,26,0.95)]" flapSpeed="0.33s" />
        </div>

        {/* Murciélago 10: Enjambre lejano en horizonte */}
        <div className="absolute bat-flight-10">
          <BatSvg className="w-7 h-5 text-[#EA580C] drop-shadow-[0_0_10px_rgba(234,88,12,0.8)]" flapSpeed="0.25s" />
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
