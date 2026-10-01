'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Check, Sparkles, AlertCircle } from 'lucide-react';

interface ParsedAddress {
  street: string;
  number?: string;
  colonia?: string;
  zip: string;
  city: string;
  state: string;
  fullAddress: string;
}

interface GoogleAddressInputProps {
  initialStreet?: string;
  initialZip?: string;
  initialColonia?: string;
  initialCity?: string;
  initialState?: string;
  onAddressChange: (address: ParsedAddress) => void;
  required?: boolean;
}

export default function GoogleAddressInput({
  initialStreet = '',
  initialZip = '',
  initialColonia = '',
  initialCity = 'Puebla',
  initialState = 'Puebla',
  onAddressChange,
}: GoogleAddressInputProps) {
  const [street, setStreet] = useState(initialStreet);
  const [colonia, setColonia] = useState(initialColonia);
  const [zip, setZip] = useState(initialZip);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [autocompleteNotice, setAutocompleteNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Notificar al padre cada vez que cambien los campos
  useEffect(() => {
    onAddressChange({
      street,
      colonia,
      zip,
      city,
      state,
      fullAddress: `${street}${colonia ? ', ' + colonia : ''}, C.P. ${zip}, ${city}, ${state}`.trim(),
    });
  }, [street, colonia, zip, city, state]);

  // Cargar Google Places Autocomplete si hay API Key disponible
  useEffect(() => {
    if (!apiKey) return;

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setGoogleLoaded(true);
      return;
    }

    const scriptId = 'google-maps-places-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=MX`;
      script.async = true;
      script.onload = () => setGoogleLoaded(true);
      document.head.appendChild(script);
    }
  }, [apiKey]);

  // Inicializar Autocomplete cuando Google Maps esté listo y haya input
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    try {
      const google = (window as any).google;
      if (!google?.maps?.places?.Autocomplete) return;

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'mx' },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place || !place.address_components) return;

        let streetName = '';
        let streetNumber = '';
        let neighborhood = '';
        let postalCode = '';
        let locality = '';
        let adminArea = '';

        for (const comp of place.address_components) {
          const types = comp.types;
          if (types.includes('route')) streetName = comp.long_name;
          if (types.includes('street_number')) streetNumber = comp.long_name;
          if (types.includes('sublocality_level_1') || types.includes('neighborhood')) neighborhood = comp.long_name;
          if (types.includes('postal_code')) postalCode = comp.long_name;
          if (types.includes('locality')) locality = comp.long_name;
          if (types.includes('administrative_area_level_1')) adminArea = comp.long_name;
        }

        const fullStreet = `${streetName} ${streetNumber}`.trim() || place.formatted_address || '';
        if (fullStreet) setStreet(fullStreet);
        if (neighborhood) setColonia(neighborhood);
        if (postalCode) setZip(postalCode);
        if (locality) setCity(locality);
        if (adminArea) setState(adminArea);

        setAutocompleteNotice('¡Dirección validada y localizada con Google Maps!');
        setTimeout(() => setAutocompleteNotice(null), 4000);
      });
    } catch (err) {
      console.warn('Error al iniciar Google Places Autocomplete:', err);
    }
  }, [googleLoaded]);

  return (
    <div className="space-y-2.5">
      {autocompleteNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{autocompleteNotice}</span>
        </div>
      )}

      {/* Campo principal con autocompletado */}
      <div>
        <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between mb-1">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#E65F2B]" />
            Calle y Número exterior / interior <span className="text-rose-500">*</span>
          </span>
          {apiKey ? (
            <span className="text-[9px] font-medium text-blue-600 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Autocompletado Google Activo
            </span>
          ) : null}
        </label>
        <input
          ref={inputRef}
          type="text"
          required
          placeholder="Ej. Av. Juárez 1502, Depto 4..."
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
        />
      </div>

      {/* Colonia y Código Postal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-gray-700 block mb-1">
            Colonia / Fraccionamiento <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej. La Paz, Centro..."
            value={colonia}
            onChange={(e) => setColonia(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-700 block mb-1">
            Código Postal (5 dígitos) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={5}
            placeholder="Ej. 72160"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Ciudad y Estado */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-gray-700 block mb-1">
            Ciudad / Municipio <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Puebla"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-700 block mb-1">
            Estado <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Puebla"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
}
