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
      {/* Texto 3D FOXDROP con relieve, degradado cálido caramelo/arena y sombra en bisel */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-black tracking-normal uppercase font-sans ${textSizes[size].title} transition-transform duration-200 group-hover:scale-[1.02]`}
          style={{
            color: '#CE8B54',
            backgroundImage: 'linear-gradient(180deg, #E6A76E 0%, #C47F46 70%, #9E5B26 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 0px #5E310F) drop-shadow(0 3px 2px rgba(0,0,0,0.5))',
            fontWeight: 950,
            letterSpacing: '-0.02em',
          }}
        >
          FOXDROP
        </span>
        {showTagline && (
          <span
            className={`font-black tracking-[0.25em] uppercase text-[#E3B888] mt-0.5 ${textSizes[size].tag}`}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            TU ATAJO AL MUNDO
          </span>
        )}
      </div>

      {/* Carita 3D del zorrito FoxDrop a la derecha */}
      <img
        src="/fox-logo-head-3d.png"
        alt="FoxDrop 3D Logo"
        className={`${foxSizes[size]} object-contain shrink-0 transition-transform duration-300 group-hover:scale-110 drop-shadow-md`}
      />
    </div>
  );
}

