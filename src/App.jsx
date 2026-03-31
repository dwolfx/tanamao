import React, { useState } from 'react';
import Layout from './components/Layout';
import Scanner from './components/Scanner';
import Dashboard from './components/Dashboard';
import OCRConfirmation from './components/OCRConfirmation';
import BulkImporter from './components/BulkImporter';
import { useDeliveries } from './hooks/useDeliveries';
import { Sparkles, History, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('route');
  const [ocrData, setOcrData] = useState(null);
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const { deliveries, loading, error, addDelivery, addBulkDeliveries, updateStatus, seedData, deleteDeliveries, saveRouteOptimization } = useDeliveries();

  const handleOCRSuccess = (data) => {
    setOcrData(data);
  };

  const handleConfirmOCR = async (finalData) => {
    const { error: addError } = await addDelivery({
      ...finalData,
      status: 'pendente',
      user_id: null,
    });

    if (addError) {
      alert("Erro ao salvar: " + addError);
    } else {
      setOcrData(null);
      setActiveTab('route');
    }
  };

  const handleBulkImport = async (items) => {
    const { error: bulkError } = await addBulkDeliveries(items);
    if (bulkError) {
      alert("Erro na importação em massa: " + bulkError);
    } else {
      setShowBulkImporter(false);
      setActiveTab('route');
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'scan' && (
        <Scanner 
          onOCRSuccess={handleOCRSuccess}
        />
      )}
      
      {activeTab === 'route' && (
        <Dashboard 
          deliveries={deliveries} 
          loading={loading} 
          onUpdateStatus={updateStatus} 
          onSeed={seedData}
          onImportScreenshot={() => setShowBulkImporter(true)}
          deleteDeliveries={deleteDeliveries}
          saveRouteOptimization={saveRouteOptimization}
        />
      )}

      {activeTab === 'completed' && (
        <CompletedView deliveries={deliveries} loading={loading} />
      )}

      {ocrData && (
        <OCRConfirmation 
          data={ocrData} 
          onConfirm={handleConfirmOCR}
          onCancel={() => setOcrData(null)}
        />
      )}

      {showBulkImporter && (
        <BulkImporter 
          onImport={handleBulkImport}
          onCancel={() => setShowBulkImporter(false)}
        />
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-xl flex flex-col items-center gap-1 z-[100] min-w-[280px]">
          <div className="flex items-center gap-2">
            <Sparkles size={12} />
            Erro de Sincronização
          </div>
          <div className="opacity-80 font-mono text-[10px] text-center border-t border-white/20 pt-1 mt-1 w-full">
            {error}
          </div>
        </div>
      )}
    </Layout>
  );
}

function CompletedView({ deliveries, loading }) {
  const completed = deliveries.filter(d => d.status === 'sucesso' || d.status === 'ausente' || d.status === 'devolvido');

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
