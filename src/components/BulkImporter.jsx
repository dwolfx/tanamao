import React, { useState } from 'react';
import { X, Check, Loader2, FileText, AlertCircle } from 'lucide-react';
import { parseBulkScreenshot } from '../utils/ocrProcessor';

export default function BulkImporter({ onImport, onCancel }) {
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

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

  const toggleItem = (idx) => {
    const newResults = [...results];
    newResults[idx].selected = !newResults[idx].selected;
    setResults(newResults);
  };

  const tryAgain = () => {
    setResults([]);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-lg rounded-[40px] border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-tighter">COLAR ENTREGAS</h2>
              <p className="text-secondary text-xs opacity-60">Extraia via iOS Live Text</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-secondary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {results.length === 0 ? (
            <div className="h-full flex flex-col">
              <textarea 
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole aqui o texto inteiro copiado da foto..."
                className="w-full flex-1 min-h-[200px] bg-background border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-primary/50 focus:outline-none transition-all placeholder:text-secondary/30 resize-none font-mono"
              />
              <button
                onClick={processManualText}
                disabled={!manualText.trim() || loading}
                className="mt-6 w-full bg-primary text-background py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                Extrair Entregas
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white/90">
                  {results.filter(r => r.selected).length} de {results.length} identificadas
                </h3>
              </div>
              
              <div className="space-y-3">
                {results.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      item.selected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-background border-white/5 opacity-50'
                    }`}
                    onClick={() => toggleItem(idx)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                        item.selected ? 'bg-primary border-primary text-background' : 'border-white/20'
                      }`}>
                        {item.selected && <Check size={14} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="font-bold text-white truncate">{item.nome_destinatario}</div>
                        <div className="text-xs text-secondary/70 truncate">{item.endereco_completo}, {item.numero}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-white/5 px-2 py-1 rounded font-mono text-secondary">
                            {item.codigo_rastreio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-background/50 flex gap-3">
            <button
              onClick={tryAgain}
              className="flex-1 bg-white/5 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
            >
              Voltar
            </button>
            <button
              onClick={() => onImport(results.filter(r => r.selected))}
              disabled={results.filter(r => r.selected).length === 0}
              className="flex-[2] bg-primary text-background py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
            >
              Importar ({results.filter(r => r.selected).length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
