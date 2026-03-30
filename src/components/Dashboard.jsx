import React, { useMemo, useState } from 'react';
import { MapPin, Package, Navigation, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Dashboard({ deliveries, loading, onUpdateStatus }) {
  const [updating, setUpdating] = useState(null);

  const groupedDeliveries = useMemo(() => {
    const groups = deliveries.reduce((acc, delivery) => {
      if (delivery.status !== 'pendente') return acc;
      
      const key = `${delivery.endereco_completo}|${delivery.numero}`;
      if (!acc[key]) {
        acc[key] = {
          endereco: delivery.endereco_completo,
          numero: delivery.numero,
          items: [],
          id: delivery.id, // For routing one of them
        };
      }
      acc[key].items.push(delivery);
      return acc;
    }, {});
    
    return Object.values(groups);
  }, [deliveries]);

  const handleNavigate = (group) => {
    const query = encodeURIComponent(`${group.endereco}, ${group.numero}`);
    window.location.href = `waze://?q=${query}`;
  };

  const handleDeliver = async (group) => {
    setUpdating(group.id);
    
    // Request GPS
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Update all items in the group to 'sucesso'
        const promises = group.items.map(item => 
          onUpdateStatus(item.id, 'sucesso', coords)
        );
        
        await Promise.all(promises);
        setUpdating(null);
      },
      (error) => {
        alert("Erro ao obter GPS: " + error.message + ". É necessário permissão para auditar a entrega.");
        setUpdating(null);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-secondary font-medium animte-pulse">Otimizando sua rota...</p>
      </div>
    );
  }

  if (groupedDeliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-surface rounded-3xl border border-white/5 mx-2">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} className="text-primary opacity-40" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Tudo Pronto!</h3>
          <p className="text-secondary text-sm px-10">Você não tem entregas pendentes. Escaneie novos pacotes para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black italic tracking-tight text-white/90">
          MINHA ROTA <span className="text-primary not-italic">({groupedDeliveries.length})</span>
        </h2>
        <div className="flex items-center gap-1 text-[10px] bg-white/5 py-1 px-2 rounded-full font-bold text-secondary uppercase tracking-widest">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
          Live
        </div>
      </div>

      <div className="space-y-4 px-1">
        {groupedDeliveries.map((group, idx) => (
          <div 
            key={`${group.endereco}-${group.numero}`}
            className="group relative bg-surface border border-white/5 rounded-3xl p-5 shadow-lg active:scale-[0.98] transition-all overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/10 transition-colors" />

            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1 pr-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <MapPin size={20} weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold uppercase leading-none">
                      {group.endereco}
                    </h3>
                    <p className="text-primary font-black text-xl leading-tight">
                      Nº {group.numero}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase">
                    <Package size={14} className="text-primary" />
                    {group.items.length} {group.items.length === 1 ? 'PACOTE' : 'PACOTES'}
                  </div>
                  {group.items[0].complemento && (
                    <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-blue-400 uppercase">
                      <Info size={14} />
                      {group.items[0].complemento}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleNavigate(group)}
                  className="w-14 h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-secondary transition-all"
                >
                  <Navigation size={24} />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => handleDeliver(group)}
                disabled={updating === group.id}
                className={cn(
                  "flex-1 py-4 px-6 rounded-2xl bg-primary text-background font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/10",
                  updating === group.id ? "opacity-50 pointer-events-none" : "hover:bg-primary/90"
                )}
              >
                {updating === group.id ? (
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Finalizar Entrega
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
