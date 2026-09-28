import React from 'react';

interface FoxDropLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export default function FoxDropLogo({
  className = '',
  variant = 'light',
  size = 'md',
  showTagline = true,
}: FoxDropLogoProps) {
  // Dimensiones según el tamaño
  const heights = {
    sm: 'h-10 sm:h-12',
    md: 'h-16 sm:h-20',
    lg: 'h-20 sm:h-26',
    xl: 'h-28 sm:h-36',
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/foxdrop-logo.png"
        alt="FoxDrop — Tu Atajo al Mundo"
        className={`${heights[size]} w-auto object-contain transition-transform duration-200 hover:scale-[1.02]`}
      />
    </div>
  );
}
