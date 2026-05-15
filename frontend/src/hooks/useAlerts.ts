import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Alert } from '@/lib/types';

export function useAlerts(crossId: string | null) {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchAlerts() {
    if (!crossId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('cross_id', crossId)
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (error) setError(error.message);
    else setAlerts(data || []);
    setLoading(false);
  }

  async function resolveAlert(alertId: string) {
    const { error } = await supabase
      .from('alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('alert_id', alertId);

    if (!error) {
      setAlerts(prev =>
        prev.map(a => a.alert_id === alertId
          ? { ...a, resolved: true, resolved_at: new Date().toISOString() }
          : a
        )
      );
    }
    return { error };
  }

  useEffect(() => {
    if (!crossId) { setLoading(false); return; }

    fetchAlerts();

    const channel = supabase
      .channel(`alerts:${crossId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'alerts',
        filter: `cross_id=eq.${crossId}`,
      }, (payload) => {
        setAlerts(prev => [payload.new as Alert, ...prev]);
      })
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'alerts',
        filter: `cross_id=eq.${crossId}`,
      }, (payload) => {
        setAlerts(prev =>
          prev.map(a => a.alert_id === (payload.new as Alert).alert_id
            ? payload.new as Alert
            : a
          )
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [crossId]);

  return { alerts, loading, error, resolveAlert, refetch: fetchAlerts };
}