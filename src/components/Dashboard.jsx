import React, { useMemo, useState } from 'react';
import { MapPin, Package, Navigation, CheckCircle2, Info, PlusCircle, FileText, Search, X, Trash2, Wand2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { optimizeRoute } from '../utils/routeOptimizer';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Dashboard({ deliveries, loading, onUpdateStatus, onSeed, onImportScreenshot, deleteDeliveries, saveRouteOptimization }) {
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [optimizeStatus, setOptimizeStatus] = useState(null);

  const groupedDeliveries = useMemo(() => {
    const groups = deliveries.reduce((acc, delivery) => {
      if (delivery.status !== 'pendente') return acc;
      
      const key = `${delivery.endereco_completo}|${delivery.numero}|${delivery.cep || ''}`;
      if (!acc[key]) {
        acc[key] = {
          endereco: delivery.endereco_completo,
          numero: delivery.numero,
          cep: delivery.cep,
          items: [],
          id: delivery.id,
          lat: delivery.lat,
          lng: delivery.lng,
          ordem_rota: delivery.ordem_rota || 9999,
        };
      }
      acc[key].items.push(delivery);
      return acc;
    }, {});
    
    return Object.values(groups).sort((a, b) => a.ordem_rota - b.ordem_rota);
  }, [deliveries]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedDeliveries;
    
    const lowerTerm = searchTerm.toLowerCase();
    return groupedDeliveries.filter(group => {
      // Check address
      if (group.endereco.toLowerCase().includes(lowerTerm)) return true;
      
      // Check if any item in the group matches name or tracking code
      return group.items.some(item => 
        (item.nome_destinatario && item.nome_destinatario.toLowerCase().includes(lowerTerm)) ||
        (item.codigo_rastreio && item.codigo_rastreio.toLowerCase().includes(lowerTerm))
      );
    });
  }, [groupedDeliveries, searchTerm]);

  const handleNavigate = (group) => {
    const query = encodeURIComponent(`${group.endereco}, ${group.numero}${group.cep ? ', ' + group.cep : ''}`);
    window.location.href = `waze://?q=${query}`;
  };

  const handleOptimizeRoute = async () => {
    try {
      const optimizedGroups = await optimizeRoute(groupedDeliveries, setOptimizeStatus);
      
      const updates = [];
      optimizedGroups.forEach((g, index) => {
        g.items.forEach(item => {
          updates.push({
            ...item,
            lat: g.lat,
            lng: g.lng,
            ordem_rota: index + 1
          });
        });
      });

      if (saveRouteOptimization) {
        setOptimizeStatus('Salvando Rota...');
        const { error } = await saveRouteOptimization(updates);
        if (error) throw new Error(error);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setOptimizeStatus(null);
    }
  };

  const handleDeliver = async (group) => {
    setUpdating(group.id);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        const promises = group.items.map(item => 
          onUpdateStatus(item.id, 'sucesso', coords)
        );
        
        await Promise.all(promises);
        setUpdating(null);
      },
      (error) => {
        alert("Erro ao obter GPS: " + error.message + ". Necessário permissão para finalizar.");
        setUpdating(null);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-secondary font-medium">Otimizando sua rota...</p>
      </div>
    );
  }

  if (groupedDeliveries.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-surface rounded-3xl border border-white/5 mx-2">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} className="text-primary opacity-40" />
        </div>
        <div className="space-y-4 px-8">
          <h3 className="text-xl font-bold italic tracking-tighter">SUA ROTA ESTÁ LIMPA</h3>
          <p className="text-secondary text-[11px] mb-4 opacity-60 leading-relaxed">
            Cole os dados copiados da sua lista de pacotes para iniciar a rota.
          </p>
          <div className="grid grid-cols-1 w-full max-w-[240px] mx-auto">
            <button 
              onClick={onImportScreenshot}
              className="flex items-center justify-center gap-3 bg-primary text-background px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-primary/20"
            >
              <FileText size={18} />
              Colar Entregas
            </button>
          </div>
        </div>
      </div>
    );
  }

  const needsOptimization = groupedDeliveries.some(g => g.ordem_rota === 9999);

  return (
    <div className="space-y-6">
      <div className="space-y-4 sticky top-0 bg-background/95 backdrop-blur-xl z-20 pb-4 outline outline-[20px] outline-background">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black italic tracking-tight text-white/90 uppercase leading-none">
              MINHA ROTA <span className="text-primary not-italic">({filteredGroups.length}/{groupedDeliveries.length})</span>
            </h2>
            <div className="flex items-center gap-1 text-[8px] bg-white/5 py-0.5 px-2 rounded-full font-bold text-secondary uppercase tracking-widest w-fit mt-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
              Live
            </div>
          </div>
          
          <button 
            onClick={onImportScreenshot}
            className="flex items-center gap-2 bg-surface border border-white/5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-secondary"
          >
            <FileText size={14} className="text-primary" />
            <span className="hidden xs:inline">Importar</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative mx-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-secondary">
              <Search size={18} />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, rua ou rastreio..."
              className="w-full bg-surface border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold focus:border-primary/50 focus:outline-none transition-all placeholder:text-secondary/40 placeholder:font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-4 flex items-center text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          {needsOptimization && (
            <div className="px-1">
              <button 
                onClick={handleOptimizeRoute}
                disabled={!!optimizeStatus}
                className="relative w-full overflow-hidden group rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-px shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors duration-300" />
                <div className="relative bg-background/90 backdrop-blur-3xl px-4 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group-hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    {optimizeStatus ? (
                      <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wand2 size={20} className="text-white animate-pulse" />
                    )}
                    <span className="font-black text-sm text-white uppercase tracking-widest">
                      {optimizeStatus ? 'Processando...' : 'Gerar Rota Inteligente'}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/60 font-medium">Algoritmo Vizinho Mais Próximo</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-1">
        {filteredGroups.length === 0 && searchTerm ? (
          <div className="text-center py-10 px-4 bg-surface rounded-3xl border border-white/5 mx-1">
            <Search className="w-12 h-12 text-secondary/30 mx-auto mb-3" />
            <p className="text-secondary text-sm font-medium">Nenhum pacote encontrado com esses dados.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div 
              key={`${group.endereco}-${group.numero}-${group.cep}`}
              className="group relative bg-surface border border-white/5 rounded-[32px] p-6 pt-10 shadow-lg transition-all overflow-hidden"
            >
              {group.ordem_rota !== 9999 && (
                <div className="absolute left-0 top-0 bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-1.5 rounded-tl-[32px] rounded-br-[16px] flex items-baseline justify-center font-black text-white shadow-md shadow-indigo-500/20 z-20 border-b border-r border-white/10 text-sm leading-none">
                  <span className="text-[9px] opacity-70 mr-[2px] tracking-widest">#</span>
                  {group.ordem_rota}
                </div>
              )}
              
              <button
                onClick={() => handleDeleteGroup(group)}
                className="absolute top-4 right-4 text-secondary/30 hover:text-red-500/90 active:scale-90 hover:bg-red-500/10 transition-all p-2 rounded-full z-20"
                title="Excluir entrega"
              >
                <Trash2 size={16} />
              </button>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-3xl pointer-events-none" />

              <div className="flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <span className="text-sm font-black text-white/90 uppercase tracking-tight truncate">
                      {group.items.length > 1 
                        ? `${group.items[0].nome_destinatario} (+${group.items.length - 1})`
                        : (group.items[0].nome_destinatario || 'Destinatário Desconhecido')}
                    </span>
                  </div>

                  <div className="mt-2 min-w-0">
                    <h3 className="text-lg font-black uppercase leading-none truncate">
                      {group.endereco}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-primary font-black text-2xl leading-none">
                        Nº {group.numero}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center justify-center w-7 h-7 bg-primary/20 text-primary rounded-full border border-primary/20 shrink-0">
                        <MapPin size={14} />
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-[10px] font-bold text-secondary uppercase tracking-widest shrink-0">
                        <Package size={12} className="text-primary" />
                        {group.items.length} {group.items.length === 1 ? 'PACOTE' : 'PACOTES'}
                      </div>
                      {group.items[0].complemento && (
                        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">
                          <Info size={12} className="shrink-0" />
                          <span className="truncate">{group.items[0].complemento}</span>
                        </div>
                      )}
                    </div>
                    
                    {group.items[0].ponto_referencia && (
                      <div className="w-full mt-1.5 px-3 py-2 bg-white/[0.03] border-l-2 border-primary/30 rounded-r-xl">
                        <p className="text-[10px] text-secondary italic leading-relaxed">
                          <span className="font-black not-italic text-primary/50 mr-1">Ref:</span>
                          {group.items[0].ponto_referencia}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.items[0].bairro && (
                        <span className="font-mono text-[9px] bg-primary/10 border border-primary/20 text-primary/80 px-2 py-1 rounded-md tracking-wider">
                          BAIRRO: {group.items[0].bairro}
                        </span>
                      )}
                      {group.cep && (
                        <span className="font-mono text-[9px] bg-white/5 border border-white/10 text-secondary/80 px-2 py-1 rounded-md tracking-wider">
                          CEP: {group.cep}
                        </span>
                      )}
                      {group.items.map(item => item.codigo_rastreio ? (
                        <span key={item.id} className="font-mono text-[9px] bg-white/5 border border-white/10 text-secondary/80 px-2 py-1 rounded-md tracking-wider">
                          {item.codigo_rastreio}
                        </span>
                      ) : null)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => handleNavigate(group)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/10 shrink-0"
                >
                  <Navigation size={18} />
                  Rota
                </button>
                <button 
                  onClick={() => handleDeliver(group)}
                  disabled={updating === group.id}
                  className={cn(
                    "flex-[2] py-4 rounded-2xl bg-primary text-background font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-primary/10",
                    updating === group.id ? "opacity-50 pointer-events-none" : "hover:brightness-110"
                  )}
                >
                  {updating === group.id ? (
                    <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Finalizar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
