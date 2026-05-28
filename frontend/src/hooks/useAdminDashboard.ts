import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Crossing, Alert } from '@/lib/types';

export interface CrossingStatus {
  crossing:      Crossing;
  gateState:     'OPEN' | 'WAITING' | 'CLOSING' | 'CLOSED' | 'OPENING' | null;
  lastEventTime: string | null;
  devicesOnline: number;
  devicesTotal:  number;
  trainToday:    number;
  alertCount:    number;
  sensorsHealthy: number;
  sensorsWarning:  number;
  sensorsFaulty:   number;
  sensorsOffline:  number;
  sensorsStale:    number;
}

export interface AdminStats {
  totalCrossings:    number;
  totalTrainToday:   number;
  totalAlertOpen:    number;
  totalDeviceOnline: number;
  totalDeviceAll:    number;
  totalSensorsHealthy: number;
  totalSensorsWarning: number;
  totalSensorsFaulty:  number;
  totalSensorsOffline: number;
  totalSensorsStale:   number;
}

export function useAdminDashboard() {
  const [crossingStatuses, setCrossingStatuses] = useState<CrossingStatus[]>([]);
  const [stats, setStats]                       = useState<AdminStats | null>(null);
  const [recentAlerts, setRecentAlerts]         = useState<(Alert & { crossings?: { name: string } })[]>([]);
  const [loading, setLoading]                   = useState(true);

  const isMountedRef  = useRef(true);
  const realtimeOkRef = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchAllRef   = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    isMountedRef.current  = true;
    realtimeOkRef.current = false;

    // Listen for manual refresh event
    const handleRefresh = () => {
      if (isMountedRef.current) {
        fetchAll();
      }
    };
    window.addEventListener('force-refresh-dashboard', handleRefresh);

    async function fetchAll() {
      if (!isMountedRef.current) return;

      const { data: crossings } = await supabase
        .from('crossings')
        .select('*')
        .order('name');

      if (!crossings) {
        if (isMountedRef.current) setLoading(false);
        return;
      }

      const offsetMs      = 7 * 60 * 60 * 1000;
      const nowWIBms      = Date.now() + offsetMs;
      const nowWIB        = new Date(nowWIBms);
      const startOfDayWIB = new Date(Date.UTC(
        nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate(), 0, 0, 0, 0,
      ));
      const startISO = new Date(startOfDayWIB.getTime() - offsetMs).toISOString();

      const [
        { data: allDevices },
        { data: allComponents },
        { data: allGateEvents },
        { data: todayClosedEvents },
        { data: allAlerts },
      ] = await Promise.all([
        supabase.from('devices').select('device_id, cross_id, status'),
        supabase
          .from('device_components')
          .select('component_id, device_id, status, last_reading_at, latest_component_state(last_bool_value, last_numeric_value, updated_at)'),
        supabase
          .from('gate_events')
          .select('cross_id, event_type, new_state, occurred_at')
          .order('occurred_at', { ascending: false })
          .limit(500),
        supabase
          .from('gate_events')
          .select('cross_id, event_type, occurred_at')
          .eq('event_type', 'GATE_CLOSED')
          .gte('occurred_at', startISO),
        supabase
          .from('alerts')
          .select('*, crossings(name)')
          .eq('resolved', false)
          .order('triggered_at', { ascending: false })
          .limit(20),
      ]);

      if (!isMountedRef.current) return;

      const statuses: CrossingStatus[] = crossings.map(crossing => {
        const devices    = (allDevices        || []).filter(d => d.cross_id === crossing.cross_id);
        const deviceIds  = devices.map(d => d.device_id);
        const components = (allComponents     || []).filter((component: any) => deviceIds.includes(component.device_id));
        const events     = (allGateEvents     || []).filter(e => e.cross_id === crossing.cross_id);
        const closed     = (todayClosedEvents || []).filter(e => e.cross_id === crossing.cross_id);
        const alertCount = (allAlerts         || []).filter(a => a.cross_id === crossing.cross_id).length;
        const lastEvent  = events[0];

        const now = Date.now();
        const sensorCounts = {
          healthy: 0,
          warning: 0,
          faulty: 0,
          offline: 0,
          stale: 0,
        };

        components.forEach((component: any) => {
          const status = String(component.status ?? '').toLowerCase();
          const lastReadingAt = component.last_reading_at ? new Date(component.last_reading_at).getTime() : null;
          const minutesSinceReading = lastReadingAt ? Math.floor((now - lastReadingAt) / 60000) : null;

          if (status === 'healthy') sensorCounts.healthy += 1;
          if (status === 'warning') sensorCounts.warning += 1;
          if (status === 'faulty') sensorCounts.faulty += 1;
          if (status === 'offline') sensorCounts.offline += 1;
          if (minutesSinceReading === null || minutesSinceReading > 1) sensorCounts.stale += 1;
        });

        let gateState: CrossingStatus['gateState'] = null;
        if (lastEvent) {
          const raw   = lastEvent.new_state as string | null;
          const known = ['OPEN', 'WAITING', 'CLOSING', 'CLOSED', 'OPENING'];
          if (raw && known.includes(raw)) {
            gateState = raw as CrossingStatus['gateState'];
          } else {
            switch (lastEvent.event_type) {
              case 'GATE_WARNING':   gateState = 'WAITING'; break;
              case 'GATE_CLOSING':   gateState = 'CLOSING'; break;
              case 'GATE_CLOSED':    gateState = 'CLOSED';  break;
              case 'GATE_OPENING':   gateState = 'OPENING'; break;
              case 'GATE_OPEN':
              case 'GATE_CANCELLED': gateState = 'OPEN';    break;
            }
          }
        }

        return {
          crossing,
          gateState,
          lastEventTime: lastEvent?.occurred_at ?? null,
          devicesOnline: devices.filter(d => d.status === 'online').length,
          devicesTotal:  devices.length,
          trainToday:    closed.length,
          alertCount,
          sensorsHealthy: sensorCounts.healthy,
          sensorsWarning: sensorCounts.warning,
          sensorsFaulty:  sensorCounts.faulty,
          sensorsOffline: sensorCounts.offline,
          sensorsStale:   sensorCounts.stale,
        };
      });

      setCrossingStatuses(statuses);
      setRecentAlerts((allAlerts || []) as any);
      setStats({
        totalCrossings:    crossings.length,
        totalTrainToday:   (todayClosedEvents || []).length,
        totalAlertOpen:    (allAlerts         || []).length,
        totalDeviceOnline: (allDevices        || []).filter(d => d.status === 'online').length,
        totalDeviceAll:    (allDevices        || []).length,
        totalSensorsHealthy: (allComponents || []).filter((component: any) => String(component.status ?? '').toLowerCase() === 'healthy').length,
        totalSensorsWarning: (allComponents || []).filter((component: any) => String(component.status ?? '').toLowerCase() === 'warning').length,
        totalSensorsFaulty:  (allComponents || []).filter((component: any) => String(component.status ?? '').toLowerCase() === 'faulty').length,
        totalSensorsOffline: (allComponents || []).filter((component: any) => String(component.status ?? '').toLowerCase() === 'offline').length,
        totalSensorsStale:   (allComponents || []).filter((component: any) => {
          const lastReadingAt = component.last_reading_at ? new Date(component.last_reading_at).getTime() : null;
          const minutesSinceReading = lastReadingAt ? Math.floor((Date.now() - lastReadingAt) / 60000) : null;
          return minutesSinceReading === null || minutesSinceReading > 1;
        }).length,
      });
      if (isMountedRef.current) setLoading(false);
    }

    fetchAllRef.current = fetchAll;

    fetchAll();

    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gate_events' },
        () => { if (isMountedRef.current) fetchAll(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' },
        () => { if (isMountedRef.current) fetchAll(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' },
        () => { if (isMountedRef.current) fetchAll(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices' },
        () => { if (isMountedRef.current) fetchAll(); })
      .subscribe(status => {
        console.log('[useAdminDashboard] realtime:', status);

        if (status === 'SUBSCRIBED') {
          realtimeOkRef.current = true;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeOkRef.current = false;
          console.warn('[useAdminDashboard] realtime gagal, fallback polling 5s');
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchAll, 5000);
          }
        }
      });

    const safetyTimer = setTimeout(() => {
      if (!realtimeOkRef.current && !pollRef.current && isMountedRef.current) {
        console.warn('[useAdminDashboard] realtime lambat, polling sementara');
        pollRef.current = setInterval(fetchAll, 5000);
      }
    }, 3000);

    const staleInterval = setInterval(fetchAll, 30000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(staleInterval);
      window.removeEventListener('force-refresh-dashboard', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    crossingStatuses,
    stats,
    recentAlerts,
    loading,
    refetch: () => {
      void fetchAllRef.current?.();
    },
  };
}
