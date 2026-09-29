'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tienda?tab=cuenta');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0F3E36] border-t-[#DF7F2D] rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[#0F3E36]">Cargando tu cuenta en FoxDrop...</p>
      </div>
    </div>
  );
}
