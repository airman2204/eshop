'use client';

import React from 'react';
import { motion } from 'framer-motion';

const ITEMS = [
  'Importación Directa de EUA 🇺🇸',
  'Stock Limitado',
  'Envíos a Todo México',
  'Encargos Especiales',
];

export default function MotionMarquee() {
  const repeated = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div className="w-full overflow-hidden border-y border-amber-400/20 bg-[#0B2B25] py-2.5 text-amber-100/90 select-none">
      <motion.div
        className="flex w-max items-center gap-8 text-xs sm:text-[13px] font-bold tracking-wide"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 28 }}
      >
        {repeated.map((text, idx) => (
          <span key={idx} className="inline-flex items-center gap-8 whitespace-nowrap">
            <span>{text}</span>
            <span className="text-[#D96B27]">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
