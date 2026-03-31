import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOCRResult } from '../utils/ocrProcessor';

export default function Scanner({ onOCRSuccess }) {
  const [error, setError] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const scannerRef = useRef(null);
  const videoRef = useRef(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
      if ('vibrate' in navigator) navigator.vibrate(100);
    } catch (e) {
      console.warn('Feedback hidden', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('scanner-region');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, aspectRatio: 1.0 },
          () => {}, // No barcode decoding needed
          () => {} // Ignore frame errors
        );

        const video = document.querySelector('#scanner-region video');
        if (isMounted && video) videoRef.current = video;

      } catch (err) {
        if (isMounted) setError('Câmera indisponível: ' + err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanner && scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(e => console.warn(e));
      }
    };
  }, []);

  const handleCaptureOCR = async () => {
    if (!videoRef.current || ocrLoading) return;
    
    setOcrLoading(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = imageData.split(',')[1];
      
      const { data, error: functionError } = await supabase.functions.invoke('vision-ocr', {
        body: { imageBase64: base64 }
      });

      if (functionError) throw new Error(functionError.message);
      if (data?.error) throw new Error(data.error);

      console.log("OCR_RAW_TEXT_VISION:", data.text);

      const result = parseOCRResult(data.text);
      playBeep();
      onOCRSuccess(result);
    } catch (err) {
      console.error("OCR_ERROR:", err);
      setError("Erro ao ler etiqueta via Google Vision. Tente novamente.");
    } finally {
      if (videoRef.current) setOcrLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <div className="relative w-full aspect-square rounded-[48px] overflow-hidden border-2 border-primary/20 bg-surface shadow-2xl">
        <div id="scanner-region" className="w-full h-full" />
        
        {/* OCR Frame Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[85%] h-[60%] border-2 border-primary border-opacity-40 bg-primary/5 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>
        </div>

        {ocrLoading && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-50 animate-in fade-in duration-300">
            <div className="relative">
              <Loader2 className="text-primary animate-spin" size={64} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="font-black text-primary uppercase tracking-[0.2em] text-xl">Lendo Etiqueta</p>
              <p className="text-secondary text-xs font-bold opacity-60">IA analisando endereço...</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center space-y-6 px-4 w-full">
        <div className="space-y-1">
          <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Triagem Inteligente</h2>
          <p className="text-secondary text-sm font-medium opacity-70 italic">Aponte para o endereço da etiqueta</p>
        </div>
        
        <button 
          onClick={handleCaptureOCR}
          disabled={ocrLoading}
          className="w-full bg-primary text-background h-20 rounded-[24px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all shadow-primary/30 disabled:opacity-50"
        >
          <Camera size={28} /> ESCANEAR IA
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
