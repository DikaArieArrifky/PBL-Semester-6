import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { GateEvent } from '@/lib/types';

export function useHistory(crossId: string | null, limit = 50) {
  const [events, setEvents]   = useState<GateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!crossId) { setLoading(false); return; }

    async function fetchHistory() {
      setLoading(true);
      const { data, error } = await supabase
        .from('gate_events')
        .select('*')
        .eq('cross_id', crossId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) setError(error.message);
      else setEvents(data || []);
      setLoading(false);
    }

    fetchHistory();

    // Realtime: tambahkan event baru ke atas list
    const channel = supabase
      .channel(`gate_history:${crossId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'gate_events',
        filter: `cross_id=eq.${crossId}`,
      }, (payload) => {
        setEvents(prev => [payload.new as GateEvent, ...prev.slice(0, limit - 1)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [crossId, limit]);

  return { events, loading, error };
}