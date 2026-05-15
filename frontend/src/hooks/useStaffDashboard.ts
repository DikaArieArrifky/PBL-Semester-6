import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Alert } from '@/lib/types';

export interface StaffStats {
  trainToday: number;
  avgClosedDuration: number;
  longestClosedDuration: number;
  alertOpen: number;
  lastGateEventAt: string | null;
  lastGateEventType: string | null;
}

export interface HourlyGateClose {
  jam: string;
  cumulative: number;
}

export function useStaffDashboard(crossId: string | null) {
  const [stats, setStats]               = useState<StaffStats | null>(null);
  const [cumulativeData, setCumulative] = useState<HourlyGateClose[]>([]);
  const [alerts, setAlerts]             = useState<Alert[]>([]);
  const [loading, setLoading]           = useState(true);

  const isMountedRef  = useRef(true);
  const realtimeOkRef = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

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
        fetchData();
      }
    };
    window.addEventListener('force-refresh-dashboard', handleRefresh);

    async function fetchData() {
      if (!isMountedRef.current) return;

      try {
        const offsetMs      = 7 * 60 * 60 * 1000;
        const nowWIBms      = Date.now() + offsetMs;
        const nowWIB        = new Date(nowWIBms);
        const startOfDayWIB = new Date(Date.UTC(
          nowWIB.getUTCFullYear(),
          nowWIB.getUTCMonth(),
          nowWIB.getUTCDate(),
          0, 0, 0, 0,
        ));
        const startISO       = new Date(startOfDayWIB.getTime() - offsetMs).toISOString();
        const currentHourWIB = nowWIB.getUTCHours();

        const [
          { data: gateEvents, error: gateErr },
          { data: activeAlerts, error: alertErr },
        ] = await Promise.all([
          supabase
            .from('gate_events')
            .select('event_id, event_type, occurred_at')
            .eq('cross_id', crossId)
            .gte('occurred_at', startISO)
            .order('occurred_at', { ascending: true }),
          supabase
            .from('alerts')
            .select('*')
            .eq('cross_id', crossId)
            .eq('resolved', false)
            .order('triggered_at', { ascending: false }),
        ]);

        if (gateErr)  console.error('[useStaffDashboard] gate_events error:', gateErr.message);
        if (alertErr) console.error('[useStaffDashboard] alerts error:', alertErr.message);
        if (!isMountedRef.current) return;

        const events = gateEvents ?? [];

        const closedEvents = events.filter(e => e.event_type === 'GATE_CLOSED');
        const openEvents   = events.filter(e => e.event_type === 'GATE_OPEN');

        const durations: number[] = [];
        closedEvents.forEach(closed => {
          const closedTime = new Date(closed.occurred_at).getTime();
          const nextOpen   = openEvents.find(o => new Date(o.occurred_at).getTime() > closedTime);
          if (nextOpen) {
            const dur = (new Date(nextOpen.occurred_at).getTime() - closedTime) / 1000;
            if (dur > 0 && dur < 3600) durations.push(dur);
          }
        });

        const avgDur = durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;
        const maxDur = durations.length ? Math.round(Math.max(...durations)) : 0;

        const lastEvent = events.length > 0 ? events[events.length - 1] : null;

        setStats({
          trainToday:            closedEvents.length,
          avgClosedDuration:     avgDur,
          longestClosedDuration: maxDur,
          alertOpen:             activeAlerts?.length ?? 0,
          lastGateEventAt:       lastEvent?.occurred_at ?? null,
          lastGateEventType:     lastEvent?.event_type  ?? null,
        });

        const hourMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourMap[i] = 0;

        closedEvents.forEach(e => {
          const hWIB = new Date(
            new Date(e.occurred_at).getTime() + offsetMs
          ).getUTCHours();
          hourMap[hWIB] = (hourMap[hWIB] ?? 0) + 1;
        });

        const startHour = closedEvents.length > 0
          ? Math.min(
              new Date(new Date(closedEvents[0].occurred_at).getTime() + offsetMs).getUTCHours(),
              6,
            )
          : 6;

        const cumulative: HourlyGateClose[] = [];
        let running = 0;
        for (let i = startHour; i <= currentHourWIB; i++) {
          running += hourMap[i] ?? 0;
          cumulative.push({
            jam:        `${String(i).padStart(2, '0')}:00`,
            cumulative: running,
          });
        }

        setCumulative(cumulative);
        setAlerts(activeAlerts ?? []);
      } catch (err) {
        console.error('[useStaffDashboard] unexpected error:', err);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    fetchData();

    const channel = supabase
      .channel(`staff_dashboard:${crossId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'gate_events',
        filter: `cross_id=eq.${crossId}`,
      }, () => { if (isMountedRef.current) fetchData(); })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'alerts',
        filter: `cross_id=eq.${crossId}`,
      }, () => { if (isMountedRef.current) fetchData(); })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'alerts',
        filter: `cross_id=eq.${crossId}`,
      }, () => { if (isMountedRef.current) fetchData(); })
      .subscribe(status => {
        console.log('[useStaffDashboard] realtime:', status);

        if (status === 'SUBSCRIBED') {
          realtimeOkRef.current = true;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeOkRef.current = false;
          console.warn('[useStaffDashboard] realtime gagal, fallback polling 5s');
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchData, 5000);
          }
        }
      });

    const safetyTimer = setTimeout(() => {
      if (!realtimeOkRef.current && !pollRef.current && isMountedRef.current) {
        console.warn('[useStaffDashboard] realtime lambat, polling sementara');
        pollRef.current = setInterval(fetchData, 5000);
      }
    }, 3000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('force-refresh-dashboard', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [crossId]);

  return { stats, cumulativeData, alerts, loading };
}
