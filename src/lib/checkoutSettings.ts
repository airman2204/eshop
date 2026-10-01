import { CheckoutSettings } from '@/types';

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  shippingMethods: [
    {
      id: 'pickup',
      name: 'Acordar con el vendedor (Entrega Personal)',
      description: 'Punto de encuentro personal en Puebla o coordinar por WhatsApp (Sin costo)',
      price: 0,
      requiresAddress: false,
      enabled: true,
    },
    {
      id: 'local_puebla',
      name: 'Envío Local (Puebla y alrededores)',
      description: 'Entrega por mensajería local a domicilio',
      price: 50,
      requiresAddress: true,
      enabled: true,
    },
    {
      id: 'national',
      name: 'Envío Nacional por Paquetería',
      description: 'Guía de rastreo nacional a cualquier estado de la República (FedEx/Estafeta/DHL)',
      price: 140,
      requiresAddress: true,
      enabled: true,
    },
  ],
  bankTransfer: {
    bankName: 'BBVA México',
    accountHolder: 'FoxDrop México',
    clabe: '012680015948372619',
    accountNumber: '1594837261',
    notes: 'Realiza tu transferencia desde tu aplicación bancaria. Envía tu captura de pantalla por WhatsApp para despachar tu paquete de inmediato.',
  },
  allowCashOnDelivery: true,
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_checkout_settings' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) return data.settings;
    }
  } catch (err) {
    console.warn('Fallo cargando checkout settings, usando defaults:', err);
  }
  return DEFAULT_CHECKOUT_SETTINGS;
}

export async function saveCheckoutSettings(settings: CheckoutSettings): Promise<boolean> {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_checkout_settings', settings }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error guardando checkout settings:', err);
    return false;
  }
}
