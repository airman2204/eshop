'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Volume2, RefreshCw, AlertCircle } from 'lucide-react';

interface MobileBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function MobileBarcodeScanner({
  isOpen,
  onClose,
  onScanSuccess,
}: MobileBarcodeScannerProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Reproducir un pitido sonoro de confirmación estilo POS de tienda
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción previa
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const scannerRegionId = 'foxdrop-qr-reader';

    const startScanner = async () => {
      setIsInitializing(true);
      setScannerError(null);

      try {
        const scanner = new Html5Qrcode(scannerRegionId);
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        // Solicitar preferentemente la cámara trasera del celular (facingMode: environment)
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!mounted) return;
            playScanBeep();
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            onScanSuccess(decodedText);
          },
          () => {
            // Ignorar frames sin código detectado
          }
        );

        if (mounted) setIsInitializing(false);
      } catch (err: unknown) {
        console.error('Error iniciando escáner de cámara:', err);
        if (mounted) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setScannerError(
            errMsg.includes('NotAllowedError') || errMsg.includes('Permission')
              ? 'Permiso de cámara denegado. Por favor permite el acceso a la cámara en los ajustes de tu navegador.'
              : 'No se pudo acceder a la cámara trasera. Asegúrate de estar en tu celular y con HTTPS/localhost.'
          );
          setIsInitializing(false);
        }
      }
    };

    // Pequeño retardo para asegurar que el DOM del modal esté listo
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
          })
          .catch(() => {});
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-between p-4 selection:bg-[#E65F2B]">
      {/* Barra Superior */}
      <div className="flex items-center justify-between text-white z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E65F2B] flex items-center justify-center text-white">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight">Escáner POS FoxDrop</h3>
            <p className="text-[10px] text-gray-300">Apunta al código de barras o QR del producto</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Visor de Cámara */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4">
        {/* Contenedor HTML5 QR Code */}
        <div
          id="foxdrop-qr-reader"
          className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 relative bg-black"
        ></div>

        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2 bg-black/60 rounded-3xl">
            <RefreshCw className="w-8 h-8 animate-spin text-[#E65F2B]" />
            <span className="text-xs font-bold">Activando cámara trasera...</span>
          </div>
        )}

        {scannerError && (
          <div className="absolute inset-x-4 bg-red-900/90 border border-red-500 text-white p-4 rounded-2xl text-xs space-y-2 text-center shadow-2xl">
            <AlertCircle className="w-6 h-6 mx-auto text-red-300" />
            <p className="font-bold">{scannerError}</p>
            <p className="text-[10px] text-red-200">
              Puedes teclear el SKU o código manualmente en la barra de búsqueda si el código está dañado.
            </p>
          </div>
        )}
      </div>

      {/* Barra Inferior con Ayuda */}
      <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5 text-center text-white text-xs space-y-1">
        <div className="flex items-center justify-center gap-1.5 font-bold text-amber-400 text-xs">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Pitido de confirmación automático al detectar</span>
        </div>
        <p className="text-[11px] text-gray-300">
          Reconoce códigos de fábrica (UPC, EAN-13, SKU de FoxDrop) y los agrega al ticket.
        </p>
      </div>
    </div>
  );
}
