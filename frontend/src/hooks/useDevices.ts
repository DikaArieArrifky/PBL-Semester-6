import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Device } from '@/lib/types';

export function useDevices(crossId?: string | null) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchDevices() {
    setLoading(true);
    let query = supabase
      .from('devices')
      .select('*')
      .order('registered_at', { ascending: true });

    if (crossId) query = query.eq('cross_id', crossId);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setDevices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDevices();

    // Realtime: update status online/offline
    const channel = supabase
      .channel(`devices:${crossId ?? 'all'}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'devices',
        ...(crossId ? { filter: `cross_id=eq.${crossId}` } : {}),
      }, (payload) => {
        setDevices(prev =>
          prev.map(d => d.device_id === (payload.new as Device).device_id
            ? { ...d, ...(payload.new as Device) }
            : d
          )
        );
      })
      .subscribe();

    const interval = setInterval(fetchDevices, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [crossId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { devices, loading, error, refetch: fetchDevices };
}