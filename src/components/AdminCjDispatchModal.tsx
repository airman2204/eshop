import React, { useState } from 'react';
import { Globe, Send, CheckCircle2, AlertCircle, Loader2, X, Package, MapPin, Phone, User, DollarSign, ShieldAlert } from 'lucide-react';
import { Order } from '@/types';

interface AdminCjDispatchModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cjOrderId: string) => void;
}

export default function AdminCjDispatchModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: AdminCjDispatchModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ cjOrderId: string } | null>(null);

  // Campos editables/auditables de dirección antes de emitir a CJ
  const shippingAddr = typeof order?.shippingAddress === 'object' ? order.shippingAddress : {};
  const [customerName, setCustomerName] = useState(order?.clientName || '');
  const [phone, setPhone] = useState(order?.clientPhone || '');
  const [street, setStreet] = useState(shippingAddr?.street || '');
  const [city, setCity] = useState(shippingAddr?.city || 'Puebla');
  const [province, setProvince] = useState(shippingAddr?.state || shippingAddr?.province || 'Puebla');
  const [zip, setZip] = useState(shippingAddr?.zip || '72000');
  const [logisticName, setLogisticName] = useState('CJPacket Ordinary');

  if (!isOpen || !order) return null;

  const isAlreadySubmitted = order.notes && order.notes.includes('[CJ-ORDER:');

  const handleDispatch = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const adminTok = typeof window !== 'undefined' ? localStorage.getItem('foxdrop_admin_session') : null;
      let token = '';
      if (adminTok) {
        try {
          const parsed = JSON.parse(adminTok);
          if (parsed.token) token = parsed.token;
        } catch {}
      }

      const res = await fetch('/api/admin/cj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'dispatch_order_to_cj',
          orderId: order.id,
          logisticName,
          customAddress: {
            customerName,
            phone,
            street,
            city,
            province,
            zip,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al enviar orden a CJ Dropshipping');
      }

      setSuccessData({ cjOrderId: data.cjOrderId });
      onSuccess(data.cjOrderId);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Globe className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Validar & Enviar a CJ Dropshipping</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-indigo-200/70">Despacho de fábrica internacional a domicilio en México</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 bg-white">
          {isAlreadySubmitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Esta orden ya fue transmitida a CJ Dropshipping</span>
              </div>
              <p className="text-xs text-emerald-700">
                La orden está blindada contra cancelaciones del cliente y puedes verla en tu panel oficial de CJ Dropshipping para gestionar el pago y despacho.
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 font-mono text-[11px] text-slate-800">
                Nota: {order.notes}
              </div>
            </div>
          ) : successData ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base">¡Orden enviada con éxito a CJ Dropshipping!</h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                La orden se generó en tu cuenta de CJ con folio internacional:
              </p>
              <div className="inline-block px-4 py-2 bg-white rounded-xl border border-emerald-300 font-mono font-bold text-sm text-slate-900 shadow-2xs">
                {successData.cjOrderId}
              </div>
              <p className="text-[11px] text-slate-500">
                A partir de ahora la cancelación en la app del cliente queda bloqueada automáticamente. Ingresa a CJ Dropshipping &gt; My CJ &gt; Dropshipping Orders para autorizar el mayoreo.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
              >
                Cerrar Ventana
              </button>
            </div>
          ) : (
            <>
              {/* Alerta de Política y Protección Financiera */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-indigo-950 text-[11px]">Protección Antifraude y Cancelaciones</p>
                  <p className="text-[10px] text-indigo-800 leading-relaxed">
                    Al dar clic en <strong>Enviar a Fábrica CJ</strong>, la orden se bloqueará contra cancelaciones del comprador y se enrutará a fábrica. Valida que el teléfono tenga 10 dígitos y el Código Postal sea correcto.
                  </p>
                </div>
              </div>

              {/* Artículos a Despachar */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 text-xs block flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#E65F2B]" /> Artículos del Pedido
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50 p-3">
                  {order.order_items && order.order_items.length > 0 ? (
                    order.order_items.map((item, idx) => (
                      <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <div className="flex-1 pr-3">
                          <p className="font-semibold text-slate-900 truncate">{item.product_title}</p>
                          <p className="text-[10px] text-slate-500">Cantidad: {item.quantity} ud(s)</p>
                        </div>
                        <span className="font-mono font-bold text-slate-800">${item.price_at_purchase} MXN</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 py-1 text-xs">Sin artículos registrados.</p>
                  )}
                </div>
              </div>

              {/* Validación de Datos del Comprador */}
              <div className="space-y-3">
                <span className="font-bold text-slate-900 text-xs block flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" /> Datos de Recepción en México
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Nombre Destinatario</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Teléfono (10 dígitos)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Calle, Número y Colonia</label>
                    <input
                      type="text"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Ciudad / Municipio</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Estado</label>
                    <input
                      type="text"
                      value={province}
                      onChange={e => setProvince(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Código Postal (C.P.)</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Línea Logística CJ</label>
                    <select
                      value={logisticName}
                      onChange={e => setLogisticName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CJPacket Ordinary">CJPacket Ordinary (Económico/Estándar)</option>
                      <option value="CJPacket Sensitive">CJPacket Sensitive (Baterías/Líquidos)</option>
                      <option value="CJ Packet Fast Line">CJ Packet Fast Line</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isAlreadySubmitted && !successData && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleDispatch}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando con CJ...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Validar & Enviar Orden a CJ</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
