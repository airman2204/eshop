import Link from 'next/link';
import FoxDropLogo from '@/components/FoxDropLogo';
import { FileText, ArrowLeft, Truck, ShieldCheck, RefreshCw, AlertCircle, Scale, Globe, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones de Compra y Uso | FoxDrop México',
  description: 'Términos y Condiciones oficiales de FoxDrop México conformes a la Ley Federal de Protección al Consumidor (PROFECO) y regulaciones de comercio electrónico. Políticas de envío, garantías, cancelaciones y devoluciones.',
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
            <Scale className="w-4 h-4" />
            <span>Marco Legal & Protección al Consumidor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F3E36] tracking-tight">
            Términos y Condiciones de Compra y Uso
          </h1>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Última actualización: Octubre de {currentYear}. Regulaciones conformes a la Ley Federal de Protección al Consumidor (PROFECO), Código de Comercio de los Estados Unidos Mexicanos y normativas de comercio digital.
          </p>
        </div>

        {/* SECCIONES LEGALES */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-xs space-y-8 text-xs sm:text-sm text-gray-700 leading-relaxed">
          
          {/* 1. OBJETO Y ACEPTACIÓN */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              1. Objeto, Ámbito de Aplicación y Aceptación
            </h2>
            <p>
              El presente contrato de Términos y Condiciones regula el acceso, navegación, uso y compras realizadas a través del sitio web oficial <strong className="text-[#0F3E36]">foxdrop.mx</strong> (en adelante, la &quot;Plataforma&quot;), operado comercialmente por FoxDrop México.
            </p>
            <p>
              Al navegar en la Plataforma, crear una cuenta o formalizar un pedido, el usuario declara ser mayor de edad con plena capacidad legal para obligarse conforme a las leyes mercantiles de los Estados Unidos Mexicanos y acepta de manera íntegra, expresa y vinculante los presentes Términos.
            </p>
          </section>

          {/* 2. CATÁLOGO, DISPONIBILIDAD Y PRECIOS */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              2. Catálogo de Productos, Precios y Divisa
            </h2>
            <p>
              Todos los precios exhibidos en la Plataforma se encuentran debidamente expresados en <strong>Pesos Mexicanos (MXN)</strong> e incluyen los impuestos aplicables. Los precios exhibidos al momento de finalizar la compra son definitivos.
            </p>
            <p>
              FoxDrop comercializa dos modalidades de productos claramente identificadas en la Plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Inventario Boutique / Entrega Inmediata:</strong> Productos físicamente resguardados en almacén local en México con entrega en 24 a 48 horas hábiles.</li>
              <li><strong>Artículos de Importación Directa:</strong> Artículos seleccionados de novedades globales que se despachan directamente de fábrica internacional al domicilio del cliente en México, con tiempo de tránsito estimado de 10 a 15 días hábiles.</li>
            </ul>
          </section>

          {/* 3. MÉTODOS DE PAGO Y SEGURIDAD TRANSACCIONAL */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              3. Métodos de Pago y Seguridad de las Transacciones
            </h2>
            <p>
              FoxDrop garantiza compras 100% seguras y cifradas mediante las siguientes pasarelas y mecanismos oficiales:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Tarjetas de Crédito y Débito (Visa, Mastercard, American Express):</strong> Procesadas de forma segura a través de la pasarela certificada de <strong>Mercado Pago</strong> bajo estándares internacionales PCI-DSS nivel 1. FoxDrop no almacena números de tarjeta ni códigos de seguridad CVV.</li>
              <li><strong>Mercado Pago Checkout Pro:</strong> Con saldo en cuenta Mercado Pago, dinero electrónico o efectivo en puntos de conveniencia autorizados.</li>
              <li><strong>Transferencia Electrónica Interbancaria (SPEI):</strong> Directa a las cuentas bancarias oficiales de FoxDrop identificadas con CLABE interbancaria.</li>
              <li><strong>Efectivo en Mostrador / Entrega Local:</strong> Aplicable exclusivamente para pedidos con modalidad de entrega acordada física en Puebla.</li>
            </ul>
          </section>

          {/* 4. POLÍTICAS DE ENVÍO Y TIEMPOS DE TRÁNSITO */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              4. Políticas de Envío, Despacho y Tiempos de Entrega
            </h2>
            <p>
              Una vez acreditado el pago de la orden:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Envíos Locales (Puebla y Zona Metropolitana):</strong> Se entregan en 24 a 48 horas hábiles mediante repartidor propio o punto de entrega convenido.</li>
              <li><strong>Envíos Nacionales:</strong> Se despachan vía paqueterías certificadas (FedEx, Estafeta, DHL, Paquetexpress) con tiempos de tránsito de 2 a 5 días hábiles y número de rastreo asignado.</li>
              <li><strong>Envíos de Importación Directa:</strong> Cuentan con <strong>Envío Gratis incluido</strong>. El tiempo estimado de arribo a domicilio en México es de <strong>10 a 15 días hábiles</strong>. Se genera guía internacional de seguimiento consultable desde la cuenta del cliente.</li>
            </ul>
            <p className="text-xs text-gray-500 italic">
              El cliente es responsable de proporcionar una dirección exacta, código postal verídico, referencias claras y número de teléfono celular con WhatsApp activo para la entrega por parte del operador logístico.
            </p>
          </section>

          {/* 5. POLÍTICA DE CANCELACIONES Y REEMBOLSOS */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              5. Política de Cancelaciones y Reembolsos
            </h2>
            <p>
              Conforme a los lineamientos de PROFECO y la naturaleza de las operaciones logísticas:
            </p>
            <div className="space-y-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="font-bold text-[#0F3E36] block">A. Cancelación Previa al Despacho:</span>
                <p className="text-xs text-gray-600">
                  El cliente podrá cancelar su orden directamente desde el panel &quot;Mis Pedidos&quot; sin penalización alguna mientras la orden se encuentre en estado <strong>Pendiente de Confirmación / En Revisión</strong>. El reembolso se tramitará de forma inmediata al mismo método de pago original o como saldo a favor si el cliente así lo solicita.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                <span className="font-bold text-amber-900 block">B. Bloqueo de Cancelación tras Emisión a Fábrica / Tránsito:</span>
                <p className="text-xs text-amber-800">
                  Una vez que la orden pasa a estado <strong>En Preparación en Fábrica Internacional</strong> o <strong>En Camino</strong>, el pedido queda legal y operativamente comprometido en la cadena de suministro internacional y embalaje aduanal. En esta etapa, no se admiten cancelaciones unilaterales en la plataforma web, debiendo esperar a la recepción física del producto para tramitar cualquier garantía o devolución conforme a la Cláusula 6.
                </p>
              </div>
            </div>
          </section>

          {/* 6. GARANTÍA DE SATISFACCIÓN Y DERECHO DE RETRACTO */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              6. Garantía de Satisfacción, Devoluciones y Daños de Traslado
            </h2>
            <p>
              En estricto apego al <strong>Artículo 92 y 93 de la Ley Federal de Protección al Consumidor</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Defectos de fábrica o fallas mecánicas/eléctricas:</strong> Todos los productos cuentan con <strong>30 días naturales de garantía</strong> directa con FoxDrop a partir del día de entrega física.</li>
              <li><strong>Daños derivados de la paquetería:</strong> Si el producto llega roto, abollado o con piezas faltantes, el cliente deberá reportarlo dentro de las <strong>48 horas posteriores</strong> a la entrega enviando fotografía o video del empaque a nuestro WhatsApp oficial para el reemplazo inmediato de la pieza sin costo.</li>
              <li><strong>Condiciones para devolución:</strong> El producto debe devolverse con su caja original, accesorios, etiquetas y manuales. Por normas de salubridad y COFEPRIS, los productos cosméticos, de higiene personal o uso íntimo abiertos no admiten devoluciones por retracto voluntario, salvo defecto de fabricación comprobable.</li>
            </ul>
          </section>

          {/* 7. PROPIEDAD INTELECTUAL Y DESLINDE NOMINATIVO DE MARCAS */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              7. Propiedad Intelectual, Deslinde de Responsabilidad y Principio de Agotamiento de Marca
            </h2>
            <p>
              FoxDrop México opera como una comercializadora y minorista independiente. Todos los nombres comerciales, marcas registradas, logotipos y diseños de terceros que pudieran exhibirse en la Plataforma (tales como Bath & Body Works, Victoria&apos;s Secret, Nike, Apple u otros) son propiedad exclusiva de sus respectivos titulares y fabricantes.
            </p>
            <p className="text-gray-600 text-xs">
              La mención de marcas en la Plataforma se realiza de conformidad con el <strong>Artículo 171 de la Ley Federal de Protección a la Propiedad Industrial</strong> (Principio de Agotamiento de Derechos de Marca), teniendo un uso estrictamente nominativo y referencial para informar al consumidor final sobre la naturaleza, compatibilidad y autenticidad física de los bienes puestos a la venta, sin implicar afiliación, patrocinio, distribución oficial exclusiva o representación legal de dichas corporaciones.
            </p>
          </section>

          {/* 8. JURISDICCIÓN Y LEY APLICABLE */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              8. Jurisdicción y Legislación Aplicable
            </h2>
            <p>
              Para la interpretación, cumplimiento y resolución de cualquier controversia derivada del presente contrato, las partes acuerdan someterse en primera instancia al procedimiento conciliatorio de la <strong>Procuraduría Federal del Consumidor (PROFECO)</strong>, y en caso de subsistir diferencias, a la jurisdicción de los <strong>Tribunales Competentes en el Estado de Puebla, México</strong>, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
            </p>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0F3E36] text-white py-6 px-4 text-center text-xs border-t border-[#175248]">
        <p className="text-[#D3E0DC]">© {currentYear} FoxDrop México. Registro y Cumplimiento Mercantil Mexicano.</p>
      </footer>
    </div>
  );
}
