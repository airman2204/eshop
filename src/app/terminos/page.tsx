import Link from 'next/link';
import FoxDropLogo from '@/components/FoxDropLogo';
import { FileText, ArrowLeft, Truck, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y Condiciones de Compra y Uso de FoxDrop México. Garantías, envíos, métodos de pago y devoluciones.',
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  const currentYear = 2026;

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#113B34] flex flex-col font-sans">
      {/* CABECERA */}
      <header className="bg-[#0F3E36] text-white py-3.5 px-4 sm:px-6 shadow-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/tienda" className="flex items-center gap-2">
            <FoxDropLogo size="md" variant="dark" />
          </Link>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3B888] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#DF7F2D]" />
            <span>Volver a la Tienda</span>
          </Link>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* ENCABEZADO */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#DF7F2D] uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Términos del Servicio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F3E36] tracking-tight">
            Términos y Condiciones de Compra
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Última actualización: Enero de {currentYear}. Regulaciones de compra, logística, pagos y garantías de FoxDrop.
          </p>
        </div>

        {/* SECCIONES */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-xs space-y-8 text-xs sm:text-sm text-gray-700 leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              1. Aceptación de los Términos
            </h2>
            <p>
              Al acceder, navegar o realizar pedidos en <strong className="text-[#0F3E36]">foxdrop.mx</strong>, el usuario acepta de manera expresa y sin reservas los presentes Términos y Condiciones. Si no está de acuerdo con alguno de ellos, le solicitamos abstenerse de utilizar el servicio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              2. Precios, Moneda y Disponibilidad
            </h2>
            <p>
              Todos los precios exhibidos en la tienda se encuentran expresados en <strong>Pesos Mexicanos (MXN)</strong>. FoxDrop se reserva el derecho de ajustar precios en función de la oferta internacional y costos de importación antes de la confirmación de una orden. Los productos están sujetos a disponibilidad de inventario.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              3. Modalidades de Pago Aceptadas
            </h2>
            <p>Para mayor seguridad y transparencia de nuestros clientes, los pagos se efectúan a través de:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Efectivo contra entrega:</strong> Disponible exclusivamente para entregas locales dentro de Puebla.</li>
              <li><strong>Transferencia bancaria SPEI:</strong> Directa a cuenta oficial, sin cobro de comisiones intermedias.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              4. Políticas de Envío y Tiempos de Entrega
            </h2>
            <p>
              Los pedidos se procesan y empacan en un periodo de 24 a 48 horas hábiles. Para entregas locales en Puebla se coordinan horarios convenientes con el comprador. Para envíos nacionales, se proporciona número de guía y seguimiento en tiempo real.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              5. Garantía y Devoluciones
            </h2>
            <p>
              Todos los artículos gozan de garantía FoxDrop contra defectos de fabricación o daños derivados del traslado. El cliente cuenta con un plazo de <strong>7 días naturales</strong> a partir de la recepción para solicitar el cambio o reembolso correspondiente.
            </p>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0F3E36] text-white py-6 px-4 text-center text-xs border-t border-[#175248]">
        <p className="text-[#D3E0DC]">© {currentYear} FoxDrop México. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
