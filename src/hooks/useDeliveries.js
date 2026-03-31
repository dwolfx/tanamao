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
      { codigo_rastreio: 'BR1001-'+suffix, endereco_completo: 'Rua das Flores', numero: '120', complemento: 'Casa 1', status: 'pendente' },
      { codigo_rastreio: 'BR1002-'+suffix, endereco_completo: 'Rua das Flores', numero: '120', complemento: 'Loja A', status: 'pendente' },
      { codigo_rastreio: 'BR1003-'+suffix, endereco_completo: 'Av. Paulista', numero: '500', complemento: '10º Andar', status: 'pendente' },
      { codigo_rastreio: 'BR1004-'+suffix, endereco_completo: 'Rua Oscar Freire', numero: '95', complemento: 'Fundos', status: 'pendente' },
      { codigo_rastreio: 'BR1005-'+suffix, endereco_completo: 'Rua Oscar Freire', numero: '95', complemento: 'Frente', status: 'pendente' },
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

  return { deliveries, loading, error, fetchDeliveries, addDelivery, updateStatus, seedData };
}
