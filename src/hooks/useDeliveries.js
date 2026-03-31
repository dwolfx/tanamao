import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'tanamao_deliveries';

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from local cache first
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setDeliveries(JSON.parse(cached));
      setLoading(false);
    }
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setDeliveries(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addDelivery = async (deliveryData) => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .insert([deliveryData])
        .select()
        .single();

      if (error) throw error;

      const updatedDeliveries = [data, ...deliveries];
      setDeliveries(updatedDeliveries);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedDeliveries));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const updateStatus = async (id, status, coordinates = null) => {
    try {
      const updates = {
        status,
        delivered_at: status === 'sucesso' ? new Date().toISOString() : null,
      };

      if (coordinates) {
        updates.coordenadas_entrega = coordinates;
      }

      const { data, error } = await supabase
        .from('entregas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedDeliveries = deliveries.map(d => d.id === id ? data : d);
      setDeliveries(updatedDeliveries);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedDeliveries));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const seedData = async () => {
    const suffix = Math.random().toString(36).substring(7).toUpperCase();
    const testData = [
      { codigo_rastreio: 'BR1001-'+suffix, nome_destinatario: 'João Silva', endereco_completo: 'Rua das Flores', numero: '120', cep: '01234-000', complemento: 'Casa 1', status: 'pendente' },
      { codigo_rastreio: 'BR1002-'+suffix, nome_destinatario: 'Maria Oliveira', endereco_completo: 'Rua das Flores', numero: '120', cep: '01234-000', complemento: 'Loja A', status: 'pendente' },
      { codigo_rastreio: 'BR1003-'+suffix, nome_destinatario: 'Carlos Souza', endereco_completo: 'Av. Paulista', numero: '500', cep: '01310-000', complemento: '10º Andar', status: 'pendente' },
      { codigo_rastreio: 'BR1004-'+suffix, nome_destinatario: 'Ana Costa', endereco_completo: 'Rua Oscar Freire', numero: '95', cep: '01426-001', complemento: 'Fundos', status: 'pendente' },
      { codigo_rastreio: 'BR1005-'+suffix, nome_destinatario: 'Roberto Lima', endereco_completo: 'Rua Oscar Freire', numero: '95', cep: '01426-001', complemento: 'Frente', status: 'pendente' },
    ];

    try {
      const { data, error } = await supabase.from('entregas').insert(testData).select();
      if (error) throw error;
      fetchDeliveries(); // Refresh
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const addBulkDeliveries = async (items) => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .insert(items.map(item => ({ ...item, status: 'pendente', user_id: null })))
        .select();

      if (error) throw error;

      const updatedDeliveries = [...data, ...deliveries];
      setDeliveries(updatedDeliveries);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedDeliveries));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const deleteDeliveries = async (ids) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .delete()
        .in('id', ids);

      if (error) throw error;

      const updatedDeliveries = deliveries.filter(d => !ids.includes(d.id));
      setDeliveries(updatedDeliveries);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedDeliveries));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const saveRouteOptimization = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .upsert(updates, { onConflict: 'id' })
        .select();

      if (error) throw error;
      
      const newDeliveries = deliveries.map(d => {
        const update = updates.find(u => u.id === d.id);
        return update ? { ...d, ...update } : d;
      });
      setDeliveries(newDeliveries);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newDeliveries));
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return { deliveries, loading, error, fetchDeliveries, addDelivery, addBulkDeliveries, updateStatus, seedData, deleteDeliveries, saveRouteOptimization };
}
