import React, { useState } from 'react';
import Layout from './components/Layout';
import Scanner from './components/Scanner';
import Dashboard from './components/Dashboard';
import { useDeliveries } from './hooks/useDeliveries';
import { Sparkles, Calendar, CheckCircle2, History } from 'lucide-react';

function CompletedView({ deliveries, loading }) {
  const completed = deliveries.filter(d => d.status === 'sucesso' || d.status === 'ausente' || d.status === 'devolvido');

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black italic tracking-tight text-white/90 px-2 uppercase">
        CONCLUÍDAS <span className="text-secondary not-italic opacity-40">({completed.length})</span>
      </h2>

      {completed.length === 0 ? (
        <div className="bg-surface rounded-3xl p-10 text-center text-secondary border border-white/5 mx-2">
          <History size={40} className="mx-auto mb-4 opacity-20" />
          <p>Nenhuma entrega concluída ainda hoje.</p>
        </div>
      ) : (
        <div className="space-y-4 px-1">
          {completed.map((item) => (
            <div key={item.id} className="bg-surface/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="font-bold text-sm uppercase">{item.endereco_completo}, {item.numero}</span>
                </div>
                <div className="flex gap-2 text-[10px] font-bold text-secondary tracking-widest">
                  <span>ID {item.codigo_rastreio}</span>
                  <span>•</span>
                  <span>{new Date(item.delivered_at || item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 font-black text-xs">
                {item.status === 'sucesso' ? 'OK' : 'ERR'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('route');
  const { deliveries, loading, error, addDelivery, updateStatus } = useDeliveries();

  const handleScanSuccess = async (code) => {
    // Basic address simulation for demo - in real life this would come from an API or manifest
    const addressMatch = code.match(/ADR:(.+)#NUM:(.+)#CMP:(.*)/);
    
    const deliveryData = {
      codigo_rastreio: code,
      endereco_completo: addressMatch ? addressMatch[1] : "Rua Simulação",
      numero: addressMatch ? addressMatch[2] : Math.floor(Math.random() * 999).toString(),
      complemento: addressMatch ? addressMatch[3] : "Apartamento " + Math.floor(Math.random() * 100),
      status: 'pendente',
      user_id: null, // Hardcoded for now as auth is not implemented
    };

    const { error: addError } = await addDelivery(deliveryData);
    if (addError) {
      console.error("Erro ao salvar entrega:", addError);
      alert("Erro ao salvar entrega. Verifique o console.");
    } else {
      // Stay on scan for multiple items? User choice. Let's redirect to route after a short delay
      setTimeout(() => setActiveTab('route'), 1000);
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'scan' && (
        <Scanner onScanSuccess={handleScanSuccess} />
      )}
      
      {activeTab === 'route' && (
        <Dashboard 
          deliveries={deliveries} 
          loading={loading} 
          onUpdateStatus={updateStatus} 
        />
      )}

      {activeTab === 'completed' && (
        <CompletedView deliveries={deliveries} loading={loading} />
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
          <Sparkles size={12} />
          Erro de Conexão: Usando Cache Offline
        </div>
      )}
    </Layout>
  );
}
