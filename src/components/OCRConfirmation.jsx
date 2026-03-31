import React, { useState } from 'react';
import { Check, X, MapPin, Hash, Package, AlertTriangle, Scan } from 'lucide-react';

export default function OCRConfirmation({ data, onConfirm, onCancel }) {
  const [editedData, setEditedData] = useState({ ...data });

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-[32px] border border-white/5 shadow-2xl p-6 space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
            <Scan size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Confirmar Dados</h2>
            <p className="text-secondary text-[10px] uppercase font-bold tracking-widest">IA Extração Brasileira</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Nome do Destinatário */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
              Nome do Destinatário
            </label>
            <input 
              value={editedData.nome_destinatario || ''}
              onChange={(e) => setEditedData({...editedData, nome_destinatario: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
              placeholder="Nome Completo"
            />
          </div>

          {/* Endereço / Logradouro */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
              Logradouro (Rua/Av)
            </label>
            <input 
              value={editedData.endereco_completo || ''}
              onChange={(e) => setEditedData({...editedData, endereco_completo: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Número */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
                Número
              </label>
              <input 
                value={editedData.numero || ''}
                onChange={(e) => setEditedData({...editedData, numero: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>
            
            {/* CEP */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
                CEP
              </label>
              <input 
                value={editedData.cep || ''}
                placeholder="00000-000"
                onChange={(e) => setEditedData({...editedData, cep: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Bairro */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
                Bairro
              </label>
              <input 
                value={editedData.bairro || ''}
                onChange={(e) => setEditedData({...editedData, bairro: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>
            
            {/* Cidade / Estado */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
                Cidade/UF
              </label>
              <div className="flex gap-2">
                <input 
                  value={editedData.cidade || ''}
                  onChange={(e) => setEditedData({...editedData, cidade: e.target.value})}
                  className="w-2/3 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                />
                <input 
                  value={editedData.estado || ''}
                  onChange={(e) => setEditedData({...editedData, estado: e.target.value})}
                  className="w-1/3 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-center focus:border-primary outline-none transition-all"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Ponto de Referência */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-secondary tracking-widest flex items-center gap-1 opacity-50">
              Ponto de Referência
            </label>
            <input 
              value={editedData.ponto_referencia || ''}
              onChange={(e) => setEditedData({...editedData, ponto_referencia: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
              placeholder="Ex: Próximo à padaria"
            />
          </div>
        </div>

        {!editedData.codigo_rastreio && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={16} />
            <p className="text-[10px] text-amber-200/70 leading-tight">
              A IA não encontrou o código de barras automaticamente. Pode continuar a entrega mesmo assim.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-white/5">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-secondary font-black text-xs uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(editedData)}
            className="flex-[1.5] py-4 rounded-2xl bg-primary text-background font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Check size={18} /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
