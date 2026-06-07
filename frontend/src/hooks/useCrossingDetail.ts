import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Crossing, Device, DeviceComponent, Alert, GateEvent } from '@/lib/types';

export interface DeviceWithComponents extends Device {
  device_components: (DeviceComponent & {
    latest_component_state: {
      last_bool_value: boolean | null;
      last_numeric_value: number | null;
      updated_at: string;
    }[] | null;
  })[];
}

export interface CrossingDetailData {
  crossing: Crossing | null;
  devices: DeviceWithComponents[];
  alerts: (Alert & { crossings?: { name: string } })[];
  gateEvents: GateEvent[];
  summary: {
    devicesOnline: number;
    devicesTotal: number;
    sensorsHealthy: number;
    sensorsWarning: number;
    sensorsFaulty: number;
    sensorsOffline: number;
    sensorsTotal: number;
    alertsActive: number;
    trainToday: number;
  };
}

const EMPTY_SUMMARY: CrossingDetailData['summary'] = {
  devicesOnline: 0,
  devicesTotal: 0,
  sensorsHealthy: 0,
  sensorsWarning: 0,
  sensorsFaulty: 0,
  sensorsOffline: 0,
  sensorsTotal: 0,
  alertsActive: 0,
  trainToday: 0,
};

export function useCrossingDetail(crossId: string | undefined) {
  const [data, setData] = useState<CrossingDetailData>({
    crossing: null,
    devices: [],
    alerts: [],
    gateEvents: [],
    summary: EMPTY_SUMMARY,
  });
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!crossId) { setLoading(false); return; }

    async function fetchAll() {
      if (!isMountedRef.current) return;
      setLoading(true);

      // Compute start of today WIB for train count
      const offsetMs = 7 * 60 * 60 * 1000;
      const nowWIBms = Date.now() + offsetMs;
      const nowWIB = new Date(nowWIBms);
      const startOfDayWIB = new Date(Date.UTC(
        nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate(), 0, 0, 0, 0,
      ));
      const startISO = new Date(startOfDayWIB.getTime() - offsetMs).toISOString();

      const [
        { data: crossing },
        { data: devices },
        { data: alerts },
        { data: gateEvents },
        { data: todayClosedEvents },
      ] = await Promise.all([
        supabase
          .from('crossings')
          .select('*')
          .eq('cross_id', crossId)
          .single(),
        supabase
          .from('devices')
          .select('*, device_components(*, latest_component_state(last_bool_value, last_numeric_value, updated_at))')
          .eq('cross_id', crossId)
          .order('registered_at', { ascending: false }),
        supabase
          .from('alerts')
          .select('*, crossings(name)')
          .eq('cross_id', crossId)
          .order('triggered_at', { ascending: false })
          .limit(50),
        supabase
          .from('gate_events')
          .select('*')
          .eq('cross_id', crossId)
          .order('occurred_at', { ascending: false })
          .limit(50),
        supabase
          .from('gate_events')
          .select('cross_id')
          .eq('cross_id', crossId)
          .eq('event_type', 'GATE_CLOSED')
          .gte('occurred_at', startISO),
      ]);

      if (!isMountedRef.current) return;

      const devicesArr = (devices || []) as DeviceWithComponents[];
      const alertsArr = (alerts || []) as (Alert & { crossings?: { name: string } })[];
      const gateEventsArr = (gateEvents || []) as GateEvent[];

      // Compute sensor counts
      let sensorsHealthy = 0, sensorsWarning = 0, sensorsFaulty = 0, sensorsOffline = 0;
      devicesArr.forEach(d => {
        (d.device_components || []).forEach(c => {
          const s = (c.status || '').toLowerCase();
          if (s === 'healthy') sensorsHealthy++;
          else if (s === 'warning') sensorsWarning++;
          else if (s === 'faulty') sensorsFaulty++;
          else if (s === 'offline') sensorsOffline++;
        });
      });

      setData({
        crossing: crossing || null,
        devices: devicesArr,
        alerts: alertsArr,
        gateEvents: gateEventsArr,
        summary: {
          devicesOnline: devicesArr.filter(d => d.status === 'online').length,
          devicesTotal: devicesArr.length,
          sensorsHealthy,
          sensorsWarning,
          sensorsFaulty,
          sensorsOffline,
          sensorsTotal: sensorsHealthy + sensorsWarning + sensorsFaulty + sensorsOffline,
          alertsActive: alertsArr.filter(a => !a.resolved).length,
          trainToday: (todayClosedEvents || []).length,
        },
      });
      if (isMountedRef.current) setLoading(false);
    }

    fetchAll();

    // Realtime subscription for this crossing
    const channel = supabase
      .channel(`crossing_detail_${crossId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_events', filter: `cross_id=eq.${crossId}` },
        () => { if (isMountedRef.current) fetchAll(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `cross_id=eq.${crossId}` },
        () => { if (isMountedRef.current) fetchAll(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `cross_id=eq.${crossId}` },
        () => { if (isMountedRef.current) fetchAll(); })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [crossId]);

  return { ...data, loading };
}
