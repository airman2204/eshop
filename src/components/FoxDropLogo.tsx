import React from 'react';

interface FoxDropLogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'light' is for light backgrounds (dark text), 'dark' is for dark backgrounds (white text)
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export default function FoxDropLogo({
  className = '',
  variant = 'light',
  size = 'md',
  showTagline = true,
}: FoxDropLogoProps) {
  const isDark = variant === 'dark';

  // Sizing tokens
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const taglineSizes = {
    sm: 'text-[7.5px]',
    md: 'text-[9.5px]',
    lg: 'text-[11px]',
  };

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* FOXDROP ORIGAMI FOX + SHOPPING BASKET ICON */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm transition-transform duration-300 hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cyan/Teal Origami Shopping Basket / Grid */}
          <g id="basket" className="transition-all duration-300">
            {/* Basket Handle */}
            <path
              d="M48 44 C48 34, 76 34, 76 44"
              stroke="#00A896"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Basket Body (Origami faceted mesh) */}
            <path
              d="M44 48 L80 48 L73 78 L51 78 Z"
              fill="#00B4D8"
              fillOpacity="0.22"
              stroke="#0284C7"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Basket Grid Lines */}
            <path
              d="M50 48 L56 78 M62 48 L62 78 M74 48 L68 78 M46 62 L78 62"
              stroke="#0284C7"
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeLinecap="round"
            />
          </g>

          {/* Origami Fox Geometric Body & Face */}
          <g id="origami-fox">
            {/* Fox Left Ear (Top Facet) */}
            <polygon points="20,16 35,32 16,34" fill="#F26522" />
            <polygon points="20,16 28,32 16,34" fill="#E65100" />
            
            {/* Fox Right Ear (Top Facet) */}
            <polygon points="52,16 56,34 37,32" fill="#FF7A45" />
            <polygon points="52,16 44,32 37,32" fill="#E65100" />

            {/* Fox Forehead / Brow */}
            <polygon points="36,24 23,38 49,38" fill="#FA541C" />

            {/* Fox Cheeks & Snout Facets */}
            <polygon points="23,38 36,54 12,42" fill="#FF7A45" />
            <polygon points="49,38 60,42 36,54" fill="#E65100" />
            <polygon points="23,38 49,38 36,54" fill="#F26522" />

            {/* Fox Nose Tip */}
            <polygon points="34,53 38,53 36,56" fill="#1E293B" />

            {/* Fox Eyes (Origami geometric slants) */}
            <polygon points="28,40 33,42 27,43" fill="#0F172A" />
            <polygon points="44,40 45,43 39,42" fill="#0F172A" />

            {/* Cyan / Teal Geometric Collar Facet (Distinctive Brand Accent) */}
            <polygon points="36,54 26,62 46,62" fill="#00A896" />
            <polygon points="36,54 46,62 52,58" fill="#0284C7" />

            {/* Fox Curving Origami Tail Wrapping Around */}
            <polygon points="26,62 14,74 28,82" fill="#FA541C" />
            <polygon points="28,82 44,82 36,72" fill="#E65100" />
            <polygon points="36,72 44,82 62,80" fill="#F26522" />
            <polygon points="62,80 72,74 58,68" fill="#FF7A45" />
            {/* White Tail Tip Fold */}
            <polygon points="72,74 84,68 76,64" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
          </g>
        </svg>
      </div>

      {/* TYPOGRAPHY: FOXDROP / TU ATAJO AL MUNDO */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center">
          <span
            className={`font-black uppercase tracking-tight leading-none ${titleSizes[size]} ${
              isDark ? 'text-white' : 'text-[#1E293B]'
            }`}
          >
            FOXDROP
          </span>
        </div>
        {showTagline && (
          <span
            className={`font-bold uppercase tracking-[0.24em] leading-tight block mt-0.5 ${taglineSizes[size]} ${
              isDark ? 'text-slate-300/90' : 'text-slate-500'
            }`}
          >
            TU ATAJO AL MUNDO
          </span>
        )}
      </div>
    </div>
  );
}
