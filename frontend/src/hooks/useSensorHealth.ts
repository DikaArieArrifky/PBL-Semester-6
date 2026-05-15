import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { DeviceComponent } from '@/lib/types';

export interface SensorHealth {
  component_id: string;
  device_id: string;
  component_code: string;
  component_type: string;
  component_name: string;
  status: DeviceComponent['status'];
  last_reading_at: string | null;
  last_bool_value: boolean | null;
  last_numeric_value: number | null;
  updated_at: string | null;
  isStale: boolean;
  minutesSinceReading: number | null;
}

export function useSensorHealth(crossId: string | null) {
  const [sensors, setSensors] = useState<SensorHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const isMountedRef  = useRef(true);
  const realtimeOkRef = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!crossId) {
      setLoading(false);
      return;
    }

    isMountedRef.current  = true;
    realtimeOkRef.current = false;

    // Listen for manual refresh event
    const handleRefresh = () => {
      if (isMountedRef.current) {
        fetchSensors();
      }
    };
    window.addEventListener('force-refresh-dashboard', handleRefresh);

    async function fetchSensors() {
      if (!isMountedRef.current) return;

      try {
        const { data: devices, error: devErr } = await supabase
          .from('devices')
          .select('device_id')
          .eq('cross_id', crossId);

        if (devErr) throw devErr;

        if (!devices || devices.length === 0) {
          if (isMountedRef.current) setSensors([]);
          return;
        }

        const deviceIds = devices.map((d: any) => d.device_id);

        const { data: components, error: compErr } = await supabase
          .from('device_components')
          .select(`
            component_id,
            device_id,
            component_code,
            component_type,
            component_name,
            status,
            last_reading_at,
            latest_component_state (
              last_bool_value,
              last_numeric_value,
              updated_at
            )
          `)
          .in('device_id', deviceIds)
          .order('component_code');

        if (compErr) throw compErr;
        if (!isMountedRef.current) return;

        const now = Date.now();

        const result: SensorHealth[] = (components || []).map((c: any) => {
          const state        = c.latest_component_state;
          const lastAt       = c.last_reading_at ? new Date(c.last_reading_at).getTime() : null;
          const minutesSince = lastAt ? Math.floor((now - lastAt) / 60000) : null;

          return {
            component_id:        c.component_id,
            device_id:           c.device_id,
            component_code:      c.component_code,
            component_type:      c.component_type,
            component_name:      c.component_name,
            status:              c.status,
            last_reading_at:     c.last_reading_at,
            last_bool_value:     state?.last_bool_value    ?? null,
            last_numeric_value:  state?.last_numeric_value ?? null,
            updated_at:          state?.updated_at         ?? null,
            isStale:             minutesSince === null || minutesSince > 1,
            minutesSinceReading: minutesSince,
          };
        });

        setSensors(result);
        setError(null);
      } catch (err: any) {
        console.error('[useSensorHealth] error:', err.message);
        if (isMountedRef.current) setError(err.message);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    fetchSensors();

    const channel = supabase
      .channel(`sensor_health:${crossId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'latest_component_state',
      }, () => {
        if (isMountedRef.current) {
          realtimeOkRef.current = true;
          fetchSensors();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'device_components',
      }, () => {
        if (isMountedRef.current) fetchSensors();
      })
      .subscribe(status => {
        console.log('[useSensorHealth] realtime:', status);

        if (status === 'SUBSCRIBED') {
          realtimeOkRef.current = true;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeOkRef.current = false;
          console.warn('[useSensorHealth] realtime gagal, fallback polling 3s');
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchSensors, 3000); // Faster for sensors
          }
        }
      });

    const safetyTimer = setTimeout(() => {
      if (!realtimeOkRef.current && !pollRef.current && isMountedRef.current) {
        console.warn('[useSensorHealth] realtime lambat, polling sementara');
        pollRef.current = setInterval(fetchSensors, 3000); // Faster fallback for sensors
      }
    }, 2000); // Faster detection

    staleRef.current = setInterval(fetchSensors, 10000); // More frequent refresh

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      if (pollRef.current)  clearInterval(pollRef.current);
      if (staleRef.current) clearInterval(staleRef.current);
      window.removeEventListener('force-refresh-dashboard', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [crossId]);

  return { sensors, loading, error };
}
