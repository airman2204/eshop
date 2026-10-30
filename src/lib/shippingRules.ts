/**
 * Módulo de Reglas y Cálculo de Envíos de FoxDrop México
 *
 * 1. Puntos de Encuentro Gratuitos ($0 MXN):
 *    - Zerezotla
 *    - Plaza San Diego
 *    - Centro de San Pedro Cholula
 *    - Centro de San Andrés Cholula
 *
 * 2. Envíos Locales a Domicilio en Puebla:
 *    - Zona Cholula y cercanías (≤ 5 km de los centros): $30 MXN
 *    - Zona Metropolitana de Puebla (> 5 km dentro de zona conurbada): $50 MXN
 *
 * 3. Envíos Nacionales:
 *    - Resto de la República / municipios foráneos: Cotización Skydropx PRO en vivo
 *      o tarifa fija garantizada ($140 MXN).
 */

export interface PickupPoint {
  id: string;
  name: string;
  shortName: string;
  area: string;
  reference: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
}

export const OFFICIAL_PICKUP_POINTS: PickupPoint[] = [
  {
    id: 'zerezotla',
    name: 'Zerezotla (San Pedro Cholula)',
    shortName: 'Zerezotla',
    area: 'San Pedro Cholula',
    reference: 'Zona Residencial Zerezotla / Club de Golf',
    lat: 19.0558,
    lng: -98.3245,
    googleMapsUrl: 'https://maps.google.com/?q=19.0558,-98.3245',
  },
  {
    id: 'plaza_san_diego',
    name: 'Plaza San Diego (Blvd. Forjadores)',
    shortName: 'Plaza San Diego',
    area: 'San Pedro Cholula',
    reference: 'Punto de encuentro seguro frente a la entrada principal',
    lat: 19.0682,
    lng: -98.2862,
    googleMapsUrl: 'https://maps.google.com/?q=19.0682,-98.2862',
  },
  {
    id: 'centro_san_pedro',
    name: 'Centro de San Pedro Cholula (Zócalo)',
    shortName: 'Centro San Pedro',
    area: 'San Pedro Cholula',
    reference: 'Plaza de la Concordia / Portales del Zócalo',
    lat: 19.0625,
    lng: -98.3056,
    googleMapsUrl: 'https://maps.google.com/?q=19.0625,-98.3056',
  },
  {
    id: 'centro_san_andres',
    name: 'Centro de San Andrés Cholula (Zócalo)',
    shortName: 'Centro San Andrés',
    area: 'San Andrés Cholula',
    reference: 'Zócalo de San Andrés Cholula / Iglesia de San Andrés',
    lat: 19.0492,
    lng: -98.2974,
    googleMapsUrl: 'https://maps.google.com/?q=19.0492,-98.2974',
  },
];

/**
 * Códigos postales verificados dentro del radio preferencial de San Pedro y San Andrés Cholula (Tarifa $30 MXN)
 */
export const CHOLULA_NEAR_POSTAL_CODES = new Set([
  '72760', // San Pedro Cholula Centro / Barrio de Santiago / Jesús Tlatempa
  '72761',
  '72762',
  '72763',
  '72764', // Zerezotla / San Cristóbal Tepontla
  '72765',
  '72766',
  '72767',
  '72770', // San Andrés Cholula Centro
  '72774',
  '72775',
  '72776',
  '72777',
]);

/**
 * Códigos postales de la Zona Metropolitana de Puebla (Tarifa $50 MXN)
 * Abarca Puebla Capital, Angelópolis, Cuautlancingo, Coronango, Zavaleta, La Paz, Sanctorum, etc.
 */
export const PUEBLA_METRO_PREFIXES = [
  '720', // Puebla Capital Centro y Norte
  '721', // La Paz, Zavaleta, San Baltazar, Recta a Cholula
  '722', // Angelópolis, Lomas de Angelópolis, San Manuel, Mayorazgo
  '723', // Amalucan, Bosques, Oriente
  '724', // Las Ánimas, El Vergel, Bugambilias
  '725', // Anzures, San Jerónimo, Sur
  '727', // Cuautlancingo, Coronango, Misiones de San Francisco
  '728', // Chipilo, Tlaxcalancingo foráneo, San Gregorio
];

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula Haversine
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distancia mínima en km hacia cualquiera de los 4 puntos oficiales de FoxDrop
 */
export function getMinDistanceToPickupPointsKm(lat: number, lng: number): number {
  let min = Infinity;
  for (const pt of OFFICIAL_PICKUP_POINTS) {
    const dist = calculateHaversineDistanceKm(lat, lng, pt.lat, pt.lng);
    if (dist < min) min = dist;
  }
  return min;
}

export type ShippingTier = 'pickup' | 'local_near' | 'local_metro' | 'national';

export interface ShippingAssessment {
  tier: ShippingTier;
  cost: number;
  label: string;
  description: string;
  estimatedTime: string;
  isPueblaState: boolean;
}

/**
 * Evalúa automáticamente la tarifa y tipo de envío según el Código Postal, Estado y Coordenadas opcionales
 */
export function assessShippingByAddress(params: {
  zip?: string;
  state?: string;
  lat?: number;
  lng?: number;
}): ShippingAssessment {
  const cleanZip = (params.zip || '').trim().slice(0, 5);
  const cleanState = (params.state || '').toLowerCase();
  const isPueblaState = cleanState.includes('puebla') || cleanZip.startsWith('72');

  // Si no hay datos de Puebla y el C.P. no inicia con 72 -> Envío Nacional
  if (!isPueblaState && cleanZip.length === 5) {
    return {
      tier: 'national',
      cost: 140,
      label: 'Envío Nacional por Paquetería',
      description: 'Guía de rastreo nacional FedEx / Paquetexpress / Estafeta (3 a 5 días)',
      estimatedTime: '3 a 5 días hábiles',
      isPueblaState: false,
    };
  }

  // Si tenemos coordenadas precisas:
  if (typeof params.lat === 'number' && typeof params.lng === 'number' && params.lat !== 0) {
    const minKm = getMinDistanceToPickupPointsKm(params.lat, params.lng);
    if (minKm <= 5.5) {
      return {
        tier: 'local_near',
        cost: 30,
        label: 'Envío Local Express Cholula & Alrededores',
        description: 'Entrega local rápida a tu domicilio',
        estimatedTime: 'Mismo día / 24 horas',
        isPueblaState: true,
      };
    }
  }

  // Evaluación por Código Postal de Cholula Cercano (≤ 5 km)
  if (CHOLULA_NEAR_POSTAL_CODES.has(cleanZip)) {
    return {
      tier: 'local_near',
      cost: 30,
      label: 'Envío Local Express Cholula & Alrededores',
      description: 'Entrega local rápida a tu domicilio',
      estimatedTime: 'Mismo día / 24 horas',
      isPueblaState: true,
    };
  }

  // Evaluación por Zona Metropolitana de Puebla (> 5 km)
  const isPueblaMetro = PUEBLA_METRO_PREFIXES.some(prefix => cleanZip.startsWith(prefix));
  if (isPueblaMetro) {
    return {
      tier: 'local_metro',
      cost: 50,
      label: 'Envío Local Puebla Metropolitana',
      description: 'Entrega en área urbana de Puebla y conurbada',
      estimatedTime: '24 a 48 horas',
      isPueblaState: true,
    };
  }

  // Si es estado de Puebla pero municipio muy lejano (ej. Tehuacán C.P. 75700, Huauchinango 73160)
  if (cleanZip.startsWith('73') || cleanZip.startsWith('74') || cleanZip.startsWith('75')) {
    return {
      tier: 'national',
      cost: 140,
      label: 'Envío Estatal Foráneo por Paquetería',
      description: 'Guía asegurada por paquetería a municipios del interior de Puebla',
      estimatedTime: '2 a 4 días hábiles',
      isPueblaState: true,
    };
  }

  // Default para Puebla sin C.P. específico
  return {
    tier: 'local_metro',
    cost: 50,
    label: 'Envío Local Puebla Metropolitana',
    description: 'Entrega a domicilio en zona urbana de Puebla',
    estimatedTime: '24 a 48 horas',
    isPueblaState: true,
  };
}
