import React, { useState } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseBulkScreenshot } from '../utils/ocrProcessor';

export default function BulkImporter({ onImport, onCancel }) {
  const [inputMode, setInputMode] = useState('image');
  const [manualText, setManualText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const processManualText = () => {
    if (!manualText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const items = parseBulkScreenshot(manualText);
      if (items.length === 0) {
        setError("Não conseguimos identificar entregas válidas neste texto. Verifique o padrão copiado.");
      } else {
        setResults(items);
      }
    } catch (err) {
      setError("Erro ao processar o texto colado.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Convert file to Base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // remove data:image/...;base64,
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Invoke Supabase Edge Function (Google Cloud Vision API)
      const { data, error: functionError } = await supabase.functions.invoke('vision-ocr', {
        body: { imageBase64: base64 }
      });

      if (functionError) throw new Error(functionError.message || "Erro de rede no Edge Function");
      if (data?.error) throw new Error(data.error);

      // 3. Parse the high-quality text using our strict rules
      const items = parseBulkScreenshot(data.text);
      
      if (items.length === 0) {
        setError("A IA não conseguiu estruturar as entregas. Verifique a legibilidade do print.");
      } else {
        setResults(items);
      }
    } catch (err) {
      setError("Erro ao processar imagem via inteligência artificial nas nuvens.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (idx) => {
    const newResults = [...results];
    newResults[idx].selected = !newResults[idx].selected;
    setResults(newResults);
  };

  const tryAgain = () => {
    setResults([]);
    // Optionally reset file and text or keep them for tweaking
    // setFile(null);
    // setManualText('');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-lg rounded-[40px] border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
              {inputMode === 'image' ? <ImageIcon size={24} /> : <FileText size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">Importar Dados</h2>
              <p className="text-secondary text-[10px] uppercase font-bold tracking-widest opacity-50">Carga em Massa Estruturada</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-secondary hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results.length && !loading && (
            <div className="space-y-6">
              {/* Tab Switcher */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setInputMode('image')}
                  className={inputMode === 'image' 
                    ? "flex-1 py-3 text-xs font-black uppercase tracking-widest bg-primary text-background rounded-xl transition-all shadow-lg shadow-primary/20" 
                    : "flex-1 py-3 text-xs font-black uppercase tracking-widest text-secondary hover:text-white transition-all"}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ImageIcon size={16} /> Imagem
                  </div>
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={inputMode === 'text' 
                    ? "flex-1 py-3 text-xs font-black uppercase tracking-widest bg-primary text-background rounded-xl transition-all shadow-lg shadow-primary/20" 
                    : "flex-1 py-3 text-xs font-black uppercase tracking-widest text-secondary hover:text-white transition-all"}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} /> Colar Texto
                  </div>
                </button>
              </div>

              {inputMode === 'image' ? (
                <>
                  <label className="border-2 border-dashed border-white/10 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-all bg-white/[0.02]">
                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-secondary">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Clique para selecionar o print</p>
                      <p className="text-secondary text-[10px] mt-1">Formatos: PNG, JPG, JPEG</p>
                    </div>
                    {file && (
                      <div className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase">
                        {file.name}
                      </div>
                    )}
                  </label>

                  {file && (
                    <button 
                      onClick={processImage}
                      className="w-full bg-primary text-background h-16 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                    >
                      PROCESSAR IMAGEM
                    </button>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Cole aqui o texto copiado pelo iOS (Texto ao Vivo)..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-[24px] p-6 text-sm text-white/90 placeholder:text-secondary/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none shadow-inner"
                  />
                  {manualText.trim() && (
                    <button 
                      onClick={processManualText}
                      className="w-full bg-primary text-background h-16 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                    >
                      PROCESSAR TEXTO
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <Loader2 className="text-primary animate-spin" size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-black text-primary uppercase tracking-[0.2em] text-xl">Lendo Roteirização</p>
                <p className="text-secondary text-[10px] font-bold opacity-60">Extraindo dados do seu print...</p>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-primary font-black text-lg">{results.length}</p>
                  <p className="text-secondary text-[10px] uppercase font-bold">Itens Detectados</p>
                </div>
                <p className="text-secondary text-xs italic">Verifique se está tudo correto</p>
              </div>

              <div className="space-y-3">
                {results.map((item, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-black uppercase text-white/90">{item.nome_destinatario}</p>
                        <p className="text-[10px] text-secondary opacity-60 line-clamp-2">
                          {item.endereco_completo}, {item.numero}
                        </p>
                      </div>
                      <Check size={18} className="text-green-500 shrink-0 mt-1" />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {item.ponto_referencia && (
                        <p className="text-[9px] text-secondary/40 italic font-medium line-clamp-2">
                          Ref: {item.ponto_referencia}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.bairro && (
                          <span className="font-mono text-[9px] bg-primary/10 border border-primary/20 text-primary/80 px-2 py-1 rounded-md tracking-wider">
                            BAIRRO: {item.bairro}
                          </span>
                        )}
                        {item.cep && (
                          <span className="font-mono text-[9px] bg-white/5 border border-white/10 text-secondary/80 px-2 py-1 rounded-md tracking-wider">
                            CEP: {item.cep}
                          </span>
                        )}
                        {item.codigo_rastreio && (
                          <span className="font-mono text-[9px] bg-white/10 border border-white/10 text-white/80 px-2 py-1 rounded-md tracking-wider">
                            ID: {item.codigo_rastreio}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-xs text-red-200 font-bold">{error}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {results.length > 0 && (
          <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
            <button 
              onClick={tryAgain}
              className="flex-1 py-4 text-xs font-black text-secondary uppercase tracking-widest"
            >
              Tentar Outro
            </button>
            <button 
              onClick={() => onImport(results)}
              className="flex-[2] py-4 bg-primary text-background rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl"
            >
              IMPORTAR TUDO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
