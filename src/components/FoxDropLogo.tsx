'use client';

import React from 'react';

interface FoxDropLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export default function FoxDropLogo({
  className = '',
  size = 'md',
  showTagline = true,
}: FoxDropLogoProps) {
  const foxSizes = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
    xl: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const textSizes = {
    sm: { title: 'text-lg sm:text-xl', tag: 'text-[7px] sm:text-[8px]' },
    md: { title: 'text-xl sm:text-2xl md:text-3xl', tag: 'text-[8px] sm:text-[9px]' },
    lg: { title: 'text-2xl sm:text-3xl md:text-4xl', tag: 'text-[10px] sm:text-xs' },
    xl: { title: 'text-3xl sm:text-4xl md:text-5xl', tag: 'text-xs sm:text-sm' },
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none group cursor-pointer ${className}`}>
      {/* Wordmark plano + zorrito FoxDrop */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-semibold tracking-tight ${textSizes[size].title}`}
          style={{
            fontFamily: 'var(--font-geist-logo), var(--font-sans), sans-serif',
            color: '#E3B888',
          }}
        >
          FoxDrop
        </span>
        {showTagline && (
          <span
            className={`font-normal text-[#E3B888]/80 mt-0.5 ${textSizes[size].tag}`}
            style={{
              fontFamily: 'var(--font-geist-logo), var(--font-sans), sans-serif',
            }}
          >
            Tu atajo al mundo
          </span>
        )}
      </div>

      {/* Carita 3D del zorrito FoxDrop a la derecha */}
      <img
        src="/fox-logo-head-3d.png"
        alt="FoxDrop 3D Logo"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
        className={`${foxSizes[size]} object-contain shrink-0 transition-transform duration-300 group-hover:scale-110 drop-shadow-md`}
      />
    </div>
  );
}
