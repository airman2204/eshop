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
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100/35 via-cyan-100/15 to-transparent animate-lightning pointer-events-none" />

      {/* 3. Siluetas vectoriales de árboles tenebrosos y castillo gótico en el horizonte */}
      <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 pointer-events-none overflow-hidden select-none animate-silhouette-backlight z-0">
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="w-full h-full text-[#03090F]"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Suelo irregular / colinas de fondo */}
          <path d="M0,320 L0,270 Q160,250 320,270 T640,265 T960,275 T1280,260 L1440,270 L1440,320 Z" />

          {/* ÁRBOL RETORCIDO 1 (Extremo izquierdo) */}
          <g transform="translate(40, 110) scale(1.15)">
            <path d="M 45 150 Q 42 110 38 85 Q 25 75 10 70 Q 22 62 34 68 Q 30 50 15 35 Q 26 38 32 50 Q 38 25 32 5 Q 40 20 42 42 Q 52 30 58 12 Q 58 28 48 52 Q 62 45 78 30 Q 68 50 54 62 Q 70 68 85 62 Q 68 76 52 82 Q 56 110 60 150 Z" />
          </g>

          {/* ÁRBOL RETORCIDO 2 (Izquierda media) */}
          <g transform="translate(220, 135) scale(0.95)">
            <path d="M 40 145 Q 38 105 32 80 Q 18 72 5 65 Q 18 58 28 64 Q 24 45 12 32 Q 22 35 28 46 Q 32 22 28 4 Q 35 18 36 38 Q 45 28 50 10 Q 51 25 43 46 Q 54 40 68 28 Q 60 45 48 56 Q 62 62 74 58 Q 60 70 46 76 Q 48 105 52 145 Z" />
          </g>

          {/* MANSIÓN / CASTILLO GÓTICO CON TORREONES (Centro - izquierda de la pantalla) */}
          <g transform="translate(480, 105) scale(0.95)">
            {/* Base castillo */}
            <rect x="50" y="80" width="130" height="90" />
            {/* Torre central alta */}
            <rect x="95" y="30" width="40" height="60" />
            <polygon points="90,30 115,-5 140,30" />
            {/* Torre izquierda */}
            <rect x="40" y="55" width="28" height="50" />
            <polygon points="36,55 54,18 72,55" />
            {/* Torre derecha */}
            <rect x="162" y="55" width="28" height="50" />
            <polygon points="158,55 176,18 194,55" />
            {/* Ventanales góticos (al iluminarse dejan pasar la luz) */}
            <path d="M 108 45 A 7 7 0 0 1 122 45 L 122 62 L 108 62 Z" className="fill-amber-300/80" />
            <path d="M 50 72 A 4 4 0 0 1 58 72 L 58 84 L 50 84 Z" className="fill-amber-300/80" />
            <path d="M 172 72 A 4 4 0 0 1 180 72 L 180 84 L 172 84 Z" className="fill-amber-300/80" />
            {/* Ventanas principales */}
            <rect x="75" y="105" width="14" height="22" rx="6" className="fill-amber-300/70" />
            <rect x="140" y="105" width="14" height="22" rx="6" className="fill-amber-300/70" />
            <path d="M 102 125 A 13 13 0 0 1 128 125 L 128 170 L 102 170 Z" className="fill-[#020509]" />
          </g>

          {/* ÁRBOL RETORCIDO 3 (Centro derecha) */}
          <g transform="translate(820, 125) scale(1.05)">
            <path d="M 45 150 Q 42 110 38 85 Q 25 75 10 70 Q 22 62 34 68 Q 30 50 15 35 Q 26 38 32 50 Q 38 25 32 5 Q 40 20 42 42 Q 52 30 58 12 Q 58 28 48 52 Q 62 45 78 30 Q 68 50 54 62 Q 70 68 85 62 Q 68 76 52 82 Q 56 110 60 150 Z" />
          </g>

          {/* CASA EMBRUJADA Y CRUCES / LÁPIDAS (Derecha) */}
          <g transform="translate(1080, 115) scale(0.9)">
            {/* Casa embrujada inclinada */}
            <polygon points="50,60 90,20 130,60" />
            <rect x="58" y="60" width="65" height="85" />
            {/* Chimenea inclinada */}
            <polygon points="105,35 118,35 120,15 107,15" />
            {/* Ventanitas góticas iluminadas en amarillo ámbar */}
            <polygon points="82,42 90,32 98,42" className="fill-amber-300/90" />
            <rect x="72" y="75" width="12" height="18" rx="4" className="fill-amber-300/80" />
            <rect x="96" y="75" width="12" height="18" rx="4" className="fill-amber-300/80" />
            {/* Cruz cementerio silueta */}
            <rect x="25" y="125" width="4" height="25" />
            <rect x="19" y="132" width="16" height="4" />
            {/* Cruz 2 */}
            <rect x="145" y="128" width="4" height="22" />
            <rect x="140" y="134" width="14" height="4" />
          </g>

          {/* ÁRBOL RETORCIDO 4 (Extremo derecho) */}
          <g transform="translate(1310, 95) scale(1.2)">
            <path d="M 45 150 Q 42 110 38 85 Q 25 75 10 70 Q 22 62 34 68 Q 30 50 15 35 Q 26 38 32 50 Q 38 25 32 5 Q 40 20 42 42 Q 52 30 58 12 Q 58 28 48 52 Q 62 45 78 30 Q 68 50 54 62 Q 70 68 85 62 Q 68 76 52 82 Q 56 110 60 150 Z" />
          </g>
        </svg>
      </div>

      {/* 4. Niebla espectral suave y rodante a ras de pantalla */}
      <div className="absolute -bottom-10 left-0 right-0 h-44 pointer-events-none opacity-45 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/30 via-slate-900/40 to-transparent" />
        <div className="w-[200%] h-full bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.18)_0%,transparent_70%)] animate-[pulse_6s_ease-in-out_infinite]" />
      </div>
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
