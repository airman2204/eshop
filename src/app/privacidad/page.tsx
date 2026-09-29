import Link from 'next/link';
import FoxDropLogo from '@/components/FoxDropLogo';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2, Phone, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad',
  description: 'Aviso de Privacidad Integral de FoxDrop México conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).',
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
            <span>Legal y Protección de Datos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F3E36] tracking-tight">
            Aviso de Privacidad Integral
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Última actualización: Enero de {currentYear}. Cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
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
              <strong>FoxDrop México</strong> (en adelante &quot;FoxDrop&quot;), con domicilio operativo en Puebla, Puebla, México, y portal web oficial{' '}
              <strong className="text-[#0F3E36]">foxdrop.mx</strong>, es el responsable legítimo del uso, almacenamiento, confidencialidad y protección de sus datos personales.
            </p>
          </section>

          {/* 2. DATOS RECABADOS */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">2.</span> Datos Personales que Recabamos
            </h2>
            <p>Para brindarle nuestros servicios de compra, entrega y fidelidad, recabamos los siguientes datos:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre(s), Apellido(s), dirección de correo electrónico y número telefónico celular (WhatsApp).</li>
              <li><strong>Datos de Entrega y Logística:</strong> Calle, número exterior e interior, colonia, municipio o alcaldía, código postal y referencias de entrega.</li>
              <li><strong>Datos de Transacción:</strong> Historial de pedidos realizados, artículos adquiridos, montos totales y puntos acumulados en Club FoxDrop.</li>
            </ul>
            <p className="text-xs bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-emerald-900 font-medium">
              🔒 <strong>Nota importante sobre datos financieros:</strong> FoxDrop <strong>no almacena</strong> números completos de tarjetas de crédito o débito ni códigos de seguridad CVV. Los pagos se gestionan mediante efectivo contra entrega local o transferencias directas SPEI bancarias protegidas.
            </p>
          </section>

          {/* 3. FINALIDADES */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">3.</span> Finalidades del Tratamiento de Datos
            </h2>
            <p>Sus datos personales son recabados para las siguientes finalidades necesarias:</p>
            <div className="space-y-2">
              <div className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-[#0F3E36] block">A. Finalidades Primarias (necesarias para el servicio):</span>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs">
                  <li>Crear y autenticar su cuenta de usuario mediante códigos de un solo uso (OTP).</li>
                  <li>Procesar, preparar, empacar y enviar los artículos adquiridos en el catálogo o pedidos especiales.</li>
                  <li>Coordinar puntos de encuentro y horarios de entrega personal en Puebla o emitir guías de paquetería nacional.</li>
                  <li>Enviar notificaciones de confirmación de pedido y estatus de rastreo vía WhatsApp o correo electrónico.</li>
                  <li>Atender aclaraciones, garantías y procesos de devolución.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-[#0F3E36] block">B. Finalidades Secundarias (opcionales):</span>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs">
                  <li>Asignar puntos de recompensa y beneficios exclusivos a través del programa Club FoxDrop.</li>
                  <li>Enviar promociones especiales, novedades o encuestas de satisfacción (el usuario puede darse de baja en cualquier momento).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. TRANSFERENCIA */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">4.</span> Transferencia de Datos Personales
            </h2>
            <p>
              FoxDrop únicamente transfiere sus datos de contacto y entrega a empresas de paquetería certificadas (ej. FedEx, Estafeta, DHL o mensajería local asignada) con el fin exclusivo de cumplir con la entrega física de sus pedidos.
            </p>
            <p className="font-semibold text-rose-700">
              FoxDrop jamás vende, renta ni transfiere sus datos personales a terceros con fines de comercialización ni publicidad ajena.
            </p>
          </section>

          {/* 5. DERECHOS ARCO */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">5.</span> Ejercicio de Derechos ARCO
            </h2>
            <p>
              Usted tiene derecho en cualquier momento a ejercer sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>, así como revocar el consentimiento que nos haya otorgado para el tratamiento de sus datos personales.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, basta con enviar un mensaje de solicitud directa a nuestra línea oficial de atención con el asunto <em>&quot;Ejercicio de Derechos ARCO&quot;</em> indicando su nombre y correo registrado.
            </p>
          </section>

          {/* 6. COOKIES */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36] flex items-center gap-2">
              <span className="text-[#DF7F2D]">6.</span> Uso de Cookies y Tecnologías de Rastreo
            </h2>
            <p>
              Nuestro sitio web <strong className="text-[#0F3E36]">foxdrop.mx</strong> utiliza cookies y tecnologías afines para asegurar el funcionamiento del carrito de compras, recordar su sesión y generar estadísticas agregadas anónimas sobre el rendimiento del catálogo. Usted puede configurar en cualquier momento sus preferencias a través de nuestro banner de cookies.
            </p>
          </section>

          {/* 7. CONTACTO */}
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-base sm:text-lg font-black text-[#0F3E36]">
              Contacto y Dudas de Privacidad
            </h2>
            <p>
              Si tiene preguntas o inquietudes respecto a la privacidad de sus datos en FoxDrop, estamos a su entera disposición:
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border border-gray-200">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp: {process.env.NEXT_PUBLIC_WHATSAPP_PHONE || 'Atención en Línea'}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border border-gray-200">
                <Mail className="w-4 h-4 text-[#DF7F2D]" />
                <span>Sitio: https://foxdrop.mx</span>
              </div>
            </div>
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
