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
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
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
