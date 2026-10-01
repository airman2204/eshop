'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
  const [coloniasOptions, setColoniasOptions] = useState<string[]>([]);
  const [zip, setZip] = useState(initialZip);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [loadingZip, setLoadingZip] = useState(false);
  const [autocompleteNotice, setAutocompleteNotice] = useState<string | null>(null);

  // Notificar al componente padre de cualquier cambio en la dirección
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

  // Consulta automática de SEPOMEX cuando el usuario escribe los 5 dígitos del CP
  const handleZipChange = async (newZip: string) => {
    const cleanZip = newZip.replace(/[^0-9]/g, '').slice(0, 5);
    setZip(cleanZip);

    if (cleanZip.length === 5) {
      setLoadingZip(true);
      try {
        const res = await fetch(`/api/postal?cp=${cleanZip}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            if (data.state) setState(data.state);
            if (data.city) setCity(data.city);
            if (data.colonias && data.colonias.length > 0) {
              setColoniasOptions(data.colonias);
              setColonia(data.colonias[0]);
            }
            setAutocompleteNotice(`¡C.P. ${cleanZip} validado! Localizado en ${data.state}`);
            setTimeout(() => setAutocompleteNotice(null), 4000);
          }
        } else {
          setColoniasOptions([]);
        }
      } catch (err) {
        console.warn('Error al consultar código postal:', err);
      } finally {
        setLoadingZip(false);
      }
    } else {
      setColoniasOptions([]);
    }
  };

  return (
    <div className="space-y-3">
      {autocompleteNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-200 font-medium">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{autocompleteNotice}</span>
        </div>
      )}

      {/* Código Postal */}
      <div>
        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1 mb-1">
          <MapPin className="w-3.5 h-3.5 text-[#E65F2B]" />
          Código Postal (5 dígitos) <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            maxLength={5}
            placeholder="Ej. 72160 o 01000"
            value={zip}
            onChange={(e) => handleZipChange(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
          />
          {loadingZip && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E65F2B]" />
              <span>Buscando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Calle y Número */}
      <div>
        <label className="text-[11px] font-bold text-gray-700 block mb-1">
          Calle y Número exterior / interior <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Ej. Av. Juárez 1502, Depto 4..."
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
        />
      </div>

      {/* Colonia / Fraccionamiento */}
      <div>
        <label className="text-[11px] font-bold text-gray-700 block mb-1">
          Colonia / Fraccionamiento <span className="text-rose-500">*</span>
        </label>
        {coloniasOptions.length > 1 ? (
          <div className="space-y-1">
            <select
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs"
            >
              {coloniasOptions.map((col, idx) => (
                <option key={idx} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-emerald-600 block">
              ✓ Colonias encontradas para este C.P. Selecciona la tuya o escribe una si no aparece.
            </span>
          </div>
        ) : (
          <input
            type="text"
            required
            placeholder="Ej. La Paz, Centro..."
            value={colonia}
            onChange={(e) => setColonia(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E65F2B] focus:border-transparent transition shadow-2xs placeholder:text-gray-400"
          />
        )}
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
