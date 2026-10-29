import Link from 'next/link';
import FoxDropLogo from '@/components/FoxDropLogo';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2, Phone, Mail, Scale } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad Integral | FoxDrop México',
  description: 'Aviso de Privacidad Integral de FoxDrop México conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Protocolos de seguridad bancaria, cifrado y derechos ARCO.',
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
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
            <ShieldCheck className="w-4 h-4" />
            <span>Legal y Protección de Datos Personales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F3E36] tracking-tight">
            Aviso de Privacidad Integral
          </h1>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Última actualización: Octubre de {currentYear}. En estricto cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento en los Estados Unidos Mexicanos.
          </p>
        </div>

        {/* SECCIONES LEGALES */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-xs space-y-8 text-xs sm:text-sm text-gray-700 leading-relaxed">
          
          {/* 1. RESPONSABLE */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">1.</span> Identidad y Domicilio del Responsable
            </h2>
            <p>
              <strong>FoxDrop México</strong> (en lo sucesivo &quot;FoxDrop&quot;), con sede de operaciones en el Estado de Puebla, México, y portal digital oficial{' '}
              <strong className="text-[#0F3E36]">foxdrop.mx</strong>, es el responsable legítimo del uso, resguardo, confidencialidad y tratamiento de los datos personales que usted nos proporcione.
            </p>
          </section>

          {/* 2. DATOS RECABADOS */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">2.</span> Datos Personales Sujetos a Tratamiento
            </h2>
            <p>Para la debida prestación de los servicios comerciales, recabamos las siguientes categorías de datos personales:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre completo, número de teléfono móvil celular (con WhatsApp activo para coordinación de entrega) y correo electrónico.</li>
              <li><strong>Datos de Destino y Logística:</strong> Calle, número exterior e interior, colonia, municipio o alcaldía, entidad federativa, código postal y referencias específicas del inmueble para la correcta entrega de paquetes.</li>
              <li><strong>Datos Transaccionales:</strong> Folio de compra, artículos adquiridos, monto total liquidado, fecha de compra y estatus de rastreo.</li>
            </ul>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs space-y-1 font-medium">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Seguridad y Blindaje de Datos Financieros:</span>
              </div>
              <p className="text-emerald-900 leading-relaxed">
                FoxDrop <strong>NO almacena, conserva ni tiene acceso</strong> a los 16 dígitos completos de sus tarjetas bancarias ni a los códigos de seguridad (CVV/CVC). El procesamiento de pagos con tarjeta de crédito y débito se delega íntegramente a <strong>Mercado Pago</strong> bajo cifrado bancario TLS 1.3 con certificación PCI-DSS Nivel 1.
              </p>
            </div>
          </section>

          {/* 3. FINALIDADES DEL TRATAMIENTO */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">3.</span> Finalidades Primarias y Secundarias
            </h2>
            <div className="space-y-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-[#0F3E36] block">A. Finalidades Primarias (necesarias para la relación comercial):</span>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs">
                  <li>Identificar al comprador y verificar la autenticidad de los pedidos.</li>
                  <li>Procesar, preparar, embalar y gestionar el despacho aduanal y de paquetería de los bienes adquiridos.</li>
                  <li>Generar y remitir la confirmación de orden, comprobante digital y número de guía de seguimiento.</li>
                  <li>Notificar oportunamente el estatus del pedido y coordinar la recepción en domicilio o punto de entrega.</li>
                  <li>Gestionar solicitudes de garantía, aclaraciones, devoluciones o cancelaciones autorizadas.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-[#0F3E36] block">B. Finalidades Secundarias (no indispensables):</span>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs">
                  <li>Acumulación y canje de beneficios dentro del programa de lealtad Club FoxDrop.</li>
                  <li>Envío de notificaciones de promociones, novedades de catálogo o encuestas de satisfacción del cliente.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. TRANSFERENCIA Y OPERADORES LOGÍSTICOS */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">4.</span> Transferencia de Datos Personales
            </h2>
            <p>
              Con fundamento en el <strong>Artículo 37 de la LFPDPPP</strong>, sus datos de contacto y domicilio podrán ser transferidos sin necesidad de consentimiento expreso a empresas de paquetería y transporte formalmente constituidas (tales como FedEx, Estafeta, Paquetexpress, Correos de México o mensajeros locales asignados), con el fin exclusivo e improrrogable de llevar a cabo la entrega física del paquete en su domicilio.
            </p>
            <p className="font-bold text-rose-800 text-xs">
              FoxDrop México NO comercializa, renta, vende ni lucra bajo ninguna circunstancia con las bases de datos de sus clientes.
            </p>
          </section>

          {/* 5. DERECHOS ARCO */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">5.</span> Ejercicio de Derechos ARCO y Revocación del Consentimiento
            </h2>
            <p>
              Usted tiene en todo momento el derecho de <strong>Acceso, Rectificación, Cancelación y Oposición (Derechos ARCO)</strong> respecto de sus datos personales en posesión de FoxDrop.
            </p>
            <p>
              Para ejercer dichos derechos, únicamente debe comunicarse a través de nuestros canales oficiales señalados al calce o desde la sección &quot;Mi Cuenta &gt; Ajustes &gt; Eliminar Cuenta&quot;, acreditando la titularidad de su cuenta registrada. Su solicitud será atendida y procesada en un plazo máximo de 5 días hábiles.
            </p>
          </section>

          {/* 6. MODIFICACIONES Y CONTACTO */}
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              6. Actualizaciones y Contacto Oficial
            </h2>
            <p>
              FoxDrop se reserva el derecho de modificar o actualizar en cualquier momento el presente Aviso de Privacidad derivado de reformas legislativas o políticas internas. Cualquier modificación sustancial se publicará oportunamente en <strong className="text-[#0F3E36]">foxdrop.mx/privacidad</strong>.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold pt-1">
              <div className="flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border border-gray-200">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp de Atención Oficial: {process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '222 380 6846'}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border border-gray-200">
                <Mail className="w-4 h-4 text-[#DF7F2D]" />
                <span>Portal: https://foxdrop.mx</span>
              </div>
            </div>
          </section>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#0F3E36] text-white py-6 px-4 text-center text-xs border-t border-[#175248]">
        <p className="text-[#D3E0DC]">© {currentYear} FoxDrop México. Cumplimiento con la Ley Federal de Protección de Datos Personales (LFPDPPP).</p>
      </footer>
    </div>
  );
}
