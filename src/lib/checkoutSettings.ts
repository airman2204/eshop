import { CheckoutSettings } from '@/types';

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  shippingMethods: [
    {
      id: 'pickup',
      name: 'Entrega Personal en Punto de Encuentro (Sin costo)',
      description: 'Zerezotla, Plaza San Diego, Centro San Pedro o Centro San Andrés Cholula',
      price: 0,
      requiresAddress: false,
      enabled: true,
    },
    {
      id: 'local_cholula_near',
      name: 'Envío Local Express Cholula & Alrededores',
      description: 'Entrega directa a domicilio en zona Cholula y cercanías',
      price: 30,
      requiresAddress: true,
      enabled: true,
    },
    {
      id: 'local_puebla',
      name: 'Envío Local Puebla Metropolitana',
      description: 'Entrega por mensajería local express a domicilio en área urbana de Puebla',
      price: 50,
      requiresAddress: true,
      enabled: true,
    },
    {
      id: 'national',
      name: 'Envío Nacional por Paquetería',
      description: 'Guía de rastreo nacional FedEx / Paquetexpress / Estafeta con Skydropx',
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
    publicKey: 'APP_USR-d97bd7f3-142a-4231-8c32-2f5d20068a5f',
    accessToken: 'APP_USR-7072476248470076-102212-39444b271633c2c2864dc800eda269cc-3782951173',
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
