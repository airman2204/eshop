import { CheckoutSettings } from '@/types';

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  shippingMethods: [
    {
      id: 'pickup',
      name: 'Acordar con el vendedor (Entrega Personal)',
      description: 'Punto de encuentro personal o coordinar por WhatsApp (Sin costo)',
      price: 0,
      requiresAddress: false,
      enabled: true,
    },
    {
      id: 'local_puebla',
      name: 'Envío Local Directo',
      description: 'Entrega por mensajería local express a domicilio',
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
    showHolder: true,
    showClabe: true,
    showCard: true,
  },
  allowCashOnDelivery: true,
  mercadopago: {
    enabled: true,
    sandbox: false,
    publicKey: 'APP_USR-071ae951-fa96-4df5-a281-bea27ac4d544',
    accessToken: 'APP_USR-2696735870200983-102212-37956d25b0de4da0271830b00d2682e6-3786813278',
  },
};

import { fetchAdminApi } from './adminAuth';

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  try {
    const res = await fetchAdminApi({ action: 'get_checkout_settings' });
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
    const res = await fetchAdminApi({ action: 'save_checkout_settings', settings });
    return res.ok;
  } catch (err) {
    console.error('Error guardando checkout settings:', err);
    return false;
  }
}
