import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Sparkles, Scan, RotateCw } from 'lucide-react';

export default function Scanner({ onScanSuccess }) {
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);

      // Vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (e) {
      console.warn('Audio/Vibration not supported orblocked', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('scanner-region');
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              console.log("RAW_SCAN_RESULT:", decodedText);
              setLastScan(decodedText);
              playBeep();
              onScanSuccess(decodedText);
              
              // Pause visual scanning for a bit
              setIsScanning(false);
              setTimeout(() => {
                if (isMounted) {
                  setLastScan(null);
                  setIsScanning(true);
                }
              }, 1500);
            }
          },
          () => {} // Ignore frame errors
        );
      } catch (err) {
        if (isMounted) setError('Erro ao acessar a câmera: ' + err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanner) {
        // If it's currently scanning, stop it
        if (scanner.isScanning) {
          scanner.stop()
            .then(() => scanner.clear())
            .catch(e => console.warn('Error during scanner cleanup:', e));
        } else {
          try { scanner.clear(); } catch(e) {}
        }
      }
    };
  }, [onScanSuccess]); // Only recreate if callback changes (unlikely)

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative w-full aspect-square max-w-sm rounded-3xl overflow-hidden border-2 border-primary/20 bg-surface shadow-2xl">
        <div id="scanner-region" className="w-full h-full" />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 pointer-events-none border-primary border-opacity-40 animate-pulse flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-primary rounded-2xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            
            {/* Moving Laser Line */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary/50 shadow-[0_0_10px_#fbbf24] animate-[bounce_2s_infinite]" />
          </div>
        </div>

        {lastScan && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center animate-slide-up">
            <div className="bg-white text-background px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              Lido: {lastScan.slice(0, 12)}...
            </div>
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Scan className="text-primary" />
          Aponte para o Pacote
        </h2>
        <p className="text-secondary text-sm px-8">
          Posicione o código de barras ou QR no centro do quadrado para registrar a entrada.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm w-full font-medium">
          {error}
        </div>
      )}

      {/* Manual Refresh / Retry */}
      <button 
        onClick={() => {
          setIsScanning(false);
          setTimeout(() => setIsScanning(true), 100);
        }}
        className="flex items-center gap-2 text-secondary py-2 px-4 rounded-lg bg-surface hover:bg-surface/80 transition-colors text-sm"
      >
        <RotateCw size={14} />
        Reiniciar Câmera
      </button>
    </div>
  );
}
