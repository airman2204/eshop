'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // No interceptar scroll en /admin para no interferir con paneles internos ni React Flow
    if (pathname?.startsWith('/admin')) return;

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      autoResize: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Recalcular altura automáticamente cuando carguen productos dinámicos del catálogo
    const ro = new ResizeObserver(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });
    ro.observe(document.body);

    return () => {
      ro.disconnect();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
}
