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

  return { deliveries, loading, error, fetchDeliveries, addDelivery, updateStatus };
}
